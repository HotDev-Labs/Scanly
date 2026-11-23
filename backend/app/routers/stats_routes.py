from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Passenger, Luggage, VerificationLog, User
from ..schemas import DashboardStats
from ..auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_passengers = db.query(func.count(Passenger.passenger_id)).scalar() or 0
    total_luggage = db.query(func.count(Luggage.id)).scalar() or 0
    collected_luggage = db.query(func.count(Luggage.id)).filter(Luggage.status == "COLLECTED").scalar() or 0
    pending_luggage = total_luggage - collected_luggage

    successful_verifications = db.query(func.count(VerificationLog.id)).filter(VerificationLog.result == "SUCCESS").scalar() or 0
    failed_verifications = db.query(func.count(VerificationLog.id)).filter(VerificationLog.result == "FAILED").scalar() or 0

    # Luggage status breakdown
    statuses = db.query(Luggage.status, func.count(Luggage.id)).group_by(Luggage.status).all()
    luggage_by_status = {s[0]: s[1] for s in statuses}

    # Ensure all 4 standard statuses are represented
    for st in ["REGISTERED", "QR_GENERATED", "IN_TRANSIT", "COLLECTED"]:
        if st not in luggage_by_status:
            luggage_by_status[st] = 0

    # Recent verifications (last 5)
    recent_verifications = db.query(VerificationLog).order_by(VerificationLog.timestamp.desc()).limit(5).all()

    # Destination stops breakdown
    destinations = db.query(Passenger.destination_stop, func.count(Passenger.passenger_id)).group_by(Passenger.destination_stop).all()
    destinations_list = [{"stop": d[0], "count": d[1]} for d in destinations]

    return {
        "total_passengers": total_passengers,
        "total_luggage": total_luggage,
        "collected_luggage": collected_luggage,
        "pending_luggage": pending_luggage,
        "successful_verifications": successful_verifications,
        "failed_verifications": failed_verifications,
        "luggage_by_status": luggage_by_status,
        "destinations": destinations_list,
        "recent_verifications": [
            {
                "id": log.id,
                "passenger_id": log.passenger_id,
                "passenger_name": log.passenger_name_input,
                "result": log.result,
                "timestamp": log.timestamp,
                "failure_reason": log.failure_reason,
                "destination_stop": log.destination_stop_input
            }
            for log in recent_verifications
        ]
    }
