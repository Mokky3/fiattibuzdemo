from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MedicalHistoryBase(BaseModel):
    description: str
    diagnosis: str

class MedicalHistoryCreate(MedicalHistoryBase):
    patient_id: int  # Add patient_id to the create schema

class MedicalHistoryUpdate(BaseModel):
    description: Optional[str] = None
    diagnosis: Optional[str] = None

class MedicalHistoryRead(MedicalHistoryBase):
    id: int
    patient_id: int
    doctor_id: int
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Fixed for Pydantic V2

# Additional schemas for dashboard/API responses
class MedicalHistoryResponse(MedicalHistoryRead):
    """Extended response with patient/doctor info"""
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None

class MedicalHistorySummary(BaseModel):
    """Summary for dashboard"""
    total_entries: int
    last_diagnosis: Optional[str] = None
    last_visit: Optional[datetime] = None