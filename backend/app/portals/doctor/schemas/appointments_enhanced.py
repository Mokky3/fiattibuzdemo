"""Enhanced Doctor portal appointment schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum

# ================================
# Enhanced Appointment Schemas
# ================================

class AppointmentTypeEnum(str, Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    ROUTINE_CHECKUP = "routine_checkup"
    VACCINATION = "vaccination"
    PROCEDURE = "procedure"
    TELEMEDICINE = "telemedicine"

class AppointmentStatusEnum(str, Enum):
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

class PriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class AppointmentSummary(BaseModel):
    """Enhanced appointment summary for Doctor portal."""
    id: str = Field(..., description="Appointment ID")
    date: str = Field(..., description="Appointment date YYYY-MM-DD")
    time: str = Field(..., description="Appointment time HH:MM")
    patient_name: str = Field(..., description="Patient name")
    patient_id: str = Field(..., description="Patient ID")
    problem: Optional[str] = Field(None, description="Patient's problem")
    description: Optional[str] = Field(None, description="Appointment description")
    status: str = Field(..., description="Appointment status")
    formatted_date: str = Field(..., description="Formatted date DD.MM.YYYY")
    appointment_type: Optional[str] = Field(None, description="Appointment type")
    notes: Optional[str] = Field(None, description="Doctor notes")
    fhir_appointment_id: Optional[str] = Field(None, description="FHIR Appointment ID")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Doctor ID")

class AppointmentCreateRequest(BaseModel):
    """Enhanced appointment creation request."""
    patient_id: str = Field(..., description="Patient ID")
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    appointment_time: str = Field(..., description="Appointment time HH:MM")
    appointment_type: str = Field(..., description="Appointment type")
    notes: Optional[str] = Field(None, description="Doctor notes")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    priority: PriorityEnum = Field(PriorityEnum.NORMAL, description="Appointment priority")
    duration_minutes: int = Field(30, ge=15, le=240, description="Appointment duration")
    reason: Optional[str] = Field(None, description="Appointment reason")
    is_virtual: bool = Field(False, description="Is virtual appointment")
    meeting_link: Optional[str] = Field(None, description="Meeting link for virtual appointments")

    @validator('appointment_date')
    def _validate_appointment_date(cls, v):
        if v:
            try:
                parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
                if parsed_date < date.today():
                    raise ValueError('Appointment date cannot be in the past')
            except ValueError:
                raise ValueError('Appointment date must be in YYYY-MM-DD format')
        return v

    @validator('appointment_time')
    def _validate_appointment_time(cls, v):
        if v:
            try:
                parsed_time = datetime.strptime(v, "%H:%M").time()
                if parsed_time < time(6, 0) or parsed_time > time(22, 0):
                    raise ValueError('Appointment time must be between 06:00 and 22:00')
            except ValueError:
                raise ValueError('Appointment time must be in HH:MM format')
        return v

class AppointmentUpdateRequest(BaseModel):
    """Enhanced appointment update request."""
    status: Optional[str] = Field(None, description="New appointment status")
    appointment_date: Optional[str] = Field(None, description="New appointment date")
    appointment_time: Optional[str] = Field(None, description="New appointment time")
    appointment_type: Optional[str] = Field(None, description="New appointment type")
    notes: Optional[str] = Field(None, description="Updated notes")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    priority: Optional[PriorityEnum] = Field(None, description="Updated priority")
    duration_minutes: Optional[int] = Field(None, ge=15, le=240, description="Updated duration")
    reason: Optional[str] = Field(None, description="Updated reason")
    is_virtual: Optional[bool] = Field(None, description="Updated virtual status")
    meeting_link: Optional[str] = Field(None, description="Updated meeting link")

    @validator('appointment_date')
    def _validate_update_appointment_date(cls, v):
        if v:
            try:
                parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
                if parsed_date < date.today():
                    raise ValueError('Appointment date cannot be in the past')
            except ValueError:
                raise ValueError('Appointment date must be in YYYY-MM-DD format')
        return v

    @validator('appointment_time')
    def _validate_update_appointment_time(cls, v):
        if v:
            try:
                parsed_time = datetime.strptime(v, "%H:%M").time()
                if parsed_time < time(6, 0) or parsed_time > time(22, 0):
                    raise ValueError('Appointment time must be between 06:00 and 22:00')
            except ValueError:
                raise ValueError('Appointment time must be in HH:MM format')
        return v

class AvailabilityRequest(BaseModel):
    """Doctor availability request."""
    date: str = Field(..., description="Date to check availability YYYY-MM-DD")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class AvailabilitySlot(BaseModel):
    """Available time slot."""
    time: str = Field(..., description="Time slot HH:MM")
    available: bool = Field(..., description="Whether slot is available")
    appointment_id: Optional[str] = Field(None, description="Existing appointment ID if not available")

class AppointmentResponse(BaseModel):
    """Enhanced appointment response."""
    id: str = Field(..., description="Appointment ID")
    appointment_number: str = Field(..., description="Appointment number")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    
    # Appointment details
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    appointment_time: str = Field(..., description="Appointment time HH:MM")
    appointment_type: str = Field(..., description="Appointment type")
    status: str = Field(..., description="Appointment status")
    priority: str = Field(..., description="Appointment priority")
    duration_minutes: int = Field(..., description="Appointment duration")
    reason: Optional[str] = Field(None, description="Appointment reason")
    notes: Optional[str] = Field(None, description="Doctor notes")
    
    # Patient info
    patient_name: str = Field(..., description="Patient name")
    patient_phone: Optional[str] = Field(None, description="Patient phone")
    patient_age: Optional[int] = Field(None, description="Patient age")
    
    # Doctor info
    doctor_name: str = Field(..., description="Doctor name")
    doctor_specialization: Optional[str] = Field(None, description="Doctor specialization")
    
    # Virtual appointment
    is_virtual: bool = Field(False, description="Is virtual appointment")
    meeting_link: Optional[str] = Field(None, description="Meeting link")
    
    # FHIR integration
    fhir_appointment_id: Optional[str] = Field(None, description="FHIR Appointment ID")
    
    # System fields
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the appointment")
    
    # Check-in details
    checked_in_at: Optional[str] = Field(None, description="Check-in timestamp")
    completed_at: Optional[str] = Field(None, description="Completion timestamp")
    
    # Follow-up
    follow_up_required: bool = Field(False, description="Follow-up required")
    follow_up_date: Optional[str] = Field(None, description="Follow-up date")

class AppointmentList(BaseModel):
    """Enhanced appointment list with pagination."""
    appointments: List[AppointmentSummary]
    total: int = Field(..., description="Total number of appointments")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class AppointmentSearch(BaseModel):
    """Enhanced appointment search parameters."""
    patient_id: Optional[str] = Field(None, description="Filter by patient ID")
    status: Optional[str] = Field(None, description="Filter by status")
    appointment_type: Optional[str] = Field(None, description="Filter by appointment type")
    priority: Optional[str] = Field(None, description="Filter by priority")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Date filters
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search by patient name or appointment number")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("appointment_date", pattern=r'^(appointment_date|created_at|patient_name|status)$')
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$')

# ================================
# Enhanced Consultation Schemas
# ================================

class VitalSigns(BaseModel):
    """Enhanced patient vital signs during consultation."""
    systolic_bp: Optional[int] = Field(None, ge=50, le=300, description="Systolic blood pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=30, le=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=30, le=300, description="Heart rate (bpm)")
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temperature (°C)")
    respiratory_rate: Optional[int] = Field(None, ge=8, le=60, description="Respiratory rate (breaths/min)")
    oxygen_saturation: Optional[int] = Field(None, ge=70, le=100, description="Oxygen saturation (%)")
    height: Optional[float] = Field(None, gt=0, le=300, description="Height (cm)")
    weight: Optional[float] = Field(None, gt=0, le=1000, description="Weight (kg)")
    bmi: Optional[float] = Field(None, gt=0, le=100, description="BMI (calculated)")
    
    measured_at: str = Field(..., description="Measurement timestamp")
    measured_by: str = Field(..., description="Staff member who took vitals")

class PhysicalExamination(BaseModel):
    """Enhanced physical examination findings."""
    general_appearance: Optional[str] = Field(None, max_length=500, description="General appearance")
    head_neck: Optional[str] = Field(None, max_length=500, description="Head and neck examination")
    cardiovascular: Optional[str] = Field(None, max_length=500, description="Cardiovascular examination")
    respiratory: Optional[str] = Field(None, max_length=500, description="Respiratory examination")
    abdominal: Optional[str] = Field(None, max_length=500, description="Abdominal examination")
    neurological: Optional[str] = Field(None, max_length=500, description="Neurological examination")
    musculoskeletal: Optional[str] = Field(None, max_length=500, description="Musculoskeletal examination")
    skin: Optional[str] = Field(None, max_length=500, description="Skin examination")
    other_findings: Optional[str] = Field(None, max_length=1000, description="Other findings")

class DiagnosisTypeEnum(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    DIFFERENTIAL = "differential"
    PROVISIONAL = "provisional"
    CONFIRMED = "confirmed"

class SeverityEnum(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"

class Diagnosis(BaseModel):
    """Enhanced diagnosis information."""
    diagnosis: str = Field(..., min_length=3, max_length=200, description="Diagnosis description")
    icd_code: Optional[str] = Field(None, max_length=20, description="ICD-10 code")
    diagnosis_type: DiagnosisTypeEnum = Field(..., description="Diagnosis type")
    severity: Optional[SeverityEnum] = Field(None, description="Diagnosis severity")
    notes: Optional[str] = Field(None, max_length=500, description="Diagnosis notes")
    confidence: Optional[int] = Field(None, ge=1, le=100, description="Confidence percentage")

class TreatmentPlan(BaseModel):
    """Enhanced treatment plan details."""
    plan_description: str = Field(..., min_length=10, max_length=2000, description="Treatment plan description")
    medications: List[str] = Field(default_factory=list, description="Prescribed medications")
    procedures: List[str] = Field(default_factory=list, description="Required procedures")
    follow_up_instructions: Optional[str] = Field(None, max_length=1000, description="Follow-up instructions")
    lifestyle_recommendations: Optional[str] = Field(None, max_length=1000, description="Lifestyle recommendations")
    referrals: List[str] = Field(default_factory=list, description="Referrals to specialists")
    
    # Timeline
    estimated_duration: Optional[str] = Field(None, max_length=100, description="Estimated treatment duration")
    next_review_date: Optional[str] = Field(None, description="Next review date YYYY-MM-DD")

class ConsultationCreate(BaseModel):
    """Enhanced consultation creation request."""
    appointment_id: str = Field(..., description="Appointment ID")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Consultation details
    chief_complaint: str = Field(..., min_length=5, max_length=1000, description="Chief complaint")
    history_present_illness: str = Field(..., min_length=10, max_length=2000, description="History of present illness")
    review_of_systems: Optional[str] = Field(None, max_length=2000, description="Review of systems")
    
    # Clinical findings
    vital_signs: Optional[VitalSigns] = Field(None, description="Vital signs")
    physical_examination: Optional[PhysicalExamination] = Field(None, description="Physical examination")
    
    # Assessment
    diagnoses: List[Diagnosis] = Field(default_factory=list, description="Diagnoses")
    differential_diagnoses: List[str] = Field(default_factory=list, description="Differential diagnoses")
    
    # Plan
    treatment_plan: Optional[TreatmentPlan] = Field(None, description="Treatment plan")
    
    # Orders
    lab_orders: List[str] = Field(default_factory=list, description="Laboratory orders")
    imaging_orders: List[str] = Field(default_factory=list, description="Imaging orders")
    other_orders: List[str] = Field(default_factory=list, description="Other orders")
    
    # Additional notes
    clinical_notes: Optional[str] = Field(None, max_length=2000, description="Clinical notes")
    patient_education: Optional[str] = Field(None, max_length=1000, description="Patient education")

class ConsultationResponse(ConsultationCreate):
    """Enhanced consultation response."""
    id: str = Field(..., description="Consultation ID")
    consultation_number: str = Field(..., description="Consultation number")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    
    # Patient info
    patient_name: str = Field(..., description="Patient name")
    patient_age: int = Field(..., description="Patient age")
    
    # System fields
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    
    # Status
    is_final: bool = Field(False, description="Is final consultation")
    signed_at: Optional[str] = Field(None, description="Signature timestamp")
    
    # FHIR integration
    fhir_encounter_id: Optional[str] = Field(None, description="FHIR Encounter ID")
    fhir_observation_ids: List[str] = Field(default_factory=list, description="FHIR Observation IDs for vitals")

class ConsultationUpdate(BaseModel):
    """Enhanced consultation update request."""
    chief_complaint: Optional[str] = Field(None, min_length=5, max_length=1000, description="Updated chief complaint")
    history_present_illness: Optional[str] = Field(None, min_length=10, max_length=2000, description="Updated history")
    review_of_systems: Optional[str] = Field(None, max_length=2000, description="Updated review of systems")
    
    vital_signs: Optional[VitalSigns] = Field(None, description="Updated vital signs")
    physical_examination: Optional[PhysicalExamination] = Field(None, description="Updated physical examination")
    
    diagnoses: Optional[List[Diagnosis]] = Field(None, description="Updated diagnoses")
    differential_diagnoses: Optional[List[str]] = Field(None, description="Updated differential diagnoses")
    
    treatment_plan: Optional[TreatmentPlan] = Field(None, description="Updated treatment plan")
    
    lab_orders: Optional[List[str]] = Field(None, description="Updated lab orders")
    imaging_orders: Optional[List[str]] = Field(None, description="Updated imaging orders")
    other_orders: Optional[List[str]] = Field(None, description="Updated other orders")
    
    clinical_notes: Optional[str] = Field(None, max_length=2000, description="Updated clinical notes")
    patient_education: Optional[str] = Field(None, max_length=1000, description="Updated patient education")

# ================================
# Enhanced Schedule Management Schemas
# ================================

class DayOfWeekEnum(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class ScheduleSlot(BaseModel):
    """Enhanced time slot in doctor's schedule."""
    start_time: str = Field(..., description="Start time HH:MM")
    end_time: str = Field(..., description="End time HH:MM")
    is_available: bool = Field(True, description="Is slot available")
    slot_type: str = Field("regular", description="Slot type: regular, break, blocked")
    max_appointments: int = Field(1, ge=0, le=10, description="Maximum appointments per slot")

class DoctorSchedule(BaseModel):
    """Enhanced doctor's weekly schedule."""
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    day_of_week: DayOfWeekEnum = Field(..., description="Day of week")
    slots: List[ScheduleSlot] = Field(..., description="Time slots")
    is_working_day: bool = Field(True, description="Is working day")
    notes: Optional[str] = Field(None, max_length=500, description="Schedule notes")

class ScheduleUpdate(BaseModel):
    """Enhanced schedule update request."""
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    schedules: List[DoctorSchedule] = Field(..., description="Updated schedules")
    effective_from: str = Field(..., description="Effective from date YYYY-MM-DD")
    notes: Optional[str] = Field(None, max_length=500, description="Update notes")

# ================================
# Enhanced Validators
# ================================

@validator('appointment_date')
def validate_appointment_date(cls, v):
    """Validate appointment date format and not in past."""
    if v:
        try:
            # Parse date to validate format
            parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
            if parsed_date < date.today():
                raise ValueError('Appointment date cannot be in the past')
        except ValueError:
            raise ValueError('Appointment date must be in YYYY-MM-DD format')
    return v

@validator('appointment_time')
def validate_appointment_time(cls, v):
    """Validate appointment time format and working hours."""
    if v:
        try:
            # Parse time to validate format
            parsed_time = datetime.strptime(v, "%H:%M").time()
            if parsed_time < time(6, 0) or parsed_time > time(22, 0):
                raise ValueError('Appointment time must be between 06:00 and 22:00')
        except ValueError:
            raise ValueError('Appointment time must be in HH:MM format')
    return v

# Removed legacy global validator wiring; validators are defined within classes above
