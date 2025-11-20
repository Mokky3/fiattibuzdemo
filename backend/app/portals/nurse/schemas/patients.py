from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field


class NursePatientBase(BaseModel):
    firstName: str
    lastName: str
    patientId: str = Field(..., pattern=r"^[A-Za-z0-9\-]+$")
    age: int = Field(..., ge=0, le=150)
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class NursePatientCreate(NursePatientBase):
    pass


class NursePatientUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    patientId: Optional[str] = Field(None, pattern=r"^[A-Za-z0-9\-]+$")
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"


class NursePatient(NursePatientBase):
    id: str


class NursePatientCollection(BaseModel):
    items: List[NursePatient]
    total: int = Field(..., ge=0)


# Patient Profile Schemas for Nurse View
class EmergencyContactInfo(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class AssignedDoctor(BaseModel):
    id: str
    name: str
    department: Optional[str] = None
    specialty: Optional[str] = None


class RoomBedInfo(BaseModel):
    roomNumber: Optional[str] = None
    bedNumber: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None


class VitalSignEntry(BaseModel):
    id: str
    measuredAt: datetime
    temperature: Optional[float] = None
    bloodPressure: Optional[str] = None  # "120/80"
    heartRate: Optional[int] = None
    respiratoryRate: Optional[int] = None
    oxygenSaturation: Optional[int] = None
    painScale: Optional[int] = None
    height: Optional[float] = None  # Height in cm
    weight: Optional[float] = None  # Weight in kg
    bmi: Optional[float] = None  # BMI (calculated)
    measuredBy: Optional[str] = None
    notes: Optional[str] = None


class ClinicalObservation(BaseModel):
    id: str
    recordedAt: datetime
    observation: str
    recordedBy: str
    category: Optional[str] = None  # "general", "pain", "wound", etc.


class NoteInfo(BaseModel):
    id: str
    noteType: str  # "soap", "progress", "consultation", "discharge", "operative"
    noteDate: datetime
    content: Optional[str] = None  # For non-SOAP notes
    subjective: Optional[str] = None  # SOAP format
    objective: Optional[str] = None  # SOAP format
    assessment: Optional[str] = None  # SOAP format
    plan: Optional[str] = None  # SOAP format
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None


class AllergyInfo(BaseModel):
    id: str
    allergen: str
    severity: Optional[str] = None
    reaction: Optional[str] = None
    status: str  # "active", "inactive"
    recordedAt: Optional[datetime] = None


class ImmunizationInfo(BaseModel):
    id: str
    vaccine: str
    date: date
    lotNumber: Optional[str] = None
    administeredBy: Optional[str] = None


class MedicationInfo(BaseModel):
    id: str
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None  # "oral", "IV", etc.
    status: str  # "active", "completed", "discontinued"
    prescribedBy: Optional[str] = None
    startDate: Optional[date] = None
    endDate: Optional[date] = None


class TreatmentPlanItem(BaseModel):
    id: str
    description: str
    type: str  # "medication", "procedure", "therapy", etc.
    status: str  # "pending", "in-progress", "completed", "cancelled"
    orderedBy: Optional[str] = None
    orderedAt: Optional[datetime] = None
    administeredAt: Optional[datetime] = None
    administeredBy: Optional[str] = None
    notes: Optional[str] = None


class LabResultInfo(BaseModel):
    id: str
    testName: str
    result: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    referenceRange: Optional[str] = None
    status: str  # "normal", "abnormal", "critical"
    orderedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None


class ImagingResultInfo(BaseModel):
    id: str
    studyType: str  # "X-Ray", "CT", "MRI", etc.
    bodyPart: Optional[str] = None
    orderedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    status: str  # "ordered", "in-progress", "completed", "cancelled"
    report: Optional[str] = None
    orderedBy: Optional[str] = None


class DocumentInfo(BaseModel):
    id: str
    name: str
    type: str  # "lab_report", "discharge_summary", "nursing_report", etc.
    uploadedAt: datetime
    uploadedBy: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None


class MedicalHistoryItem(BaseModel):
    id: str
    condition: str
    diagnosisDate: Optional[date] = None
    status: str  # "active", "resolved", "chronic"
    notes: Optional[str] = None


class PatientProfileOverview(BaseModel):
    """Basic patient overview - visible and partially editable"""
    id: str
    firstName: str
    lastName: str
    fullName: str
    age: int
    gender: str
    photo: Optional[str] = None
    patientId: str
    pinfl: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    assignedDoctors: List[AssignedDoctor] = []
    department: Optional[str] = None
    roomBed: Optional[RoomBedInfo] = None
    emergencyContact: Optional[EmergencyContactInfo] = None
    isEditable: bool = False  # Whether nurse can edit demographic info


class PatientProfileClinical(BaseModel):
    """Clinical information - read + limited write"""
    vitalSigns: List[VitalSignEntry] = []
    observations: List[ClinicalObservation] = []
    medicalHistory: List[MedicalHistoryItem] = []
    allergies: List[AllergyInfo] = []
    immunizations: List[ImmunizationInfo] = []
    medications: List[MedicationInfo] = []
    treatmentPlans: List[TreatmentPlanItem] = []
    labResults: List[LabResultInfo] = []
    imagingResults: List[ImagingResultInfo] = []
    notes: List[NoteInfo] = []


class PatientProfileDocuments(BaseModel):
    """Documents and reports"""
    documents: List[DocumentInfo] = []
    canUpload: bool = True
    canDelete: bool = False


class NursePatientProfile(BaseModel):
    """Complete patient profile for nurse view"""
    overview: PatientProfileOverview
    clinical: PatientProfileClinical
    documents: PatientProfileDocuments
    lastUpdated: Optional[datetime] = None


# Request schemas for nurse actions
class CreateVitalSignRequest(BaseModel):
    patientId: str
    temperature: Optional[float] = None
    bloodPressureSystolic: Optional[int] = None
    bloodPressureDiastolic: Optional[int] = None
    heartRate: Optional[int] = None
    respiratoryRate: Optional[int] = None
    oxygenSaturation: Optional[int] = None
    painScale: Optional[int] = Field(None, ge=0, le=10)
    height: Optional[float] = Field(None, gt=0, description="Height in cm")
    weight: Optional[float] = Field(None, gt=0, description="Weight in kg")
    notes: Optional[str] = None
    measuredAt: Optional[datetime] = None  # If not provided, uses current time


class CreateObservationRequest(BaseModel):
    patientId: str
    observation: str = Field(..., min_length=1, max_length=1000)
    category: Optional[str] = None  # "general", "pain", "wound", etc.
    recordedAt: Optional[datetime] = None  # If not provided, uses current time


class AddAllergyRequest(BaseModel):
    patientId: str
    allergen: str = Field(..., min_length=1, max_length=200)
    severity: Optional[str] = None  # "mild", "moderate", "severe", "life-threatening"
    reaction: Optional[str] = None
    recordedAt: Optional[datetime] = None


class AddImmunizationRequest(BaseModel):
    patientId: str
    vaccine: str = Field(..., min_length=1, max_length=200)
    lotNumber: Optional[str] = None
    date: Union[str, date, None] = None  # Immunization date (YYYY-MM-DD format). If not provided, uses current date


class MarkTreatmentAdministeredRequest(BaseModel):
    treatmentPlanId: str
    notes: Optional[str] = None
    administeredAt: Optional[datetime] = None  # If not provided, uses current time





