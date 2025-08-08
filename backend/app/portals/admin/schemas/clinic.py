from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from app.common.schemas.common import ClinicStatus, IDModel, TimestampedModel

# ---------------------------- Clinic ----------------------------

class ClinicBase(BaseModel):
    name: str
    city: str
    address: str
    founded: str
    status: ClinicStatus
    departments: List[str]

class ClinicCreate(ClinicBase):
    pass

class ClinicUpdate(ClinicBase):
    pass

class ClinicResponse(ClinicBase, IDModel, TimestampedModel):
    doctors: int
    patients: int

class ClinicStatusUpdate(BaseModel):
    status: ClinicStatus
