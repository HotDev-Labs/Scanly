import urllib.parse
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models import Passenger, Luggage, User
from ..schemas import PassengerCreate, PassengerUpdate, PassengerResponse
from ..auth import get_current_user
from ..services.qr_service import ensure_luggage_for_passenger

router = APIRouter(prefix="/api/passengers", tags=["Passengers"])

@router.get("/batches", response_model=List[str])
@router.post("/batches", response_model=List[str])
def list_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List distinct trip/batch names.
    """
    results = db.query(Passenger.batch_name).distinct().all()
    batches = sorted([r[0] for r in results if r[0]])
    if not batches:
        batches = ["Trip 1"]
    return batches

@router.delete("/batches/{batch_name:path}")
@router.post("/batches/{batch_name:path}")
@router.post("/batches/{batch_name:path}/delete")
@router.delete("/batches/{batch_name:path}/delete")
def delete_batch(
    batch_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes all passengers and luggage in a specific trip/batch.
    """
    clean_batch = urllib.parse.unquote(batch_name).strip()
    passengers = db.query(Passenger).filter(Passenger.batch_name == clean_batch).all()
    if not passengers:
        return {"message": f"Trip '{clean_batch}' deleted successfully.", "deleted_count": 0}
    
    p_ids = [p.passenger_id for p in passengers]
    db.query(Luggage).filter(Luggage.passenger_id.in_(p_ids)).delete(synchronize_session=False)
    db.query(Passenger).filter(Passenger.batch_name == clean_batch).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Trip '{clean_batch}' and its {len(p_ids)} passengers deleted successfully."}

@router.get("", response_model=List[PassengerResponse])
def list_passengers(
    search: Optional[str] = Query(None, description="Search by name, ID, mobile, or stop"),
    destination: Optional[str] = Query(None, description="Filter by destination stop"),
    batch: Optional[str] = Query(None, description="Filter by batch / trip name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Passenger)
    if isinstance(batch, str) and batch.strip() and batch.lower() != "all":
        query = query.filter(Passenger.batch_name == batch.strip())
    if isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Passenger.passenger_id.ilike(term),
                Passenger.display_id.ilike(term),
                Passenger.name.ilike(term),
                Passenger.mobile_number.ilike(term),
                Passenger.boarding_stop.ilike(term),
                Passenger.destination_stop.ilike(term),
            )
        )
    if isinstance(destination, str) and destination.strip():
        query = query.filter(Passenger.destination_stop == destination.strip())

    return query.order_by(Passenger.name.asc()).all()

@router.post("/generate-qr", response_model=PassengerResponse)
@router.get("/generate-qr", response_model=PassengerResponse)
@router.put("/generate-qr", response_model=PassengerResponse)
def generate_qr_query(
    passenger_id: str = Query(...),
    luggage_count: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_qr_for_passenger(passenger_id=passenger_id, db=db, luggage_count=luggage_count, current_user=current_user)

@router.post("/{passenger_id}/generate-qr", response_model=PassengerResponse)
@router.get("/{passenger_id}/generate-qr", response_model=PassengerResponse)
@router.put("/{passenger_id}/generate-qr", response_model=PassengerResponse)
def generate_qr_for_passenger(
    passenger_id: str,
    db: Session = Depends(get_db),
    luggage_count: Optional[int] = Query(None, description="Optional override of luggage count"),
    current_user: User = Depends(get_current_user)
):
    clean_id = urllib.parse.unquote(passenger_id).strip()
    passenger = db.query(Passenger).filter(
        (Passenger.passenger_id == clean_id) |
        (Passenger.display_id == clean_id) |
        (Passenger.passenger_id.endswith(f"-{clean_id}"))
    ).first()
    if not passenger:
        raise HTTPException(status_code=404, detail=f"Passenger '{clean_id}' not found")

    if luggage_count is not None:
        try:
            val = int(luggage_count)
            if val >= 1:
                passenger.luggage_count = val
                db.commit()
                db.refresh(passenger)
        except Exception:
            pass

    items = ensure_luggage_for_passenger(db, passenger)
    db.expire_all()
    passenger = db.query(Passenger).filter(Passenger.passenger_id == passenger.passenger_id).first()
    passenger.luggage_items = items
    return passenger

@router.get("/{passenger_id}", response_model=PassengerResponse)
def get_passenger(
    passenger_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_id = urllib.parse.unquote(passenger_id).strip()
    passenger = db.query(Passenger).filter(
        (Passenger.passenger_id == clean_id) |
        (Passenger.display_id == clean_id) |
        (Passenger.passenger_id.endswith(f"-{clean_id}"))
    ).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
    return passenger

@router.post("", response_model=PassengerResponse)
def create_passenger(
    passenger_in: PassengerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    b_name = (passenger_in.batch_name or "Trip 1").strip()
    raw_id = passenger_in.passenger_id.strip()
    d_id = getattr(passenger_in, "display_id", None) or raw_id
    
    if b_name and not raw_id.startswith(f"{b_name}-"):
        unique_id = f"{b_name}-{raw_id}"
    else:
        unique_id = raw_id

    existing = db.query(Passenger).filter(Passenger.passenger_id == unique_id).first()
    if existing:
        existing.display_id = d_id
        existing.batch_name = b_name
        existing.name = passenger_in.name
        existing.mobile_number = passenger_in.mobile_number
        existing.boarding_stop = passenger_in.boarding_stop
        existing.destination_stop = passenger_in.destination_stop
        existing.luggage_count = passenger_in.luggage_count
        db.commit()
        db.refresh(existing)
        return existing

    passenger = Passenger(
        passenger_id=unique_id,
        display_id=d_id,
        batch_name=b_name,
        name=passenger_in.name,
        mobile_number=passenger_in.mobile_number,
        boarding_stop=passenger_in.boarding_stop,
        destination_stop=passenger_in.destination_stop,
        luggage_count=passenger_in.luggage_count
    )
    db.add(passenger)
    db.commit()
    db.refresh(passenger)
    return passenger

@router.put("/{passenger_id}", response_model=PassengerResponse)
@router.post("/{passenger_id}", response_model=PassengerResponse)
@router.post("/{passenger_id}/update", response_model=PassengerResponse)
def update_passenger(
    passenger_id: str,
    passenger_update: PassengerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_id = urllib.parse.unquote(passenger_id).strip()
    passenger = db.query(Passenger).filter(
        (Passenger.passenger_id == clean_id) |
        (Passenger.display_id == clean_id) |
        (Passenger.passenger_id.endswith(f"-{clean_id}"))
    ).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")

    old_count = passenger.luggage_count
    update_data = passenger_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(passenger, field, val)

    new_count = passenger.luggage_count
    # Check if passenger already has generated luggage items
    existing_items = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).order_by(Luggage.id.asc()).all()
    if existing_items:
        items = ensure_luggage_for_passenger(db, passenger)
        passenger.luggage_items = items

    db.commit()
    db.refresh(passenger)
    return passenger

@router.delete("/{passenger_id}")
@router.post("/{passenger_id}/delete")
def delete_passenger(
    passenger_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_id = urllib.parse.unquote(passenger_id).strip()
    passenger = db.query(Passenger).filter(
        (Passenger.passenger_id == clean_id) |
        (Passenger.display_id == clean_id) |
        (Passenger.passenger_id.endswith(f"-{clean_id}"))
    ).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")

    db.delete(passenger)
    db.commit()
    return {"message": f"Passenger {clean_id} and associated luggage deleted successfully"}
