import json
import re
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Luggage, Passenger, User, VerificationLog
from ..schemas import LuggageResponse
from ..auth import get_current_user
from ..services.qr_service import bulk_generate_qr_for_all, create_qr_code_image_data_url, ensure_luggage_for_passenger

class ScanRequest(BaseModel):
    code: str
    auto_collect: Optional[bool] = True

def extract_target_bags(text: str) -> Optional[int]:
    """Extract total luggage/bags count from any formatted QR code text."""
    for line in text.splitlines():
        line_clean = line.strip().lower()
        m = re.search(r'(?:total\s+bags?|bags?|baggage|luggage)\s*[:=-]?\s*(\d+)', line_clean)
        if m:
            try:
                val = int(m.group(1))
                if val >= 1:
                    return val
            except Exception:
                pass
        m2 = re.search(r'(\d+)\s*(?:bags?|baggage(?:\s*tags?)?|luggage)', line_clean)
        if m2:
            try:
                val = int(m2.group(1))
                if val >= 1:
                    return val
            except Exception:
                pass
    return None

def resolve_passenger_and_items(code_str: str, db: Session):
    clean = code_str.strip()
    if not clean:
        return None, [], None

    target_bags = extract_target_bags(clean)

    # 1. Direct match on luggage_tag or qr_token
    item = db.query(Luggage).filter(
        (Luggage.luggage_tag == clean) | (Luggage.qr_token == clean)
    ).first()
    if item:
        passenger = db.query(Passenger).filter(Passenger.passenger_id == item.passenger_id).first()
        if passenger:
            if target_bags and target_bags > passenger.luggage_count:
                passenger.luggage_count = target_bags
                db.commit()
                db.refresh(passenger)
            all_bags = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).order_by(Luggage.id.asc()).all()
            if not all_bags or len(all_bags) < passenger.luggage_count:
                all_bags = ensure_luggage_for_passenger(db, passenger)
            return passenger, all_bags, item

    # 2. Match directly by passenger_id or display_id (e.g. "P101" or "Trip 1-P101")
    passenger = db.query(Passenger).filter(
        (Passenger.passenger_id == clean) | (Passenger.display_id == clean)
    ).first()
    if passenger:
        if target_bags and target_bags > passenger.luggage_count:
            passenger.luggage_count = target_bags
            db.commit()
            db.refresh(passenger)
        all_bags = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).order_by(Luggage.id.asc()).all()
        if not all_bags or len(all_bags) < passenger.luggage_count:
            all_bags = ensure_luggage_for_passenger(db, passenger)
        pending = [b for b in all_bags if b.status != "COLLECTED"]
        target = pending[0] if pending else (all_bags[0] if all_bags else None)
        return passenger, all_bags, target

    # 3. Check multiline text for "Tag:", "Passenger ID:", "ID:", "Trip:"
    lines = clean.splitlines()
    target_id = None
    target_tag = None
    target_trip = None
    for line in lines:
        line_clean = line.strip()
        lower = line_clean.lower()
        if lower.startswith("tag:"):
            target_tag = line_clean.split(":", 1)[1].strip()
        elif lower.startswith("passenger id:") or lower.startswith("id:"):
            target_id = line_clean.split(":", 1)[1].strip()
        elif lower.startswith("trip:"):
            target_trip = line_clean.split(":", 1)[1].strip()

    lookup_key = target_tag or target_id
    if lookup_key:
        # Check luggage tag first
        item = db.query(Luggage).filter(Luggage.luggage_tag == lookup_key).first()
        if item:
            passenger = db.query(Passenger).filter(Passenger.passenger_id == item.passenger_id).first()
            if passenger:
                if target_bags and target_bags > passenger.luggage_count:
                    passenger.luggage_count = target_bags
                    db.commit()
                    db.refresh(passenger)
                all_bags = db.query(Luggage).filter(Luggage.passenger_id == item.passenger_id).order_by(Luggage.id.asc()).all()
                if not all_bags or len(all_bags) < passenger.luggage_count:
                    all_bags = ensure_luggage_for_passenger(db, passenger)
                return passenger, all_bags, item

        # Query passenger matching passenger_id or display_id
        q = db.query(Passenger).filter(
            (Passenger.passenger_id == lookup_key) | 
            (Passenger.display_id == lookup_key) | 
            (Passenger.passenger_id.ilike(f"%{lookup_key}%"))
        )
        if target_trip:
            q = q.filter(Passenger.batch_name == target_trip)
        passenger = q.first()
        if passenger:
            if target_bags and target_bags > passenger.luggage_count:
                passenger.luggage_count = target_bags
                db.commit()
                db.refresh(passenger)
            all_bags = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).order_by(Luggage.id.asc()).all()
            if not all_bags or len(all_bags) < passenger.luggage_count:
                all_bags = ensure_luggage_for_passenger(db, passenger)
            pending = [b for b in all_bags if b.status != "COLLECTED"]
            target = pending[0] if pending else (all_bags[0] if all_bags else None)
            return passenger, all_bags, target

    # 4. JSON payload fallback
    try:
        data = json.loads(clean)
        if isinstance(data, dict):
            pid = data.get("passenger_id") or data.get("tag") or data.get("id") or data.get("token")
            if pid:
                return resolve_passenger_and_items(str(pid), db)
    except Exception:
        pass

    # 5. Search by passenger ID contained within the string
    passengers = db.query(Passenger).all()
    for p in passengers:
        if p.passenger_id in clean or (len(p.name) > 3 and p.name.lower() in clean.lower()):
            if target_bags and target_bags > p.luggage_count:
                p.luggage_count = target_bags
                db.commit()
                db.refresh(p)
            all_bags = db.query(Luggage).filter(Luggage.passenger_id == p.passenger_id).order_by(Luggage.id.asc()).all()
            if not all_bags or len(all_bags) < p.luggage_count:
                all_bags = ensure_luggage_for_passenger(db, p)
            pending = [b for b in all_bags if b.status != "COLLECTED"]
            target = pending[0] if pending else (all_bags[0] if all_bags else None)
            return p, all_bags, target

    return None, [], None

router = APIRouter(prefix="/api/luggage", tags=["Luggage"])

@router.delete("/delete-all")
@router.post("/delete-all")
def delete_all_luggage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes all generated luggage items and resets luggage tracking completely.
    """
    deleted_luggage = db.query(Luggage).delete()
    deleted_logs = db.query(VerificationLog).delete()
    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted all {deleted_luggage} generated QR luggage records and reset verification logs.",
        "deleted_count": deleted_luggage
    }

@router.get("", response_model=List[LuggageResponse])
def list_luggage(
    status: Optional[str] = Query(None, description="Filter by status: REGISTERED, QR_GENERATED, IN_TRANSIT, COLLECTED"),
    passenger_id: Optional[str] = Query(None, description="Filter by passenger ID"),
    batch_name: Optional[str] = Query(None, description="Filter by trip/batch name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Luggage)
    if status:
        query = query.filter(Luggage.status == status.upper())
    if passenger_id:
        query = query.filter(Luggage.passenger_id == passenger_id)
    if batch_name:
        query = query.join(Passenger, Luggage.passenger_id == Passenger.passenger_id).filter(Passenger.batch_name == batch_name)
    return query.order_by(Luggage.id.asc()).all()

@router.post("/scan")
def scan_luggage(
    req: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Main scan endpoint:
    Resolves customer from the QR code (even with 4 bags, 1 QR code).
    Each scan automatically verifies and hands over the next pending bag:
    Scan 1 -> Bag 1 of 4 verified
    Scan 2 -> Bag 2 of 4 verified
    Scan 3 -> Bag 3 of 4 verified
    Scan 4 -> Bag 4 of 4 verified (all bags completed)
    """
    passenger, all_bags, target_item = resolve_passenger_and_items(req.code, db)
    if not passenger:
        raise HTTPException(
            status_code=404,
            detail=f"No passenger or luggage found for scanned code."
        )

    if not all_bags or len(all_bags) < passenger.luggage_count:
        all_bags = ensure_luggage_for_passenger(db, passenger)

    pending_bags = [b for b in all_bags if b.status != "COLLECTED"]
    collected_bags = [b for b in all_bags if b.status == "COLLECTED"]
    now = datetime.now(timezone.utc)
    just_collected = False
    just_collected_tag = None

    if req.auto_collect and pending_bags:
        bag_to_collect = pending_bags[0]
        bag_to_collect.status = "COLLECTED"
        bag_to_collect.collected_at = now
        bag_to_collect.collected_by_operator = current_user.username

        v_log = VerificationLog(
            passenger_id=passenger.passenger_id,
            passenger_name_input=passenger.name,
            mobile_number_input=passenger.mobile_number,
            destination_stop_input=passenger.destination_stop,
            luggage_count_expected=passenger.luggage_count,
            luggage_count_scanned=1,
            scanned_tags=json.dumps([bag_to_collect.luggage_tag]),
            result="SUCCESS",
            failure_reason=None,
            operator_id=current_user.username,
            timestamp=now
        )
        db.add(v_log)
        db.commit()
        db.refresh(bag_to_collect)

        just_collected = True
        just_collected_tag = bag_to_collect.luggage_tag
        collected_bags.append(bag_to_collect)
        pending_bags.pop(0)

    total_count = max(passenger.luggage_count, len(all_bags))
    if len(all_bags) < total_count:
        all_bags = ensure_luggage_for_passenger(db, passenger)
        pending_bags = [b for b in all_bags if b.status != "COLLECTED"]
        collected_bags = [b for b in all_bags if b.status == "COLLECTED"]
        total_count = len(all_bags)

    collected_count = len(collected_bags)
    all_collected = (collected_count >= total_count)

    if just_collected:
        if all_collected:
            msg = f"All {total_count} bags verified & handed over to {passenger.name}!"
        else:
            msg = f"Customer has {total_count} bags: Bag {collected_count} of {total_count} ({just_collected_tag}) verified & handed over!"
    else:
        if all_collected:
            msg = f"All {total_count} bags for {passenger.name} have already been handed over."
        else:
            msg = f"Customer {passenger.name} has {total_count} bags ({collected_count} of {total_count} collected)."

    return {
        "success": True,
        "message": msg,
        "passenger_id": passenger.passenger_id,
        "display_id": getattr(passenger, "display_id", None) or passenger.passenger_id,
        "batch_name": getattr(passenger, "batch_name", None) or "Trip 1",
        "owner_name": passenger.name,
        "mobile_number": passenger.mobile_number,
        "destination_stop": passenger.destination_stop,
        "boarding_stop": passenger.boarding_stop,
        "luggage_count": total_count,
        "luggage_tag": just_collected_tag or (all_bags[0].luggage_tag if all_bags else f"{passenger.passenger_id}-L1"),
        "status": "COLLECTED" if all_collected else "IN_TRANSIT",
        "collected_count": collected_count,
        "total_count": total_count,
        "all_collected": all_collected,
        "just_collected": just_collected,
        "just_collected_tag": just_collected_tag,
        "all_luggage_items": [
            {
                "id": b.id,
                "tag": b.luggage_tag,
                "status": b.status,
                "collected_at": b.collected_at.isoformat() if b.collected_at else None
            }
            for b in all_bags
        ]
    }

@router.get("/token/{token:path}")
def get_luggage_by_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    passenger, all_bags, item = resolve_passenger_and_items(token, db)
    if not passenger or not item:
        raise HTTPException(status_code=404, detail=f"No luggage record found for scanned code: {token[:50]}")

    collected_bags = [b for b in all_bags if b.status == "COLLECTED"]

    return {
        "luggage_tag": item.luggage_tag,
        "passenger_id": item.passenger_id,
        "display_id": getattr(passenger, "display_id", None) or passenger.passenger_id if passenger else item.passenger_id,
        "batch_name": getattr(passenger, "batch_name", None) or "Trip 1" if passenger else "Trip 1",
        "owner_name": passenger.name if passenger else "Unknown",
        "mobile_number": passenger.mobile_number if passenger else "Unknown",
        "status": item.status,
        "destination_stop": passenger.destination_stop if passenger else "Unknown",
        "boarding_stop": passenger.boarding_stop if passenger else "Unknown",
        "luggage_count": passenger.luggage_count if passenger else 1,
        "collected_at": item.collected_at,
        "collected_by": item.collected_by_operator,
        "qr_token": item.qr_token,
        "collected_count": len(collected_bags),
        "total_count": len(all_bags),
        "all_collected": (len(collected_bags) >= len(all_bags)),
        "all_luggage_items": [
            {
                "id": b.id,
                "tag": b.luggage_tag,
                "status": b.status,
                "is_current": b.id == item.id
            }
            for b in all_bags
        ]
    }

@router.post("/token/{token:path}/handover")
def handover_luggage_by_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    passenger, all_bags, item = resolve_passenger_and_items(token, db)
    if not item or not passenger:
        raise HTTPException(status_code=404, detail="Luggage not found for provided QR token")

    passenger = db.query(Passenger).filter(Passenger.passenger_id == item.passenger_id).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")

    if item.status == "COLLECTED":
        collected_str = item.collected_at.strftime('%Y-%m-%d %H:%M') if item.collected_at else 'previously'
        raise HTTPException(
            status_code=400,
            detail=f"Luggage '{item.luggage_tag}' was already marked as collected at {collected_str}."
        )

    now = datetime.now(timezone.utc)
    item.status = "COLLECTED"
    item.collected_at = now
    item.collected_by_operator = current_user.username

    v_log = VerificationLog(
        passenger_id=passenger.passenger_id,
        passenger_name_input=passenger.name,
        mobile_number_input=passenger.mobile_number,
        destination_stop_input=passenger.destination_stop,
        luggage_count_expected=passenger.luggage_count,
        luggage_count_scanned=1,
        scanned_tags=json.dumps([item.luggage_tag]),
        result="SUCCESS",
        failure_reason=None,
        operator_id=current_user.username,
        timestamp=now
    )
    db.add(v_log)
    db.commit()
    db.refresh(item)

    all_bags = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).all()
    all_collected = all(b.status == "COLLECTED" for b in all_bags)

    return {
        "success": True,
        "message": f"Luggage '{item.luggage_tag}' marked as HANDED OVER to {passenger.name}.",
        "luggage_tag": item.luggage_tag,
        "owner_name": passenger.name,
        "mobile_number": passenger.mobile_number,
        "destination_stop": passenger.destination_stop,
        "status": item.status,
        "collected_at": item.collected_at,
        "all_collected": all_collected,
        "all_luggage_items": [
            {"id": b.id, "tag": b.luggage_tag, "status": b.status}
            for b in all_bags
        ]
    }

@router.post("/passenger/{passenger_id}/handover-all")
def handover_all_luggage_for_passenger(
    passenger_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    passenger = db.query(Passenger).filter(Passenger.passenger_id == passenger_id).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")

    items = db.query(Luggage).filter(Luggage.passenger_id == passenger_id).all()
    if not items:
        raise HTTPException(status_code=404, detail="No luggage items found for this passenger")

    now = datetime.now(timezone.utc)
    for it in items:
        it.status = "COLLECTED"
        it.collected_at = now
        it.collected_by_operator = current_user.username

    v_log = VerificationLog(
        passenger_id=passenger.passenger_id,
        passenger_name_input=passenger.name,
        mobile_number_input=passenger.mobile_number,
        destination_stop_input=passenger.destination_stop,
        luggage_count_expected=passenger.luggage_count,
        luggage_count_scanned=len(items),
        scanned_tags=json.dumps([it.luggage_tag for it in items]),
        result="SUCCESS",
        failure_reason=None,
        operator_id=current_user.username,
        timestamp=now
    )
    db.add(v_log)
    db.commit()

    return {
        "success": True,
        "message": f"All {len(items)} luggage item(s) marked as HANDED OVER to {passenger.name}.",
        "owner_name": passenger.name,
        "passenger_id": passenger.passenger_id,
        "collected_tags": [it.luggage_tag for it in items]
    }

@router.post("/generate-all")
def generate_all_qr(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = bulk_generate_qr_for_all(db)
    return {"message": f"Successfully verified and generated QR codes for {count} luggage items."}

@router.post("/{tag}/reprint")
def reprint_qr_code(
    tag: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Luggage).filter(Luggage.luggage_tag == tag).first()
    if not item:
        raise HTTPException(status_code=404, detail="Luggage item not found")

    item.qr_data_url = create_qr_code_image_data_url(item.qr_token)
    db.commit()
    db.refresh(item)
    return LuggageResponse.model_validate(item)

@router.put("/{tag}/status")
@router.post("/{tag}/status")
def update_luggage_status(
    tag: str,
    new_status: str = Query(..., description="REGISTERED, QR_GENERATED, IN_TRANSIT, COLLECTED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_tag = urllib.parse.unquote(tag).strip()
    item = db.query(Luggage).filter(
        (Luggage.luggage_tag == clean_tag) |
        (Luggage.luggage_tag == tag)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Luggage item not found")

    valid_statuses = ["REGISTERED", "QR_GENERATED", "IN_TRANSIT", "COLLECTED"]
    if new_status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    item.status = new_status.upper()
    db.commit()
    db.refresh(item)
    return LuggageResponse.model_validate(item)

@router.delete("/{tag}")
@router.post("/{tag}/delete")
def delete_luggage_item(
    tag: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_tag = urllib.parse.unquote(tag).strip()
    item = db.query(Luggage).filter(
        (Luggage.luggage_tag == clean_tag) |
        (Luggage.luggage_tag == tag)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Luggage item not found")

    passenger = db.query(Passenger).filter(Passenger.passenger_id == item.passenger_id).first()
    db.delete(item)
    if passenger:
        remaining = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).count()
        passenger.luggage_count = max(1, remaining)
    db.commit()
    return {"message": f"Luggage {clean_tag} deleted successfully"}
