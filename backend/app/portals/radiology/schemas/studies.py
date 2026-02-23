from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class RadiologyStudyBase(BaseModel):
    accessionNumber: Optional[str] = Field(None, description="Unique accession identifier")
    patientName: Optional[str] = Field(None, description="Full patient name")
    mrn: Optional[str] = Field(None, description="Medical record number")
    age: Optional[int] = Field(None, ge=0, le=120, description="Patient age in years")
    gender: Optional[str] = Field(None, pattern=r"^(M|F|O)$", description="Gender code")
    dob: Optional[date] = Field(None, description="Date of birth")
    phone: str = Field("", description="Primary contact phone number")
    email: str = Field("", description="Contact email address")
    address: str = Field("", description="Mailing address")
    orderDate: Optional[datetime] = Field(None, description="Order timestamp")
    scheduledDate: Optional[datetime] = Field(None, description="Scheduled start timestamp")
    modality: Optional[str] = Field(None, description="Imaging modality")
    bodyPart: Optional[str] = Field(None, description="Body part to image")
    studyDescription: Optional[str] = Field(None, description="Study protocol description")
    indication: Optional[str] = Field(None, description="Clinical indication")
    priority: Optional[str] = Field(None, description="Ordering priority")
    status: str = Field(..., description="Workflow status")
    orderingPhysician: Optional[str] = Field(None, description="Ordering provider")
    technologist: Optional[str] = Field(None, description="Assigned technologist")
    location: Optional[str] = Field(None, description="Facility or department")
    room: Optional[str] = Field(None, description="Exam room")
    contrast: bool = Field(False, description="Whether contrast is required")
    preparation: Optional[str] = Field(None, description="Patient preparation notes")
    duration: int = Field(0, ge=0, description="Estimated duration in minutes")
    notes: Optional[str] = Field(None, description="Operational notes")
    insurance: Optional[str] = Field(None, description="Insurance provider")
    authorization: Optional[str] = Field(None, description="Pre-authorization code")
    cptCode: Optional[str] = Field(None, description="Primary CPT code")


class RadiologyStudy(RadiologyStudyBase):
    id: str = Field(..., description="Study identifier (UUID)")
    patientId: Optional[str] = Field(None, description="Patient identifier (UUID)")
    studyInstanceUid: Optional[str] = Field(None, description="DICOM Study Instance UID")
    orthancStudyId: Optional[str] = Field(None, description="Orthanc Study ID")
    createdAt: Optional[datetime] = Field(None, description="Creation timestamp")
    updatedAt: Optional[datetime] = Field(None, description="Last update timestamp")


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





