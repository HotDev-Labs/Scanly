from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

# User & Auth
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Luggage
class LuggageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    passenger_id: str
    luggage_tag: str
    qr_token: str
    status: str
    qr_data_url: Optional[str] = None
    collected_at: Optional[datetime] = None
    collected_by_operator: Optional[str] = None
    created_at: datetime

# Passenger
class PassengerBase(BaseModel):
    passenger_id: str = Field(..., description="Unique Passenger ID, e.g. Trip 1-P101")
    display_id: Optional[str] = Field(None, description="Sheet / Display Passenger ID, e.g. P101")
    batch_name: Optional[str] = Field(default="Trip 1", description="Trip or Batch identifier")
    name: str = Field(..., min_length=2, max_length=100)
    mobile_number: str = Field(..., min_length=7, max_length=20)
    boarding_stop: str = Field(..., min_length=2, max_length=100)
    destination_stop: str = Field(..., min_length=2, max_length=100)
    luggage_count: int = Field(default=1, ge=1, le=10)

class PassengerCreate(PassengerBase):
    pass

class PassengerUpdate(BaseModel):
    name: Optional[str] = None
    display_id: Optional[str] = None
    batch_name: Optional[str] = None
    mobile_number: Optional[str] = None
    boarding_stop: Optional[str] = None
    destination_stop: Optional[str] = None
    luggage_count: Optional[int] = Field(None, ge=1, le=10)

class PassengerResponse(PassengerBase):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime
    updated_at: datetime
    luggage_items: List[LuggageResponse] = []

# Verification
class VerificationRequest(BaseModel):
    passenger_name: str = Field(..., description="Passenger's full name as reported")
    mobile_number: str = Field(..., description="Passenger's registered mobile number")
    destination_stop: str = Field(..., description="Destination stop being verified")
    luggage_count: int = Field(..., ge=1, description="Number of luggage bags being collected")
    scanned_tokens: List[str] = Field(..., description="List of scanned QR tokens or tags")

class ScannedLuggageDetail(BaseModel):
    luggage_tag: str
    passenger_id: str
    owner_name: str
    status: str
    is_valid_for_this_passenger: bool
    is_already_collected: bool

class VerificationResponse(BaseModel):
    status: str  # "SUCCESS" or "FAILED"
    title: str   # "VERIFICATION SUCCESSFUL" or "VERIFICATION FAILED"
    message: str
    failure_reason: Optional[str] = None
    passenger: Optional[PassengerResponse] = None
    scanned_details: List[ScannedLuggageDetail] = []
    log_id: Optional[int] = None

# Verification History Log
class VerificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    passenger_id: Optional[str]
    passenger_name_input: str
    mobile_number_input: str
    destination_stop_input: str
    luggage_count_expected: int
    luggage_count_scanned: int
    scanned_tags: str
    result: str
    failure_reason: Optional[str]
    operator_id: str
    timestamp: datetime

# Import
class ImportRow(BaseModel):
    passenger_id: str
    display_id: Optional[str] = None
    batch_name: Optional[str] = "Trip 1"
    name: str
    mobile_number: str
    boarding_stop: str
    destination_stop: str
    luggage_count: int
    row_number: int
    errors: List[str] = []
    is_valid: bool = True

class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    rows: List[ImportRow]

class ImportExecuteRequest(BaseModel):
    rows: List[PassengerBase]
    batch_name: Optional[str] = None

# Dashboard Stats
class DashboardStats(BaseModel):
    total_passengers: int
    total_luggage: int
    collected_luggage: int
    pending_luggage: int
    successful_verifications: int
    failed_verifications: int
    luggage_by_status: dict
