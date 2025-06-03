from pydantic import BaseModel
from typing import Optional

class DoctorBase(BaseModel):
    full_name: str
    specialty: str
    phone: Optional[str] = None
    email: Optional[str] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorRead(DoctorBase):
    id: int

    class Config:
        from_attributes = True  # Use from_attributes if using Pydantic v2
