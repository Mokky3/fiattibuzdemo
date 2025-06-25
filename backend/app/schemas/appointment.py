from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    reason: str
    notes: Optional[str] = None
    status: Optional[str] = "upcoming"

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    reason: str
    notes: Optional[str] = None
    status: Optional[str] = "upcoming"

class AppointmentUpdate(BaseModel):
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

class AppointmentRead(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# For frontend compatibility
class AppointmentResponse(BaseModel):
    id: int
    patient_name: str
    doctor_name: str
    appointment_date: str  # ISO format
    appointment_time: str  # HH:MM format
    reason: str
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True