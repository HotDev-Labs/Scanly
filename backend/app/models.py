from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="agent", nullable=False)  # "admin" or "agent"
    created_at = Column(DateTime, default=datetime.utcnow)

class Passenger(Base):
    __tablename__ = "passengers"

    passenger_id = Column(String(50), primary_key=True, index=True)
    display_id = Column(String(50), nullable=True, index=True)
    batch_name = Column(String(100), default="Trip 1", nullable=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    agent_email = Column(String(100), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    mobile_number = Column(String(20), nullable=False, index=True)
    boarding_stop = Column(String(100), nullable=False)
    destination_stop = Column(String(100), nullable=False, index=True)
    luggage_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    luggage_items = relationship("Luggage", back_populates="passenger", cascade="all, delete-orphan")

class Luggage(Base):
    __tablename__ = "luggage"

    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(String(50), ForeignKey("passengers.passenger_id", ondelete="CASCADE"), nullable=False, index=True)
    luggage_tag = Column(String(60), unique=True, index=True, nullable=False)  # e.g., P101-L1
    qr_token = Column(String(120), unique=True, index=True, nullable=False)     # Unpredictable secure token
    status = Column(String(30), default="REGISTERED", nullable=False, index=True) # REGISTERED, QR_GENERATED, IN_TRANSIT, COLLECTED
    qr_data_url = Column(Text, nullable=True)                                  # Base64 data URL for quick rendering and label printing
    collected_at = Column(DateTime, nullable=True)
    collected_by_operator = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    passenger = relationship("Passenger", back_populates="luggage_items")

class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(String(50), nullable=True, index=True)
    passenger_name_input = Column(String(100), nullable=False)
    mobile_number_input = Column(String(20), nullable=False)
    destination_stop_input = Column(String(100), nullable=False)
    luggage_count_expected = Column(Integer, nullable=False)
    luggage_count_scanned = Column(Integer, nullable=False)
    scanned_tags = Column(Text, nullable=False)  # JSON string array of luggage tags or tokens scanned
    result = Column(String(20), nullable=False, index=True)  # SUCCESS, FAILED
    failure_reason = Column(Text, nullable=True)
    operator_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
