from pydantic import BaseModel
from datetime import datetime

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_time: datetime
    reason: str

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentRead(AppointmentBase):
    id: int

    class Config:
        from_attributes = True
