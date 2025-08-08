"""Doctor portal – medical reports router
Internally uses FHIR DocumentReference resources while preserving the existing
public REST contract expected by the React UI.
"""
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status
from pydantic import BaseModel

from .auth import get_current_doctor, DoctorUser
# from db import fhir_repo  # ↖ your DB abstraction (save / get / delete) - TODO: implement FHIR repository

router = APIRouter(prefix="/api/doctor/reports", tags=["Doctor · Reports"])

# ──────────────────────────────────────────────────────────────────────────────
# Incoming payload from the React UI
# ──────────────────────────────────────────────────────────────────────────────
class CreateReport(BaseModel):
    patientId: str
    specialty: str
    code: str  # e.g. "#025"
    data: Dict[str, Any]

# Thin DTO back to the UI
class ReportSummary(BaseModel):
    id: str            # QuestionnaireResponse.id
    bundleId: str      # FHIR Bundle id (optional for the UI)
    date: str
    doctor: Dict[str, str]

# Enhanced models for UI-friendly report viewing
class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

class FollowUp(BaseModel):
    reason: str
    date: str

class Doctor(BaseModel):
    name: str
    specialty: str
    department: str

class ReportView(BaseModel):
    id: str
    date: str
    doctor: Doctor
    chiefComplaint: str
    historyOfPresentIllness: str
    physicalExamination: str
    diagnosis: str
    treatmentPlan: str
    medications: List[Medication]
    followUp: FollowUp
    additionalNotes: str

# ──────────────────────────────────────────────────────────────────────────────
# Helper functions for data transformation
# ──────────────────────────────────────────────────────────────────────────────
def transform_fhir_to_ui_format(bundle: Dict, qr_id: str, doctor: DoctorUser) -> ReportView:
    """Transform FHIR Bundle to UI-friendly format for ViewReport component."""
    
    # Find the QuestionnaireResponse
    qr = next(
        (e["resource"] for e in bundle["entry"] 
         if e["resource"]["resourceType"] == "QuestionnaireResponse" 
         and e["resource"]["id"] == qr_id), 
        None
    )
    
    if not qr:
        raise HTTPException(status_code=404, detail="QuestionnaireResponse not found")
    
    # Extract answers from QuestionnaireResponse
    answers = {}
    for item in qr.get("item", []):
        link_id = item.get("linkId")
        if item.get("answer"):
            # Handle different answer types
            answer = item["answer"][0]
            if "valueString" in answer:
                answers[link_id] = answer["valueString"]
            elif "valueBoolean" in answer:
                answers[link_id] = answer["valueBoolean"]
            elif "valueDateTime" in answer:
                answers[link_id] = answer["valueDateTime"]
            elif "valueInteger" in answer:
                answers[link_id] = answer["valueInteger"]
    
    # Parse medications from the data
    medications = []
    medication_data = answers.get("medications", [])
    if isinstance(medication_data, str):
        # If medications are stored as a string, try to parse them
        try:
            import json
            medication_data = json.loads(medication_data)
        except:
            medication_data = []
    
    if isinstance(medication_data, list):
        for med in medication_data:
            if isinstance(med, dict):
                medications.append(Medication(
                    name=med.get("name", ""),
                    dosage=med.get("dosage", ""),
                    frequency=med.get("frequency", ""),
                    duration=med.get("duration", "")
                ))
    
    # Parse follow-up information
    follow_up = FollowUp(
        reason=answers.get("followUpReason", "Regular follow-up"),
        date=answers.get("followUpDate", "Not scheduled")
    )
    
    # Create doctor information
    doctor_info = Doctor(
        name=doctor.full_name,
        specialty=answers.get("specialty", "General Medicine"),
        department=answers.get("department", "General Department")
    )
    
    # Format the date
    authored_date = qr.get("authored", datetime.now(timezone.utc).isoformat())
    if "T" in authored_date:
        formatted_date = datetime.fromisoformat(authored_date.replace("Z", "+00:00")).strftime("%B %d, %Y")
    else:
        formatted_date = authored_date
    
    return ReportView(
        id=qr_id,
        date=formatted_date,
        doctor=doctor_info,
        chiefComplaint=answers.get("chiefComplaint", ""),
        historyOfPresentIllness=answers.get("historyOfPresentIllness", ""),
        physicalExamination=answers.get("physicalExamination", ""),
        diagnosis=answers.get("diagnosis", ""),
        treatmentPlan=answers.get("treatmentPlan", ""),
        medications=medications,
        followUp=follow_up,
        additionalNotes=answers.get("additionalNotes", "")
    )

def extract_form_data_for_fhir(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and normalize form data for FHIR storage."""
    normalized_data = {}
    
    # Standard medical report fields
    medical_fields = [
        "chiefComplaint",
        "historyOfPresentIllness", 
        "physicalExamination",
        "diagnosis",
        "treatmentPlan",
        "additionalNotes",
        "followUpReason",
        "followUpDate"
    ]
    
    for field in medical_fields:
        if field in data:
            normalized_data[field] = data[field]
    
    # Handle medications specially
    if "medications" in data:
        normalized_data["medications"] = data["medications"]
    
    # Include any additional specialty-specific fields
    for key, value in data.items():
        if key not in normalized_data:
            normalized_data[key] = value
    
    return normalized_data

# ──────────────────────────────────────────────────────────────────────────────
# End‑points
# ──────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=ReportSummary, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: CreateReport = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
):
    """Save Midwifery / General form as FHIR resources."""

    # 1️⃣  Extract and normalize form data
    form_data = extract_form_data_for_fhir(payload.data)
    
    # 2️⃣  Build resources
    qr = build_questionnaire_response(
        questionnaire_code=payload.code,
        answers=form_data,
        patient_id=payload.patientId,
        author_id=current.id,
    )
    observations = build_observations_from_form(form_data, payload.patientId)

    # 3️⃣  Bundle (type=transaction)
    bundle_id = f"bundle-{uuid4().hex[:8]}"
    bundle = {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "transaction",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entry": [{"resource": r} for r in [qr, *observations]],
    }

    # 4️⃣  Persist
    fhir_repo.save(bundle_id, bundle)

    # 5️⃣  Return summary understood by the React UI
    return ReportSummary(
        id=qr["id"],
        bundleId=bundle_id,
        date=qr["authored"],
        doctor={"name": current.full_name, "specialty": payload.specialty},
    )


@router.get("/{qr_id}", response_model=ReportView)
async def get_report(
    qr_id: str = Path(..., description="QuestionnaireResponse.id"),
    current: DoctorUser = Depends(get_current_doctor),
):
    """Return the report in UI-friendly format for ViewReport component."""
    bundle = fhir_repo.get_by_qr_id(qr_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Transform FHIR data to UI format
    return transform_fhir_to_ui_format(bundle, qr_id, current)


@router.get("/{qr_id}/fhir", response_model=Dict)
async def get_report_fhir(
    qr_id: str = Path(..., description="QuestionnaireResponse.id"),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Return the raw FHIR QuestionnaireResponse (for debugging/integration)."""
    bundle = fhir_repo.get_by_qr_id(qr_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Report not found")
    
    qr = next(
        (e["resource"] for e in bundle["entry"] 
         if e["resource"]["resourceType"] == "QuestionnaireResponse" 
         and e["resource"]["id"] == qr_id), 
        None
    )
    
    if not qr:
        raise HTTPException(status_code=404, detail="QuestionnaireResponse not found")
    
    return qr


@router.delete("/{qr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    qr_id: str,
    _: DoctorUser = Depends(get_current_doctor),
):
    """Delete a report by QuestionnaireResponse ID."""
    if not fhir_repo.delete_by_qr_id(qr_id):
        raise HTTPException(status_code=404, detail="Report not found")


@router.get("", response_model=List[ReportSummary])
async def list_reports(
    patient_id: Optional[str] = None,
    current: DoctorUser = Depends(get_current_doctor),
):
    """List all reports, optionally filtered by patient ID."""
    bundles = fhir_repo.list_bundles(patient_id=patient_id, doctor_id=current.id)
    
    summaries = []
    for bundle in bundles:
        # Find QuestionnaireResponse in each bundle
        qr = next(
            (e["resource"] for e in bundle["entry"] 
             if e["resource"]["resourceType"] == "QuestionnaireResponse"), 
            None
        )
        
        if qr:
            # Extract specialty from the questionnaire or default
            specialty = "General Medicine"
            if qr.get("item"):
                for item in qr["item"]:
                    if item.get("linkId") == "specialty":
                        specialty = item.get("answer", [{}])[0].get("valueString", specialty)
            
            summaries.append(ReportSummary(
                id=qr["id"],
                bundleId=bundle["id"],
                date=qr["authored"],
                doctor={"name": current.full_name, "specialty": specialty}
            ))
    
    return summaries