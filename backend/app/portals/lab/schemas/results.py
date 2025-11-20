from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator


_ALLOWED_RESULT_STATUS = {"completed", "pending"}
_ALLOWED_PRIORITY = {"urgent", "routine"}


class LabResultValue(BaseModel):
    test: str
    value: str
    unit: str
    range: str
    status: Optional[str] = None
    trend: Optional[str] = None


class LabResultBase(BaseModel):
    patientName: str
    patientId: str
    orderId: str
    testType: str
    testCategory: str
    orderDate: date
    completedDate: Optional[date] = None
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    physician: str
    status: str = Field(..., pattern=r"^[a-z\-]+$")
    priority: str = Field(..., pattern=r"^(urgent|routine)$")
    technician: Optional[str] = None
    results: List[LabResultValue] = Field(default_factory=list)
    flags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_RESULT_STATUS:
            raise ValueError("Invalid result status")
        return value

    @validator("priority")
    def validate_priority(cls, value: str) -> str:
        if value not in _ALLOWED_PRIORITY:
            raise ValueError("Invalid priority value")
        return value


class LabResultCreate(LabResultBase):
    id: Optional[str] = None


class LabResultUpdate(BaseModel):
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    orderId: Optional[str] = None
    testType: Optional[str] = None
    testCategory: Optional[str] = None
    orderDate: Optional[date] = None
    completedDate: Optional[date] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    physician: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z\-]+$")
    priority: Optional[str] = Field(None, pattern=r"^(urgent|routine)$")
    technician: Optional[str] = None
    results: Optional[List[LabResultValue]] = None
    flags: Optional[List[str]] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"


class LabResult(LabResultBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class LabResultCollection(BaseModel):
    items: List[LabResult]
    total: int = Field(..., ge=0)
    abnormal: int = Field(..., ge=0)
    critical: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)


class LabResultStats(BaseModel):
    total: int
    completed: int
    pending: int
    abnormal: int
    critical: int





