"""Enhanced base schemas and common models for surgical edits integration."""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr, validator, constr
import enum
from enum import Enum

# ============================= Enhanced Enums =============================
class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"

class AppointmentStatus(str, enum.Enum):
    """Enhanced appointment statuses aligned with FHIR."""
    PROPOSED = "proposed"
    PENDING = "pending"
    BOOKED = "booked"
    ARRIVED = "arrived"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    NOSHOW = "noshow"
    ENTERED_IN_ERROR = "entered-in-error"
    CHECKED_IN = "checked-in"
    WAITLIST = "waitlist"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class UserRole(str, enum.Enum):
    """Enhanced user roles with surgical edits additions."""
    SUPER_ADMIN = "super_admin"
    CLINIC_ADMIN = "clinic_admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    LAB_TECHNICIAN = "lab_technician"
    RADIOLOGIST = "radiologist"
    PHARMACIST = "pharmacist"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class MessageType(str, enum.Enum):
    """Enhanced message types for surgical edits."""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"
    VIDEO = "video"
    TEMPLATE = "template"
    SYSTEM = "system"

class MessagePriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"
    SUCCESS = "success"
    ERROR = "error"

class ClinicScope(str, enum.Enum):
    """Clinic scoping for multi-tenant architecture."""
    GLOBAL = "global"
    CLINIC = "clinic"
    USER = "user"

class FHIRResourceType(str, enum.Enum):
    """FHIR resource types used in surgical edits."""
    PATIENT = "Patient"
    PRACTITIONER = "Practitioner"
    PRACTITIONER_ROLE = "PractitionerRole"
    ORGANIZATION = "Organization"
    LOCATION = "Location"
    APPOINTMENT = "Appointment"
    ENCOUNTER = "Encounter"
    MEDICATION_REQUEST = "MedicationRequest"
    OBSERVATION = "Observation"
    DOCUMENT_REFERENCE = "DocumentReference"
    DIAGNOSTIC_REPORT = "DiagnosticReport"
    COVERAGE = "Coverage"
    TASK = "Task"
    COMMUNICATION = "Communication"
    BINARY = "Binary"
    IMMUNIZATION = "Immunization"
    PROCEDURE = "Procedure"
    RELATED_PERSON = "RelatedPerson"

# ============================= Enhanced Base Models =============================
class TimestampMixin(BaseModel):
    """Enhanced mixin for models that need timestamp fields."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = Field(None, description="User who created the record")
    updated_by: Optional[str] = Field(None, description="User who last updated the record")

class ClinicScopedMixin(BaseModel):
    """Mixin for models that need clinic scoping."""
    clinic_id: str = Field(..., description="Clinic ID for multi-tenant scoping")
    clinic_name: Optional[str] = Field(None, description="Clinic name for reference")

class FHIRMixin(BaseModel):
    """Mixin for models that integrate with FHIR."""
    fhir_id: Optional[str] = Field(None, description="FHIR resource ID")
    fhir_version_id: Optional[str] = Field(None, description="FHIR version ID")
    fhir_last_updated: Optional[datetime] = Field(None, description="FHIR last updated timestamp")
    fhir_sync_status: str = Field("synced", description="FHIR sync status: synced|pending|failed|conflict")

class AuditMixin(BaseModel):
    """Mixin for models that need audit logging."""
    audit_trail: Optional[List[Dict[str, Any]]] = Field(None, description="Audit trail entries")
    last_audit_at: Optional[datetime] = Field(None, description="Last audit timestamp")

class PaginationParams(BaseModel):
    """Enhanced pagination parameters."""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$', description="Sort order")

class ResponseBase(BaseModel):
    """Enhanced base response model."""
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: Optional[str] = Field(None, description="Request trace ID")

class ErrorResponse(ResponseBase):
    """Enhanced error response model."""
    success: bool = False
    error_code: Optional[str] = None
    error_type: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    clinic_id: Optional[str] = None
    user_id: Optional[str] = None

# ============================= Enhanced Common Models =============================
class PhoneNumber(BaseModel):
    """Enhanced phone number validation model."""
    value: constr(min_length=10, max_length=20) = Field(..., description="Phone number")
    country_code: Optional[str] = Field("+998", description="Country code")
    is_verified: bool = Field(False, description="Is phone number verified")
    
    @validator('value')
    def validate_phone(cls, v):
        # Remove spaces, dashes, and parentheses
        cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not cleaned.replace('+', '').isdigit():
            raise ValueError('Phone number must contain only digits')
        return v

class Address(BaseModel):
    """Enhanced address model."""
    street: Optional[str] = Field(None, max_length=200, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    zip_code: Optional[str] = Field(None, alias="zipCode", max_length=20, description="Postal code")
    country: Optional[str] = Field("Uzbekistan", max_length=100, description="Country")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Latitude and longitude")
    
    class Config:
        populate_by_name = True

class TimeRange(BaseModel):
    """Enhanced time range model."""
    start: time
    end: time
    
    @validator('end')
    def validate_time_range(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v

class DateRange(BaseModel):
    """Enhanced date range model."""
    start_date: date
    end_date: date
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class WorkingHours(BaseModel):
    """Working hours model."""
    day_of_week: str = Field(..., pattern=r'^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$')
    start_time: time
    end_time: time
    is_working_day: bool = True
    break_start: Optional[time] = None
    break_end: Optional[time] = None

# ============================= Enhanced User Related =============================
class UserBase(BaseModel):
    """Enhanced base user model."""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = None
    role: UserRole = UserRole.PATIENT
    status: UserStatus = UserStatus.ACTIVE
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

class ContactInfo(BaseModel):
    """Enhanced contact information model."""
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    preferred_contact_method: str = Field("phone", pattern=r'^(phone|email|sms)$')
    language_preference: str = Field("en", pattern=r'^(en|uz|ru)$')

class UserPreferences(BaseModel):
    """User preferences model."""
    language: str = Field("en", pattern=r'^(en|uz|ru)$')
    timezone: str = Field("Asia/Tashkent")
    date_format: str = Field("DD.MM.YYYY", pattern=r'^(DD\.MM\.YYYY|MM/DD/YYYY|YYYY-MM-DD)$')
    time_format: str = Field("24h", pattern=r'^(12h|24h)$')
    notifications_enabled: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False
    push_notifications: bool = True

# ============================= Enhanced FHIR Related =============================
class FHIRReference(BaseModel):
    """Enhanced FHIR resource reference."""
    reference: str  # e.g., "Patient/123"
    display: Optional[str] = None
    type: Optional[str] = None  # Resource type
    
    @validator('reference')
    def validate_reference(cls, v):
        if '/' not in v:
            raise ValueError('Reference must be in format ResourceType/id')
        return v

class FHIRIdentifier(BaseModel):
    """Enhanced FHIR identifier."""
    system: str
    value: str
    type: Optional[Dict[str, str]] = None
    use: Optional[str] = Field("usual", pattern=r'^(usual|official|temp|secondary)$')
    period: Optional[Dict[str, str]] = None

class FHIRMeta(BaseModel):
    """Enhanced FHIR resource metadata."""
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    source: str = "healthcare-portal"
    profile: Optional[List[str]] = None
    version_id: Optional[str] = None
    security: Optional[List[Dict[str, str]]] = None
    tag: Optional[List[Dict[str, str]]] = None

class FHIRCodeableConcept(BaseModel):
    """FHIR CodeableConcept."""
    coding: Optional[List[Dict[str, str]]] = None
    text: Optional[str] = None

class FHIRQuantity(BaseModel):
    """FHIR Quantity."""
    value: Optional[float] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None

class FHIRPeriod(BaseModel):
    """FHIR Period."""
    start: Optional[datetime] = None
    end: Optional[datetime] = None

# ============================= Enhanced Medical Models =============================
class VitalSigns(BaseModel):
    """Enhanced vital signs model."""
    systolic_bp: Optional[int] = Field(None, ge=50, le=300, description="Systolic blood pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=30, le=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=30, le=300, description="Heart rate (bpm)")
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temperature (°C)")
    respiratory_rate: Optional[int] = Field(None, ge=8, le=60, description="Respiratory rate (breaths/min)")
    oxygen_saturation: Optional[int] = Field(None, ge=70, le=100, description="Oxygen saturation (%)")
    height: Optional[float] = Field(None, gt=0, le=300, description="Height (cm)")
    weight: Optional[float] = Field(None, gt=0, le=1000, description="Weight (kg)")
    bmi: Optional[float] = Field(None, gt=0, le=100, description="BMI (calculated)")
    
    measured_at: datetime = Field(default_factory=datetime.utcnow)
    measured_by: str  # Staff member who took vitals
    fhir_observation_ids: Optional[List[str]] = Field(None, description="FHIR Observation IDs")

class MedicalHistory(BaseModel):
    """Enhanced medical history model."""
    allergies: List[str] = Field(default_factory=list, description="Known allergies")
    chronic_conditions: List[str] = Field(default_factory=list, description="Chronic conditions")
    family_history: List[str] = Field(default_factory=list, description="Family medical history")
    surgical_history: List[str] = Field(default_factory=list, description="Surgical history")
    social_history: Optional[str] = Field(None, description="Social history")
    medications: List[str] = Field(default_factory=list, description="Current medications")
    immunizations: List[str] = Field(default_factory=list, description="Immunization history")

class InsuranceInfo(BaseModel):
    """Enhanced insurance information model."""
    provider_name: str = Field(..., max_length=100, description="Insurance provider")
    policy_number: str = Field(..., max_length=50, description="Policy number")
    group_number: Optional[str] = Field(None, max_length=50, description="Group number")
    coverage_type: str = Field(..., description="Coverage type")
    start_date: Optional[date] = Field(None, description="Coverage start date")
    end_date: Optional[date] = Field(None, description="Coverage end date")
    is_primary: bool = Field(True, description="Is primary insurance")
    is_active: bool = Field(True, description="Is insurance active")
    fhir_coverage_id: Optional[str] = Field(None, description="FHIR Coverage ID")

# ============================= Enhanced Search and Filter Models =============================
class SearchParams(BaseModel):
    """Enhanced search parameters."""
    query: Optional[str] = Field(None, min_length=2, max_length=100, description="Search query")
    filters: Optional[Dict[str, Any]] = Field(None, description="Applied filters")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$', description="Sort order")
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")

class DateFilter(BaseModel):
    """Date filter model."""
    field: str = Field(..., description="Date field to filter")
    start_date: Optional[date] = Field(None, description="Start date")
    end_date: Optional[date] = Field(None, description="End date")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class TextFilter(BaseModel):
    """Text filter model."""
    field: str = Field(..., description="Text field to filter")
    value: str = Field(..., min_length=1, description="Filter value")
    operator: str = Field("contains", pattern=r'^(contains|equals|starts_with|ends_with)$')

class NumericFilter(BaseModel):
    """Numeric filter model."""
    field: str = Field(..., description="Numeric field to filter")
    min_value: Optional[float] = Field(None, description="Minimum value")
    max_value: Optional[float] = Field(None, description="Maximum value")
    
    @validator('max_value')
    def validate_numeric_range(cls, v, values):
        if v and values.get('min_value') and v < values['min_value']:
            raise ValueError('Maximum value must be greater than or equal to minimum value')
        return v

# ============================= Enhanced Validation Helpers =============================
def validate_pinfl(pinfl: str) -> str:
    """Validate PINFL format."""
    if len(pinfl) != 14:
        raise ValueError('PINFL must be exactly 14 digits')
    if not pinfl.isdigit():
        raise ValueError('PINFL must contain only digits')
    return pinfl

def validate_email_format(email: str) -> str:
    """Validate email format."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError('Invalid email format')
    return email.lower()

def calculate_age(birth_date: date) -> int:
    """Calculate age from birth date."""
    today = date.today()
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    return age

def format_phone_number(phone: str) -> str:
    """Format phone number to standard format."""
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Add country code if missing
    if len(digits) == 9 and not phone.startswith('+'):
        digits = '998' + digits
    
    # Format as +998XXXXXXXXX
    if len(digits) == 12 and digits.startswith('998'):
        return '+' + digits
    
    return phone  # Return original if can't format
