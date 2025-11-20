"""Appointment detail schemas for reception portal."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AppointmentDetail(BaseModel):
    """Detailed appointment information for printing."""
    id: str
    appointment_id: str
    patient_id: Optional[str] = None
    patient_name: str
    patient_email: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: str
    doctor_specialty: Optional[str] = None
    appointment_date: str  # Formatted date
    appointment_time: str  # Formatted time
    appointment_datetime: datetime  # Full datetime for sorting
    appointment_type: str
    status: str
    duration_minutes: int
    reason: Optional[str] = None
    notes: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    
    class Config:
        from_attributes = True

