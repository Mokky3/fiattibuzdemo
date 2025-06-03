from pydantic import BaseModel
from datetime import date
from typing import Optional

class PatientBase(BaseModel):
    full_name: str
    gender: str
    birth_date: date
    phone: Optional[str] = None
    email: Optional[str] = None
    passport_number: Optional[str] = None
    address: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientRead(PatientBase):
    id: int

    class Config:
        orm_mode = True
