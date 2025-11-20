"""Enhanced Patient portal profile schemas for surgical edits integration."""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Enhanced Patient Profile Schemas
# ================================

class GenderEnum(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"

class MaritalStatusEnum(str, Enum):
    SINGLE = "Single"
    MARRIED = "Married"
    DIVORCED = "Divorced"
    WIDOWED = "Widowed"

class LanguageEnum(str, Enum):
    ENGLISH = "en"
    UZBEK = "uz"
    RUSSIAN = "ru"

class VitalStat(BaseModel):
    """Enhanced vital sign record."""
    code: str = Field(..., description="Vital sign code e.g. 'weight'")
    value: str = Field(..., description="Vital sign value e.g. '70 kg'")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    date: str = Field(..., description="Date of measurement YYYY-MM-DD")
    fhir_observation_id: Optional[str] = Field(None, description="FHIR Observation ID")
    measured_by: Optional[str] = Field(None, description="Who measured the vital")
    clinic_id: Optional[str] = Field(None, description="Clinic where measured")

class ImmunizationRec(BaseModel):
    """Enhanced immunization record."""
    vaccine: str = Field(..., description="Vaccine name")
    date: str = Field(..., description="Immunization date YYYY-MM-DD")
    status: str = Field(..., description="Status: Completed | Due | Overdue")
    lot_number: Optional[str] = Field(None, description="Vaccine lot number")
    manufacturer: Optional[str] = Field(None, description="Vaccine manufacturer")
    fhir_immunization_id: Optional[str] = Field(None, description="FHIR Immunization ID")
    clinic_id: Optional[str] = Field(None, description="Clinic where administered")

class InsuranceInfo(BaseModel):
    """Enhanced insurance information."""
    provider: str = Field(..., description="Insurance provider")
    policy_number: str = Field(..., description="Policy number")
    group_number: Optional[str] = Field(None, description="Group number")
    coverage_type: str = Field(..., description="Coverage type")
    valid_until: Optional[str] = Field(None, description="Coverage end date YYYY-MM-DD")
    is_active: bool = Field(True, description="Is insurance active")
    fhir_coverage_id: Optional[str] = Field(None, description="FHIR Coverage ID")
    clinic_id: Optional[str] = Field(None, description="Clinic ID")

class EmergencyContact(BaseModel):
    """Enhanced emergency contact information."""
    name: str = Field(..., description="Contact name")
    relationship: str = Field(..., description="Relationship to patient")
    phone: str = Field(..., description="Contact phone number")
    email: Optional[str] = Field(None, description="Contact email")
    address: Optional[str] = Field(None, description="Contact address")
    fhir_related_person_id: Optional[str] = Field(None, description="FHIR RelatedPerson ID")

class ProfileOut(BaseModel):
    """Enhanced patient profile response."""
    # Demographics
    full_name: str = Field(..., description="Full name")
    email: Optional[str] = Field(None, description="Email address")
    phone: str = Field(..., description="Phone number")
    date_of_birth: str = Field(..., description="Date of birth YYYY-MM-DD")
    gender: str = Field(..., description="Gender")
    address: Optional[str] = Field(None, description="Address")
    pinfl: str = Field(..., description="Personal identification number")
    
    # Enhanced demographics
    nationality: Optional[str] = Field(None, description="Nationality")
    marital_status: Optional[str] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, description="Occupation")
    preferred_language: str = Field(..., description="Preferred language")
    
    # Medical information
    blood_type: Optional[str] = Field(None, description="Blood type")
    height: Optional[float] = Field(None, description="Height in cm")
    weight: Optional[float] = Field(None, description="Weight in kg")
    blood_group: Optional[str] = Field(None, description="Blood group")
    blood_pressure_systolic: Optional[int] = Field(None, description="Systolic blood pressure")
    blood_pressure_diastolic: Optional[int] = Field(None, description="Diastolic blood pressure")
    bmi: Optional[float] = Field(None, description="Body Mass Index")
    allergies: List[str] = Field(default_factory=list, description="Known allergies")
    chronic_conditions: List[str] = Field(default_factory=list, description="Chronic conditions")
    medications: List[str] = Field(default_factory=list, description="Current medications")
    
    # Vital signs
    vitals: List[VitalStat] = Field(default_factory=list, description="Recent vital signs")
    
    # Immunizations
    immunizations: List[ImmunizationRec] = Field(default_factory=list, description="Immunization records")
    
    # Insurance
    insurance: Optional[InsuranceInfo] = Field(None, description="Insurance information")
    
    # Emergency contact
    emergency_contact: Optional[EmergencyContact] = Field(None, description="Emergency contact")
    
    # FHIR integration
    fhir_patient_id: Optional[str] = Field(None, description="FHIR Patient ID")
    
    # System fields
    clinic_id: str = Field(..., description="Clinic ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    last_login: Optional[str] = Field(None, description="Last login timestamp")

class ProfileUpdateRequest(BaseModel):
    """Enhanced profile update request."""
    # Basic information
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Updated full name")
    email: Optional[EmailStr] = Field(None, description="Updated email address")
    phone: Optional[str] = Field(None, min_length=10, max_length=20, description="Updated phone number")
    address: Optional[str] = Field(None, max_length=200, description="Updated address")
    
    # Enhanced demographics
    nationality: Optional[str] = Field(None, max_length=50, description="Updated nationality")
    marital_status: Optional[MaritalStatusEnum] = Field(None, description="Updated marital status")
    occupation: Optional[str] = Field(None, max_length=100, description="Updated occupation")
    preferred_language: Optional[LanguageEnum] = Field(None, description="Updated preferred language")
    
    # Medical information
    blood_type: Optional[str] = Field(None, max_length=10, description="Updated blood type")
    allergies: Optional[List[str]] = Field(None, description="Updated allergies list")
    chronic_conditions: Optional[List[str]] = Field(None, description="Updated chronic conditions")
    
    # Emergency contact updates
    emergency_contact_name: Optional[str] = Field(None, max_length=100, description="Updated emergency contact name")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Updated emergency contact phone")
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50, description="Updated emergency contact relationship")
    emergency_contact_email: Optional[EmailStr] = Field(None, description="Updated emergency contact email")
    emergency_contact_address: Optional[str] = Field(None, max_length=200, description="Updated emergency contact address")

class VitalSignsRequest(BaseModel):
    """Add vital signs request."""
    vitals: List[Dict[str, Any]] = Field(..., description="List of vital signs to add")
    measured_by: Optional[str] = Field(None, description="Who measured the vitals")
    clinic_id: Optional[str] = Field(None, description="Clinic where measured")

class AllergyUpdateRequest(BaseModel):
    """Update allergies request."""
    allergies: List[str] = Field(..., description="Updated allergies list")
    add_allergy: Optional[str] = Field(None, description="New allergy to add")
    remove_allergy: Optional[str] = Field(None, description="Allergy to remove")

class ChronicConditionUpdateRequest(BaseModel):
    """Update chronic conditions request."""
    chronic_conditions: List[str] = Field(..., description="Updated chronic conditions list")
    add_condition: Optional[str] = Field(None, description="New condition to add")
    remove_condition: Optional[str] = Field(None, description="Condition to remove")

class ProfileStats(BaseModel):
    """Enhanced profile statistics."""
    total_vitals: int = Field(..., description="Total vital sign records")
    vitals_this_month: int = Field(..., description="Vital signs recorded this month")
    total_immunizations: int = Field(..., description="Total immunizations")
    upcoming_immunizations: int = Field(..., description="Upcoming immunizations")
    active_medications: int = Field(..., description="Active medications")
    known_allergies: int = Field(..., description="Known allergies")
    chronic_conditions: int = Field(..., description="Chronic conditions")
    last_vital_date: Optional[str] = Field(None, description="Last vital sign date")
    last_immunization_date: Optional[str] = Field(None, description="Last immunization date")
    clinic_id: str = Field(..., description="Clinic ID")

class ProfileExportRequest(BaseModel):
    """Profile export request."""
    format: str = Field("json", pattern=r'^(json|pdf|csv)$', description="Export format")
    include_vitals: bool = Field(True, description="Include vital signs")
    include_immunizations: bool = Field(True, description="Include immunizations")
    include_insurance: bool = Field(True, description="Include insurance information")
    date_from: Optional[str] = Field(None, description="Export from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Export to date YYYY-MM-DD")

class ProfileExportResponse(BaseModel):
    """Profile export response."""
    export_id: str = Field(..., description="Export job ID")
    format: str = Field(..., description="Export format")
    file_url: str = Field(..., description="Download URL")
    expires_at: str = Field(..., description="Export expiration date")
    created_at: str = Field(..., description="Export creation date")
    record_count: int = Field(..., description="Number of records exported")

# ================================
# Enhanced Validators
# ================================

@validator('phone')
def validate_phone_number(cls, v):
    """Validate phone number format."""
    if v:
        # Remove any spaces, dashes, or parentheses
        v = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not v.isdigit():
            raise ValueError('Phone number must contain only digits')
        if len(v) < 10 or len(v) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
    return v

@validator('date_of_birth')
def validate_date_of_birth(cls, v):
    """Validate date of birth format and not in future."""
    if v:
        try:
            # Parse date to validate format
            parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
            if parsed_date > date.today():
                raise ValueError('Date of birth cannot be in the future')
            if parsed_date < date(1900, 1, 1):
                raise ValueError('Date of birth cannot be before 1900')
        except ValueError as e:
            if 'time data' in str(e):
                raise ValueError('Date of birth must be in YYYY-MM-DD format')
            raise e
    return v

@validator('vitals')
def validate_vitals(cls, v):
    """Validate vital signs data."""
    if v:
        for vital in v:
            if not isinstance(vital, dict):
                raise ValueError('Each vital sign must be a dictionary')
            required_fields = ['code', 'value', 'date']
            for field in required_fields:
                if field not in vital:
                    raise ValueError(f'Vital sign missing required field: {field}')
    return v

@validator('allergies', 'chronic_conditions')
def validate_medical_lists(cls, v):
    """Validate medical lists."""
    if v:
        for item in v:
            if not isinstance(item, str):
                raise ValueError('All items must be strings')
            if len(item.strip()) == 0:
                raise ValueError('Items cannot be empty')
    return v

# Apply validators to relevant classes (disabled for Pydantic v2 compatibility)

# ================================
# Additional Patient Portal Schemas (merged)
# ================================

class PatientSettings(BaseModel):
    id: str = Field(..., description="Patient ID")
    patient_id: str = Field(..., description="Patient ID")
    fhir_token: Optional[str] = Field(None, description="FHIR token")
    notifications_enabled: bool = Field(True, description="Notifications enabled")
    email_notifications: bool = Field(True, description="Email notifications")
    sms_notifications: bool = Field(False, description="SMS notifications")
    appointment_reminders: bool = Field(True, description="Appointment reminders")
    medication_reminders: bool = Field(True, description="Medication reminders")
    language: str = Field("en", description="Preferred language")
    timezone: str = Field("Asia/Tashkent", description="Timezone")


class PatientProfile(BaseModel):
    id: str = Field(..., description="Patient ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    date_of_birth: Optional[str] = Field(None, description="Date of birth")
    gender: Optional[str] = Field(None, description="Gender")
    address: Optional[str] = Field(None, description="Address")
    emergency_contact: Optional[str] = Field(None, description="Emergency contact")
    insurance_number: Optional[str] = Field(None, description="Insurance number")
    created_at: str = Field(..., description="Created timestamp")


class PatientAppointment(BaseModel):
    id: str = Field(..., description="Appointment ID")
    date: str = Field(..., description="Appointment date")
    time: str = Field(..., description="Appointment time")
    doctor_name: str = Field(..., description="Doctor name")
    doctor_specialty: Optional[str] = Field(None, description="Doctor specialty")
    clinic_name: Optional[str] = Field(None, description="Clinic name")
    status: str = Field(..., description="Appointment status")
    reason: Optional[str] = Field(None, description="Appointment reason")
    notes: Optional[str] = Field(None, description="Appointment notes")


class AppointmentCreate(BaseModel):
    hospital: str
    appointmentDate: str        # "YYYY-MM-DD"
    appointmentTime: str        # "HH:MM"
    appointmentType: str        # free-text label
    additionalNote: Optional[str] = None
    doctor_id: Optional[str] = None   # optional Practitioner.id selected in modal


class AppointmentRow(BaseModel):
    id: str
    date: str                   # "DD.MM.YYYY"
    time: str                   # "HH:MM"
    daysUntil: Optional[int]    # present for upcoming records
    description: str
    hospital: str
    room: Optional[str]
    type: str                   # same label we stored


class AppointmentPatch(BaseModel):
    status: Optional[str] = Field(None, pattern=r'^(cancelled|noshow)$')
    appointmentDate: Optional[str] = None
    appointmentTime: Optional[str] = None
    additionalNote: Optional[str] = None


class AppointmentRequest(BaseModel):
    doctor_id: str = Field(..., description="Doctor ID")
    patient_id: str = Field(..., description="Patient ID")
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    appointment_time: str = Field(..., description="Appointment time HH:MM")
    appointment_type: str = Field(..., description="Appointment type")
    additional_note: Optional[str] = Field(None, description="Additional notes")


class Notifications(BaseModel):
    enabled: bool = True
    emailNotifications: bool = True
    reminderTiming: str = Field("24hours", pattern=r"\d+hours?")
    _id: Optional[str] = None


class Privacy(BaseModel):
    allowResearch: bool = False
    shareHealthData: bool = True
    _id: Optional[str] = None


class Preferences(BaseModel):
    language: str = "en"


class SettingsBlob(BaseModel):
    notifications: Optional[Notifications]
    privacy: Optional[Privacy]
    preferences: Optional[Preferences]


# ----------------------
# Export/Erase Schemas
# ----------------------
from typing import List as _List


class FHIRExportRequest(BaseModel):
    resource_types: _List[str] = Field(..., description="FHIR resource types to export")
    format: str = Field("json", description="Export format: json, xml, ndjson")
    since: Optional[str] = Field(None, description="Export resources modified since this date")
    patient_id: str = Field(..., description="Patient ID for export")


class FHIREraseRequest(BaseModel):
    resource_types: _List[str] = Field(..., description="FHIR resource types to erase")
    patient_id: str = Field(..., description="Patient ID for erase")
    confirmation_code: str = Field(..., description="Confirmation code from email/SMS")


class FHIRExportResult(BaseModel):
    export_id: str = Field(..., description="Export job ID")
    status: str = Field(..., description="Export status: pending, in_progress, completed, failed")
    resource_types: _List[str] = Field(..., description="Resource types being exported")
    format: str = Field(..., description="Export format")
    file_url: Optional[str] = Field(None, description="Download URL for completed export")
    expires_at: Optional[str] = Field(None, description="Export file expiration date")
    created_at: str = Field(..., description="Export creation date")


class FHIREraseResult(BaseModel):
    erase_id: str = Field(..., description="Erase job ID")
    status: str = Field(..., description="Erase status: pending, in_progress, completed, failed")
    resource_types: _List[str] = Field(..., description="Resource types being erased")
    resources_erased: int = Field(..., description="Number of resources erased")
    created_at: str = Field(..., description="Erase creation date")


class ConfirmationCodeRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    operation: str = Field(..., description="Operation: export, erase")
    delivery_method: str = Field(..., description="Delivery method: email, sms")


class ConfirmationCodeResult(BaseModel):
    confirmation_id: str = Field(..., description="Confirmation code ID")
    expires_at: str = Field(..., description="Confirmation code expiration date")
    delivery_method: str = Field(..., description="Delivery method used")