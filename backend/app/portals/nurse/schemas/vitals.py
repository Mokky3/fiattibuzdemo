from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, validator


_ALLOWED_STATUS = {"normal", "attention", "abnormal", "pending"}


class VitalMeasurement(BaseModel):
    id: str
    patient: str
    patientId: Optional[str] = None  # Patient ID for navigation
    room: str
    date: date
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    temperature: Optional[str] = None
    bloodPressure: Optional[str] = None
    heartRate: Optional[str] = None
    respiratory: Optional[str] = None
    oxygenSat: Optional[str] = None
    pain: Optional[str] = None
    status: str
    nurse: Optional[str] = None
    alerts: List[str] = Field(default_factory=list)

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_STATUS:
            raise ValueError("Invalid status value")
        return value


class VitalMeasurementCreate(BaseModel):
    patient: str
    room: str
    date: date
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    temperature: Optional[str] = None
    bloodPressure: Optional[str] = None
    heartRate: Optional[str] = None
    respiratory: Optional[str] = None
    oxygenSat: Optional[str] = None
    pain: Optional[str] = None
    status: str
    nurse: Optional[str] = None
    alerts: List[str] = Field(default_factory=list)

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_STATUS:
            raise ValueError("Invalid status value")
        return value


class VitalMeasurementUpdate(BaseModel):
    patient: Optional[str] = None
    room: Optional[str] = None
    date: Optional[date] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    temperature: Optional[str] = None
    bloodPressure: Optional[str] = None
    heartRate: Optional[str] = None
    respiratory: Optional[str] = None
    oxygenSat: Optional[str] = None
    pain: Optional[str] = None
    status: Optional[str] = None
    nurse: Optional[str] = None
    alerts: Optional[List[str]] = None

    class Config:
        extra = "forbid"


class VitalCollection(BaseModel):
    items: List[VitalMeasurement]
    total: int = Field(..., ge=0)
    normal: int = Field(..., ge=0)
    attention: int = Field(..., ge=0)
    abnormal: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)


class VitalStats(BaseModel):
    total: int
    normal: int
    attention: int
    abnormal: int
    pending: int





