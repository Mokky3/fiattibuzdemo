# common/schemas/patient.py
"""
Patient-related schemas for the EHR system
Based on doctor portal router models
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from .base import (
    BaseSchema, PersonBase, AddressMixin, ContactInfo, 
    VitalSigns, MedicalInfo, Gender, BloodGroup, RhFactor,
    calculate_age
)

# ──────────────────────────────────────────────────────────────────────────────
# Patient Core Models
# ──────────────────────────────────────────────────────────────────────────────

class PatientBase(PersonBase, AddressMixin):
    """Base patient model with core information"""
    patient_code: str = Field(..., description="Unique patient identifier code")
    gender: Gender
    date_of_birth: date
    temporary_address: Optional[str] = Field(None, max_length=500)
    work_place: Optional[str] = Field(None, max_length=200)
    occupation: Optional[str] = Field(None, max_length=100)
    
    @validator('date_of_birth')
    def validate_birth_date(cls, v):
        if v > date.today():
            raise ValueError('Birth date cannot be in the future')
        if v < date(1900, 1, 1):
            raise ValueError('Birth date cannot be before 1900')
        return v

class PatientCreate(PatientBase):
    """Schema for creating a new patient"""
    emergency_contact_name: Optional[str] = Field(None, max_length=200)
    emergency_contact_phone: Optional[str] = None
    insurance_number: Optional[str] = Field(None, max_length=50)
    preferred_language: Optional[str] = Field(None, max_length=50)
    
class PatientUpdate(BaseModel):
    """Schema for updating patient information"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    temporary_address: Optional[str] = None
    work_place: Optional[str] = None
    occupation: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class Patient(PatientBase, BaseSchema):
    """Complete patient model with computed fields"""
    age: int = Field(..., description="Calculated age based on date of birth")
    
    # Vital signs
    height: Optional[str] = None
    weight: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure: Optional[str] = None
    
    # Medical information
    blood_group: Optional[BloodGroup] = None
    rh_factor: Optional[RhFactor] = None
    
    # Additional contact info
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # System fields
    registration_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    last_visit_date: Optional[datetime] = None
    is_active: bool = True
    
    @validator('age', pre=True, always=True)
    def calculate_patient_age(cls, v, values):
        if 'date_of_birth' in values and values['date_of_birth']:
            return calculate_age(values['date_of_birth'])
        return v or 0

# ──────────────────────────────────────────────────────────────────────────────
# Patient List/Summary Models (for UI)
# ──────────────────────────────────────────────────────────────────────────────

class PatientSummary(BaseModel):
    """Simplified patient model for lists and dropdowns"""
    id: str
    first_name: str
    last_name: str
    patient_code: str
    gender: Gender
    age: int
    last_visit_date: Optional[datetime] = None
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

class PatientListItem(PatientSummary):
    """Patient list item with additional summary info"""
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    blood_group: Optional[BloodGroup] = None
    total_visits: int = 0
    last_diagnosis: Optional[str] = None

# ──────────────────────────────────────────────────────────────────────────────
# Patient Medical Records
# ──────────────────────────────────────────────────────────────────────────────

class PatientVitalSigns(VitalSigns):
    """Patient vital signs with metadata"""
    patient_id: str
    measured_by: Optional[str] = None
    measured_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class PatientMedicalHistory(BaseModel):
    """Patient medical history"""
    patient_id: str
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    family_history: List[str] = Field(default_factory=list)
    surgical_history: List[str] = Field(default_factory=list)
    social_history: Optional[str] = None
    
class PatientInsurance(BaseModel):
    """Patient insurance information"""
    patient_id: str
    provider_name: str
    policy_number: str
    group_number: Optional[str] = None
    coverage_start_date: Optional[date] = None
    coverage_end_date: Optional[date] = None
    is_primary: bool = True

# ──────────────────────────────────────────────────────────────────────────────
# Patient Activity and Statistics
# ──────────────────────────────────────────────────────────────────────────────

class PatientActivity(BaseModel):
    """Patient activity record"""
    patient_id: str
    activity_type: str  # "appointment", "report", "prescription", "message"
    activity_description: str
    activity_date: datetime = Field(default_factory=datetime.utcnow)
    performed_by: Optional[str] = None  # Doctor/staff member ID
    
class PatientStats(BaseModel):
    """Patient statistics summary"""
    patient_id: str
    total_appointments: int = 0
    total_reports: int = 0
    total_prescriptions: int = 0
    active_prescriptions: int = 0
    last_appointment_date: Optional[datetime] = None
    last_report_date: Optional[datetime] = None
    total_visits_this_year: int = 0
    
# ──────────────────────────────────────────────────────────────────────────────
# Patient Search and Filtering
# ──────────────────────────────────────────────────────────────────────────────

class PatientSearchFilter(BaseModel):
    """Patient search filter parameters"""
    query: Optional[str] = Field(None, description="Search in name, code, email")
    gender: Optional[Gender] = None
    blood_group: Optional[BloodGroup] = None
    age_min: Optional[int] = Field(None, ge=0, le=150)
    age_max: Optional[int] = Field(None, ge=0, le=150)
    has_active_prescriptions: Optional[bool] = None
    registration_date_from: Optional[date] = None
    registration_date_to: Optional[date] = None
    
    @validator('age_max')
    def validate_age_range(cls, v, values):
        if v and values.get('age_min') and v < values['age_min']:
            raise ValueError('Maximum age must be greater than minimum age')
        return v

# ──────────────────────────────────────────────────────────────────────────────
# Response Models for Patient API
# ──────────────────────────────────────────────────────────────────────────────

class PatientResponse(BaseModel):
    """Standard patient response wrapper"""
    patient: Patient
    stats: Optional[PatientStats] = None
    recent_activity: Optional[List[PatientActivity]] = None

class PatientListResponse(BaseModel):
    """Patient list response"""
    patients: List[PatientListItem]
    total: int
    filters_applied: Optional[PatientSearchFilter] = None

# ──────────────────────────────────────────────────────────────────────────────
# Legacy/Compatibility Models (for existing frontend)
# ──────────────────────────────────────────────────────────────────────────────

class LegacyPatient(BaseModel):
    """Legacy patient model for backward compatibility with existing frontend"""
    id: str
    name: str  # Combined first_name + last_name
    gender: str
    dob: str  # ISO date string
    age: int
    height: Optional[str] = None
    weight: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    bloodPressure: Optional[str] = None  # Note: camelCase for frontend
    bloodGroup: Optional[str] = None
    rhFactor: Optional[str] = None
    phoneNumber: Optional[str] = None
    emailAddress: Optional[EmailStr] = None
    address: Optional[str] = None
    temporaryAddress: Optional[str] = None
    
    @classmethod
    def from_patient(cls, patient: Patient) -> "LegacyPatient":
        """Convert modern Patient model to legacy format"""
        return cls(
            id=patient.id,
            name=f"{patient.first_name} {patient.last_name}",
            gender=patient.gender.value,
            dob=patient.date_of_birth.isoformat(),
            age=patient.age,
            height=patient.height,
            weight=patient.weight,
            bmi=patient.bmi,
            temperature=patient.temperature,
            bloodPressure=patient.blood_pressure,
            bloodGroup=patient.blood_group.value if patient.blood_group else None,
            rhFactor=patient.rh_factor.value if patient.rh_factor else None,
            phoneNumber=patient.phone_number,
            emailAddress=patient.email,
            address=patient.address,
            temporaryAddress=patient.temporary_address
        )