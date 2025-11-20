from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.common.enums import ServiceRequestStatus, ServiceRequestPriority, ServiceRequestIntent, LEGACY_TO_FHIR_STATUS, LEGACY_TO_FHIR_PRIORITY, LEGACY_TO_FHIR_INTENT




class LabOrderTest(BaseModel):
    id: str
    name: str
    category: str
    code: str
    cost: float = Field(..., ge=0)


class LabOrderTestCreate(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    code: str
    cost: float = Field(..., ge=0)


class LabOrderBase(BaseModel):
    model_config = ConfigDict(use_enum_values=True)  # serialize enums as strings
    
    patientName: str
    patientId: str
    age: int
    gender: str
    orderDate: date
    orderTime: str
    physician: str
    department: str
    status: str
    priority: str
    sampleType: str
    clinicalInfo: Optional[str] = None
    instructions: Optional[str] = None
    estimatedTime: Optional[str] = None
    totalCost: float
    insurance: Optional[str] = None
    authorizedBy: Optional[str] = None
    notes: Optional[str] = None




class LabOrder(LabOrderBase):
    id: str
    orderNumber: str
    tests: List[LabOrderTest] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime


class LabOrderCreate(LabOrderBase):
    id: Optional[str] = None
    tests: List[LabOrderTestCreate] = Field(default_factory=list)


class LabOrderUpdate(BaseModel):
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    age: Optional[int] = Field(None, ge=0)
    gender: Optional[str] = None
    orderDate: Optional[date] = None
    orderTime: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    physician: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z\-]+$")
    priority: Optional[str] = Field(None, pattern=r"^(urgent|routine)$")
    sampleType: Optional[str] = None
    clinicalInfo: Optional[str] = None
    instructions: Optional[str] = None
    estimatedTime: Optional[str] = None
    totalCost: Optional[float] = Field(None, ge=0)
    insurance: Optional[str] = None
    authorizedBy: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"


class LabOrderCollection(BaseModel):
    items: List[LabOrder]
    total: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    completed: int = Field(..., ge=0)
    urgent: int = Field(..., ge=0)
    cancelled: int = Field(..., ge=0)


class LabOrderStatusUpdate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: ServiceRequestStatus

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        """Allow DB strings and map legacy → canonical."""
        if isinstance(v, str):
            vv = v.strip().lower()
            vv = LEGACY_TO_FHIR_STATUS.get(vv, vv)
            return vv
        return v


class LabOrderStats(BaseModel):
    total: int
    pending: int
    completed: int
    urgent: int
    cancelled: int



