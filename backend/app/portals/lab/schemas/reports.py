from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


_ALLOWED_REPORT_STATUS = {"completed", "pending", "processing", "failed"}
_ALLOWED_REPORT_TYPES = {"statistics", "patient", "quality", "alerts", "performance", "inventory"}


class ReportMetrics(BaseModel):
    metrics: Dict[str, Any] = Field(default_factory=dict)


class PatientInfo(BaseModel):
    name: str
    id: str
    age: int = Field(..., ge=0)
    gender: str


class LabReportBase(BaseModel):
    title: str
    type: str
    category: str
    generatedDate: date
    generatedTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    generatedBy: str
    status: str = Field(..., pattern=r"^[a-z]+$")
    format: str
    size: Optional[str] = None
    pages: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    period: Optional[str] = None
    recipients: List[str] = Field(default_factory=list)
    downloadCount: int = Field(0, ge=0)
    lastAccessed: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None
    patientInfo: Optional[PatientInfo] = None

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_REPORT_STATUS:
            raise ValueError("Invalid report status")
        return value

    @validator("type")
    def validate_type(cls, value: str) -> str:
        if value not in _ALLOWED_REPORT_TYPES:
            raise ValueError("Invalid report type")
        return value


class LabReportCreate(LabReportBase):
    id: Optional[str] = None


class LabReportUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    generatedDate: Optional[date] = None
    generatedTime: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    generatedBy: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z]+$")
    format: Optional[str] = None
    size: Optional[str] = None
    pages: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    period: Optional[str] = None
    recipients: Optional[List[str]] = None
    downloadCount: Optional[int] = Field(None, ge=0)
    lastAccessed: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None
    patientInfo: Optional[PatientInfo] = None

    class Config:
        extra = "forbid"


class LabReport(LabReportBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class LabReportCollection(BaseModel):
    items: List[LabReport]
    total: int = Field(..., ge=0)
    completed: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    processing: int = Field(..., ge=0)
    failed: int = Field(..., ge=0)
    downloads: int = Field(..., ge=0)


class LabReportStats(BaseModel):
    total: int
    completed: int
    pending: int
    processing: int
    failed: int
    templates: int
    downloads: int


class LabReportTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    frequency: str
    estimatedTime: str
    parameters: List[str] = Field(default_factory=list)


class LabReportTemplateCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    category: str
    frequency: str
    estimatedTime: str
    parameters: List[str] = Field(default_factory=list)


class LabReportStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^[a-z]+$")


# New schema for comprehensive lab report with test results
class TestResultParameter(BaseModel):
    """Parameter within a panel test."""
    code: Optional[str] = None
    name: Optional[str] = None
    unit: Optional[str] = None
    ref: Optional[str] = None
    ref_percent: Optional[str] = None
    resultValue: Optional[str] = None
    percentValue: Optional[str] = None
    absoluteValue: Optional[str] = None
    abnormalityType: Optional[str] = None
    isAbnormal: Optional[bool] = None


class TestResultData(BaseModel):
    """Test result data structure from frontend."""
    testName: str
    testCode: Optional[str] = None
    testType: str
    testCategory: Optional[str] = None
    
    # For numeric_single
    resultValue: Optional[str] = None
    resultUnit: Optional[str] = None
    referenceRange: Optional[str] = None
    abnormalityType: Optional[str] = None
    isAbnormal: Optional[bool] = None
    isCritical: Optional[bool] = None
    
    # For panel tests
    parameters: Optional[List[TestResultParameter]] = None
    numericParameters: Optional[List[TestResultParameter]] = None
    
    # For various test types
    interpretation: Optional[str] = None
    comments: Optional[str] = None
    
    # Store all other fields as JSON
    additionalData: Optional[Dict[str, Any]] = None


class LabReportWithTestsCreate(BaseModel):
    """Schema for creating a lab report with test results."""
    title: str
    type: str = "patient"
    category: str = "general"
    generatedDate: date
    generatedTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    generatedBy: str
    status: str = "completed"
    format: str = "pdf"
    description: Optional[str] = None
    
    # Patient and specimen info
    data: Dict[str, Any] = Field(..., description="Contains patientId, specimenType, testResults, etc.")
    patientInfo: Optional[Dict[str, Any]] = None





