from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class FinalReport(BaseModel):
    radiologist: str
    reportDate: datetime
    impression: str
    findings: str


class WorklistStudy(BaseModel):
    id: str = Field(..., description="Study identifier (UUID)")
    accessionNumber: Optional[str] = None
    patientName: Optional[str] = None
    patientId: str = Field("", description="Patient ID")
    mrn: Optional[str] = None
    age: int = Field(0, ge=0, le=130)
    gender: str = Field("O", pattern=r"^(M|F|O)$")
    dob: Optional[date] = None
    studyDate: Optional[datetime] = None
    studyTime: str = Field("", description="Study time as HH:MM")
    modality: Optional[str] = None
    bodyPart: Optional[str] = None
    studyDescription: Optional[str] = None
    indication: Optional[str] = None
    priority: Optional[str] = None
    orderingPhysician: Optional[str] = None
    technologist: Optional[str] = None
    status: str = Field(..., description="Study status")
    readingStatus: str = Field("unread", pattern=r"^(unread|reading|preliminary|final)$")
    imageCount: int = Field(0, ge=0)
    seriesCount: int = Field(0, ge=0)
    studySize: str = Field("", description="Study size")
    contrast: bool = False
    location: Optional[str] = None
    room: Optional[str] = None
    protocolName: str = Field("", description="Protocol name")
    assignedRadiologist: Optional[str] = None
    priorStudies: int = Field(0, ge=0)
    criticalFlag: bool = False
    tags: List[str] = Field(default_factory=list)
    turnaroundTime: str = Field("", description="Turnaround time")
    estimatedReadTime: str = Field("", description="Estimated read time")
    preliminaryFindings: Optional[str] = None
    finalReport: Optional[FinalReport] = None
    studyInstanceUID: Optional[str] = Field(None, description="DICOM Study Instance UID")
    orthancStudyId: Optional[str] = Field(None, description="Orthanc Study ID")


class WorklistSummary(BaseModel):
    total: int = Field(..., ge=0)
    unread: int = Field(..., ge=0)
    reading: int = Field(..., ge=0)
    preliminary: int = Field(..., ge=0)
    final: int = Field(..., ge=0)
    statCount: int = Field(..., ge=0)
    urgentCount: int = Field(..., ge=0)
    routineCount: int = Field(..., ge=0)
    criticalCount: int = Field(..., ge=0)
    byModality: Dict[str, int]
    byAssigned: Dict[str, int]


class WorklistCollection(BaseModel):
    items: List[WorklistStudy]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    summary: WorklistSummary


class WorklistUpdate(BaseModel):
    assignedRadiologist: Optional[str] = None
    readingStatus: Optional[str] = Field(None, pattern=r"^(unread|reading|preliminary|final)$")
    status: Optional[str] = None
    criticalFlag: Optional[bool] = None
    tags: Optional[List[str]] = None
    preliminaryFindings: Optional[str] = None
    finalReport: Optional[FinalReport] = None

    class Config:
        extra = "forbid"


class AssignRequest(BaseModel):
    radiologist: Optional[str] = None


class ReadingStatusRequest(BaseModel):
    readingStatus: str = Field(..., pattern=r"^(unread|reading|preliminary|final)$")
    preliminaryFindings: Optional[str] = None





