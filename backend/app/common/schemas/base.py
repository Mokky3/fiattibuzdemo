# app/common/schemas/base.py
"""Base schemas and common models used across the application."""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator, constr
from enum import Enum


# ============================= Enums =============================
class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARRIVED = "arrived"
    CHECKED_IN = "checked-in"
    DECLINED = "declined"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class UserRole(str, Enum):
    RECEPTIONIST = "receptionist"
    DOCTOR = "doctor"
    NURSE = "nurse"
    ADMIN = "admin"
    PATIENT = "patient"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class MessageType(str, Enum):
    GENERAL = "general"
    APPOINTMENT = "appointment"
    REMINDER = "reminder"
    URGENT = "urgent"
    ATTACHMENT = "attachment"


class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"
    SUCCESS = "success"


# ============================= Base Models =============================
class TimestampMixin(BaseModel):
    """Mixin for models that need timestamp fields."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    page: int = Field(1, ge=1)
    size: int = Field(50, ge=1, le=200)


class ResponseBase(BaseModel):
    """Base response model."""
    success: bool = True
    message: Optional[str] = None


class ErrorResponse(ResponseBase):
    """Error response model."""
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ============================= Common Models =============================
class PhoneNumber(BaseModel):
    """Phone number validation model."""
    value: constr(min_length=10, max_length=20) = Field(..., description="Phone number")
    
    @validator('value')
    def validate_phone(cls, v):
        # Remove spaces and hyphens
        cleaned = v.replace(' ', '').replace('-', '')
        if not cleaned.replace('+', '').isdigit():
            raise ValueError('Phone number must contain only digits')
        return v


class Address(BaseModel):
    """Address model."""
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = Field(None, alias="zipCode")
    country: Optional[str] = "US"
    
    class Config:
        populate_by_name = True


class TimeRange(BaseModel):
    """Time range model."""
    start: time
    end: time
    
    @validator('end')
    def validate_time_range(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v


class DateRange(BaseModel):
    """Date range model."""
    start_date: date
    end_date: date
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v


# ============================= User Related =============================
class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = None
    role: UserRole = UserRole.RECEPTIONIST
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class ContactInfo(BaseModel):
    """Contact information model."""
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


# ============================= FHIR Related =============================
class FHIRReference(BaseModel):
    """FHIR resource reference."""
    reference: str  # e.g., "Patient/123"
    display: Optional[str] = None
    
    @validator('reference')
    def validate_reference(cls, v):
        if '/' not in v:
            raise ValueError('Reference must be in format ResourceType/id')
        return v


class FHIRIdentifier(BaseModel):
    """FHIR identifier."""
    system: str
    value: str
    type: Optional[Dict[str, str]] = None


class FHIRMeta(BaseModel):
    """FHIR resource metadata."""
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    source: str = "reception-portal"
    profile: Optional[List[str]] = None