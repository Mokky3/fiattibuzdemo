# app/portals/reception/schemas/appointment.py
"""Appointment scheduling and management schemas."""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator

from app.common.schemas.base import AppointmentStatus, Priority


# ============================= Request Models =============================
class AppointmentCreate(BaseModel):
    """Create appointment request schema."""
    # Patient information
    patient_id: Optional[str] = Field(None, alias="patientId")
    patient_name: str = Field(..., alias="patientName")
    patient_phone: str = Field(..., alias="patientPhone")
    patient_email: Optional[EmailStr] = Field(None, alias="patientEmail")
    is_new_patient: bool = Field(False, alias="isNewPatient")
    
    # Appointment details
    appointment_date: str = Field(..., alias="appointmentDate", description="YYYY-MM-DD")
    appointment_time: str = Field(..., alias="appointmentTime", description="HH:MM")
    doctor_id: str = Field(..., alias="doctorId")
    appointment_type: Optional[str] = Field(None, alias="appointmentType")
    reason: str
    notes: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    duration: str = Field("30", description="Duration in minutes")
    
    # Insurance information
    insurance_provider: Optional[str] = Field(None, alias="insuranceProvider")
    insurance_id: Optional[str] = Field(None, alias="insuranceId")
    
    class Config:
        populate_by_name = True
        
    @validator('appointment_date')
    def validate_date(cls, v):
        try:
            appt_date = datetime.strptime(v, "%Y-%m-%d").date()
            if appt_date < date.today():
                raise ValueError("Appointment date cannot be in the past")
            return v
        except ValueError as e:
            if "Appointment date" in str(e):
                raise e
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
    
    @validator('appointment_time')
    def validate_time(cls, v):
        try:
            datetime.strptime(v, "%H:%M")
            return v
        except ValueError:
            raise ValueError("Invalid time format. Use HH:MM")


class AppointmentUpdate(BaseModel):
    """Update appointment request schema."""
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    priority: Optional[Priority] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    doctor_id: Optional[str] = None
    reason: Optional[str] = None


class AppointmentConfirmDecline(BaseModel):
    """Confirm or decline appointment request schema."""
    reason: Optional[str] = None
    notify_patient: bool = Field(True, alias="notifyPatient")
    
    class Config:
        populate_by_name = True


class AppointmentActionRequest(BaseModel):
    """General appointment action request."""
    appointment_id: str
    action: str  # 'delete' or 'decline'
    reason: str
    notify_patient: bool = True


# ============================= Response Models =============================
class AppointmentPublic(BaseModel):
    """Public appointment response schema."""
    id: str
    date: str
    time: str
    patient: str
    doctor: str
    reason: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    duration: int = 30
    
    class Config:
        from_attributes = True


class DoctorPublic(BaseModel):
    """Public doctor information schema."""
    id: str
    name: str
    specialty: str
    available: bool


class AppointmentStats(BaseModel):
    """Appointment statistics for dashboard."""
    total_appointments: int = Field(..., alias="totalAppointments")
    checked_in: int = Field(..., alias="checkedIn")
    walk_ins: int = Field(..., alias="walkIns")
    waiting: int
    
    class Config:
        populate_by_name = True


class TimeSlot(BaseModel):
    """Available time slot schema."""
    time: str
    available: bool
    reason: Optional[str] = None


class AppointmentListResponse(BaseModel):
    """Appointment list response with pagination."""
    appointments: List[AppointmentPublic]
    total: int
    page: int
    size: int
    has_next: bool
    has_prev: bool


class DoctorAvailability(BaseModel):
    """Doctor availability response."""
    doctor_id: str
    doctor_name: str
    date: str
    available_slots: List[TimeSlot]
    working_hours: Dict[str, str]  # {"start": "08:00", "end": "18:00"}


class AppointmentDetails(AppointmentPublic):
    """Detailed appointment information."""
    patient_address: Optional[str] = None
    patient_insurance: Optional[Dict[str, str]] = None
    appointment_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True