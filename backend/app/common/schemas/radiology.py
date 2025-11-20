from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional

from pydantic import BaseModel, Field


# Reports
class RadiologyReportBase(BaseModel):
    findings: str
    impression: str
    recommendations: Optional[str] = None


class RadiologyReportCreate(RadiologyReportBase):
    study_id: str = Field(..., description="Study identifier, e.g., RAD-001")


class RadiologyReport(RadiologyReportBase):
    id: str
    study_id: str
    radiologist: str
    created_at: datetime


# Studies (shared minimal schema)
class RadiologyStudy(BaseModel):
    id: str
    accessionNumber: str
    patientName: str
    mrn: str
    modality: str
    bodyPart: str
    studyDescription: str
    studyDate: datetime
    dob: date
    age: int
    gender: str


# Messaging
class RadiologyContact(BaseModel):
    id: int
    name: str
    role: str
    type: str
    urgent: bool = False
    status: str = "offline"


class RadiologyMessage(BaseModel):
    id: int
    sender: str
    content: str
    time: str
    isMe: bool
    urgent: bool = False
    studyLink: Optional[str] = None


class RadiologyThread(BaseModel):
    contact_id: int
    messages: List[RadiologyMessage]


# PACS
class PACSStudyInfo(BaseModel):
    study_id: str
    StudyInstanceUID: str
    viewer_url: str





