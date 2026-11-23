from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import VerificationLog, User
from ..schemas import VerificationRequest, VerificationResponse, VerificationLogResponse
from ..auth import get_current_user
from ..services.verification_service import perform_verification

router = APIRouter(prefix="/api/verification", tags=["Luggage Verification"])

@router.post("/verify", response_model=VerificationResponse)
def verify_luggage(
    req: VerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return perform_verification(db, req, operator_id=current_user.username)

@router.get("/history", response_model=List[VerificationLogResponse])
def get_verification_history(
    result: Optional[str] = Query(None, description="SUCCESS or FAILED"),
    passenger_id: Optional[str] = Query(None, description="Filter by Passenger ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(VerificationLog)
    if result:
        query = query.filter(VerificationLog.result == result.upper())
    if passenger_id:
        query = query.filter(VerificationLog.passenger_id == passenger_id)

    return query.order_by(VerificationLog.timestamp.desc()).offset(offset).limit(limit).all()

@router.get("/history/{log_id}", response_model=VerificationLogResponse)
def get_verification_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(VerificationLog).filter(VerificationLog.id == log_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Verification log record not found")
    return item
