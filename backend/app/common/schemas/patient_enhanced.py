"""Enhanced patient-related schemas for surgical edits integration."""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
import enum
from .base_enhanced import (
    TimestampMixin, ClinicScopedMixin, FHIRMixin, AuditMixin,
    Gender, PhoneNumber, Address, ContactInfo, UserPreferences,
    VitalSigns, MedicalHistory, InsuranceInfo, FHIRReference,
    validate_pinfl, validate_email_format, calculate_age, format_phone_number
)

# ============================= Enhanced Patient Core Models =============================

class PatientBase(BaseModel):
    """Enhanced base patient model with surgical edits integration."""
    first_name: str = Field(..., min_length=1, max_length=100, description="Patient first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Patient last name")
    middle_name: Optional[str] = Field(None, max_length=100, description="Patient middle name")
    gender: Gender
    date_of_birth: date
    pinfl: Optional[str] = Field(None, description="Personal identification number")
    passport_number: Optional[str] = Field(None, max_length=20, description="Passport number")
    email: Optional[EmailStr] = Field(None, description="Patient email")
    phone: Optional[str] = Field(None, description="Patient phone number")
    
    @validator('pinfl')
    def validate_pinfl_field(cls, v):
        if v:
            return validate_pinfl(v)
        return v
    
    @validator('email')
    def validate_email_field(cls, v):
        if v:
            return validate_email_format(v)
        return v
    
    @validator('phone')
    def validate_phone_field(cls, v):
        if v:
            return format_phone_number(v)
        return v
    
    @validator('date_of_birth')
    def validate_birth_date(cls, v):
        if v > date.today():
            raise ValueError('Birth date cannot be in the future')
        if v < date(1900, 1, 1):
            raise ValueError('Birth date cannot be before 1900')
        return v

class PatientCreate(PatientBase):
    """Enhanced schema for creating a new patient with FHIR integration."""
    # Flat fields commonly sent by portals
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    clinic_id: Optional[str] = None

    # Structured fields (optional; can be generated from the flat fields above)
    emergency_contact: Optional[ContactInfo] = None
    insurance_info: Optional[InsuranceInfo] = None
    medical_history: Optional[MedicalHistory] = None
    preferences: Optional[UserPreferences] = None
    
    # FHIR integration fields
    create_fhir_patient: bool = Field(True, description="Create FHIR Patient resource")
    create_fhir_coverage: bool = Field(False, description="Create FHIR Coverage if insurance provided")
    create_fhir_related_person: bool = Field(False, description="Create FHIR RelatedPerson for emergency contact")

class PatientUpdate(BaseModel):
    """Enhanced schema for updating patient information."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[Address] = None
    emergency_contact: Optional[ContactInfo] = None
    insurance_info: Optional[InsuranceInfo] = None
    medical_history: Optional[MedicalHistory] = None
    preferences: Optional[UserPreferences] = None
    
    @validator('email')
    def validate_email_field(cls, v):
        if v:
            return validate_email_format(v)
        return v
    
    @validator('phone')
    def validate_phone_field(cls, v):
        if v:
            return format_phone_number(v)
        return v

class Patient(BaseModel):
    """Enhanced complete patient model with all fields."""
    id: str = Field(..., description="Patient ID")
    patient_code: str = Field(..., description="Unique patient identifier code")
    first_name: str
    last_name: str
    gender: Gender
    date_of_birth: date
    age: int = Field(..., description="Calculated age based on date of birth")
    
    # Contact and address information
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[Address] = None
    emergency_contact: Optional[ContactInfo] = None
    
    # Medical information
    medical_history: Optional[MedicalHistory] = None
    insurance_info: Optional[InsuranceInfo] = None
    current_vitals: Optional[VitalSigns] = None
    
    # System fields
    clinic_id: Optional[str] = None
    fhir_id: Optional[str] = None
    registration_date: datetime = Field(default_factory=datetime.utcnow)
    last_visit_date: Optional[datetime] = None
    is_active: bool = True
    status: str = Field("active", description="Patient status")
    
    # Preferences and settings
    preferences: Optional[UserPreferences] = None
    
    @validator('age', pre=True, always=True)
    def calculate_patient_age(cls, v, values):
        if 'date_of_birth' in values and values['date_of_birth']:
            return calculate_age(values['date_of_birth'])
        return v or 0

# ============================= Enhanced Patient Summary Models =============================

class PatientSummary(BaseModel):
    """Enhanced simplified patient model for lists and dropdowns."""
    id: str
    patient_code: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    gender: Gender
    age: int
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    last_visit_date: Optional[datetime] = None
    is_active: bool = True
    clinic_id: str
    fhir_id: Optional[str] = None
    
    @property
    def full_name(self) -> str:
        name_parts = [self.first_name]
        if self.middle_name:
            name_parts.append(self.middle_name)
        name_parts.append(self.last_name)
        return " ".join(name_parts)

class PatientListItem(PatientSummary):
    """Enhanced patient list item with additional summary info."""
    address: Optional[str] = None
    insurance_provider: Optional[str] = None
    total_visits: int = 0
    last_diagnosis: Optional[str] = None
    has_active_prescriptions: bool = False
    risk_level: str = Field("low", pattern=r'^(low|medium|high)$')

class PatientSearchResult(PatientSummary):
    """Enhanced patient search result with relevance scoring."""
    relevance_score: float = Field(0.0, ge=0.0, le=1.0, description="Search relevance score")
    matched_fields: List[str] = Field(default_factory=list, description="Fields that matched the search")
    duplicate_probability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Probability of being a duplicate")

# ============================= Enhanced Patient Medical Records =============================

class PatientVitalSigns(VitalSigns):
    """Enhanced patient vital signs with metadata."""
    patient_id: str
    encounter_id: Optional[str] = None
    measured_by: str
    measured_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    clinic_id: str
    fhir_observation_ids: Optional[List[str]] = Field(None, description="FHIR Observation IDs")

class PatientMedicalRecord(BaseModel):
    """Enhanced patient medical record."""
    patient_id: str
    record_type: str = Field(..., pattern=r'^(consultation|lab|imaging|prescription|procedure|vaccination)$')
    title: str = Field(..., max_length=200)
    content: str = Field(..., description="Record content")
    date: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    clinic_id: str
    fhir_document_reference_id: Optional[str] = None
    fhir_diagnostic_report_id: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class PatientImmunization(BaseModel):
    """Enhanced patient immunization record."""
    patient_id: str
    vaccine_name: str
    vaccine_code: str
    administration_date: date
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    administered_by: str
    clinic_id: str
    fhir_immunization_id: Optional[str] = None
    next_due_date: Optional[date] = None

# ============================= Enhanced Patient Activity and Statistics =============================

class PatientActivity(BaseModel):
    """Enhanced patient activity record."""
    patient_id: str
    activity_type: str = Field(..., pattern=r'^(appointment|report|prescription|message|login|profile_update)$')
    activity_description: str
    activity_date: datetime = Field(default_factory=datetime.utcnow)
    performed_by: Optional[str] = None
    clinic_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PatientStats(BaseModel):
    """Enhanced patient statistics summary."""
    patient_id: str
    clinic_id: str
    total_appointments: int = 0
    completed_appointments: int = 0
    cancelled_appointments: int = 0
    total_reports: int = 0
    total_prescriptions: int = 0
    active_prescriptions: int = 0
    total_visits_this_year: int = 0
    last_appointment_date: Optional[datetime] = None
    last_report_date: Optional[datetime] = None
    average_appointment_duration: Optional[float] = None
    patient_satisfaction_rating: Optional[float] = None

# ============================= Enhanced Patient Search and Filtering =============================

class PatientSearchFilter(BaseModel):
    """Enhanced patient search filter parameters."""
    query: Optional[str] = Field(None, min_length=2, max_length=100, description="Search in name, code, email, phone")
    gender: Optional[Gender] = None
    age_min: Optional[int] = Field(None, ge=0, le=150)
    age_max: Optional[int] = Field(None, ge=0, le=150)
    has_active_prescriptions: Optional[bool] = None
    has_insurance: Optional[bool] = None
    registration_date_from: Optional[date] = None
    registration_date_to: Optional[date] = None
    last_visit_from: Optional[date] = None
    last_visit_to: Optional[date] = None
    clinic_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r'^(active|inactive|suspended)$')
    
    @validator('age_max')
    def validate_age_range(cls, v, values):
        if v and values.get('age_min') and v < values['age_min']:
            raise ValueError('Maximum age must be greater than minimum age')
        return v

class DuplicateCheckRequest(BaseModel):
    """Enhanced duplicate check request."""
    first_name: str
    last_name: str
    date_of_birth: date
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    pinfl: Optional[str] = None
    clinic_id: str

class DuplicateCheckResponse(BaseModel):
    """Enhanced duplicate check response."""
    has_potential_duplicates: bool
    potential_duplicates: List[PatientSummary] = Field(default_factory=list)
    confidence_scores: List[float] = Field(default_factory=list)
    match_reasons: List[List[str]] = Field(default_factory=list)
    recommended_action: str = Field("review", pattern=r'^(create|review|merge|reject)$')

# ============================= Enhanced Response Models =============================

class PatientResponse(BaseModel):
    """Enhanced standard patient response wrapper."""
    patient: Patient
    stats: Optional[PatientStats] = None
    recent_activity: Optional[List[PatientActivity]] = None
    medical_records: Optional[List[PatientMedicalRecord]] = None
    vitals_history: Optional[List[PatientVitalSigns]] = None
    immunizations: Optional[List[PatientImmunization]] = None

class PatientListResponse(BaseModel):
    """Enhanced patient list response."""
    patients: List[PatientListItem]
    total: int
    page: int
    size: int
    filters_applied: Optional[PatientSearchFilter] = None
    clinic_id: str

class PatientSearchResponse(BaseModel):
    """Enhanced patient search response."""
    results: List[PatientSearchResult]
    total: int
    query: str
    search_time_ms: int
    suggestions: Optional[List[str]] = None

# ============================= Enhanced FHIR Integration Models =============================

class FHIRPatientMapping(BaseModel):
    """Enhanced FHIR Patient resource mapping."""
    fhir_id: str
    local_patient_id: str
    fhir_version_id: str
    last_sync: datetime
    sync_status: str = Field("synced", pattern=r'^(synced|pending|failed|conflict)$')
    clinic_id: str
    sync_errors: Optional[List[str]] = None

class FHIRCoverageMapping(BaseModel):
    """Enhanced FHIR Coverage resource mapping."""
    fhir_id: str
    local_patient_id: str
    coverage_type: str
    policy_number: str
    last_sync: datetime
    sync_status: str = Field("synced", pattern=r'^(synced|pending|failed|conflict)$')

class FHIRRelatedPersonMapping(BaseModel):
    """Enhanced FHIR RelatedPerson resource mapping."""
    fhir_id: str
    local_patient_id: str
    relationship_type: str
    contact_name: str
    contact_phone: str
    last_sync: datetime
    sync_status: str = Field("synced", pattern=r'^(synced|pending|failed|conflict)$')

# ============================= Enhanced Export and Import Models =============================

class PatientExportRequest(BaseModel):
    """Enhanced patient export request."""
    patient_ids: Optional[List[str]] = None
    clinic_id: Optional[str] = None
    export_format: str = Field("json", pattern=r'^(json|csv|xml|fhir)$')
    include_medical_records: bool = False
    include_vitals: bool = False
    include_prescriptions: bool = False
    date_range: Optional[Dict[str, date]] = None
    fields: Optional[List[str]] = None

class PatientImportRequest(BaseModel):
    """Enhanced patient import request."""
    file_url: str
    import_format: str = Field("json", pattern=r'^(json|csv|xml|fhir)$')
    clinic_id: str
    create_fhir_resources: bool = True
    validate_duplicates: bool = True
    overwrite_existing: bool = False

class PatientBulkUpdateRequest(BaseModel):
    """Enhanced patient bulk update request."""
    patient_ids: List[str]
    updates: Dict[str, Any]
    clinic_id: str
    reason: str
    notify_patients: bool = False

# ============================= Enhanced Legacy Compatibility Models =============================

class LegacyPatient(BaseModel):
    """Enhanced legacy patient model for backward compatibility."""
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
    clinicId: Optional[str] = None
    fhirId: Optional[str] = None
    
    @classmethod
    def from_patient(cls, patient: Patient) -> "LegacyPatient":
        """Convert enhanced Patient model to legacy format."""
        return cls(
            id=patient.id,
            name=f"{patient.first_name} {patient.last_name}",
            gender=patient.gender.value,
            dob=patient.date_of_birth.isoformat(),
            age=patient.age,
            height=str(patient.current_vitals.height) if patient.current_vitals and patient.current_vitals.height else None,
            weight=str(patient.current_vitals.weight) if patient.current_vitals and patient.current_vitals.weight else None,
            bmi=str(patient.current_vitals.bmi) if patient.current_vitals and patient.current_vitals.bmi else None,
            temperature=str(patient.current_vitals.temperature) if patient.current_vitals and patient.current_vitals.temperature else None,
            bloodPressure=f"{patient.current_vitals.systolic_bp}/{patient.current_vitals.diastolic_bp}" if patient.current_vitals and patient.current_vitals.systolic_bp and patient.current_vitals.diastolic_bp else None,
            phoneNumber=patient.phone,
            emailAddress=patient.email,
            address=patient.address.street if patient.address else None,
            clinicId=patient.clinic_id,
            fhirId=patient.fhir_id
        )
