from pydantic import BaseModel
from datetime import datetime

class MedicalHistoryCreate(BaseModel):
    description: str
    diagnosis: str

class MedicalHistoryRead(MedicalHistoryCreate):
    id: int
    doctor_id: int
    patient_id: int
    created_at: datetime

    class Config:
        from_attributes = True
