"""Enhanced Patient portal doctor search schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced Doctor Search Schemas
# ================================

class SpecialtyEnum(str, Enum):
    GENERAL_MEDICINE = "general_medicine"
    CARDIOLOGY = "cardiology"
    DERMATOLOGY = "dermatology"
    ENDOCRINOLOGY = "endocrinology"
    GASTROENTEROLOGY = "gastroenterology"
    HEMATOLOGY = "hematology"
    INFECTIOUS_DISEASE = "infectious_disease"
    NEPHROLOGY = "nephrology"
    NEUROLOGY = "neurology"
    ONCOLOGY = "oncology"
    PEDIATRICS = "pediatrics"
    PSYCHIATRY = "psychiatry"
    PULMONOLOGY = "pulmonology"
    RADIOLOGY = "radiology"
    SURGERY = "surgery"
    UROLOGY = "urology"
    GYNECOLOGY = "gynecology"
    OPHTHALMOLOGY = "ophthalmology"
    OTOLARYNGOLOGY = "otolaryngology"
    ORTHOPEDICS = "orthopedics"

class AvailabilityStatusEnum(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ON_BREAK = "on_break"

class DoctorSearchRequest(BaseModel):
    """Enhanced doctor search request."""
    specialty: Optional[SpecialtyEnum] = Field(None, description="Filter by medical specialty")
    location: Optional[str] = Field(None, min_length=2, description="Filter by location")
    clinic_id: Optional[str] = Field(None, description="Filter by specific clinic")
    availability: Optional[AvailabilityStatusEnum] = Field(None, description="Filter by availability status")
    rating_min: Optional[float] = Field(None, ge=1.0, le=5.0, description="Minimum rating")
    experience_years_min: Optional[int] = Field(None, ge=0, description="Minimum years of experience")
    languages: Optional[List[str]] = Field(None, description="Filter by spoken languages")
    insurance_accepted: Optional[List[str]] = Field(None, description="Filter by accepted insurance")
    virtual_consultation: Optional[bool] = Field(None, description="Filter by virtual consultation availability")
    emergency_available: Optional[bool] = Field(None, description="Filter by emergency availability")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search by doctor name or specialty")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("rating", pattern=r'^(rating|experience|name|availability|distance)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class DoctorSummary(BaseModel):
    """Enhanced doctor summary."""
    id: str = Field(..., description="Doctor ID")
    name: str = Field(..., description="Doctor name")
    specialty: str = Field(..., description="Medical specialty")
    title: Optional[str] = Field(None, description="Professional title")
    experience_years: int = Field(..., description="Years of experience")
    rating: float = Field(..., ge=1.0, le=5.0, description="Average rating")
    review_count: int = Field(..., description="Number of reviews")
    location: str = Field(..., description="Location")
    clinic_name: str = Field(..., description="Clinic name")
    clinic_id: str = Field(..., description="Clinic ID")
    availability_status: str = Field(..., description="Current availability status")
    next_available: Optional[str] = Field(None, description="Next available appointment")
    languages: List[str] = Field(default_factory=list, description="Spoken languages")
    insurance_accepted: List[str] = Field(default_factory=list, description="Accepted insurance")
    virtual_consultation: bool = Field(False, description="Virtual consultation available")
    emergency_available: bool = Field(False, description="Emergency availability")
    consultation_fee: Optional[str] = Field(None, description="Consultation fee")
    fhir_practitioner_id: Optional[str] = Field(None, description="FHIR Practitioner ID")
    fhir_practitioner_role_id: Optional[str] = Field(None, description="FHIR PractitionerRole ID")

class DoctorDetail(BaseModel):
    """Enhanced doctor detail."""
    id: str = Field(..., description="Doctor ID")
    name: str = Field(..., description="Doctor name")
    specialty: str = Field(..., description="Medical specialty")
    title: Optional[str] = Field(None, description="Professional title")
    experience_years: int = Field(..., description="Years of experience")
    rating: float = Field(..., ge=1.0, le=5.0, description="Average rating")
    review_count: int = Field(..., description="Number of reviews")
    location: str = Field(..., description="Location")
    clinic_name: str = Field(..., description="Clinic name")
    clinic_id: str = Field(..., description="Clinic ID")
    availability_status: str = Field(..., description="Current availability status")
    next_available: Optional[str] = Field(None, description="Next available appointment")
    languages: List[str] = Field(default_factory=list, description="Spoken languages")
    insurance_accepted: List[str] = Field(default_factory=list, description="Accepted insurance")
    virtual_consultation: bool = Field(False, description="Virtual consultation available")
    emergency_available: bool = Field(False, description="Emergency availability")
    consultation_fee: Optional[str] = Field(None, description="Consultation fee")
    
    # Detailed information
    education: List[str] = Field(default_factory=list, description="Educational background")
    certifications: List[str] = Field(default_factory=list, description="Professional certifications")
    awards: List[str] = Field(default_factory=list, description="Awards and recognitions")
    publications: List[str] = Field(default_factory=list, description="Publications")
    bio: Optional[str] = Field(None, description="Professional biography")
    photo_url: Optional[str] = Field(None, description="Doctor photo URL")
    
    # Contact information
    phone: Optional[str] = Field(None, description="Contact phone")
    email: Optional[str] = Field(None, description="Contact email")
    website: Optional[str] = Field(None, description="Professional website")
    
    # Availability
    working_hours: Dict[str, str] = Field(default_factory=dict, description="Working hours by day")
    emergency_hours: Optional[str] = Field(None, description="Emergency availability hours")
    
    # FHIR integration
    fhir_practitioner_id: Optional[str] = Field(None, description="FHIR Practitioner ID")
    fhir_practitioner_role_id: Optional[str] = Field(None, description="FHIR PractitionerRole ID")
    
    # System fields
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class DoctorSearchResponse(BaseModel):
    """Enhanced doctor search response."""
    doctors: List[DoctorSummary] = Field(..., description="List of doctors")
    total: int = Field(..., description="Total number of doctors")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")
    search_facets: Dict[str, Any] = Field(default_factory=dict, description="Search facets for filtering")

class SearchFacets(BaseModel):
    """Enhanced search facets."""
    specialties: List[Dict[str, Any]] = Field(default_factory=list, description="Available specialties")
    locations: List[Dict[str, Any]] = Field(default_factory=list, description="Available locations")
    clinics: List[Dict[str, Any]] = Field(default_factory=list, description="Available clinics")
    languages: List[str] = Field(default_factory=list, description="Available languages")
    insurance_providers: List[str] = Field(default_factory=list, description="Available insurance providers")
    experience_ranges: List[Dict[str, Any]] = Field(default_factory=list, description="Experience ranges")
    rating_ranges: List[Dict[str, Any]] = Field(default_factory=list, description="Rating ranges")

class DoctorAvailabilityRequest(BaseModel):
    """Doctor availability check request."""
    doctor_id: str = Field(..., description="Doctor ID")
    date: str = Field(..., description="Date to check availability YYYY-MM-DD")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class DoctorAvailabilityResponse(BaseModel):
    """Doctor availability response."""
    doctor_id: str = Field(..., description="Doctor ID")
    date: str = Field(..., description="Date checked")
    available_slots: List[Dict[str, Any]] = Field(default_factory=list, description="Available time slots")
    is_available: bool = Field(..., description="Is doctor available on this date")
    next_available_date: Optional[str] = Field(None, description="Next available date")
    clinic_id: str = Field(..., description="Clinic ID")

class DoctorReview(BaseModel):
    """Enhanced doctor review."""
    id: str = Field(..., description="Review ID")
    doctor_id: str = Field(..., description="Doctor ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name (anonymized)")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    title: Optional[str] = Field(None, description="Review title")
    comment: Optional[str] = Field(None, description="Review comment")
    visit_date: str = Field(..., description="Visit date")
    clinic_id: str = Field(..., description="Clinic ID")
    created_at: str = Field(..., description="Review creation date")
    updated_at: str = Field(..., description="Review last update date")

class DoctorStats(BaseModel):
    """Enhanced doctor statistics."""
    total_doctors: int = Field(..., description="Total doctors")
    doctors_by_specialty: Dict[str, int] = Field(..., description="Doctors count by specialty")
    doctors_by_location: Dict[str, int] = Field(..., description="Doctors count by location")
    average_rating: float = Field(..., description="Average rating across all doctors")
    doctors_with_virtual_consultation: int = Field(..., description="Doctors with virtual consultation")
    doctors_available_emergency: int = Field(..., description="Doctors available for emergency")
    most_popular_specialties: List[Dict[str, Any]] = Field(default_factory=list, description="Most popular specialties")
    clinic_id: str = Field(..., description="Clinic ID")

class FavoriteDoctorRequest(BaseModel):
    """Add doctor to favorites request."""
    doctor_id: str = Field(..., description="Doctor ID to add to favorites")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class FavoriteDoctorResponse(BaseModel):
    """Favorite doctor response."""
    doctor_id: str = Field(..., description="Doctor ID")
    added_at: str = Field(..., description="Added to favorites date")
    is_favorite: bool = Field(True, description="Is doctor in favorites")

class FavoriteDoctorsList(BaseModel):
    """Favorite doctors list."""
    favorite_doctors: List[DoctorSummary] = Field(..., description="List of favorite doctors")
    total: int = Field(..., description="Total number of favorite doctors")

# ================================
# Enhanced Validators
# ================================

@validator('search_query')
def validate_search_query(cls, v):
    """Validate search query."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Search query must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Search query cannot exceed 100 characters')
    return v

@validator('location')
def validate_location(cls, v):
    """Validate location."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Location must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Location cannot exceed 100 characters')
    return v

@validator('languages')
def validate_languages(cls, v):
    """Validate languages list."""
    if v:
        for language in v:
            if not isinstance(language, str):
                raise ValueError('All languages must be strings')
            if len(language.strip()) == 0:
                raise ValueError('Language names cannot be empty')
    return v

@validator('insurance_accepted')
def validate_insurance_accepted(cls, v):
    """Validate insurance accepted list."""
    if v:
        for insurance in v:
            if not isinstance(insurance, str):
                raise ValueError('All insurance providers must be strings')
            if len(insurance.strip()) == 0:
                raise ValueError('Insurance provider names cannot be empty')
    return v

@validator('date')
def validate_date(cls, v):
    """Validate date format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    return v

@validator('rating')
def validate_rating(cls, v):
    """Validate rating range."""
    if v is not None:
        if v < 1.0 or v > 5.0:
            raise ValueError('Rating must be between 1.0 and 5.0')
    return v

@validator('experience_years')
def validate_experience_years(cls, v):
    """Validate experience years."""
    if v is not None:
        if v < 0:
            raise ValueError('Experience years cannot be negative')
        if v > 50:
            raise ValueError('Experience years cannot exceed 50')
    return v

# Apply validators to relevant classes
pass
