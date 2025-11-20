"""Enhanced Patient portal prescription schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Enhanced Prescription Schemas
# ================================

class PrescriptionStatusEnum(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"

class RefillStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskStatusEnum(str, Enum):
    DRAFT = "draft"
    REQUESTED = "requested"
    RECEIVED = "received"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    IN_PROGRESS = "in-progress"
    ON_HOLD = "on-hold"
    FAILED = "failed"
    COMPLETED = "completed"
    ENTERED_IN_ERROR = "entered-in-error"

class PrescriptionSummary(BaseModel):
    """Enhanced prescription summary."""
    id: str = Field(..., description="MedicationRequest ID")
    medicine_name: str = Field(..., description="Medicine name")
    known_as: Optional[str] = Field(None, description="Known as")
    description: Optional[str] = Field(None, description="Prescription description")
    prescribed_date: str = Field(..., description="Prescribed date DD.MM.YYYY")
    end_date: Optional[str] = Field(None, description="End date DD.MM.YYYY")
    prescribed_by: str = Field(..., description="Prescribed by doctor")
    hospital: Optional[str] = Field(None, description="Hospital/clinic")
    dosage: Optional[str] = Field(None, description="Dosage instructions")
    frequency: Optional[str] = Field(None, description="Frequency")
    status: PrescriptionStatusEnum = Field(..., description="Prescription status")
    remaining_refills: int = Field(..., description="Remaining refills")
    total_refills: int = Field(..., description="Total refills allowed")
    price: Optional[str] = Field(None, description="Price information")
    fhir_medication_request_id: Optional[str] = Field(None, description="FHIR MedicationRequest ID")
    clinic_id: str = Field(..., description="Clinic ID")
    patient_id: str = Field(..., description="Patient ID")

class RefillRequest(BaseModel):
    """Enhanced refill request."""
    pharmacy_id: Optional[str] = Field(None, description="Preferred pharmacy ID")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for refill")
    urgent: bool = Field(False, description="Is this an urgent refill request")
    quantity_requested: Optional[int] = Field(None, ge=1, description="Quantity requested")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

class RefillTaskStatus(BaseModel):
    """Enhanced refill task status."""
    task_id: str = Field(..., description="FHIR Task ID")
    status: TaskStatusEnum = Field(..., description="Task status")
    created_at: str = Field(..., description="Task creation date")
    updated_at: str = Field(..., description="Task last update date")
    assigned_to: Optional[str] = Field(None, description="Assigned to doctor/pharmacist")
    notes: Optional[str] = Field(None, description="Task notes")
    fhir_task_id: Optional[str] = Field(None, description="FHIR Task ID")

class PrescriptionDetail(BaseModel):
    """Enhanced prescription detail."""
    id: str = Field(..., description="MedicationRequest ID")
    medicine_name: str = Field(..., description="Medicine name")
    generic_name: Optional[str] = Field(None, description="Generic name")
    brand_name: Optional[str] = Field(None, description="Brand name")
    description: Optional[str] = Field(None, description="Prescription description")
    prescribed_date: str = Field(..., description="Prescribed date")
    end_date: Optional[str] = Field(None, description="End date")
    prescribed_by: str = Field(..., description="Prescribed by doctor")
    doctor_phone: Optional[str] = Field(None, description="Doctor phone number")
    hospital: Optional[str] = Field(None, description="Hospital/clinic")
    dosage: Optional[str] = Field(None, description="Dosage instructions")
    frequency: Optional[str] = Field(None, description="Frequency")
    route: Optional[str] = Field(None, description="Route of administration")
    duration: Optional[str] = Field(None, description="Duration of treatment")
    status: str = Field(..., description="Prescription status")
    remaining_refills: int = Field(..., description="Remaining refills")
    total_refills: int = Field(..., description="Total refills allowed")
    price: Optional[str] = Field(None, description="Price information")
    insurance_coverage: Optional[str] = Field(None, description="Insurance coverage")
    side_effects: List[str] = Field(default_factory=list, description="Known side effects")
    contraindications: List[str] = Field(default_factory=list, description="Contraindications")
    interactions: List[str] = Field(default_factory=list, description="Drug interactions")
    fhir_medication_request_id: Optional[str] = Field(None, description="FHIR MedicationRequest ID")
    clinic_id: str = Field(..., description="Clinic ID")
    patient_id: str = Field(..., description="Patient ID")

class PrescriptionListResponse(BaseModel):
    """Enhanced prescription list response."""
    prescriptions: List[PrescriptionSummary] = Field(..., description="List of prescriptions")
    total: int = Field(..., description="Total number of prescriptions")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class PrescriptionSearchRequest(BaseModel):
    """Enhanced prescription search request."""
    status: Optional[PrescriptionStatusEnum] = Field(None, description="Filter by status")
    medicine_name: Optional[str] = Field(None, min_length=2, description="Filter by medicine name")
    prescribed_by: Optional[str] = Field(None, description="Filter by prescribing doctor")
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    has_refills: Optional[bool] = Field(None, description="Filter by refill availability")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("prescribed_date", pattern=r'^(prescribed_date|end_date|medicine_name|status)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class RefillHistory(BaseModel):
    """Enhanced refill history."""
    refill_id: str = Field(..., description="Refill request ID")
    prescription_id: str = Field(..., description="Prescription ID")
    requested_date: str = Field(..., description="Refill request date")
    status: RefillStatusEnum = Field(..., description="Refill status")
    quantity_requested: int = Field(..., description="Quantity requested")
    quantity_dispensed: Optional[int] = Field(None, description="Quantity dispensed")
    pharmacy_name: Optional[str] = Field(None, description="Pharmacy name")
    pharmacist_name: Optional[str] = Field(None, description="Pharmacist name")
    notes: Optional[str] = Field(None, description="Refill notes")
    fhir_task_id: Optional[str] = Field(None, description="FHIR Task ID")

class PrescriptionStats(BaseModel):
    """Enhanced prescription statistics."""
    total_prescriptions: int = Field(..., description="Total prescriptions")
    active_prescriptions: int = Field(..., description="Active prescriptions")
    expired_prescriptions: int = Field(..., description="Expired prescriptions")
    completed_prescriptions: int = Field(..., description="Completed prescriptions")
    prescriptions_this_month: int = Field(..., description="Prescriptions this month")
    total_refills_used: int = Field(..., description="Total refills used")
    pending_refill_requests: int = Field(..., description="Pending refill requests")
    average_prescription_duration: float = Field(..., description="Average prescription duration in days")
    most_prescribed_medicine: Optional[str] = Field(None, description="Most prescribed medicine")
    clinic_id: str = Field(..., description="Clinic ID")
    patient_id: str = Field(..., description="Patient ID")

class MedicationInteractionCheck(BaseModel):
    """Medication interaction check request."""
    current_medications: List[str] = Field(..., description="Current medications")
    new_medication: str = Field(..., description="New medication to check")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class MedicationInteractionResponse(BaseModel):
    """Medication interaction response."""
    has_interactions: bool = Field(..., description="Has drug interactions")
    interactions: List[Dict[str, Any]] = Field(default_factory=list, description="Interaction details")
    severity_level: Optional[str] = Field(None, description="Severity level: minor|moderate|major|contraindicated")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")

class PrescriptionReminderRequest(BaseModel):
    """Prescription reminder request."""
    prescription_id: str = Field(..., description="Prescription ID")
    reminder_type: str = Field("medication", pattern=r'^(medication|refill|expiry)$', description="Reminder type")
    reminder_time: str = Field(..., description="Reminder time HH:MM")
    days_before: int = Field(0, ge=0, le=30, description="Days before to remind")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class PrescriptionReminderResponse(BaseModel):
    """Prescription reminder response."""
    reminder_id: str = Field(..., description="Reminder ID")
    prescription_id: str = Field(..., description="Prescription ID")
    reminder_type: str = Field(..., description="Reminder type")
    reminder_time: str = Field(..., description="Reminder time")
    is_active: bool = Field(True, description="Is reminder active")
    created_at: str = Field(..., description="Reminder creation date")

# ================================
# Enhanced Validators
# ================================

@validator('prescribed_date', 'end_date')
def validate_prescription_dates(cls, v):
    """Validate prescription dates format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Prescription date must be in YYYY-MM-DD format')
    return v

@validator('remaining_refills', 'total_refills')
def validate_refill_counts(cls, v):
    """Validate refill counts."""
    if v is not None:
        if v < 0:
            raise ValueError('Refill count cannot be negative')
        if v > 12:
            raise ValueError('Refill count cannot exceed 12')
    return v

@validator('quantity_requested')
def validate_quantity_requested(cls, v):
    """Validate quantity requested."""
    if v is not None:
        if v < 1:
            raise ValueError('Quantity requested must be at least 1')
        if v > 1000:
            raise ValueError('Quantity requested cannot exceed 1000')
    return v

@validator('current_medications')
def validate_current_medications(cls, v):
    """Validate current medications list."""
    if v:
        if len(v) == 0:
            raise ValueError('Current medications list cannot be empty')
        for medication in v:
            if not isinstance(medication, str):
                raise ValueError('All medications must be strings')
            if len(medication.strip()) == 0:
                raise ValueError('Medication names cannot be empty')
    return v

@validator('reminder_time')
def validate_reminder_time(cls, v):
    """Validate reminder time format."""
    if v:
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError('Reminder time must be in HH:MM format')
    return v

# Apply validators to relevant classes
pass
