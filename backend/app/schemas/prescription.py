from pydantic import BaseModel
from datetime import datetime

class PrescriptionBase(BaseModel):
    medication: str
    dosage: str
    instructions: str | None = None

class PrescriptionCreate(PrescriptionBase):
    patient_id: int
    doctor_id: int

class PrescriptionRead(PrescriptionBase):
    id: int
    date_prescribed: datetime

    class Config:
        from_attributes = True
