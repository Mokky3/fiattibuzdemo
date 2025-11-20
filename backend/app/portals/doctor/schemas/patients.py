from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Patient Related Schemas
# ================================

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class BloodTypeEnum(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"

class PatientStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DECEASED = "deceased"
    TRANSFERRED = "transferred"

class EmergencyContact(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    relationship: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., pattern=r'^\+?[\d\s\-\(\)]{10,20}$')
    email: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class InsuranceInfo(BaseModel):
    provider: str = Field(..., min_length=2, max_length=100)
    policy_number: str = Field(..., min_length=5, max_length=50)
    group_number: Optional[str] = Field(None, max_length=50)
    expiry_date: Optional[date] = None
    coverage_type: str = Field(default="basic")  # basic, premium, comprehensive

class PatientBase(BaseModel):
    # Personal Information
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    date_of_birth: date
    gender: GenderEnum
    phone: str = Field(..., pattern=r'^\+?[\d\s\-\(\)]{10,20}$')
    email: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Address
    address_line_1: str = Field(..., min_length=5, max_length=200)
    address_line_2: Optional[str] = Field(None, max_length=200)
    city: str = Field(..., min_length=2, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: str = Field(..., min_length=4, max_length=20)
    country: str = Field(default="Uzbekistan", max_length=100)
    
    # Medical Information
    blood_type: Optional[BloodTypeEnum] = None
    height: Optional[float] = Field(None, gt=0, le=300, description="Height in cm")
    weight: Optional[float] = Field(None, gt=0, le=1000, description="Weight in kg")
    
    # Emergency Contact
    emergency_contacts: List[EmergencyContact] = Field(default_factory=list, max_items=3)
    
    # Insurance
    insurance_info: Optional[InsuranceInfo] = None
    
    # Additional Info
    occupation: Optional[str] = Field(None, max_length=100)
    marital_status: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=1000)

class PatientCreate(PatientBase):
    """Schema for creating a new patient"""
    pass

class PatientUpdate(BaseModel):
    """Schema for updating patient information - all fields optional"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[\d\s\-\(\)]{10,20}$')
    email: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    address_line_1: Optional[str] = Field(None, min_length=5, max_length=200)
    address_line_2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, min_length=4, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    blood_type: Optional[BloodTypeEnum] = None
    height: Optional[float] = Field(None, gt=0, le=300)
    weight: Optional[float] = Field(None, gt=0, le=1000)
    
    emergency_contacts: Optional[List[EmergencyContact]] = Field(None, max_items=3)
    insurance_info: Optional[InsuranceInfo] = None
    
    occupation: Optional[str] = Field(None, max_length=100)
    marital_status: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=1000)
    status: Optional[PatientStatusEnum] = None

class PatientResponse(PatientBase):
    """Schema for patient response - includes system fields"""
    id: str
    patient_number: str  # e.g., P-2025-001234
    status: PatientStatusEnum
    clinic_id: str
    assigned_doctor_id: Optional[str] = None
    
    # System timestamps
    created_at: datetime
    updated_at: datetime
    last_visit: Optional[datetime] = None
    
    # Calculated fields
    age: int
    bmi: Optional[float] = None
    
    # Visit summary
    total_visits: int = 0
    upcoming_appointments: int = 0
    
    class Config:
        from_attributes = True

class PatientList(BaseModel):
    """Schema for patient list with pagination"""
    patients: List[PatientResponse]
    total: int
    page: int
    size: int
    total_pages: int

class PatientSearch(BaseModel):
    """Schema for patient search parameters"""
    query: Optional[str] = Field(None, min_length=2, description="Search by name, phone, or patient number")
    status: Optional[PatientStatusEnum] = None
    assigned_doctor_id: Optional[str] = None
    age_min: Optional[int] = Field(None, ge=0, le=150)
    age_max: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[GenderEnum] = None
    last_visit_from: Optional[date] = None
    last_visit_to: Optional[date] = None
    
    # Pagination
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
    
    # Sorting
    sort_by: str = Field("last_name", pattern=r'^(first_name|last_name|date_of_birth|last_visit|created_at)$')
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$')

# ================================
# Medical History Schemas
# ================================

class AllergyTypeEnum(str, Enum):
    DRUG = "drug"
    FOOD = "food"
    ENVIRONMENTAL = "environmental"
    OTHER = "other"

class SeverityEnum(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    LIFE_THREATENING = "life_threatening"

class Allergy(BaseModel):
    allergen: str = Field(..., min_length=2, max_length=100)
    allergy_type: AllergyTypeEnum
    severity: SeverityEnum
    reaction: str = Field(..., min_length=5, max_length=500)
    onset_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)

class MedicalCondition(BaseModel):
    condition: str = Field(..., min_length=2, max_length=200)
    icd_code: Optional[str] = Field(None, max_length=20)
    diagnosed_date: Optional[date] = None
    status: str = Field(default="active")  # active, resolved, chronic
    severity: Optional[SeverityEnum] = None
    notes: Optional[str] = Field(None, max_length=1000)

class FamilyHistory(BaseModel):
    relative: str = Field(..., min_length=2, max_length=50)  # mother, father, sibling, etc.
    condition: str = Field(..., min_length=2, max_length=200)
    age_of_onset: Optional[int] = Field(None, ge=0, le=150)
    notes: Optional[str] = Field(None, max_length=500)

class MedicalHistory(BaseModel):
    patient_id: str
    allergies: List[Allergy] = Field(default_factory=list)
    medical_conditions: List[MedicalCondition] = Field(default_factory=list)
    family_history: List[FamilyHistory] = Field(default_factory=list)
    surgical_history: List[str] = Field(default_factory=list)
    social_history: Dict[str, Any] = Field(default_factory=dict)  # smoking, alcohol, etc.
    
    # Metadata
    last_updated: datetime
    updated_by: str  # doctor ID

class MedicalHistoryUpdate(BaseModel):
    allergies: Optional[List[Allergy]] = None
    medical_conditions: Optional[List[MedicalCondition]] = None
    family_history: Optional[List[FamilyHistory]] = None
    surgical_history: Optional[List[str]] = None
    social_history: Optional[Dict[str, Any]] = None

# ================================
# Validators
# ================================

@validator('date_of_birth', pre=True, always=True)
def validate_date_of_birth(cls, v):
    if isinstance(v, str):
        try:
            v = datetime.strptime(v, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError('Invalid date format. Use YYYY-MM-DD')
    
    if v and v > date.today():
        raise ValueError('Date of birth cannot be in the future')
    
    if v and (date.today() - v).days > 150 * 365:  # 150 years
        raise ValueError('Date of birth cannot be more than 150 years ago')
    
    return v

# Add validator to PatientBase and related classes
PatientBase.__validators__['validate_date_of_birth'] = validator('date_of_birth', pre=True, always=True, allow_reuse=True)(validate_date_of_birth)