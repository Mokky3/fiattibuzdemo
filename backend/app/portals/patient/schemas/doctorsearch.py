from pydantic import BaseModel
from typing import Optional

class Doctor(BaseModel):
    id: str
    fullName: str
    specialty: Optional[str]
    hospital: Optional[str]

class AppointmentRequest(BaseModel):
    doctorId: str
    patientId: str
    appointmentDate: str
    appointmentTime: str
    appointmentType: str
    additionalNote: Optional[str] = None
