from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum

# ================================
# Appointment Schemas
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
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class PriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class AppointmentBase(BaseModel):
    patient_id: str
    appointment_type: AppointmentTypeEnum
    appointment_date: date
    appointment_time: time
    duration_minutes: int = Field(default=30, ge=15, le=240)
    
    reason: str = Field(..., min_length=5, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    priority: PriorityEnum = Field(default=PriorityEnum.NORMAL)
    
    # Location details
    room_number: Optional[str] = Field(None, max_length=20)
    clinic_location: Optional[str] = Field(None, max_length=100)
    
    # Telemedicine
    is_virtual: bool = Field(default=False)
    meeting_link: Optional[str] = Field(None, max_length=500)

class AppointmentCreate(AppointmentBase):
    """Schema for creating new appointment"""
    send_reminder: bool = Field(default=True)
    reminder_time: Optional[int] = Field(24, description="Hours before appointment to send reminder")

class AppointmentUpdate(BaseModel):
    """Schema for updating appointment"""
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    reason: Optional[str] = Field(None, min_length=5, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    priority: Optional[PriorityEnum] = None
    room_number: Optional[str] = Field(None, max_length=20)
    clinic_location: Optional[str] = Field(None, max_length=100)
    status: Optional[AppointmentStatusEnum] = None

class AppointmentResponse(AppointmentBase):
    """Schema for appointment response"""
    id: str
    appointment_number: str  # e.g., APT-2025-001234
    doctor_id: str
    status: AppointmentStatusEnum
    
    # Patient info (embedded)
    patient_name: str
    patient_phone: str
    patient_age: int
    
    # Doctor info (embedded)
    doctor_name: str
    doctor_specialization: Optional[str] = None
    
    # System fields
    created_at: datetime
    updated_at: datetime
    created_by: str  # User who created the appointment
    
    # Check-in details
    checked_in_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Follow-up
    follow_up_required: bool = Field(default=False)
    follow_up_date: Optional[date] = None
    
    class Config:
        from_attributes = True

class AppointmentList(BaseModel):
    """Schema for appointment list with pagination"""
    appointments: List[AppointmentResponse]
    total: int
    page: int
    size: int
    total_pages: int

class AppointmentSearch(BaseModel):
    """Schema for appointment search parameters"""
    patient_id: Optional[str] = None
    status: Optional[AppointmentStatusEnum] = None
    appointment_type: Optional[AppointmentTypeEnum] = None
    priority: Optional[PriorityEnum] = None
    
    # Date filters
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search by patient name or appointment number")
    
    # Pagination
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
    
    # Sorting
    sort_by: str = Field("appointment_date", regex=r'^(appointment_date|created_at|patient_name|status)$')
    sort_order: str = Field("asc", regex=r'^(asc|desc)$')

# ================================
# Consultation Schemas
# ================================

class VitalSigns(BaseModel):
    """Patient vital signs during consultation"""
    systolic_bp: Optional[int] = Field(None, ge=50, le=300, description="Systolic blood pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=30, le=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=30, le=300, description="Heart rate (bpm)")
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temperature (°C)")
    respiratory_rate: Optional[int] = Field(None, ge=8, le=60, description="Respiratory rate (breaths/min)")
    oxygen_saturation: Optional[int] = Field(None, ge=70, le=100, description="Oxygen saturation (%)")
    height: Optional[float] = Field(None, gt=0, le=300, description="Height (cm)")
    weight: Optional[float] = Field(None, gt=0, le=1000, description="Weight (kg)")
    bmi: Optional[float] = Field(None, gt=0, le=100, description="BMI (calculated)")
    
    measured_at: datetime = Field(default_factory=datetime.now)
    measured_by: str  # Staff member who took vitals

class PhysicalExamination(BaseModel):
    """Physical examination findings"""
    general_appearance: Optional[str] = Field(None, max_length=500)
    head_neck: Optional[str] = Field(None, max_length=500)
    cardiovascular: Optional[str] = Field(None, max_length=500)
    respiratory: Optional[str] = Field(None, max_length=500)
    abdominal: Optional[str] = Field(None, max_length=500)
    neurological: Optional[str] = Field(None, max_length=500)
    musculoskeletal: Optional[str] = Field(None, max_length=500)
    skin: Optional[str] = Field(None, max_length=500)
    other_findings: Optional[str] = Field(None, max_length=1000)

class DiagnosisTypeEnum(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    DIFFERENTIAL = "differential"
    PROVISIONAL = "provisional"
    CONFIRMED = "confirmed"

class Diagnosis(BaseModel):
    """Diagnosis information"""
    diagnosis: str = Field(..., min_length=3, max_length=200)
    icd_code: Optional[str] = Field(None, max_length=20)
    diagnosis_type: DiagnosisTypeEnum
    severity: Optional[SeverityEnum] = None
    notes: Optional[str] = Field(None, max_length=500)
    confidence: Optional[int] = Field(None, ge=1, le=100, description="Confidence percentage")

class TreatmentPlan(BaseModel):
    """Treatment plan details"""
    plan_description: str = Field(..., min_length=10, max_length=2000)
    medications: List[str] = Field(default_factory=list)
    procedures: List[str] = Field(default_factory=list)
    follow_up_instructions: Optional[str] = Field(None, max_length=1000)
    lifestyle_recommendations: Optional[str] = Field(None, max_length=1000)
    referrals: List[str] = Field(default_factory=list)  # Referral to specialists
    
    # Timeline
    estimated_duration: Optional[str] = Field(None, max_length=100)
    next_review_date: Optional[date] = None

class ConsultationCreate(BaseModel):
    """Schema for creating consultation record"""
    appointment_id: str
    
    # Consultation details
    chief_complaint: str = Field(..., min_length=5, max_length=1000)
    history_present_illness: str = Field(..., min_length=10, max_length=2000)
    review_of_systems: Optional[str] = Field(None, max_length=2000)
    
    # Clinical findings
    vital_signs: Optional[VitalSigns] = None
    physical_examination: Optional[PhysicalExamination] = None
    
    # Assessment
    diagnoses: List[Diagnosis] = Field(default_factory=list)
    differential_diagnoses: List[str] = Field(default_factory=list)
    
    # Plan
    treatment_plan: Optional[TreatmentPlan] = None
    
    # Orders
    lab_orders: List[str] = Field(default_factory=list)
    imaging_orders: List[str] = Field(default_factory=list)
    other_orders: List[str] = Field(default_factory=list)
    
    # Additional notes
    clinical_notes: Optional[str] = Field(None, max_length=2000)
    patient_education: Optional[str] = Field(None, max_length=1000)

class ConsultationResponse(ConsultationCreate):
    """Schema for consultation response"""
    id: str
    consultation_number: str  # e.g., CONS-2025-001234
    patient_id: str
    doctor_id: str
    
    # Patient info (embedded)
    patient_name: str
    patient_age: int
    
    # System fields
    created_at: datetime
    updated_at: datetime
    
    # Status
    is_final: bool = Field(default=False)
    signed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ConsultationUpdate(BaseModel):
    """Schema for updating consultation"""
    chief_complaint: Optional[str] = Field(None, min_length=5, max_length=1000)
    history_present_illness: Optional[str] = Field(None, min_length=10, max_length=2000)
    review_of_systems: Optional[str] = Field(None, max_length=2000)
    
    vital_signs: Optional[VitalSigns] = None
    physical_examination: Optional[PhysicalExamination] = None
    
    diagnoses: Optional[List[Diagnosis]] = None
    differential_diagnoses: Optional[List[str]] = None
    
    treatment_plan: Optional[TreatmentPlan] = None
    
    lab_orders: Optional[List[str]] = None
    imaging_orders: Optional[List[str]] = None
    other_orders: Optional[List[str]] = None
    
    clinical_notes: Optional[str] = Field(None, max_length=2000)
    patient_education: Optional[str] = Field(None, max_length=1000)

# ================================
# Schedule Management Schemas
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
    """Time slot in doctor's schedule"""
    start_time: time
    end_time: time
    is_available: bool = Field(default=True)
    slot_type: str = Field(default="regular")  # regular, break, blocked
    max_appointments: int = Field(default=1, ge=0, le=10)

class DoctorSchedule(BaseModel):
    """Doctor's weekly schedule"""
    doctor_id: str
    day_of_week: DayOfWeekEnum
    slots: List[ScheduleSlot]
    is_working_day: bool = Field(default=True)
    notes: Optional[str] = Field(None, max_length=500)

class ScheduleUpdate(BaseModel):
    """Update doctor's schedule"""
    schedules: List[DoctorSchedule]
    effective_from: date
    notes: Optional[str] = Field(None, max_length=500)

# ================================
# Validators
# ================================

@validator('appointment_time')
def validate_appointment_time(cls, v, values):
    """Validate appointment time is during working hours"""
    if v:
        # Basic validation - can be enhanced based on clinic hours
        if v < time(6, 0) or v > time(22, 0):
            raise ValueError('Appointment time must be between 6:00 AM and 10:00 PM')
    return v

@validator('appointment_date')
def validate_appointment_date(cls, v):
    """Validate appointment date is not in the past"""
    if v and v < date.today():
        raise ValueError('Appointment date cannot be in the past')
    return v

# Apply validators to relevant classes
AppointmentBase.__validators__['validate_appointment_time'] = validator('appointment_time', allow_reuse=True)(validate_appointment_time)
AppointmentBase.__validators__['validate_appointment_date'] = validator('appointment_date', allow_reuse=True)(validate_appointment_date)