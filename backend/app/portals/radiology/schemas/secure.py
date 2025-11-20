from __future__ import annotations

from typing import Dict, Optional, List

from pydantic import BaseModel, Field


class RadiologyDashboardStats(BaseModel):
    total_studies: int = Field(..., description="Total imaging studies")
    pending_studies: int = Field(..., description="Pending studies")
    completed_today: int = Field(..., description="Completed today")
    critical_findings: int = Field(..., description="Critical findings pending")
    unread_messages: int = Field(..., description="Unread messages")
    overdue_studies: int = Field(..., description="Overdue studies")


class ImagingStudy(BaseModel):
    id: str = Field(..., description="Study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    study_date: str = Field(..., description="Study date")
    modality: str = Field(..., description="Imaging modality (CT, MRI, X-ray, etc.)")
    body_part: str = Field(..., description="Body part examined")
    status: str = Field(..., description="Study status")
    priority: str = Field(..., description="Priority level")
    ordered_by: Optional[str] = Field(None, description="Ordered by doctor")
    due_date: Optional[str] = Field(None, description="Due date")
    clinical_history: Optional[str] = Field(None, description="Clinical history")
    study_notes: Optional[str] = Field(None, description="Study notes")


class RadiologyReport(BaseModel):
    id: str = Field(..., description="Report ID")
    study_id: str = Field(..., description="Imaging study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    modality: str = Field(..., description="Imaging modality")
    body_part: str = Field(..., description="Body part examined")
    report_date: str = Field(..., description="Report date")
    status: str = Field(..., description="Report status")
    findings: Optional[str] = Field(None, description="Radiological findings")
    impression: Optional[str] = Field(None, description="Impression/conclusion")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    radiologist: str = Field(..., description="Radiologist name")
    reviewed_by: Optional[str] = Field(None, description="Reviewed by")
    is_critical: bool = Field(False, description="Is critical finding")


class PACSStudy(BaseModel):
    id: str = Field(..., description="PACS study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    study_uid: str = Field(..., description="DICOM Study UID")
    series_count: int = Field(..., description="Number of series")
    image_count: int = Field(..., description="Number of images")
    modality: str = Field(..., description="Imaging modality")
    study_date: str = Field(..., description="Study date")
    study_time: str = Field(..., description="Study time")
    body_part: str = Field(..., description="Body part examined")
    status: str = Field(..., description="Study status")
    storage_location: Optional[str] = Field(None, description="Storage location")


