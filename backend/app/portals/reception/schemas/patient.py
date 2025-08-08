# app/portals/reception/schemas/patient.py
"""Patient registration and management schemas."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, validator, constr

from app.common.schemas.base import Gender, ContactInfo


# ============================= Request Models =============================
class PatientRegisterPayload(BaseModel):
    """Patient registration request schema."""
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: str = Field(..., description="YYYY-MM-DD format")
    gender: Gender
    phone_number: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=200)
    emergency_contact: Optional[str] = Field(None, max_length=100)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    pinfl: str = Field(..., min_length=14, max_length=14, description="Personal identification number")
    
    # Enhanced fields
    nationality: Optional[str] = Field(None, max_length=50)
    marital_status: Optional[str] = Field(None, pattern="^(Single|Married|Divorced|Widowed)$")
    occupation: Optional[str] = Field(None, max_length=100)
    insurance_provider: Optional[str] = Field(None, max_length=100)
    insurance_id: Optional[str] = Field(None, max_length=50)
    preferred_language: str = Field("en", pattern="^(en|uz|ru)$")
    
    @validator('date_of_birth')
    def validate_birth_date(cls, v):
        try:
            birth_date = datetime.strptime(v, "%Y-%m-%d").date()
            today = datetime.now().date()
            if birth_date >= today:
                raise ValueError("Birth date must be in the past")
            if (today - birth_date).days > 365 * 150:  # 150 years max
                raise ValueError("Invalid birth date")
            return v
        except ValueError as e:
            if "Birth date" in str(e) or "Invalid" in str(e):
                raise e
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not cleaned.replace('+', '').isdigit():
            raise ValueError('Phone number must contain only digits')
        return v
    
    @validator('pinfl')
    def validate_pinfl(cls, v):
        if not v.isdigit():
            raise ValueError('PINFL must contain only digits')
        return v


class PatientSearchParams(BaseModel):
    """Patient search parameters."""
    q: Optional[str] = Field(None, description="General search query")
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    pinfl: Optional[str] = None
    phone: Optional[str] = None
    fuzzy: bool = Field(True, description="Enable fuzzy matching")
    limit: int = Field(10, ge=1, le=50)


class PatientUpdateRequest(BaseModel):
    """Patient update request schema."""
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    preferred_language: Optional[str] = None
    nationality: Optional[str] = None
    occupation: Optional[str] = None


class PatientInviteRequest(BaseModel):
    """Patient invitation request schema."""
    patient_id: str
    invitation_type: str = Field("both", description="sms|email|both")
    custom_message: Optional[str] = None


# ============================= Response Models =============================
class PatientListItem(BaseModel):
    """Patient list item for display."""
    id: str
    first_name: str
    last_name: str
    date_of_birth: str
    phone_number: str
    email: Optional[str] = None
    insurance_provider: Optional[str] = None
    last_visit: Optional[str] = None
    status: str = "active"  # active | inactive | archived
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    class Config:
        from_attributes = True


class PatientSearchResult(BaseModel):
    """Patient search result with relevance score."""
    id: str
    full_name: str
    date_of_birth: str
    phone_number: str
    email: Optional[str] = None
    pinfl: str
    match_score: float = Field(1.0, ge=0.0, le=1.0)
    
    class Config:
        from_attributes = True


class PatientStats(BaseModel):
    """Patient statistics for dashboard."""
    total_patients: int
    new_patients_today: int
    new_patients_this_week: int
    active_patients: int


class DuplicateCheck(BaseModel):
    """Duplicate patient check result."""
    is_duplicate: bool
    existing_patient_id: Optional[str] = None
    match_fields: List[str] = Field(default_factory=list)
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class PatientInviteResponse(BaseModel):
    """Patient invitation response."""
    patient_id: str
    invitation_results: dict
    message: str


class PatientDetailResponse(PatientListItem):
    """Detailed patient information response."""
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    pinfl: str
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    occupation: Optional[str] = None
    insurance_id: Optional[str] = None
    preferred_language: str = "en"
    registration_date: Optional[datetime] = None
    medical_record_number: Optional[str] = None
    
    class Config:
        from_attributes = True