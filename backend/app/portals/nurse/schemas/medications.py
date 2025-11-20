from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, validator


_ALLOWED_STATUS = {"pending", "due-soon", "overdue", "given", "skipped"}


class MedicationAdministration(BaseModel):
    id: str
    patient: str
    room: str
    medication: str
    dosage: str
    frequency: str
    route: str
    timeToAdminister: str
    status: str
    statusTime: Optional[str] = None
    nextDue: Optional[str] = None
    date: date

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_STATUS:
            raise ValueError("Invalid status value")
        return value


class MedicationAdministrationCreate(BaseModel):
    patient: str
    room: str
    medication: str
    dosage: str
    frequency: str
    route: str
    timeToAdminister: str
    status: str
    statusTime: Optional[str] = None
    nextDue: Optional[str] = None
    date: date

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_STATUS:
            raise ValueError("Invalid status value")
        return value


class MedicationAdministrationUpdate(BaseModel):
    patient: Optional[str] = None
    room: Optional[str] = None
    medication: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    timeToAdminister: Optional[str] = None
    status: Optional[str] = None
    statusTime: Optional[str] = None
    nextDue: Optional[str] = None
    date: Optional[date] = None

    class Config:
        extra = "forbid"


class MedicationCollection(BaseModel):
    items: List[MedicationAdministration]
    total: int = Field(..., ge=0)
    given: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    dueSoon: int = Field(..., ge=0)
    overdue: int = Field(..., ge=0)
    skipped: int = Field(..., ge=0)





