"""Doctor portal - patients router
Comprehensive patient management with reports and prescriptions
"""
from datetime import datetime, date, timezone
from typing import Dict, List, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, status
from pydantic import BaseModel, EmailStr

from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor/patients", tags=["Doctor · Patients"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models - Updated to match your existing structure
# ──────────────────────────────────────────────────────────────────────────────

# Patient Models (Updated to match frontend expectations)
class Patient(BaseModel):
    id: str
    first_name: str
    last_name: str
    patient_code: str
    gender: str                    # "male" | "female"
    date_of_birth: str            # ISO date string
    age: int
    height: Optional[str] = None   # "180 cm"
    weight: Optional[str] = None   # "75 kg"
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure: Optional[str] = None
    blood_group: Optional[str] = None
    rh_factor: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    temporary_address: Optional[str] = None
    work_place: Optional[str] = None
    occupation: Optional[str] = None

# Report Models (for Patient.jsx reports tab)
class ReportSummary(BaseModel):
    id: str
    date: str
    time: str
    problem: str
    description: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    doctor_name: str
    patient_id: str

# Prescription Models (matching your existing prescriptions.py)
class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    status: str = "active"

class PrescriptionDTO(BaseModel):
    id: str
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    status: str  # "active", "completed", "cancelled"
    prescribed_date: str
    doctor_name: str

# ──────────────────────────────────────────────────────────────────────────────
# Mock Data Stores - Enhanced with proper structure
# ──────────────────────────────────────────────────────────────────────────────

_PATIENTS: Dict[str, Patient] = {
    "p1": Patient(
        id="p1",
        first_name="Jane",
        last_name="Doe",
        patient_code="PT-2024-001",
        gender="female",
        date_of_birth="1994-03-12",
        age=31,
        height="168 cm",
        weight="60 kg",
        bmi="21.3",
        temperature="36.6 °C",
        blood_pressure="118/75",
        blood_group="A",
        rh_factor="+",
        phone_number="+998 90 000-00-00",
        email="jane@example.com",
        address="Tashkent, Amir Temur Avenue",
        temporary_address=None,
        work_place="Tech Solutions LLC",
        occupation="Software Engineer"
    ),
    "p2": Patient(
        id="p2",
        first_name="John",
        last_name="Smith",
        patient_code="PT-2024-002",
        gender="male",
        date_of_birth="1988-07-25",
        age=36,
        height="175 cm",
        weight="80 kg",
        bmi="26.1",
        temperature="36.5 °C",
        blood_pressure="125/80",
        blood_group="O",
        rh_factor="+",
        phone_number="+998 91 123-45-67",
        email="john.smith@example.com",
        address="Tashkent, Mustaqillik Avenue 45",
        temporary_address="Samarkand, Registan Street 12",
        work_place="Uzbekistan Airways",
        occupation="Pilot"
    )
}

_REPORTS: Dict[str, ReportSummary] = {
    "r1": ReportSummary(
        id="r1",
        date="2024-07-10",
        time="14:30",
        problem="Chest Pain",
        description="Patient experiencing mild chest discomfort for 2 days",
        diagnosis="Mild costochondritis",
        treatment="Pain management and rest",
        doctor_name="Dr. Sarah Johnson",
        patient_id="p1"
    ),
    "r2": ReportSummary(
        id="r2",
        date="2024-07-08",
        time="09:15",
        problem="Routine Checkup",
        description="Annual health screening and vital signs check",
        diagnosis="Normal health status",
        treatment="Continue current lifestyle",
        doctor_name="Dr. Sarah Johnson",
        patient_id="p1"
    ),
    "r3": ReportSummary(
        id="r3",
        date="2024-07-12",
        time="16:45",
        problem="Back Pain",
        description="Lower back pain after physical activity",
        diagnosis="Muscle strain",
        treatment="Physical therapy and medication",
        doctor_name="Dr. Michael Chen",
        patient_id="p2"
    )
}

# Import prescription cache from your existing prescriptions router
# In a real implementation, you'd have shared storage
_PRESCRIPTIONS: Dict[str, PrescriptionDTO] = {}

# ──────────────────────────────────────────────────────────────────────────────
# Patient Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[Patient])
async def list_patients(
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get all patients for the sidebar list - matches your existing endpoint"""
    return list(_PATIENTS.values())


@router.get("/{patient_id}", response_model=Patient)
async def get_patient(
    patient_id: str = Path(..., description="Patient ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get detailed patient information"""
    patient = _PATIENTS.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ──────────────────────────────────────────────────────────────────────────────
# Report Endpoints - These integrate with your reports router
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{patient_id}/reports", response_model=List[ReportSummary])
async def get_patient_reports(
    patient_id: str = Path(..., description="Patient ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get all reports for a specific patient"""
    # Verify patient exists
    if patient_id not in _PATIENTS:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Return reports for this patient, sorted by date (newest first)
    patient_reports = [
        report for report in _REPORTS.values() 
        if report.patient_id == patient_id
    ]
    
    # Sort by date and time (newest first)
    patient_reports.sort(
        key=lambda x: (x.date, x.time), 
        reverse=True
    )
    
    return patient_reports


# ──────────────────────────────────────────────────────────────────────────────
# Prescription Endpoints - These integrate with your prescriptions router
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{patient_id}/prescriptions", response_model=List[PrescriptionDTO])
async def get_patient_prescriptions(
    patient_id: str = Path(..., description="Patient ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get all prescriptions for a specific patient"""
    # Verify patient exists
    if patient_id not in _PATIENTS:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Import the prescription cache from your prescriptions router
    # In real implementation, this would query the same FHIR store
    try:
        from .prescriptions import _PRESC_CACHE
        # Return prescriptions for this patient, sorted by date (newest first)
        patient_prescriptions = [
            prescription for prescription in _PRESC_CACHE.values() 
            if prescription.patient_id == patient_id
        ]
    except ImportError:
        # Fallback to local cache if prescriptions router not available
        patient_prescriptions = [
            prescription for prescription in _PRESCRIPTIONS.values()
            if prescription.patient_id == patient_id
        ]
    
    # Sort by prescribed date (newest first)
    patient_prescriptions.sort(
        key=lambda x: x.prescribed_date, 
        reverse=True
    )
    
    return patient_prescriptions


# ──────────────────────────────────────────────────────────────────────────────
# Additional endpoints needed by your frontend
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str = Path(..., description="Report ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Delete a specific report - delegates to reports router in real implementation"""
    if report_id not in _REPORTS:
        raise HTTPException(status_code=404, detail="Report not found")
    
    del _REPORTS[report_id]


@router.delete("/prescriptions/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prescription(
    prescription_id: str = Path(..., description="Prescription ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Delete a specific prescription - delegates to prescriptions router"""
    try:
        from .prescriptions import _PRESC_CACHE
        if prescription_id not in _PRESC_CACHE:
            raise HTTPException(status_code=404, detail="Prescription not found")
        del _PRESC_CACHE[prescription_id]
    except ImportError:
        if prescription_id not in _PRESCRIPTIONS:
            raise HTTPException(status_code=404, detail="Prescription not found")
        del _PRESCRIPTIONS[prescription_id]


@router.patch("/prescriptions/{prescription_id}/status")
async def update_prescription_status(
    prescription_id: str = Path(..., description="Prescription ID"),
    status_update: dict = Body(..., example={"status": "completed"}),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Update prescription status - delegates to prescriptions router"""
    new_status = status_update.get("status")
    if new_status not in ["active", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        from .prescriptions import _PRESC_CACHE
        if prescription_id not in _PRESC_CACHE:
            raise HTTPException(status_code=404, detail="Prescription not found")
        _PRESC_CACHE[prescription_id].status = new_status
    except ImportError:
        if prescription_id not in _PRESCRIPTIONS:
            raise HTTPException(status_code=404, detail="Prescription not found")
        _PRESCRIPTIONS[prescription_id].status = new_status
    
    return {"message": "Status updated successfully"}


# ──────────────────────────────────────────────────────────────────────────────
# Utility Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{patient_id}/summary")
async def get_patient_summary(
    patient_id: str = Path(..., description="Patient ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get patient summary with counts of reports and prescriptions"""
    if patient_id not in _PATIENTS:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = _PATIENTS[patient_id]
    
    # Count reports and prescriptions
    reports_count = len([r for r in _REPORTS.values() if r.patient_id == patient_id])
    
    # Import prescription cache for counting
    try:
        from .prescriptions import _PRESC_CACHE
        prescriptions_count = len([p for p in _PRESC_CACHE.values() if p.patient_id == patient_id])
        active_prescriptions_count = len([
            p for p in _PRESC_CACHE.values() 
            if p.patient_id == patient_id and p.status == "active"
        ])
    except ImportError:
        prescriptions_count = len([p for p in _PRESCRIPTIONS.values() if p.patient_id == patient_id])
        active_prescriptions_count = len([
            p for p in _PRESCRIPTIONS.values() 
            if p.patient_id == patient_id and p.status == "active"
        ])
    
    return {
        "patient": patient,
        "summary": {
            "total_reports": reports_count,
            "total_prescriptions": prescriptions_count,
            "active_prescriptions": active_prescriptions_count
        }
    }