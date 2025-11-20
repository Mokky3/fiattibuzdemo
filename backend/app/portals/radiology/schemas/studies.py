from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class RadiologyStudyBase(BaseModel):
    accessionNumber: str = Field(..., description="Unique accession identifier")
    patientName: str = Field(..., description="Full patient name")
    mrn: str = Field(..., description="Medical record number")
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    gender: str = Field(..., pattern=r"^(M|F|O)$", description="Gender code")
    dob: date = Field(..., description="Date of birth")
    phone: str = Field(..., description="Primary contact phone number")
    email: EmailStr = Field(..., description="Contact email address")
    address: str = Field(..., description="Mailing address")
    orderDate: datetime = Field(..., description="Order timestamp")
    scheduledDate: datetime = Field(..., description="Scheduled start timestamp")
    modality: str = Field(..., description="Imaging modality")
    bodyPart: str = Field(..., description="Body part to image")
    studyDescription: str = Field(..., description="Study protocol description")
    indication: str = Field(..., description="Clinical indication")
    priority: str = Field(..., pattern=r"^(STAT|Urgent|Routine)$", description="Ordering priority")
    status: str = Field(..., pattern=r"^(scheduled|in_progress|completed|cancelled)$", description="Workflow status")
    orderingPhysician: str = Field(..., description="Ordering provider")
    technologist: str = Field(..., description="Assigned technologist")
    location: str = Field(..., description="Facility or department")
    room: str = Field(..., description="Exam room")
    contrast: bool = Field(..., description="Whether contrast is required")
    preparation: Optional[str] = Field(None, description="Patient preparation notes")
    duration: int = Field(..., ge=0, description="Estimated duration in minutes")
    notes: Optional[str] = Field(None, description="Operational notes")
    insurance: str = Field(..., description="Insurance provider")
    authorization: str = Field(..., description="Pre-authorization code")
    cptCode: str = Field(..., description="Primary CPT code")


class RadiologyStudy(RadiologyStudyBase):
    id: str = Field(..., pattern=r"^RAD-\d{3,}$", description="Study identifier")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")


class RadiologyStudyCreate(RadiologyStudyBase):
    id: Optional[str] = Field(None, pattern=r"^RAD-\d{3,}$", description="Optional explicit identifier")


class RadiologyStudyUpdate(BaseModel):
    accessionNumber: Optional[str] = None
    patientName: Optional[str] = None
    mrn: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[str] = Field(None, pattern=r"^(M|F|O)$")
    dob: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    orderDate: Optional[datetime] = None
    scheduledDate: Optional[datetime] = None
    modality: Optional[str] = None
    bodyPart: Optional[str] = None
    studyDescription: Optional[str] = None
    indication: Optional[str] = None
    priority: Optional[str] = Field(None, pattern=r"^(STAT|Urgent|Routine)$")
    status: Optional[str] = Field(None, pattern=r"^(scheduled|in_progress|completed|cancelled)$")
    orderingPhysician: Optional[str] = None
    technologist: Optional[str] = None
    location: Optional[str] = None
    room: Optional[str] = None
    contrast: Optional[bool] = None
    preparation: Optional[str] = None
    duration: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    insurance: Optional[str] = None
    authorization: Optional[str] = None
    cptCode: Optional[str] = None

    class Config:
        extra = "forbid"


class RadiologyStudySummary(BaseModel):
    total: int = Field(..., ge=0)
    statusCounts: Dict[str, int]
    priorityCounts: Dict[str, int]
    modalityCounts: Dict[str, int]
    scheduledToday: int = Field(..., ge=0)
    statPriority: int = Field(..., ge=0)


class RadiologyStudyCollection(BaseModel):
    items: List[RadiologyStudy]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    summary: RadiologyStudySummary





