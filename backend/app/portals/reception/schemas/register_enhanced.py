"""Enhanced Reception portal patient registration schemas for surgical edits integration."""
from pydantic import BaseModel, Field, EmailStr, validator, root_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Enhanced Patient Registration Schemas
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

class InsuranceTypeEnum(str, Enum):
    PRIVATE = "private"
    GOVERNMENT = "government"
    EMPLOYER = "employer"
    SELF_PAY = "self_pay"

class PatientRegisterRequest(BaseModel):
    """Enhanced patient registration request."""
    # Basic information
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name")
    date_of_birth: str = Field(..., description="Date of birth YYYY-MM-DD")
    gender: GenderEnum = Field(..., description="Gender")
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20, description="Phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")
    address: Optional[str] = Field(None, max_length=200, description="Address")
    pinfl: str = Field(..., min_length=14, max_length=14, description="Personal identification number")
    
    # Enhanced fields
    nationality: Optional[str] = Field(None, max_length=50, description="Nationality")
    marital_status: Optional[MaritalStatusEnum] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, max_length=100, description="Occupation")
    preferred_language: LanguageEnum = Field(LanguageEnum.ENGLISH, description="Preferred language")
    
    # Insurance information
    insurance_provider: Optional[str] = Field(None, max_length=100, description="Insurance provider")
    insurance_id: Optional[str] = Field(None, max_length=50, description="Insurance ID")
    insurance_type: Optional[InsuranceTypeEnum] = Field(None, description="Insurance type")
    insurance_start_date: Optional[str] = Field(None, description="Insurance start date YYYY-MM-DD")
    insurance_end_date: Optional[str] = Field(None, description="Insurance end date YYYY-MM-DD")
    
    # Emergency contact
    emergency_contact_name: Optional[str] = Field(None, max_length=100, description="Emergency contact name")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Emergency contact phone")
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50, description="Emergency contact relationship")
    
    # Clinic scoping
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Additional notes
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

    @validator('pinfl')
    def _validate_pinfl(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '')
            if len(v) != 14:
                raise ValueError('PINFL must be exactly 14 digits')
            if not v.isdigit():
                raise ValueError('PINFL must contain only digits')
        return v

    @validator('phone_number')
    def _validate_phone(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if not v.isdigit():
                raise ValueError('Phone number must contain only digits')
            if len(v) < 10 or len(v) > 15:
                raise ValueError('Phone number must be between 10 and 15 digits')
        return v
    
    @root_validator(skip_on_failure=True)
    def validate_contact_info(cls, values):
        """Ensure at least one of email or phone_number is provided."""
        email = values.get('email')
        phone_number = values.get('phone_number')
        
        # Normalize empty strings to None
        if email and isinstance(email, str) and email.strip() == '':
            email = None
        if phone_number and isinstance(phone_number, str) and phone_number.strip() == '':
            phone_number = None
        
        if not email and not phone_number:
            raise ValueError('Either email or phone number must be provided')
        
        return values

    @validator('date_of_birth')
    def _validate_dob(cls, v):
        if v:
            try:
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

    @validator('insurance_start_date', 'insurance_end_date')
    def _validate_ins_dates(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError('Insurance date must be in YYYY-MM-DD format')
        return v

class EmergencyContact(BaseModel):
    """Emergency contact information."""
    name: str = Field(..., min_length=2, max_length=100, description="Contact name")
    phone: str = Field(..., min_length=10, max_length=20, description="Contact phone")
    relationship: str = Field(..., min_length=2, max_length=50, description="Relationship to patient")
    address: Optional[str] = Field(None, max_length=200, description="Contact address")

class InsuranceInfo(BaseModel):
    """Insurance information."""
    provider: str = Field(..., min_length=2, max_length=100, description="Insurance provider")
    policy_id: str = Field(..., min_length=2, max_length=50, description="Insurance policy ID")
    insurance_type: InsuranceTypeEnum = Field(..., description="Insurance type")
    start_date: str = Field(..., description="Insurance start date YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="Insurance end date YYYY-MM-DD")
    is_active: bool = Field(True, description="Is insurance active")

class PatientResponse(BaseModel):
    """Enhanced patient response."""
    id: str = Field(..., description="Patient ID")
    patient_number: str = Field(..., description="Patient number")
    full_name: str = Field(..., description="Full name")
    date_of_birth: str = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender")
    phone_number: str = Field(..., description="Phone number")
    email: Optional[str] = Field(None, description="Email address")
    address: Optional[str] = Field(None, description="Address")
    pinfl: str = Field(..., description="Personal identification number")
    
    # Enhanced fields
    nationality: Optional[str] = Field(None, description="Nationality")
    marital_status: Optional[str] = Field(None, description="Marital status")
    occupation: Optional[str] = Field(None, description="Occupation")
    preferred_language: str = Field(..., description="Preferred language")
    
    # Insurance information
    insurance: Optional[InsuranceInfo] = Field(None, description="Insurance information")
    
    # Emergency contact
    emergency_contact: Optional[EmergencyContact] = Field(None, description="Emergency contact")
    
    # FHIR integration
    fhir_patient_id: Optional[str] = Field(None, description="FHIR Patient ID")
    fhir_coverage_id: Optional[str] = Field(None, description="FHIR Coverage ID")
    fhir_related_person_id: Optional[str] = Field(None, description="FHIR RelatedPerson ID")
    
    # System fields
    clinic_id: str = Field(..., description="Clinic ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the patient")
    
    # Additional notes
    notes: Optional[str] = Field(None, description="Additional notes")

class DuplicateCheckRequest(BaseModel):
    """Duplicate patient check request."""
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name")
    date_of_birth: str = Field(..., description="Date of birth YYYY-MM-DD")
    phone_number: str = Field(..., min_length=10, max_length=20, description="Phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")
    pinfl: Optional[str] = Field(None, min_length=14, max_length=14, description="Personal identification number")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

    @validator('pinfl')
    def _validate_dup_pinfl(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '')
            if len(v) != 14 or not v.isdigit():
                raise ValueError('PINFL must be exactly 14 digits')
        return v

    @validator('phone_number')
    def _validate_dup_phone(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if not v.isdigit() or len(v) < 10 or len(v) > 15:
                raise ValueError('Phone number must be 10-15 digits')
        return v

    @validator('date_of_birth')
    def _validate_dup_dob(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError('Date of birth must be in YYYY-MM-DD format')
        return v

class DuplicateCheckResponse(BaseModel):
    """Duplicate patient check response."""
    has_duplicates: bool = Field(..., description="Has potential duplicates")
    duplicates: List[Dict[str, Any]] = Field(default_factory=list, description="Potential duplicate patients")
    confidence_scores: List[float] = Field(default_factory=list, description="Confidence scores for duplicates")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")

class PatientSearchRequest(BaseModel):
    """Enhanced patient search request."""
    search_query: Optional[str] = Field(None, min_length=2, description="Search query")
    full_name: Optional[str] = Field(None, min_length=2, description="Filter by full name")
    phone_number: Optional[str] = Field(None, min_length=10, description="Filter by phone number")
    email: Optional[EmailStr] = Field(None, description="Filter by email")
    pinfl: Optional[str] = Field(None, min_length=14, max_length=14, description="Filter by PINFL")
    date_of_birth: Optional[str] = Field(None, description="Filter by date of birth YYYY-MM-DD")
    gender: Optional[GenderEnum] = Field(None, description="Filter by gender")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|full_name|date_of_birth)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

    @validator('pinfl')
    def _validate_search_pinfl(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '')
            if len(v) != 14 or not v.isdigit():
                raise ValueError('PINFL must be exactly 14 digits')
        return v

    @validator('phone_number')
    def _validate_search_phone(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if not v.isdigit() or len(v) < 10 or len(v) > 15:
                raise ValueError('Phone number must be 10-15 digits')
        return v

    @validator('date_of_birth')
    def _validate_search_dob(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError('Date of birth must be in YYYY-MM-DD format')
        return v

class PatientListResponse(BaseModel):
    """Enhanced patient list response."""
    patients: List[PatientResponse] = Field(..., description="List of patients")
    total: int = Field(..., description="Total number of patients")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class PatientUpdateRequest(BaseModel):
    """Enhanced patient update request."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Updated full name")
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20, description="Updated phone number")
    email: Optional[EmailStr] = Field(None, description="Updated email address")
    address: Optional[str] = Field(None, max_length=200, description="Updated address")
    nationality: Optional[str] = Field(None, max_length=50, description="Updated nationality")
    marital_status: Optional[MaritalStatusEnum] = Field(None, description="Updated marital status")
    occupation: Optional[str] = Field(None, max_length=100, description="Updated occupation")
    preferred_language: Optional[LanguageEnum] = Field(None, description="Updated preferred language")
    
    # Insurance updates
    insurance_provider: Optional[str] = Field(None, max_length=100, description="Updated insurance provider")
    insurance_id: Optional[str] = Field(None, max_length=50, description="Updated insurance ID")
    insurance_type: Optional[InsuranceTypeEnum] = Field(None, description="Updated insurance type")
    insurance_start_date: Optional[str] = Field(None, description="Updated insurance start date")
    insurance_end_date: Optional[str] = Field(None, description="Updated insurance end date")
    
    # Emergency contact updates
    emergency_contact_name: Optional[str] = Field(None, max_length=100, description="Updated emergency contact name")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Updated emergency contact phone")
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50, description="Updated emergency contact relationship")
    
    # Clinic scoping
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Additional notes
    notes: Optional[str] = Field(None, max_length=500, description="Updated notes")

    @validator('phone_number')
    def _validate_update_phone(cls, v):
        if v:
            v = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            if not v.isdigit() or len(v) < 10 or len(v) > 15:
                raise ValueError('Phone number must be 10-15 digits')
        return v

    @validator('insurance_start_date', 'insurance_end_date')
    def _validate_update_ins_dates(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError('Insurance date must be in YYYY-MM-DD format')
        return v

class PatientStats(BaseModel):
    """Enhanced patient statistics."""
    total_patients: int = Field(..., description="Total patients registered")
    patients_today: int = Field(..., description="Patients registered today")
    patients_this_week: int = Field(..., description="Patients registered this week")
    patients_this_month: int = Field(..., description="Patients registered this month")
    patients_by_gender: Dict[str, int] = Field(..., description="Patients count by gender")
    patients_by_age_group: Dict[str, int] = Field(..., description="Patients count by age group")
    patients_with_insurance: int = Field(..., description="Patients with insurance")
    patients_without_insurance: int = Field(..., description="Patients without insurance")
    clinic_id: str = Field(..., description="Clinic ID")

# ================================
# Enhanced Validators
# ================================

@validator('pinfl')
def validate_pinfl(cls, v):
    """Validate PINFL format."""
    if v:
        # Remove any spaces or dashes
        v = v.replace(' ', '').replace('-', '')
        if len(v) != 14:
            raise ValueError('PINFL must be exactly 14 digits')
        if not v.isdigit():
            raise ValueError('PINFL must contain only digits')
    return v

@validator('phone_number')
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

@validator('insurance_start_date', 'insurance_end_date')
def validate_insurance_dates(cls, v):
    """Validate insurance dates format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Insurance date must be in YYYY-MM-DD format')
    return v

# Validators moved into class methods for Pydantic v2 compatibility
