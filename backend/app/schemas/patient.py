from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import date, datetime


class PatientBase(BaseModel):
    """Base patient schema with your existing fields"""
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: str = Field(..., pattern="^(Male|Female)$")
    birth_date: date
    phone: str = Field(..., pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    passport_number: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Full name cannot be empty')
        return v.strip().title()
    
    @field_validator('birth_date')
    @classmethod
    def validate_birth_date(cls, v):
        if v >= date.today():
            raise ValueError('Date of birth must be in the past')
        return v


class PatientCreate(PatientBase):
    """Schema for creating a patient - includes additional fields for registration form"""
    emergency_contact: Optional[str] = Field(None, max_length=20)
    pinfl: Optional[str] = Field(None, pattern=r"^\d{14}$")
    
    # Accept frontend field names and map them
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = Field(None, pattern=r"^\+998\d{9}$")
    
    @field_validator('pinfl')
    @classmethod
    def validate_pinfl(cls, v):
        if v and len(v) != 14:
            raise ValueError('PINFL must be exactly 14 digits')
        return v
    
    def model_dump(self, **kwargs):
        """Override model_dump method to handle field mapping"""
        data = super().model_dump(**kwargs)
        
        # Map frontend fields to backend fields if they exist
        if self.date_of_birth and not data.get('birth_date'):
            data['birth_date'] = self.date_of_birth
            data.pop('date_of_birth', None)
        
        if self.phone_number and not data.get('phone'):
            data['phone'] = self.phone_number
            data.pop('phone_number', None)
        
        return data


class PatientUpdate(BaseModel):
    """Schema for updating patient information"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, pattern="^(active|inactive|suspended)$")


class PatientResponse(BaseModel):
    """Schema for patient response"""
    id: int
    patient_id: Optional[str]
    full_name: str
    birth_date: date
    gender: str
    phone: str
    email: Optional[str]
    passport_number: Optional[str]
    address: Optional[str]
    emergency_contact: Optional[str]
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True  # Updated for Pydantic v2


class PatientListResponse(BaseModel):
    """Schema for paginated patient list"""
    patients: List[PatientResponse]
    total: int
    page: int
    size: int
    pages: int


class PatientSearch(BaseModel):
    """Schema for patient search"""
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    pinfl: Optional[str] = None
    phone: Optional[str] = None
    passport_number: Optional[str] = None
    
    # Accept frontend field names
    date_of_birth: Optional[date] = None
    phone_number: Optional[str] = None


class InvitationRequest(BaseModel):
    """Schema for invitation request"""
    patient_id: int


class InvitationResponse(BaseModel):
    """Schema for invitation response"""
    message: str
    invitation_token: str
    expires_at: str


class PatientStatistics(BaseModel):
    """Schema for patient statistics"""
    total_patients: int
    active_patients: int
    inactive_patients: int
    today_registrations: int
    gender_distribution: dict


# Frontend compatibility schemas - maps frontend field names
class PatientRegistrationForm(BaseModel):
    """Schema that matches your frontend form exactly"""
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: date
    gender: str = Field(..., pattern="^(Male|Female)$")
    phone_number: str = Field(..., pattern=r"^\+998\d{9}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    pinfl: str = Field(..., pattern=r"^\d{14}$")
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Full name cannot be empty')
        return v.strip().title()
    
    @field_validator('date_of_birth')
    @classmethod
    def validate_date_of_birth(cls, v):
        if v >= date.today():
            raise ValueError('Date of birth must be in the past')
        return v
    
    def to_patient_create(self) -> PatientCreate:
        """Convert to PatientCreate schema with proper field mapping"""
        return PatientCreate(
            full_name=self.full_name,
            birth_date=self.date_of_birth,  # Map to your DB field
            gender=self.gender,
            phone=self.phone_number,  # Map to your DB field
            email=self.email,
            address=self.address,
            emergency_contact=self.emergency_contact,
            pinfl=self.pinfl
        )