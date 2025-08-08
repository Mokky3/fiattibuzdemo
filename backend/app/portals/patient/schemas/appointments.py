from pydantic import BaseModel, Field
from typing import Optional

class AppointmentCreate(BaseModel):
    hospital: str
    appointmentDate: str
    appointmentTime: str
    appointmentType: str
    additionalNote: Optional[str] = None
    doctor_id: Optional[str] = None

class AppointmentRow(BaseModel):
    id: str
    date: str
    time: str
    daysUntil: Optional[int]
    description: str
    hospital: str
    room: Optional[str]
    type: str

class AppointmentPatch(BaseModel):
    status: Optional[str] = Field(None, regex="^(cancelled|noshow)$")
    appointmentDate: Optional[str]
    appointmentTime: Optional[str]
    additionalNote: Optional[str]
