import secrets
import io
import base64
import qrcode
from sqlalchemy.orm import Session
from ..models import Luggage, Passenger

def generate_secure_qr_token(passenger_id: str, tag: str) -> str:
    """
    Generate an unpredictable, cryptographically strong token for luggage.
    """
    random_part = secrets.token_hex(8)
    return f"SLV-{tag}-{random_part}"

def mask_customer_name(name: str) -> str:
    """
    Mask customer name for privacy protection.
    e.g. 'Rahul Sharma' -> 'R***l S****a'
    """
    parts = (name or "").strip().split()
    if not parts:
        return "Protected"
    masked = []
    for p in parts:
        if len(p) <= 2:
            masked.append(p[0] + "*")
        else:
            masked.append(p[0] + "*" * (len(p) - 2) + p[-1])
    return " ".join(masked)

def generate_customer_qr_payload(passenger: Passenger) -> str:
    """
    Generate secure web link for luggage QR tag.
    When scanned by ANY normal phone camera (iPhone, Android, Google Lens):
    It takes them directly to a secure verification link:
    e.g. https://scanly-henna.vercel.app/verify?tag=Trip%201-P101
    Zero private customer data is displayed on the camera screen!
    The page asks for the passenger PIN to unlock.
    In the Scanly web app, the scanner directly parses the tag from this URL,
    opens the in-app verification pop-up, asks for PIN, and allows pull & push!
    """
    import os
    import urllib.parse
    base_url = (os.getenv("APP_URL") or "https://scanly-henna.vercel.app").rstrip("/")
    clean_tag = urllib.parse.quote(str(passenger.passenger_id).strip())
    return f"{base_url}/verify?tag={clean_tag}"

def create_qr_code_image_data_url(payload: str) -> str:
    """
    Generate a QR code image as a base64 Data URL.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def ensure_luggage_for_passenger(db: Session, passenger: Passenger) -> list[Luggage]:
    """
    Ensure each passenger has their corresponding luggage items generated.
    For one customer, even if they have multiple bags (e.g. 4 bags),
    only 1 QR code is generated for that customer and shared across all their luggage tags.
    """
    target_count = max(1, int(passenger.luggage_count or 1))
    passenger.luggage_count = target_count

    existing_items = db.query(Luggage).filter(Luggage.passenger_id == passenger.passenger_id).order_by(Luggage.id.asc()).all()
    existing_count = len(existing_items)

    customer_payload = generate_customer_qr_payload(passenger)
    customer_qr_data_url = create_qr_code_image_data_url(customer_payload)

    # If already has more items than new luggage count, delete the extras
    if existing_count > target_count:
        extras = existing_items[target_count:]
        for extra in extras:
            db.delete(extra)
        db.commit()
        existing_items = existing_items[:target_count]

    # Always update existing items with the latest QR payload and image URL
    for item in existing_items:
        item.qr_data_url = customer_qr_data_url

    # If needs more items
    if len(existing_items) < target_count:
        for i in range(len(existing_items) + 1, target_count + 1):
            tag = f"{passenger.passenger_id}-L{i}"
            token = generate_secure_qr_token(passenger.passenger_id, tag)
            
            luggage = Luggage(
                passenger_id=passenger.passenger_id,
                luggage_tag=tag,
                qr_token=token,
                status="QR_GENERATED",
                qr_data_url=customer_qr_data_url
            )
            db.add(luggage)
            existing_items.append(luggage)

    db.commit()
    for item in existing_items:
        db.refresh(item)
    return existing_items

def bulk_generate_qr_for_all(db: Session) -> int:
    """
    Generate QR codes for all passengers that lack luggage records.
    """
    passengers = db.query(Passenger).all()
    count = 0
    for p in passengers:
        items = ensure_luggage_for_passenger(db, p)
        count += len(items)
    return count
