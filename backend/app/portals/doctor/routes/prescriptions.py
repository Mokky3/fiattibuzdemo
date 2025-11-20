"""Doctor portal – prescriptions router
Internally uses FHIR MedicationRequest resources while preserving the existing
public REST contract expected by the React UI.
"""
from datetime import datetime, timezone, date, timedelta
from typing import Dict, Any, Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, status

from .auth import get_current_doctor, DoctorUser
from app.services.fhir_repository import fhir_repo
from app.common.services.fhir_builders import coding
from app.common.schemas.responses_enhanced import SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
from app.common.schemas.medical_enhanced import (
    PrescriptionBase as PrescriptionCreateSchema,
    PrescriptionUpdate as PrescriptionUpdateSchema,
    PrescriptionSummary,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.prescription import prescription as prescription_crud
from app.crud.patient_medication import patient_medication
from app.common.models.user import User
from app.common.models.prescription import PrescriptionStatus

router = APIRouter(prefix="/prescriptions", tags=["Doctor · Prescriptions"])

# In‑memory cache so dashboard can list without extra DB round‑trips.
_PRESC_CACHE: Dict[str, PrescriptionSummary] = {}

# ---------------------------------------------------------------------------
# Helper – build a FHIR MedicationRequest resource
# ---------------------------------------------------------------------------

def build_medication_request(
    rx_id: str,
    patient_id: str,
    doctor_id: str,
    data: PrescriptionCreateSchema,
) -> Dict:
    # For demo, we don't resolve real RxNorm; we code the free‑text drug name
    med_code = coding(
        "http://www.nlm.nih.gov/research/umls/rxnorm",
        data.medication_name.lower().replace(" ", "-"),
        data.medication_name,
    )
    written = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "MedicationRequest",
        "id": rx_id,
        "status": data.status.value if hasattr(data.status, "value") else str(data.status),
        "intent": "order",
        "medicationCodeableConcept": {"coding": [med_code]},
        "subject": {"reference": f"Patient/{patient_id}"},
        "authoredOn": written,
        "requester": {"reference": f"Practitioner/{doctor_id}"},
        "dosageInstruction": [
            {
                "text": data.instructions or 
                        f"{data.dosage}, {data.frequency} × for {data.duration}",
            }
        ],
    }


@router.post(
    "/patients/{patient_id}",
    response_model=SuccessResponse[PrescriptionSummary],
    status_code=status.HTTP_201_CREATED,
)
async def create_prescription(
    patient_id: str,
    data: PrescriptionCreateSchema = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    try:
        # Ensure body matches path
        if getattr(data, "patient_id", patient_id) != patient_id:
            problem = create_problem_detail(
                error_type=ErrorType.VALIDATION_ERROR,
                title="Patient ID mismatch",
                status=400,
                detail="Body patient_id must match path patient_id"
            )
            raise HTTPException(status_code=400, detail=problem.dict())

        # Resolve clinic (hospital) from current doctor
        # First try to get from user's organization_id
        user = db.query(User).filter(User.id == current.id).first()
        hospital_id = str(user.organization_id) if user and getattr(user, "organization_id", None) else None
        
        # If no organization_id, try to get from doctor's associated hospitals
        # Get doctor profile with hospitals relationship (eager load)
        from app.common.models.doctor import Doctor
        from sqlalchemy.orm import joinedload
        doctor_profile = db.query(Doctor).options(joinedload(Doctor.hospitals)).filter(Doctor.user_id == current.id).first()
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        doctor_profile_id = str(doctor_profile.id)
        
        if not hospital_id:
            # Try to get from doctor's associated hospitals
            if doctor_profile.hospitals:
                # Use the first associated hospital
                hospital_id = str(doctor_profile.hospitals[0].id)
        
        # If still no hospital, use default hospital as fallback
        if not hospital_id:
            # Use default hospital ID (same as used in appointments)
            hospital_id = 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'

        # 1) Create DB prescription
        # Note: doctor_id in prescriptions table references core.users.user_id (not ehr.doctors.id)
        # Use current.id (user_id) for doctor_id, created_by, and prescribed_by since they all reference core.users.id
        db_p = prescription_crud.create_prescription(
            db,
            patient_id=patient_id,
            doctor_id=current.id,  # user_id for doctor_id (references core.users.user_id)
            hospital_id=hospital_id,
            medicine_name=data.medication_name,
            dosage=data.dosage,
            frequency=data.frequency,
            duration=data.duration,
            notes=data.instructions,
            intent=None,
            priority=None,
            created_by=current.id,  # user_id for created_by (references core.users.id)
            prescribed_by=current.id,  # user_id for prescribed_by (references core.users.id)
        )
        rx_id = str(db_p.id)

        # 1b) Create PatientMedication record from prescription
        try:
            # Calculate end_date from duration if provided
            end_date = None
            if data.duration:
                # Parse duration (e.g., "7 days", "2 weeks", "1 month")
                duration_lower = data.duration.lower()
                if 'day' in duration_lower:
                    days = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                    if days > 0:
                        end_date = date.today() + timedelta(days=days)
                elif 'week' in duration_lower:
                    weeks = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                    if weeks > 0:
                        end_date = date.today() + timedelta(weeks=weeks)
                elif 'month' in duration_lower:
                    months = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                    if months > 0:
                        # Approximate: 30 days per month
                        end_date = date.today() + timedelta(days=months * 30)
            
            # Extract route from notes/instructions if available, or use default
            route = None
            if data.instructions:
                # Try to extract route from instructions (e.g., "topical", "oral", etc.)
                instructions_lower = data.instructions.lower()
                if 'topical' in instructions_lower:
                    route = 'topical'
                elif 'oral' in instructions_lower:
                    route = 'oral'
                elif 'injection' in instructions_lower or 'inject' in instructions_lower:
                    route = 'injection'
            
            print(f"Creating PatientMedication from prescription:")
            print(f"  patient_id: {patient_id}")
            print(f"  medication_name: {data.medication_name}")
            print(f"  prescription_id: {rx_id}")
            print(f"  prescribed_by: {current.id}")
            
            created_med = patient_medication.create_medication(
                db,
                patient_id=patient_id,
                medication_name=data.medication_name,
                dosage=data.dosage,
                frequency=data.frequency,
                route=route,
                start_date=date.today(),
                end_date=end_date,
                prescription_id=rx_id,
                prescribed_by=current.id,  # user_id
                prescribed_date=date.today(),
                instructions=data.instructions,
                notes=None,
                is_active=True
            )
            print(f"✓ Successfully created PatientMedication: {created_med.id if created_med else 'None'}")
        except Exception as med_error:
            # Log error but don't fail prescription creation
            print(f"ERROR: Failed to create PatientMedication record: {med_error}")
            import traceback
            traceback.print_exc()
            # Re-raise to see the error in logs
            # Don't fail prescription creation, but log the error

        # 2) Create FHIR MedicationRequest (wrapped in a bundle for demo)
        fhir_res = build_medication_request(rx_id, patient_id, current.id, data)
        bundle = {
            "resourceType": "Bundle",
            "id": rx_id,
            "type": "transaction",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry": [{"resource": fhir_res}],
        }
        fhir_repo.save(bundle)

        # 3) Build response and cache
        summary = PrescriptionSummary(
            id=rx_id,
            patient_id=patient_id,
            medication_name=data.medication_name,
            dosage=data.dosage,
            frequency=data.frequency,
            duration=data.duration,
            status=data.status,
            prescribed_date=date.today(),
            doctor_name=getattr(current, "full_name", None) or current.email,
            clinic_id=hospital_id
        )
        _PRESC_CACHE[rx_id] = summary
        return SuccessResponse(data=summary, message="Prescription created")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Create Prescription Failed",
            status=500,
            detail=str(e)
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.patch("/{rx_id}", response_model=SuccessResponse[PrescriptionSummary])
async def update_prescription_status(
    rx_id: str,
    payload: PrescriptionUpdateSchema = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    # Update DB first
    status_enum = None
    if payload.status is not None:
        try:
            status_enum = PrescriptionStatus(payload.status)
        except Exception:
            status_enum = None
    updated_db = None
    if status_enum is not None:
        updated_db = prescription_crud.update_status(
            db,
            prescription_id=rx_id,
            status=status_enum,
            status_reason=None,
            cancelled_by=current.id if status_enum == PrescriptionStatus.CANCELLED else None,
        )
    if not updated_db:
        # Not found in DB
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Update FHIR Bundle if present
    try:
        bundle = fhir_repo.get("Bundle", rx_id)
        if bundle and bundle.get("entry"):
            med_req = bundle["entry"][0]["resource"]
            if payload.status is not None:
                med_req["status"] = payload.status.value if hasattr(payload.status, "value") else str(payload.status)
            fhir_repo.save(bundle)
    except Exception:
        # Ignore FHIR errors; DB is source-of-truth
        pass

    # Update cache / DTO
    current_summary = _PRESC_CACHE.get(rx_id)
    updated_summary = PrescriptionSummary(
        id=rx_id,
        patient_id=str(updated_db.patient_id),
        medication_name=updated_db.medicine_name,
        dosage=updated_db.dosage,
        frequency=updated_db.frequency,
        duration=updated_db.duration or "",
        status=updated_db.status,
        prescribed_date=updated_db.prescribed_date.date() if updated_db.prescribed_date else date.today(),
        doctor_name=getattr(current, "full_name", None) or current.email,
        clinic_id=str(getattr(updated_db, "hospital_id", ""))
    )
    _PRESC_CACHE[rx_id] = updated_summary
    return SuccessResponse(data=updated_summary, message="Prescription updated")


@router.delete("/prescriptions/{rx_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_prescription(
    rx_id: str,
    db: Session = Depends(get_db),
    _: DoctorUser = Depends(get_current_doctor),
):
    # Delete DB
    ok = prescription_crud.delete_prescription(db, prescription_id=rx_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Prescription not found")
    # Delete FHIR (best-effort)
    try:
        fhir_repo.delete("Bundle", rx_id)
    except Exception:
        pass
    _PRESC_CACHE.pop(rx_id, None)
    return SuccessResponse(data={"status": "deleted"}, message="Prescription deleted")
