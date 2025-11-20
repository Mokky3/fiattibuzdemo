"""Enhanced Reception portal appointment schemas for surgical edits integration."""
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
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class AppointmentCreateRequest(BaseModel):
    """Enhanced appointment creation request."""
    patient_id: str = Field(..., description="Patient ID")
    practitioner_id: str = Field(..., description="Doctor/Practitioner ID")
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    appointment_time: str = Field(..., description="Appointment time HH:MM")
    appointment_type: AppointmentTypeEnum = Field(..., description="Appointment type")
    reason: Optional[str] = Field(None, max_length=500, description="Appointment reason")
    description: Optional[str] = Field(None, max_length=1000, description="Additional description")
    priority: PriorityEnum = Field(PriorityEnum.MEDIUM, description="Priority")
    duration: int = Field(30, ge=15, le=180, description="Duration in minutes")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Additional fields
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    is_virtual: bool = Field(False, description="Is virtual appointment")
    meeting_link: Optional[str] = Field(None, max_length=500, description="Meeting link for virtual appointments")
    room_number: Optional[str] = Field(None, max_length=20, description="Room number")
    send_reminder: bool = Field(True, description="Send appointment reminder")
    reminder_hours: int = Field(24, ge=1, le=168, description="Hours before appointment to send reminder")

class AppointmentSummary(BaseModel):
    """Enhanced appointment summary."""
    id: str = Field(..., description="Appointment ID")
    date: str = Field(..., description="Appointment date YYYY-MM-DD")
    time: str = Field(..., description="Appointment time HH:MM")
    patient_name: str = Field(..., description="Patient name")
    patient_id: str = Field(..., description="Patient ID")
    doctor_name: str = Field(..., description="Doctor name")
    doctor_id: str = Field(..., description="Doctor ID")
    reason: Optional[str] = Field(None, description="Appointment reason")
    description: Optional[str] = Field(None, description="Appointment description")
    status: str = Field(..., description="Appointment status")
    priority: str = Field(..., description="Appointment priority")
    appointment_type: str = Field(..., description="Appointment type")
    duration: int = Field(..., description="Appointment duration in minutes")
    clinic_id: str = Field(..., description="Clinic ID")
    fhir_appointment_id: Optional[str] = Field(None, description="FHIR Appointment ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class AppointmentResponse(BaseModel):
    """Enhanced appointment response."""
    id: str = Field(..., description="Appointment ID")
    appointment_number: str = Field(..., description="Appointment number")
    patient_id: str = Field(..., description="Patient ID")
    practitioner_id: str = Field(..., description="Practitioner ID")
    clinic_id: str = Field(..., description="Clinic ID")
    
    # Appointment details
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    appointment_time: str = Field(..., description="Appointment time HH:MM")
    appointment_type: str = Field(..., description="Appointment type")
    status: str = Field(..., description="Appointment status")
    priority: str = Field(..., description="Appointment priority")
    duration: int = Field(..., description="Appointment duration in minutes")
    reason: Optional[str] = Field(None, description="Appointment reason")
    description: Optional[str] = Field(None, description="Appointment description")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    # Patient info
    patient_name: str = Field(..., description="Patient name")
    patient_phone: Optional[str] = Field(None, description="Patient phone")
    patient_email: Optional[str] = Field(None, description="Patient email")
    patient_age: Optional[int] = Field(None, description="Patient age")
    
    # Doctor info
    doctor_name: str = Field(..., description="Doctor name")
    doctor_specialization: Optional[str] = Field(None, description="Doctor specialization")
    doctor_phone: Optional[str] = Field(None, description="Doctor phone")
    
    # Virtual appointment
    is_virtual: bool = Field(False, description="Is virtual appointment")
    meeting_link: Optional[str] = Field(None, description="Meeting link")
    
    # Location
    room_number: Optional[str] = Field(None, description="Room number")
    clinic_location: Optional[str] = Field(None, description="Clinic location")
    
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

class AppointmentUpdateRequest(BaseModel):
    """Enhanced appointment update request."""
    appointment_date: Optional[str] = Field(None, description="Updated appointment date YYYY-MM-DD")
    appointment_time: Optional[str] = Field(None, description="Updated appointment time HH:MM")
    appointment_type: Optional[AppointmentTypeEnum] = Field(None, description="Updated appointment type")
    status: Optional[AppointmentStatusEnum] = Field(None, description="Updated appointment status")
    priority: Optional[PriorityEnum] = Field(None, description="Updated priority")
    duration: Optional[int] = Field(None, ge=15, le=180, description="Updated duration in minutes")
    reason: Optional[str] = Field(None, max_length=500, description="Updated appointment reason")
    description: Optional[str] = Field(None, max_length=1000, description="Updated description")
    notes: Optional[str] = Field(None, max_length=500, description="Updated notes")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Virtual appointment updates
    is_virtual: Optional[bool] = Field(None, description="Updated virtual status")
    meeting_link: Optional[str] = Field(None, max_length=500, description="Updated meeting link")
    
    # Location updates
    room_number: Optional[str] = Field(None, max_length=20, description="Updated room number")
    clinic_location: Optional[str] = Field(None, max_length=100, description="Updated clinic location")

class AppointmentSearchRequest(BaseModel):
    """Enhanced appointment search request."""
    patient_id: Optional[str] = Field(None, description="Filter by patient ID")
    practitioner_id: Optional[str] = Field(None, description="Filter by practitioner ID")
    status: Optional[AppointmentStatusEnum] = Field(None, description="Filter by status")
    appointment_type: Optional[AppointmentTypeEnum] = Field(None, description="Filter by appointment type")
    priority: Optional[PriorityEnum] = Field(None, description="Filter by priority")
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
    sort_by: str = Field("appointment_date", pattern=r'^(appointment_date|created_at|patient_name|status|priority)$')
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$')

class AppointmentListResponse(BaseModel):
    """Enhanced appointment list response."""
    appointments: List[AppointmentSummary] = Field(..., description="List of appointments")
    total: int = Field(..., description="Total number of appointments")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class AvailabilityRequest(BaseModel):
    """Doctor availability request."""
    practitioner_id: str = Field(..., description="Practitioner ID")
    date: str = Field(..., description="Date to check availability YYYY-MM-DD")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    duration: int = Field(30, ge=15, le=180, description="Required duration in minutes")

class AvailabilitySlot(BaseModel):
    """Available time slot."""
    time: str = Field(..., description="Time slot HH:MM")
    available: bool = Field(..., description="Whether slot is available")
    appointment_id: Optional[str] = Field(None, description="Existing appointment ID if not available")
    duration: int = Field(..., description="Slot duration in minutes")

class AvailabilityResponse(BaseModel):
    """Doctor availability response."""
    practitioner_id: str = Field(..., description="Practitioner ID")
    date: str = Field(..., description="Date checked")
    slots: List[AvailabilitySlot] = Field(..., description="Available time slots")
    clinic_id: str = Field(..., description="Clinic ID")

class AppointmentStats(BaseModel):
    """Enhanced appointment statistics."""
    total_appointments: int = Field(..., description="Total appointments")
    appointments_today: int = Field(..., description="Appointments today")
    appointments_this_week: int = Field(..., description="Appointments this week")
    appointments_this_month: int = Field(..., description="Appointments this month")
    appointments_by_status: Dict[str, int] = Field(..., description="Appointments count by status")
    appointments_by_type: Dict[str, int] = Field(..., description="Appointments count by type")
    appointments_by_priority: Dict[str, int] = Field(..., description="Appointments count by priority")
    average_duration: float = Field(..., description="Average appointment duration")
    no_show_rate: float = Field(..., description="No-show rate percentage")
    clinic_id: str = Field(..., description="Clinic ID")

class AppointmentReminderRequest(BaseModel):
    """Appointment reminder request."""
    appointment_id: str = Field(..., description="Appointment ID")
    reminder_type: str = Field("sms", pattern=r'^(sms|email|phone)$', description="Reminder type")
    message: Optional[str] = Field(None, description="Custom reminder message")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class AppointmentReminderResponse(BaseModel):
    """Appointment reminder response."""
    appointment_id: str = Field(..., description="Appointment ID")
    reminder_sent: bool = Field(..., description="Reminder sent successfully")
    reminder_type: str = Field(..., description="Reminder type")
    sent_at: str = Field(..., description="Reminder sent timestamp")
    message: str = Field(..., description="Reminder message sent")

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

@validator('meeting_link')
def validate_meeting_link(cls, v):
    """Validate meeting link format."""
    if v:
        import re
        # Basic URL validation
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        if not url_pattern.match(v):
            raise ValueError('Meeting link must be a valid URL')
    return v

# Note: Removed legacy global validator wiring for Pydantic v2 compatibility.
