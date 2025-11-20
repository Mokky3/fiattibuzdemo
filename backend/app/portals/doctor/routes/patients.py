"""Doctor portal - patients router
Comprehensive patient management with reports and prescriptions
"""
from datetime import datetime, date, timezone, timedelta
from typing import Dict, List, Any, Optional
from uuid import uuid4, UUID
import json

from fastapi import APIRouter, Depends, HTTPException, Path, Body, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc

from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.schemas.medical_enhanced import PrescriptionSummary
from app.db.session import get_db
from app.crud.patient import patient as patient_crud
from app.crud.prescription import prescription as prescription_crud
from app.crud.clinical import allergy_intolerance
from app.crud.vitals import vitals as vitals_crud
from app.crud.patient_medication import patient_medication
from app.common.models.patient import PatientMedication
from app.common.models.clinical import AllergyIntolerance, ClinicalStatus, Immunization

# Import ORM models with clear names to avoid shadowing
from app.common.models.patient import Patient as PatientORM
from app.common.models.user import User as UserORM
from app.common.models.appointment import Appointment as AppointmentORM

router = APIRouter(prefix="/patients", tags=["Doctor · Patients"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models (UI-facing)
# ──────────────────────────────────────────────────────────────────────────────

class PatientOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    patient_code: str
    gender: str
    date_of_birth: str
    age: int
    height: Optional[str] = None
    weight: Optional[str] = None
    bmi: Optional[str] = None
    last_measured: Optional[str] = None  # Date/time when vitals were last measured
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

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _calc_age(dob: Optional[date]) -> int:
    if not dob:
        return 0
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

# ──────────────────────────────────────────────────────────────────────────────
# Patient Endpoints (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[List[PatientOut]])
async def list_patients(
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    # Get the doctor ID from the doctor profile, not the user ID
    doctor_id = current.doctor_profile.get('id') if current.doctor_profile else None
    if not doctor_id:
        raise HTTPException(status_code=500, detail="Doctor profile not found")
    
    # Get doctor's clinic (organization_id) from User model
    from app.common.models.user import User
    from app.common.models.patient import OrganizationPatient
    from uuid import UUID
    
    doctor_user = db.query(User).filter(User.id == current.id).first()
    if not doctor_user or not doctor_user.organization_id:
        raise HTTPException(status_code=500, detail="Doctor not associated with a clinic")
    
    clinic_uuid = UUID(str(doctor_user.organization_id)) if isinstance(doctor_user.organization_id, str) else doctor_user.organization_id
    
    # Get patients through organization_patients (filtered by clinic) AND appointments (filtered by doctor)
    rows = db.query(PatientORM).join(
        OrganizationPatient, PatientORM.patient_id == OrganizationPatient.patient_id
    ).join(
        UserORM, PatientORM.user_id == UserORM.id
    ).join(
        AppointmentORM, AppointmentORM.patient_id == PatientORM.patient_id
    ).filter(
        OrganizationPatient.organization_id == clinic_uuid,
        OrganizationPatient.status == "active",
        AppointmentORM.doctor_id == doctor_id
    ).options(
        joinedload(PatientORM.user)
    ).distinct(PatientORM.patient_id).limit(200).all()
    
    items: List[PatientOut] = []
    for p in rows:
        user = p.user if hasattr(p, 'user') else None
        items.append(PatientOut(
            id=str(p.patient_id),
            first_name=user.first_name if user else "",
            last_name=user.last_name if user else "",
            patient_code=f"PT-{str(p.patient_id)[:8].upper()}",
            gender=p.sex or "",
            date_of_birth=p.date_of_birth.isoformat() if p.date_of_birth else "",
            age=_calc_age(p.date_of_birth),
            phone_number=user.phone if user else p.phone,
            email=user.email if user else "",
            address=None,  # Not available in current schema
            blood_group=None,
            rh_factor=None,
        ))
    return SuccessResponse(data=items, message="Patients retrieved")


@router.get("/search")
async def search_patients(
    q: str = Query(..., min_length=2, description="Search query for name, email, or ID"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current: DoctorUser = Depends(get_current_doctor)
):
    """Search patients by name, email, or ID with proper authentication, filtered by doctor's clinic."""
    try:
        print(f"DEBUG: Patient search called with query: {q}")
        print(f"DEBUG: Current doctor: {current}")
        
        # Get doctor's clinic (organization_id) from User model
        from app.common.models.user import User
        from app.common.models.patient import OrganizationPatient
        from uuid import UUID
        
        doctor_user = db.query(User).filter(User.id == current.id).first()
        if not doctor_user or not doctor_user.organization_id:
            # If no clinic, return empty results
            return []
        
        clinic_uuid = UUID(str(doctor_user.organization_id)) if isinstance(doctor_user.organization_id, str) else doctor_user.organization_id
        
        # Simple, safe patient search with User join and organization_patients filter
        # Build search filters
        like = f"%{q}%"
        
        # Base query with User join, organization_patients filter, and relationship loading
        query = db.query(PatientORM).join(
            OrganizationPatient, PatientORM.patient_id == OrganizationPatient.patient_id
        ).join(
            UserORM, PatientORM.user_id == UserORM.id
        ).filter(
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        ).options(joinedload(PatientORM.user))
        
        # Add search filters - search in User table for names and email
        query = query.filter(
            or_(
                UserORM.first_name.ilike(like),
                UserORM.last_name.ilike(like),
                UserORM.full_name.ilike(like),
                UserORM.email.ilike(like),
                UserORM.phone.ilike(like),
                PatientORM.phone.ilike(like),
            )
        )
        
        # Order and limit
        results = query.order_by(UserORM.last_name.asc(), UserORM.first_name.asc()).distinct().limit(limit).all()
        
        print(f"DEBUG: Found {len(results)} patients")
        
        # Transform to response format
        search_results = []
        for patient in results:
            try:
                # Get the associated user data
                user = patient.user if hasattr(patient, 'user') else None
                
                search_results.append({
                    "id": str(patient.patient_id),
                    "fullName": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else f"Patient {str(patient.patient_id)[:8]}",
                    "email": user.email if user else "",
                    "nationalId": "",  # No national_id column in actual schema
                    "phone": user.phone or patient.phone or "",
                    "dateOfBirth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    "gender": patient.sex or "",  # Use 'sex' column instead of 'gender'
                })
            except Exception as patient_error:
                print(f"DEBUG: Error processing patient {patient.patient_id}: {patient_error}")
                continue
        
        print(f"DEBUG: Transformed {len(search_results)} patients")
        
        return search_results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Critical error in patient search: {e}")
        import traceback
        traceback.print_exc()
        # Return empty results instead of crashing
        return []


@router.get("/{patient_id:uuid}", response_model=SuccessResponse[PatientOut])
async def get_patient(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    # Get patient with user data using proper ORM models
    p = db.query(PatientORM).join(UserORM, PatientORM.user_id == UserORM.id).options(
        joinedload(PatientORM.user)
    ).filter(PatientORM.patient_id == str(patient_id)).first()
    
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user = p.user if hasattr(p, 'user') else None
    
    # Get latest vital signs for height, weight, BMI, and measurement date
    height = None
    weight = None
    bmi = None
    last_measured = None
    try:
        from sqlalchemy import text
        import uuid as uuid_lib
        import logging
        logger = logging.getLogger(__name__)
        
        patient_id_str = str(patient_id)
        patient_id_uuid = UUID(patient_id_str) if isinstance(patient_id, str) else patient_id
        
        logger.info(f"🔍 [get_patient] Querying vitals for patient_id: {patient_id_str} (UUID: {patient_id_uuid})")
        
        # Query latest vital signs for height, weight, BMI, and recorded_at
        # Get the most recent vital sign that has height or weight (BMI can be calculated)
        vitals_sql = text("""
            SELECT height, weight, bmi, recorded_at, created_at
            FROM ehr.vital_signs
            WHERE patient_id = :patient_id
            AND (height IS NOT NULL OR weight IS NOT NULL)
            ORDER BY recorded_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 1
        """)
        try:
            vitals_result = db.execute(vitals_sql, {"patient_id": patient_id_uuid}).first()
            logger.info(f"🔍 [get_patient] Vitals query result (UUID): {vitals_result}")
            if vitals_result:
                height_val = vitals_result[0]
                weight_val = vitals_result[1]
                bmi_val = vitals_result[2]
                
                height = str(height_val) if height_val is not None else None
                weight = str(weight_val) if weight_val is not None else None
                
                # Calculate BMI if missing but height and weight are available
                if bmi_val is None and height_val is not None and weight_val is not None:
                    try:
                        height_m = float(height_val) / 100.0
                        weight_kg = float(weight_val)
                        if height_m > 0:
                            bmi_val = round(weight_kg / (height_m * height_m), 1)
                            logger.info(f"🔍 [get_patient] Calculated BMI on retrieval: {bmi_val} (height={height_val}cm, weight={weight_val}kg)")
                    except (ValueError, TypeError, ZeroDivisionError) as e:
                        logger.warning(f"🔍 [get_patient] Could not calculate BMI: {e}")
                        bmi_val = None
                
                bmi = str(bmi_val) if bmi_val is not None else None
                
                # Get the measurement date (prefer recorded_at, fallback to created_at)
                recorded_at = vitals_result[3] if len(vitals_result) > 3 else None
                created_at = vitals_result[4] if len(vitals_result) > 4 else None
                last_measured = recorded_at or created_at
                if last_measured:
                    # Convert to ISO format string
                    if hasattr(last_measured, 'isoformat'):
                        last_measured = last_measured.isoformat()
                    else:
                        last_measured = str(last_measured)
                logger.info(f"🔍 [get_patient] Extracted: height={height}, weight={weight}, bmi={bmi}, last_measured={last_measured}")
        except Exception as e1:
            logger.warning(f"🔍 [get_patient] UUID query failed: {e1}, trying string comparison")
            # Fallback to string comparison
            try:
                vitals_sql_str = text("""
                    SELECT height, weight, bmi, recorded_at, created_at
                    FROM ehr.vital_signs
                    WHERE patient_id::text = :patient_id
                    AND (height IS NOT NULL OR weight IS NOT NULL)
                    ORDER BY recorded_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                    LIMIT 1
                """)
                vitals_result = db.execute(vitals_sql_str, {"patient_id": patient_id_str}).first()
                logger.info(f"🔍 [get_patient] Vitals query result (string): {vitals_result}")
                if vitals_result:
                    height_val = vitals_result[0]
                    weight_val = vitals_result[1]
                    bmi_val = vitals_result[2]
                    
                    height = str(height_val) if height_val is not None else None
                    weight = str(weight_val) if weight_val is not None else None
                    
                    # Calculate BMI if missing but height and weight are available
                    if bmi_val is None and height_val is not None and weight_val is not None:
                        try:
                            height_m = float(height_val) / 100.0
                            weight_kg = float(weight_val)
                            if height_m > 0:
                                bmi_val = round(weight_kg / (height_m * height_m), 1)
                                logger.info(f"🔍 [get_patient] Calculated BMI on retrieval (string): {bmi_val} (height={height_val}cm, weight={weight_val}kg)")
                        except (ValueError, TypeError, ZeroDivisionError) as e:
                            logger.warning(f"🔍 [get_patient] Could not calculate BMI: {e}")
                            bmi_val = None
                    
                    bmi = str(bmi_val) if bmi_val is not None else None
                    
                    # Get the measurement date (prefer recorded_at, fallback to created_at)
                    recorded_at = vitals_result[3] if len(vitals_result) > 3 else None
                    created_at = vitals_result[4] if len(vitals_result) > 4 else None
                    last_measured = recorded_at or created_at
                    if last_measured:
                        # Convert to ISO format string
                        if hasattr(last_measured, 'isoformat'):
                            last_measured = last_measured.isoformat()
                        else:
                            last_measured = str(last_measured)
                    logger.info(f"🔍 [get_patient] Extracted: height={height}, weight={weight}, bmi={bmi}, last_measured={last_measured}")
            except Exception as e2:
                logger.warning(f"🔍 [get_patient] String query also failed: {e2}")
                pass
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"🔍 [get_patient] Error querying vitals: {e}", exc_info=True)
        pass
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔍 [get_patient] Final values: height={height}, weight={weight}, bmi={bmi}, last_measured={last_measured}")
    
    item = PatientOut(
        id=str(p.patient_id),
        first_name=user.first_name if user else "",
        last_name=user.last_name if user else "",
        patient_code=f"PT-{str(p.patient_id)[:8].upper()}",
        gender=p.sex or "",
        date_of_birth=p.date_of_birth.isoformat() if p.date_of_birth else "",
        age=_calc_age(p.date_of_birth),
        height=height,
        weight=weight,
        bmi=bmi,
        last_measured=last_measured,
        phone_number=user.phone if user else p.phone,
        email=user.email if user else "",
        address=None,  # Not available in current schema
        blood_group=None,
        rh_factor=None,
    )
    return SuccessResponse(data=item, message="Patient retrieved")


# ──────────────────────────────────────────────────────────────────────────────
# Report Endpoints (DB-backed via ClinicalNote)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{patient_id:uuid}/reports", response_model=SuccessResponse[List[ReportSummary]])
async def get_patient_reports(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    # Verify patient exists
    if not patient_crud.get(db=db, id=str(patient_id)):
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get doctor profile ID (from ehr.doctors table, not user_id)
    from app.common.models.doctor import ClinicalNote, Doctor
    from uuid import UUID
    
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current.id).first()
    if not doctor_profile:
        # If no doctor profile, return empty list (no reports for this doctor)
        return SuccessResponse(data=[], message="No reports found")
    
    # Use doctor profile ID (UUID object) for query
    doctor_id_for_query = doctor_profile.id
    
    # Query ClinicalNote - both patient_id and doctor_id should be UUID objects
    patient_uuid = UUID(str(patient_id)) if isinstance(patient_id, str) else patient_id
    notes = db.query(ClinicalNote).filter(
        ClinicalNote.patient_id == patient_uuid,
        ClinicalNote.doctor_id == doctor_id_for_query
    ).order_by(ClinicalNote.note_date.desc()).all()
    items: List[ReportSummary] = []
    for n in notes:
        dt = n.note_date or datetime.now(timezone.utc)
        
        # Parse assessment if it's JSON string
        diagnosis_text = ""
        if n.assessment:
            try:
                assessment_data = json.loads(n.assessment) if isinstance(n.assessment, str) else n.assessment
                if isinstance(assessment_data, dict):
                    # Extract working diagnoses
                    working = assessment_data.get("working", [])
                    ddx = assessment_data.get("ddx", [])
                    diagnosis_parts = []
                    if working:
                        diagnosis_parts.append("Working: " + ", ".join([d.get("term", d) if isinstance(d, dict) else str(d) for d in working]))
                    if ddx:
                        diagnosis_parts.append("DDx: " + ", ".join([d.get("term", d) if isinstance(d, dict) else str(d) for d in ddx]))
                    diagnosis_text = "; ".join(diagnosis_parts) if diagnosis_parts else str(n.assessment)
                else:
                    diagnosis_text = str(n.assessment)
            except:
                diagnosis_text = str(n.assessment) if n.assessment else ""
        
        # Parse plan if it's JSON string
        treatment_text = ""
        if n.plan:
            try:
                plan_data = json.loads(n.plan) if isinstance(n.plan, str) else n.plan
                if isinstance(plan_data, dict):
                    # Extract plan details
                    plan_parts = []
                    if plan_data.get("tests"):
                        plan_parts.append("Tests: " + ", ".join([str(t) for t in plan_data["tests"]]))
                    if plan_data.get("referrals"):
                        plan_parts.append("Referrals: " + ", ".join([str(r) for r in plan_data["referrals"]]))
                    if plan_data.get("med_changes"):
                        plan_parts.append("Med Changes: " + ", ".join([str(m) for m in plan_data["med_changes"]]))
                    if plan_data.get("lifestyle"):
                        plan_parts.append("Lifestyle: " + ", ".join([str(l) for l in plan_data["lifestyle"]]))
                    if plan_data.get("follow_up"):
                        plan_parts.append("Follow-up: " + str(plan_data["follow_up"]))
                    treatment_text = "; ".join(plan_parts) if plan_parts else str(n.plan)
                else:
                    treatment_text = str(n.plan)
            except:
                treatment_text = str(n.plan) if n.plan else ""
        
        # Get description - try to extract from content JSON if available
        description_text = n.subjective or ""
        if not description_text and n.content:
            try:
                content_data = json.loads(n.content) if isinstance(n.content, str) else n.content
                if isinstance(content_data, dict):
                    # Try to get chief complaint or HPI free text
                    hpi = content_data.get("hpi", {})
                    if isinstance(hpi, dict):
                        description_text = hpi.get("free", "") or content_data.get("chief_complaint", "")
                    else:
                        description_text = content_data.get("chief_complaint", "")
            except:
                description_text = n.content[:200] if n.content else ""
        
        items.append(ReportSummary(
            id=str(n.id),
            date=dt.date().isoformat(),
            time=dt.time().isoformat(timespec="minutes"),
            problem=n.note_type or "",
            description=description_text[:200] if description_text else "",
            diagnosis=diagnosis_text,
            treatment=treatment_text,
            doctor_name=current.email,
            patient_id=str(patient_id)  # Convert UUID to string for ReportSummary schema
        ))
    return SuccessResponse(data=items, message="Reports retrieved")


# ──────────────────────────────────────────────────────────────────────────────
# Prescription Endpoints (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{patient_id:uuid}/prescriptions", response_model=SuccessResponse[List[PrescriptionSummary]])
async def get_patient_prescriptions(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    if not patient_crud.get(db=db, id=str(patient_id)):
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = prescription_crud.list_by_patient(db, patient_id=str(patient_id), skip=0, limit=200)
    items: List[PrescriptionSummary] = []
    for p in rows:
        items.append(PrescriptionSummary(
            id=str(p.id),
            patient_id=str(p.patient_id),
            medication_name=p.medicine_name,
            dosage=p.dosage,
            frequency=p.frequency,
            duration=p.duration or "",
            status=p.status,
            prescribed_date=p.prescribed_date.date() if p.prescribed_date else date.today(),
            doctor_name=getattr(current, "full_name", None) or current.email,
            clinic_id=str(getattr(p, "hospital_id", ""))
        ))
    # sort by prescribed_date desc
    items.sort(key=lambda x: x.prescribed_date, reverse=True)
    return SuccessResponse(data=items, message="Prescriptions retrieved")


# ──────────────────────────────────────────────────────────────────────────────
# Additional endpoints (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/reports/{report_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_report(
    report_id: str = Path(..., description="Report ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Delete a report from ClinicalNote table."""
    from app.common.models.doctor import ClinicalNote, Doctor
    
    # Get doctor profile ID (from ehr.doctors table, not user_id)
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current.id).first()
    if not doctor_profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    # Use doctor profile ID (UUID object) for query
    doctor_id_for_query = doctor_profile.id
    
    # Convert report_id to UUID if it's a string
    try:
        report_uuid = UUID(str(report_id)) if isinstance(report_id, str) else report_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
    
    # Query ClinicalNote using doctor profile ID and report ID
    n = db.query(ClinicalNote).filter(
        ClinicalNote.id == report_uuid,
        ClinicalNote.doctor_id == doctor_id_for_query
    ).first()
    
    if not n:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(n)
    db.commit()
    return SuccessResponse(data={"status": "deleted", "report_id": str(report_uuid)}, message="Report deleted successfully")


@router.delete("/prescriptions/{prescription_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_prescription(
    prescription_id: str = Path(..., description="Prescription ID"),
    _: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    ok = prescription_crud.delete_prescription(db, prescription_id=prescription_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return SuccessResponse(data={"status": "deleted"}, message="Prescription deleted")


@router.patch("/prescriptions/{prescription_id}/status", response_model=SuccessResponse[Dict[str, str]])
async def update_prescription_status(
    prescription_id: str = Path(..., description="Prescription ID"),
    status_update: dict = Body(..., example={"status": "completed"}),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    from app.common.models.prescription import PrescriptionStatus
    new_status = status_update.get("status")
    try:
        status_enum = PrescriptionStatus(new_status)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid status")
    updated = prescription_crud.update_status(
        db,
        prescription_id=prescription_id,
        status=status_enum,
        status_reason=None,
        cancelled_by=current.id if status_enum == PrescriptionStatus.CANCELLED else None
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return SuccessResponse(data={"message": "Status updated successfully"}, message="Status updated successfully")


@router.get("/{patient_id:uuid}/summary", response_model=SuccessResponse[Dict[str, Any]])
async def get_patient_summary(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    if not patient_crud.get(db=db, id=str(patient_id)):
        raise HTTPException(status_code=404, detail="Patient not found")
    from app.common.models.doctor import ClinicalNote
    reports_count = db.query(ClinicalNote).filter(ClinicalNote.patient_id == str(patient_id), ClinicalNote.doctor_id == current.id).count()
    prescriptions_count = len(prescription_crud.list_by_patient(db, patient_id=str(patient_id), skip=0, limit=100))
    active_prescriptions_count = len([p for p in prescription_crud.list_by_patient(db, patient_id=str(patient_id), skip=0, limit=100) if str(getattr(p, "status", "")) == "PrescriptionStatus.ACTIVE" or getattr(p, "status", None) == getattr(p, "status", None)])
    return SuccessResponse(
        data={
            "summary": {
                "total_reports": reports_count,
                "total_prescriptions": prescriptions_count,
                "active_prescriptions": active_prescriptions_count
            }
        },
        message="Patient summary retrieved"
    )


@router.get("/{patient_id:uuid}/allergies", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_patient_allergies(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get patient allergies."""
    try:
        if not patient_crud.get(db=db, id=str(patient_id)):
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get allergies using raw SQL to avoid enum conversion issues (similar to nurse profile)
        from sqlalchemy import text
        import uuid as uuid_lib
        
        patient_id_str = str(patient_id)
        print(f"Getting allergies for patient_id: {patient_id_str}")
        
        try:
            # Query allergies using raw SQL to avoid enum conversion issues
            # Try multiple approaches to match patient_id (UUID vs String)
            allergies_results = None
            try:
                # First try with UUID cast - patient_id in DB is UUID type
                patient_id_uuid = UUID(str(patient_id)) if isinstance(patient_id, str) else patient_id
                if isinstance(patient_id_uuid, str):
                    try:
                        patient_id_uuid = uuid_lib.UUID(patient_id_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                allergies_sql = text("""
                    SELECT id, display_name, criticality, clinical_status, recorded_date, notes
                    FROM ehr.allergy_intolerances
                    WHERE patient_id = :patient_id
                    ORDER BY recorded_date DESC
                """)
                allergies_results = db.execute(allergies_sql, {"patient_id": patient_id_uuid}).all()
            except Exception as e1:
                print(f"Error getting allergies (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    # Fallback to direct string comparison
                    allergies_sql = text("""
                        SELECT id, display_name, criticality, clinical_status, recorded_date, notes
                        FROM ehr.allergy_intolerances
                        WHERE patient_id::text = :patient_id
                        ORDER BY recorded_date DESC
                    """)
                    allergies_results = db.execute(allergies_sql, {"patient_id": patient_id_str}).all()
                except Exception as e2:
                    print(f"Error getting allergies (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    allergies_results = []
            
            if not allergies_results:
                allergies_results = []
            
            # Format allergies for response
            items = []
            for row in allergies_results:
                allergy_id = row[0]
                display_name = row[1]
                criticality = row[2]
                clinical_status = row[3]
                recorded_date = row[4]
                notes = row[5]
                
                # Extract reaction from notes if available
                reaction = None
                if notes and isinstance(notes, list) and len(notes) > 0:
                    # Notes is a JSON array of annotations, get the first one's text
                    first_note = notes[0] if isinstance(notes[0], dict) else None
                    if first_note and 'text' in first_note:
                        reaction = first_note['text']
                
                # Only include active allergies
                if clinical_status and str(clinical_status).lower() in ['active', 'ACTIVE']:
                    items.append({
                        "id": str(allergy_id),
                        "display_name": display_name or "Unknown",
                        "criticality": str(criticality) if criticality else None,
                        "type": None,  # Not available in raw query
                        "categories": [],  # Not available in raw query
                        "onset_date": None,  # Not available in raw query
                        "recorded_date": recorded_date.isoformat() if recorded_date else None,
                        "notes": notes if notes else [],
                        "reaction": reaction
                    })
            
            print(f"Returning {len(items)} allergies for patient {patient_id_str}")
            return SuccessResponse(data=items, message="Patient allergies retrieved")
        except Exception as db_error:
            print(f"Error querying allergies: {db_error}")
            import traceback
            traceback.print_exc()
            return SuccessResponse(data=[], message="No allergies found")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving allergies: {str(e)}")


@router.get("/{patient_id:uuid}/medications", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_patient_medications(
    patient_id: UUID = Path(..., description="Patient ID"),
    active_only: bool = Query(True, description="Return only active medications"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get patient medications."""
    try:
        if not patient_crud.get(db=db, id=str(patient_id)):
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Use CRUD to get patient medications
        # Convert patient_id to string format for PatientMedication (uses String(36))
        patient_id_str = str(patient_id)
        print(f"Getting medications for patient_id: {patient_id_str}")
        try:
            medications = patient_medication.get_patient_medications(
                db,
                patient_id=patient_id_str,
                active_only=active_only,
                include_discontinued=False
            )
            print(f"Found {len(medications)} existing medications")
            
            # If no medications found, try to create from existing prescriptions
            if not medications or len(medications) == 0:
                try:
                    # Get active prescriptions for this patient
                    from app.crud.prescription import prescription as prescription_crud
                    from app.common.models.prescription import PrescriptionStatus
                    
                    prescriptions = prescription_crud.list_by_patient(
                        db,
                        patient_id=str(patient_id),
                        status=PrescriptionStatus.ACTIVE.value if active_only else None,
                        skip=0,
                        limit=100
                    )
                    
                    print(f"Found {len(prescriptions)} prescriptions for patient {patient_id_str}")
                    
                    # Create PatientMedication records from prescriptions that don't have one
                    created_count = 0
                    for rx in prescriptions:
                        # Check if medication already exists for this prescription
                        existing_meds = patient_medication.get_by_prescription(
                            db,
                            prescription_id=str(rx.id)
                        )
                        
                        if not existing_meds:
                            # Create medication from prescription
                            try:
                                # Calculate end_date from duration if available
                                end_date = rx.end_date if rx.end_date else None
                                if not end_date and hasattr(rx, 'duration') and rx.duration:
                                    # Parse duration (simple parsing)
                                    duration_lower = str(rx.duration).lower()
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
                                            end_date = date.today() + timedelta(days=months * 30)
                                
                                # Extract route from notes if available
                                route = None
                                if hasattr(rx, 'notes') and rx.notes:
                                    notes_lower = str(rx.notes).lower()
                                    if 'topical' in notes_lower:
                                        route = 'topical'
                                    elif 'oral' in notes_lower:
                                        route = 'oral'
                                    elif 'injection' in notes_lower or 'inject' in notes_lower:
                                        route = 'injection'
                                
                                # Ensure patient_id is converted to string format for PatientMedication (String(36))
                                rx_patient_id_str = str(rx.patient_id) if rx.patient_id else str(patient_id)
                                
                                # Get prescribed_by from prescription (rx.prescribed_by is UUID, need to convert to string)
                                rx_prescribed_by = None
                                if hasattr(rx, 'prescribed_by') and rx.prescribed_by:
                                    rx_prescribed_by = str(rx.prescribed_by)
                                elif hasattr(rx, 'created_by') and rx.created_by:
                                    rx_prescribed_by = str(rx.created_by)
                                else:
                                    # Fallback to current user
                                    rx_prescribed_by = str(current.id)
                                
                                # Get prescribed_date
                                rx_prescribed_date = None
                                if hasattr(rx, 'prescribed_date') and rx.prescribed_date:
                                    if hasattr(rx.prescribed_date, 'date'):
                                        rx_prescribed_date = rx.prescribed_date.date()
                                    elif isinstance(rx.prescribed_date, date):
                                        rx_prescribed_date = rx.prescribed_date
                                    else:
                                        rx_prescribed_date = date.today()
                                else:
                                    rx_prescribed_date = date.today()
                                
                                print(f"Creating PatientMedication from prescription {rx.id}:")
                                print(f"  patient_id: {rx_patient_id_str}")
                                print(f"  medication_name: {rx.medicine_name}")
                                print(f"  prescription_id: {str(rx.id)}")
                                
                                patient_medication.create_medication(
                                    db,
                                    patient_id=rx_patient_id_str,
                                    medication_name=rx.medicine_name,
                                    dosage=rx.dosage,
                                    frequency=rx.frequency,
                                    route=route,
                                    start_date=rx.start_date if rx.start_date else date.today(),
                                    end_date=end_date,
                                    prescription_id=str(rx.id),
                                    prescribed_by=rx_prescribed_by,
                                    prescribed_date=rx_prescribed_date,
                                    instructions=rx.notes if hasattr(rx, 'notes') else None,
                                    notes=None,
                                    is_active=True
                                )
                                created_count += 1
                                print(f"  ✓ Created PatientMedication record (total: {created_count})")
                            except Exception as create_error:
                                print(f"Warning: Failed to create PatientMedication from prescription {rx.id}: {create_error}")
                                continue
                    
                    # Re-fetch medications after creating from prescriptions
                    if created_count > 0:
                        medications = patient_medication.get_patient_medications(
                            db,
                            patient_id=str(patient_id),
                            active_only=active_only,
                            include_discontinued=False
                        )
                except Exception as backfill_error:
                    print(f"Warning: Failed to backfill medications from prescriptions: {backfill_error}")
                    import traceback
                    traceback.print_exc()
            
            # Format medications for response
            items = []
            for med in medications:
                items.append({
                    "id": str(med.id) if med.id else None,
                    "medication_name": med.medication_name if med.medication_name else "",
                    "dosage": med.dosage if med.dosage else "",
                    "frequency": med.frequency if med.frequency else "",
                    "route": med.route if med.route else "",
                    "start_date": med.start_date.isoformat() if med.start_date else None,
                    "end_date": med.end_date.isoformat() if med.end_date else None,
                    "instructions": med.instructions if med.instructions else None,
                    "notes": med.notes if med.notes else None,
                    "is_active": med.is_active if med.is_active is not None else False,
                    "prescribed_date": med.prescribed_date.isoformat() if med.prescribed_date else None
                })
            
            print(f"Returning {len(items)} medications for patient {patient_id_str}")
            return SuccessResponse(data=items, message="Patient medications retrieved")
        except Exception as db_error:
            # If table doesn't exist or query fails, return empty list
            print(f"Error querying PatientMedication: {db_error}")
            import traceback
            traceback.print_exc()
            return SuccessResponse(data=[], message="No medications found")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving medications: {str(e)}")


@router.get("/{patient_id:uuid}/vitals", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_patient_vitals(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get patient vital signs."""
    try:
        if not patient_crud.get(db=db, id=str(patient_id)):
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get vitals using raw SQL (similar to nurse profile)
        from sqlalchemy import text
        import uuid as uuid_lib
        
        patient_id_str = str(patient_id)
        print(f"Getting vitals for patient_id: {patient_id_str}")
        
        try:
            # Try multiple approaches to match patient_id (UUID vs String)
            vitals_results = None
            try:
                # First try with UUID cast
                patient_id_uuid = UUID(str(patient_id)) if isinstance(patient_id, str) else patient_id
                if isinstance(patient_id_uuid, str):
                    try:
                        patient_id_uuid = uuid_lib.UUID(patient_id_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                vitals_sql = text("""
                    SELECT id, temperature, heart_rate, systolic_bp, diastolic_bp, 
                           respiratory_rate, oxygen_saturation, pain_scale, height, weight, bmi,
                           recorded_by, recorded_at
                    FROM ehr.vital_signs
                    WHERE patient_id = :patient_id
                    ORDER BY recorded_at DESC NULLS LAST, id DESC
                    LIMIT 50
                """)
                vitals_results = db.execute(vitals_sql, {"patient_id": patient_id_uuid}).all()
            except Exception as e1:
                print(f"Error getting vitals (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    # Fallback to string comparison
                    vitals_sql = text("""
                        SELECT id, temperature, heart_rate, systolic_bp, diastolic_bp, 
                               respiratory_rate, oxygen_saturation, pain_scale, height, weight, bmi,
                               recorded_by, recorded_at
                        FROM ehr.vital_signs
                        WHERE patient_id::text = :patient_id
                        ORDER BY recorded_at DESC NULLS LAST, id DESC
                        LIMIT 50
                    """)
                    vitals_results = db.execute(vitals_sql, {"patient_id": patient_id_str}).all()
                except Exception as e2:
                    print(f"Error getting vitals (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    vitals_results = []
            
            if not vitals_results:
                vitals_results = []
            
            # Format vitals for response
            items = []
            for row in vitals_results:
                vitals_id = row[0]
                temperature = row[1]
                heart_rate = row[2]
                systolic_bp = row[3]
                diastolic_bp = row[4]
                respiratory_rate = row[5]
                oxygen_saturation = row[6]
                pain_scale = row[7]
                height = row[8] if len(row) > 8 else None
                weight = row[9] if len(row) > 9 else None
                bmi = row[10] if len(row) > 10 else None
                recorded_by = row[11] if len(row) > 11 else None
                recorded_at = row[12] if len(row) > 12 else None
                
                # Format BP
                bp = None
                if systolic_bp is not None and diastolic_bp is not None:
                    bp = f"{systolic_bp}/{diastolic_bp}"
                elif systolic_bp is not None:
                    bp = f"{systolic_bp}/-"
                elif diastolic_bp is not None:
                    bp = f"-/{diastolic_bp}"
                
                items.append({
                    "id": str(vitals_id),
                    "temperature": str(temperature) if temperature is not None else None,
                    "heartRate": str(heart_rate) if heart_rate is not None else None,
                    "bloodPressure": bp,
                    "respiratoryRate": str(respiratory_rate) if respiratory_rate is not None else None,
                    "oxygenSaturation": str(oxygen_saturation) if oxygen_saturation is not None else None,
                    "painScale": str(pain_scale) if pain_scale is not None else None,
                    "height": str(height) if height is not None else None,
                    "weight": str(weight) if weight is not None else None,
                    "bmi": str(bmi) if bmi is not None else None,
                    "recordedBy": str(recorded_by) if recorded_by else None,
                    "recordedAt": recorded_at.isoformat() if recorded_at else None,
                })
            
            print(f"Returning {len(items)} vitals for patient {patient_id_str}")
            return SuccessResponse(data=items, message="Patient vitals retrieved")
        except Exception as db_error:
            print(f"Error querying vitals: {db_error}")
            import traceback
            traceback.print_exc()
            return SuccessResponse(data=[], message="No vitals found")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving vitals: {str(e)}")


@router.get("/{patient_id:uuid}/immunizations", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_patient_immunizations(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get patient immunizations."""
    try:
        if not patient_crud.get(db=db, id=str(patient_id)):
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get immunizations using raw SQL (similar to nurse profile)
        from sqlalchemy import text
        import uuid as uuid_lib
        
        patient_id_str = str(patient_id)
        print(f"Getting immunizations for patient_id: {patient_id_str}")
        
        try:
            # Try multiple approaches to match patient_id (UUID vs String)
            immunizations_results = None
            try:
                # First try with UUID cast
                patient_id_uuid = UUID(str(patient_id)) if isinstance(patient_id, str) else patient_id
                if isinstance(patient_id_uuid, str):
                    try:
                        patient_id_uuid = uuid_lib.UUID(patient_id_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                immunizations_sql = text("""
                    SELECT id, vaccine_name, occurrence_date, lot_number, performer_id, recorded
                    FROM ehr.immunizations
                    WHERE patient_id = :patient_id
                    ORDER BY occurrence_date DESC NULLS LAST, recorded DESC
                """)
                immunizations_results = db.execute(immunizations_sql, {"patient_id": patient_id_uuid}).all()
            except Exception as e1:
                print(f"Error getting immunizations (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    # Fallback to string comparison
                    immunizations_sql = text("""
                        SELECT id, vaccine_name, occurrence_date, lot_number, performer_id, recorded
                        FROM ehr.immunizations
                        WHERE patient_id::text = :patient_id
                        ORDER BY occurrence_date DESC NULLS LAST, recorded DESC
                    """)
                    immunizations_results = db.execute(immunizations_sql, {"patient_id": patient_id_str}).all()
                except Exception as e2:
                    print(f"Error getting immunizations (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    immunizations_results = []
            
            if not immunizations_results:
                immunizations_results = []
            
            # Format immunizations for response
            items = []
            for row in immunizations_results:
                imm_id = row[0]
                vaccine_name = row[1]
                occurrence_date = row[2]
                lot_number = row[3]
                performer_id = row[4]
                recorded = row[5]
                
                # Extract date from occurrence_date (datetime) or use recorded date
                imm_date = None
                if occurrence_date:
                    if isinstance(occurrence_date, datetime):
                        imm_date = occurrence_date.date()
                    elif isinstance(occurrence_date, date):
                        imm_date = occurrence_date
                    else:
                        imm_date = date.today()
                elif recorded:
                    if isinstance(recorded, datetime):
                        imm_date = recorded.date()
                    else:
                        imm_date = date.today()
                else:
                    imm_date = date.today()
                
                items.append({
                    "id": str(imm_id),
                    "vaccine": vaccine_name or "Unknown",
                    "date": imm_date.isoformat() if imm_date else None,
                    "lotNumber": lot_number,
                    "administeredBy": str(performer_id) if performer_id else None,
                })
            
            print(f"Returning {len(items)} immunizations for patient {patient_id_str}")
            return SuccessResponse(data=items, message="Patient immunizations retrieved")
        except Exception as db_error:
            print(f"Error querying immunizations: {db_error}")
            import traceback
            traceback.print_exc()
            return SuccessResponse(data=[], message="No immunizations found")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving immunizations: {str(e)}")