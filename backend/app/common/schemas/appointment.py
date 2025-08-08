# common/schemas/appointment.py
"""
Appointment-related schemas for the EHR system
Based on doctor portal appointment router models
"""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum
from .base import BaseSchema, Priority

# ──────────────────────────────────────────────────────────────────────────────
# Appointment Enums
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    UPCOMING = "upcoming" 
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAST = "past"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class AppointmentType(str, Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow-up"
    CHECKUP = "checkup"
    EMERGENCY = "emergency"
    ROUTINE = "routine"
    SPECIALIST = "specialist"
    THERAPY = "therapy"
    VACCINATION = "vaccination"
    SURGERY = "surgery"
    LAB_WORK = "lab_work"
    IMAGING = "imaging"

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

# ──────────────────────────────────────────────────────────────────────────────
# Core Appointment Models
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentBase(BaseModel):
    """Base appointment model"""
    patient_id: str = Field(..., description="Patient identifier")
    doctor_id: str = Field(..., description="Doctor identifier")
    appointment_date: date = Field(..., description="Appointment date")
    appointment_time: time = Field(..., description="Appointment time")
    appointment_type: AppointmentType = AppointmentType.CONSULTATION
    duration_minutes: int = Field(30, ge=15, le=480, description="Duration in minutes")
    notes: Optional[str] = Field(None, max_length=1000, description="Appointment notes")
    priority: Priority = Priority.MEDIUM
    
    @validator('appointment_date')
    def validate_appointment_date(cls, v):
        # Allow past dates for historical data, but warn for future scheduling
        return v

class AppointmentCreate(AppointmentBase):
    """Schema for creating new appointments"""
    patient_name: Optional[str] = Field(None, description="Patient name for quick reference")
    status: AppointmentStatus = AppointmentStatus.PENDING
    send_reminder: bool = True
    reminder_time_minutes: int = Field(60, ge=15, le=1440, description="Reminder time before appointment")
    
class AppointmentUpdate(BaseModel):
    """Schema for updating appointments"""
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    appointment_type: Optional[AppointmentType] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    notes: Optional[str] = Field(None, max_length=1000)
    priority: Optional[Priority] = None
    status: Optional[AppointmentStatus] = None

class AppointmentStatusUpdate(BaseModel):
    """Schema for status-only updates"""
    status: AppointmentStatus
    reason: Optional[str] = Field(None, max_length=500, description="Reason for status change")
    updated_by: Optional[str] = Field(None, description="User who updated the status")

# ──────────────────────────────────────────────────────────────────────────────
# Complete Appointment Model
# ──────────────────────────────────────────────────────────────────────────────

class Appointment(AppointmentBase, BaseSchema):
    """Complete appointment model with all fields"""
    status: AppointmentStatus = AppointmentStatus.PENDING
    
    # Patient and doctor information (denormalized for performance)
    patient_name: str = Field(..., description="Patient full name")
    doctor_name: str = Field(..., description="Doctor full name")
    
    # Scheduling information
    created_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    
    # Reminders and notifications
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    
    # Additional metadata
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    actual_duration_minutes: Optional[int] = None
    
    # Room and resource allocation
    room_number: Optional[str] = None
    equipment_needed: Optional[List[str]] = Field(default_factory=list)
    
    # Follow-up information
    follow_up_needed: bool = False
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None

# ──────────────────────────────────────────────────────────────────────────────
# Frontend Compatibility Models
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentDTO(BaseModel):
    """Frontend-compatible appointment model (legacy)"""
    id: str
    date: str  # YYYY-MM-DD format
    time: str  # HH:MM format
    patient: str  # Patient name
    problem: Optional[str] = None  # Appointment type/reason
    description: Optional[str] = None  # Notes
    provider: str  # Doctor name
    formattedDate: str  # DD.MM.YYYY format for UI
    status: str  # Status as string
    
    # Additional fields for frontend compatibility
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    doctor_name: Optional[str] = None
    
    @classmethod
    def from_appointment(cls, appointment: Appointment) -> "AppointmentDTO":
        """Convert Appointment to frontend DTO format"""
        return cls(
            id=appointment.id,
            date=appointment.appointment_date.isoformat(),
            time=appointment.appointment_time.strftime("%H:%M"),
            patient=appointment.patient_name,
            problem=appointment.appointment_type.value,
            description=appointment.notes,
            provider=appointment.doctor_name,
            formattedDate=appointment.appointment_date.strftime("%d.%m.%Y"),
            status=appointment.status.value,
            patient_name=appointment.patient_name,
            patient_id=appointment.patient_id,
            appointment_date=appointment.appointment_date.isoformat(),
            appointment_time=appointment.appointment_time.strftime("%H:%M"),
            appointment_type=appointment.appointment_type.value,
            notes=appointment.notes,
            doctor_name=appointment.doctor_name
        )

# ──────────────────────────────────────────────────────────────────────────────
# Recurring Appointments
# ──────────────────────────────────────────────────────────────────────────────

class RecurringAppointment(BaseModel):
    """Recurring appointment configuration"""
    base_appointment_id: str
    recurrence_type: RecurrenceType
    recurrence_interval: int = Field(1, ge=1, description="Interval between recurrences")
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = Field(None, ge=1, le=100)
    days_of_week: Optional[List[int]] = Field(None, description="Days of week (0=Monday)")
    
    @validator('days_of_week')
    def validate_days_of_week(cls, v):
        if v:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError('Days of week must be between 0 (Monday) and 6 (Sunday)')
        return v

# ──────────────────────────────────────────────────────────────────────────────
# Appointment Slots and Availability
# ──────────────────────────────────────────────────────────────────────────────

class TimeSlot(BaseModel):
    """Available time slot"""
    start_time: time
    end_time: time
    is_available: bool = True
    appointment_id: Optional[str] = None  # If booked
    
class DaySchedule(BaseModel):
    """Doctor's schedule for a specific day"""
    date: date
    doctor_id: str
    working_hours_start: time
    working_hours_end: time
    lunch_break_start: Optional[time] = None
    lunch_break_end: Optional[time] = None
    slots: List[TimeSlot]
    total_slots: int
    available_slots: int
    booked_slots: int

class AvailabilityRequest(BaseModel):
    """Request for checking appointment availability"""
    doctor_id: str
    start_date: date
    end_date: date
    appointment_type: Optional[AppointmentType] = None
    duration_minutes: int = 30

# ──────────────────────────────────────────────────────────────────────────────
# Appointment Search and Filtering
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentFilter(BaseModel):
    """Appointment filtering parameters"""
    status: Optional[AppointmentStatus] = None
    appointment_type: Optional[AppointmentType] = None
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    priority: Optional[Priority] = None
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('End date must be after start date')
        return v

class AppointmentSearchFilter(AppointmentFilter):
    """Extended search filter with text search"""
    query: Optional[str] = Field(None, description="Search in patient name, notes, type")
    include_cancelled: bool = False
    sort_by: str = Field("appointment_date", description="Sort field")
    sort_order: str = Field("asc", regex="^(asc|desc)$")

# ──────────────────────────────────────────────────────────────────────────────
# Appointment Statistics and Reports
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentStats(BaseModel):
    """Appointment statistics"""
    total_appointments: int = 0
    pending_appointments: int = 0
    upcoming_appointments: int = 0
    completed_appointments: int = 0
    cancelled_appointments: int = 0
    no_show_appointments: int = 0
    today_appointments: int = 0
    this_week_appointments: int = 0
    this_month_appointments: int = 0
    
class DoctorAppointmentStats(AppointmentStats):
    """Doctor-specific appointment statistics"""
    doctor_id: str
    doctor_name: str
    average_appointment_duration: float = 0.0
    patient_satisfaction_rating: Optional[float] = None
    on_time_percentage: float = 0.0
    
class AppointmentSummary(BaseModel):
    """Daily appointment summary"""
    date: date
    doctor_id: str
    total_scheduled: int = 0
    completed: int = 0
    cancelled: int = 0
    no_shows: int = 0
    average_duration: float = 0.0
    first_appointment: Optional[time] = None
    last_appointment: Optional[time] = None

# ──────────────────────────────────────────────────────────────────────────────
# Reminder and Notification Models
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentReminder(BaseModel):
    """Appointment reminder configuration"""
    appointment_id: str
    reminder_type: str = Field(..., regex="^(email|sms|push|call)$")
    reminder_time_minutes: int = Field(..., ge=15, le=1440)
    message_template: Optional[str] = None
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    delivery_status: Optional[str] = None

class BulkReminderRequest(BaseModel):
    """Bulk reminder sending request"""
    date_from: date
    date_to: date
    reminder_type: str = Field(..., regex="^(email|sms|push|call)$")
    hours_before: int = Field(24, ge=1, le=168)
    doctor_ids: Optional[List[str]] = None

# ──────────────────────────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentResponse(BaseModel):
    """Single appointment response"""
    appointment: Appointment
    patient_info: Optional[Dict[str, Any]] = None
    doctor_info: Optional[Dict[str, Any]] = None
    related_appointments: Optional[List[Appointment]] = None

class AppointmentListResponse(BaseModel):
    """Appointment list response"""
    appointments: List[Appointment]
    total: int
    filters_applied: Optional[AppointmentFilter] = None
    stats: Optional[AppointmentStats] = None

class AvailabilityResponse(BaseModel):
    """Availability check response"""
    available_slots: List[DaySchedule]
    doctor_id: str
    date_range: Dict[str, date]
    total_available_slots: int

class AppointmentConflictResponse(BaseModel):
    """Appointment conflict check response"""
    has_conflict: bool
    conflicting_appointments: List[Appointment] = Field(default_factory=list)
    suggested_times: List[Dict[str, Any]] = Field(default_factory=list)

# ──────────────────────────────────────────────────────────────────────────────
# FHIR Integration Models
# ──────────────────────────────────────────────────────────────────────────────

class FHIRAppointmentMapping(BaseModel):
    """FHIR Appointment resource mapping"""
    fhir_id: str
    local_appointment_id: str
    fhir_status: str  # FHIR status values
    local_status: AppointmentStatus
    last_sync: datetime
    sync_status: str = Field("synced", regex="^(synced|pending|failed)$")

class AppointmentParticipant(BaseModel):
    """FHIR Appointment participant"""
    actor_reference: str  # Patient/{id} or Practitioner/{id}
    actor_type: str = Field(..., regex="^(patient|practitioner|location|device)$")
    required: bool = True
    status: str = Field("accepted", regex="^(accepted|declined|tentative|needs-action)$")

# ──────────────────────────────────────────────────────────────────────────────
# Appointment Workflow Models
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentWorkflow(BaseModel):
    """Appointment workflow state"""
    appointment_id: str
    current_step: str
    workflow_steps: List[str] = Field(default_factory=lambda: [
        "scheduled", "confirmed", "checked_in", "in_progress", "completed", "checked_out"
    ])
    completed_steps: List[str] = Field(default_factory=list)
    step_timestamps: Dict[str, datetime] = Field(default_factory=dict)
    
class WorkflowStepUpdate(BaseModel):
    """Update workflow step"""
    appointment_id: str
    step: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    updated_by: str

# ──────────────────────────────────────────────────────────────────────────────
# Integration with Other Schemas
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentWithDetails(Appointment):
    """Appointment with full related information"""
    patient_details: Optional[Dict[str, Any]] = None
    doctor_details: Optional[Dict[str, Any]] = None
    medical_records: Optional[List[Dict[str, Any]]] = None
    prescriptions: Optional[List[Dict[str, Any]]] = None
    reports: Optional[List[Dict[str, Any]]] = None