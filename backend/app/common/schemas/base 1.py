# common/schemas/base.py
"""
Base schemas for the EHR system
Contains fundamental data models used across the application
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum

# ──────────────────────────────────────────────────────────────────────────────
# Enums for controlled vocabularies
# ──────────────────────────────────────────────────────────────────────────────

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"

class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"

class RhFactor(str, Enum):
    POSITIVE = "+"
    NEGATIVE = "-"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Status(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

# ──────────────────────────────────────────────────────────────────────────────
# Base Models
# ──────────────────────────────────────────────────────────────────────────────

class BaseSchema(BaseModel):
    """Base schema with common fields"""
    id: Optional[str] = Field(None, description="Unique identifier")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None
        }

class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

class PersonBase(BaseModel):
    """Base model for person entities"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, regex=r"^\+?[\d\s\-\(\)]+$")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v and len(v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class AddressMixin(BaseModel):
    """Mixin for address fields"""
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)

class ContactInfo(BaseModel):
    """Contact information model"""
    email: Optional[EmailStr] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

# ──────────────────────────────────────────────────────────────────────────────
# Health-related Base Models
# ──────────────────────────────────────────────────────────────────────────────

class VitalSigns(BaseModel):
    """Vital signs measurements"""
    temperature: Optional[str] = Field(None, description="Body temperature (e.g., '36.6 °C')")
    blood_pressure: Optional[str] = Field(None, description="Blood pressure (e.g., '120/80')")
    heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Heart rate in BPM")
    respiratory_rate: Optional[int] = Field(None, ge=8, le=50, description="Breaths per minute")
    oxygen_saturation: Optional[float] = Field(None, ge=0, le=100, description="SpO2 percentage")
    height: Optional[str] = Field(None, description="Height (e.g., '175 cm')")
    weight: Optional[str] = Field(None, description="Weight (e.g., '70 kg')")
    bmi: Optional[str] = Field(None, description="Body Mass Index")

class MedicalInfo(BaseModel):
    """Basic medical information"""
    blood_group: Optional[BloodGroup] = None
    rh_factor: Optional[RhFactor] = None
    allergies: Optional[List[str]] = Field(default_factory=list)
    chronic_conditions: Optional[List[str]] = Field(default_factory=list)
    current_medications: Optional[List[str]] = Field(default_factory=list)

# ──────────────────────────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: str = "Service is running normally"
    version: Optional[str] = None
    uptime: Optional[float] = None

# ──────────────────────────────────────────────────────────────────────────────
# Pagination Models
# ──────────────────────────────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(20, ge=1, le=100, description="Items per page")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
    
    @classmethod
    def create(cls, items: List[Any], total: int, page: int, limit: int):
        total_pages = (total + limit - 1) // limit
        return cls(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )

# ──────────────────────────────────────────────────────────────────────────────
# Filter Models
# ──────────────────────────────────────────────────────────────────────────────

class DateRangeFilter(BaseModel):
    """Date range filter"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class SearchFilter(BaseModel):
    """Search filter parameters"""
    query: Optional[str] = Field(None, min_length=1, max_length=100)
    fields: Optional[List[str]] = Field(default_factory=list)
    case_sensitive: bool = False

# ──────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ──────────────────────────────────────────────────────────────────────────────

def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix"""
    from uuid import uuid4
    return f"{prefix}{uuid4().hex[:8]}" if prefix else uuid4().hex[:8]

def calculate_age(birth_date: date) -> int:
    """Calculate age from birth date"""
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))