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
    id: str = Field(..., pattern=r"^RAD-\d{3,}$")
    accessionNumber: str
    patientName: str
    patientId: str
    mrn: str
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., pattern=r"^(M|F|O)$")
    dob: date
    studyDate: datetime
    studyTime: str
    modality: str
    bodyPart: str
    studyDescription: str
    indication: str
    priority: str = Field(..., pattern=r"^(STAT|Urgent|Routine)$")
    orderingPhysician: str
    technologist: str
    status: str
    readingStatus: str = Field(..., pattern=r"^(unread|reading|preliminary|final)$")
    imageCount: int = Field(..., ge=0)
    seriesCount: int = Field(..., ge=0)
    studySize: str
    contrast: bool
    location: str
    room: str
    protocolName: str
    assignedRadiologist: Optional[str] = None
    priorStudies: int = Field(..., ge=0)
    criticalFlag: bool = False
    tags: List[str] = Field(default_factory=list)
    turnaroundTime: str
    estimatedReadTime: str
    preliminaryFindings: Optional[str] = None
    finalReport: Optional[FinalReport] = None


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





