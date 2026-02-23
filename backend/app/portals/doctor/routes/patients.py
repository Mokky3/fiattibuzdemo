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
from sqlalchemy import or_, desc, func, String

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
        clinic_uuid = None
        if doctor_user and doctor_user.organization_id:
            clinic_uuid = UUID(str(doctor_user.organization_id)) if isinstance(doctor_user.organization_id, str) else doctor_user.organization_id
            print(f"DEBUG: Doctor's clinic: {clinic_uuid}")
        else:
            print(f"DEBUG: Doctor has no clinic association - will search all patients")
        
        # Simple, safe patient search with User join
        # Build search filters - make search case-insensitive and more flexible
        like = f"%{q}%"
        q_lower = q.lower()
        
        # Base query with User join and relationship loading
        # For appointment creation, we want to show all patients, not just clinic patients
        # But prioritize clinic patients if doctor has a clinic
        # Note: We only search patients that have a user_id (where name/email data is stored)
        if clinic_uuid:
            # First try to find patients in the clinic
            query = db.query(PatientORM).join(
                OrganizationPatient, PatientORM.patient_id == OrganizationPatient.patient_id
            ).join(
                UserORM, PatientORM.user_id == UserORM.id
            ).filter(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"
            ).options(joinedload(PatientORM.user))
        else:
            # No clinic, search all patients that have a user_id
            query = db.query(PatientORM).join(
                UserORM, PatientORM.user_id == UserORM.id
            ).options(joinedload(PatientORM.user))
        
        # Add search filters - search in User table for names and email
        # Use concatenated full name for better matching
        search_filters = [
            UserORM.first_name.ilike(like),
            UserORM.last_name.ilike(like),
            UserORM.full_name.ilike(like),
            # Search in concatenated first_name + last_name
            func.concat(UserORM.first_name, ' ', UserORM.last_name).ilike(like),
            func.concat(UserORM.last_name, ' ', UserORM.first_name).ilike(like),
            UserORM.email.ilike(like),
            UserORM.phone.ilike(like),
            PatientORM.phone.ilike(like),
        ]
        
        # Also search by patient_id if query looks like UUID (8+ chars)
        if len(q) >= 8:
            try:
                # Try to match as UUID
                search_filters.append(func.cast(PatientORM.patient_id, String).ilike(like))
            except:
                pass
        
        query = query.filter(or_(*search_filters))
        
        # Order and limit - use distinct on patient_id to avoid duplicates
        # PostgreSQL requires ORDER BY columns to be in SELECT when using DISTINCT
        # So we order by patient_id first, then apply distinct, then sort in Python
        results = query.order_by(PatientORM.patient_id).distinct(PatientORM.patient_id).limit(limit * 2).all()
        
        # Sort results by name in Python (since we can't do it in SQL with DISTINCT)
        results = sorted(results, key=lambda p: (
            (p.user.last_name or '') if p.user else '',
            (p.user.first_name or '') if p.user else ''
        ))[:limit]
        
        print(f"DEBUG: Found {len(results)} patients matching query '{q}' in clinic")
        
        # If no results in clinic, search all patients (for appointment creation flexibility)
        if len(results) == 0 and clinic_uuid:
            print(f"DEBUG: No patients found in clinic, searching all patients...")
            # Search all patients without clinic filter, using the same search filters
            all_patients_query = db.query(PatientORM).join(
                UserORM, PatientORM.user_id == UserORM.id
            ).filter(
                or_(*search_filters)
            ).options(joinedload(PatientORM.user)).order_by(
                PatientORM.patient_id
            ).distinct(PatientORM.patient_id).limit(limit * 2).all()
            
            # Sort by name in Python
            all_patients_query = sorted(all_patients_query, key=lambda p: (
                (p.user.last_name or '') if p.user else '',
                (p.user.first_name or '') if p.user else ''
            ))[:limit]
            
            print(f"DEBUG: Found {len(all_patients_query)} patients matching '{q}' (all patients)")
            results = all_patients_query
        
        # Additional debug: check total patients in database
        try:
            total_patients = db.query(PatientORM).count()
            print(f"DEBUG: Total patients in database: {total_patients}")
            
            # Check if any patients have user_id
            patients_with_user = db.query(PatientORM).filter(PatientORM.user_id.isnot(None)).count()
            print(f"DEBUG: Patients with user_id: {patients_with_user}")
            
            # Check if any users match the search (for debugging)
            matching_users = db.query(UserORM).filter(
                or_(
                    UserORM.first_name.ilike(like),
                    UserORM.last_name.ilike(like),
                    UserORM.full_name.ilike(like),
                    UserORM.email.ilike(like),
                )
            ).limit(5).all()
            print(f"DEBUG: Found {len(matching_users)} users matching '{q}'")
            for u in matching_users:
                print(f"DEBUG:   - User: {u.first_name} {u.last_name} (ID: {u.id}, Email: {u.email})")
        except Exception as debug_error:
            print(f"DEBUG: Error in debug queries: {debug_error}")
        
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
                import traceback
                traceback.print_exc()
                continue
        
        print(f"DEBUG: Transformed {len(search_results)} patients")
        
        return search_results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Critical error in patient search: {e}")
        import traceback
        traceback.print_exc()
        # Log the error but still return empty results
        # In production, you might want to raise HTTPException here
        return []


@router.get("/{patient_id:uuid}", response_model=SuccessResponse[PatientOut])
async def get_patient(
    patient_id: UUID = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    # Get doctor's clinic and doctor_id
    from app.common.models.user import User
    from app.common.models.patient import OrganizationPatient
    from app.common.models.doctor import Doctor
    
    doctor_user = db.query(User).filter(User.id == current.id).first()
    if not doctor_user:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get doctor profile to get doctor_id
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current.id).first()
    doctor_id = doctor_profile.id if doctor_profile else None
    
    # Get patient with user data using proper ORM models
    # Since the patient is searchable, it should have a user_id
    # Use the same query pattern as search to ensure consistency
    print(f"DEBUG: [get_patient] Looking for patient_id: {patient_id} (type: {type(patient_id)})")
    
    # Try query with user join (same as search) - this is how searchable patients are found
    print(f"DEBUG: [get_patient] Querying PatientORM with user join")
    p = db.query(PatientORM).join(
        UserORM, PatientORM.user_id == UserORM.id
    ).options(
        joinedload(PatientORM.user)
    ).filter(PatientORM.patient_id == patient_id).first()
    print(f"DEBUG: [get_patient] Query with user join result: {p is not None}")
    
    # If not found with user join, try without join (for patients without user accounts)
    if not p:
        print(f"DEBUG: [get_patient] Patient not found with user join, trying without join")
        p = db.query(PatientORM).filter(PatientORM.patient_id == patient_id).first()
        print(f"DEBUG: [get_patient] Query without join result: {p is not None}")
    
    # Also try with cast to string (in case of UUID type issues)
    if not p:
        print(f"DEBUG: [get_patient] Trying cast to string query")
        try:
            from sqlalchemy import cast, String
            p = db.query(PatientORM).join(
                UserORM, PatientORM.user_id == UserORM.id
            ).options(
                joinedload(PatientORM.user)
            ).filter(cast(PatientORM.patient_id, String) == str(patient_id)).first()
            print(f"DEBUG: [get_patient] Cast query result: {p is not None}")
        except Exception as e:
            print(f"DEBUG: [get_patient] Cast query error: {e}")
            pass
    
    # If still not found, maybe patient_id is actually a user_id
    if not p:
        print(f"DEBUG: [get_patient] Trying to find patient by user_id={patient_id}")
        p = db.query(PatientORM).join(
            UserORM, PatientORM.user_id == UserORM.id
        ).options(
            joinedload(PatientORM.user)
        ).filter(PatientORM.user_id == patient_id).first()
        if p:
            print(f"DEBUG: [get_patient] Found patient by user_id: {p.patient_id}")
    
    if p:
        print(f"DEBUG: [get_patient] Patient found: {p.patient_id}, user_id: {p.user_id}")
    
    if not p:
        print(f"DEBUG: [get_patient] Patient {patient_id} not found in database")
        print(f"DEBUG: [get_patient] doctor_id: {doctor_id}")
        
        # Check if doctor has an appointment with this patient_id
        # If so, the patient might not exist yet, but we should still allow access
        # and return minimal patient info
        if doctor_id:
            print(f"DEBUG: [get_patient] Checking for appointment with patient_id={patient_id}, doctor_id={doctor_id}")
            # Try to find appointment with this patient_id
            appointment = db.query(AppointmentORM).filter(
                AppointmentORM.patient_id == patient_id,
                AppointmentORM.doctor_id == doctor_id
            ).first()
            print(f"DEBUG: [get_patient] Appointment found: {appointment is not None}")
            
            # If not found, try to find ANY appointment with this doctor to see what patient_ids exist
            if not appointment:
                print(f"DEBUG: [get_patient] No appointment found, checking all appointments for this doctor")
                all_appointments = db.query(AppointmentORM).filter(
                    AppointmentORM.doctor_id == doctor_id
                ).limit(10).all()
                print(f"DEBUG: [get_patient] Total appointments for doctor: {len(all_appointments)}")
                print(f"DEBUG: [get_patient] Sample appointment patient_ids: {[str(a.patient_id) for a in all_appointments]}")
                print(f"DEBUG: [get_patient] Looking for patient_id: {patient_id}")
                # Check if any appointment has a patient that matches by user_id
                # OR if the passed patient_id is actually a user_id that matches an appointment's patient's user_id
                for apt in all_appointments:
                    print(f"DEBUG: [get_patient] Checking appointment: id={apt.id}, patient_id={apt.patient_id}")
                    # Try to find patient by the appointment's patient_id
                    apt_patient = db.query(PatientORM).filter(PatientORM.patient_id == apt.patient_id).first()
                    if apt_patient:
                        print(f"DEBUG: [get_patient] Appointment patient found: patient_id={apt_patient.patient_id}, user_id={apt_patient.user_id}")
                        # Check if the passed patient_id matches this patient's user_id
                        if apt_patient.user_id == patient_id:
                            print(f"DEBUG: [get_patient] Found patient via appointment user_id match! appointment.patient_id={apt.patient_id}, patient.user_id={apt_patient.user_id}")
                            p = apt_patient
                            # Load user relationship
                            if p.user_id:
                                p = db.query(PatientORM).join(
                                    UserORM, PatientORM.user_id == UserORM.id
                                ).options(
                                    joinedload(PatientORM.user)
                                ).filter(PatientORM.patient_id == p.patient_id).first()
                            break
                        # Also check if the passed patient_id matches the appointment's patient_id directly
                        elif apt.patient_id == patient_id:
                            print(f"DEBUG: [get_patient] Found patient via appointment patient_id match! appointment.patient_id={apt.patient_id}")
                            p = apt_patient
                            # Load user relationship
                            if p.user_id:
                                p = db.query(PatientORM).join(
                                    UserORM, PatientORM.user_id == UserORM.id
                                ).options(
                                    joinedload(PatientORM.user)
                                ).filter(PatientORM.patient_id == p.patient_id).first()
                            break
                    else:
                        print(f"DEBUG: [get_patient] No patient found for appointment patient_id={apt.patient_id}")
            
            if appointment:
                print(f"DEBUG: [get_patient] Appointment patient_id: {appointment.patient_id}, doctor_id: {appointment.doctor_id}")
            
            if appointment:
                print(f"DEBUG: [get_patient] Patient not found but doctor has appointment - creating minimal patient record")
                # Patient doesn't exist but doctor has appointment - create minimal patient
                # This can happen when appointments are created before patient records
                try:
                    from datetime import datetime
                    p = PatientORM(
                        patient_id=patient_id,
                        user_id=None,  # No user account yet
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(p)
                    db.commit()
                    db.refresh(p)
                    print(f"DEBUG: [get_patient] Created minimal patient record: {p.patient_id}")
                except Exception as create_error:
                    print(f"DEBUG: [get_patient] Error creating patient: {create_error}")
                    import traceback
                    traceback.print_exc()
                    db.rollback()
                    # Don't fail - try to find patient by user_id instead
                    # Maybe the appointment's patient_id is actually a user_id
                    print(f"DEBUG: [get_patient] Trying to find patient by user_id={patient_id}")
                    p = db.query(PatientORM).filter(PatientORM.user_id == patient_id).first()
                    if not p:
                        raise HTTPException(status_code=500, detail=f"Failed to create patient record: {str(create_error)}")
        else:
            print(f"DEBUG: [get_patient] No doctor_id, cannot check appointments")
        
        # If still not found, check if patient_id is actually a user_id
        if not p:
            print(f"DEBUG: [get_patient] Trying to find patient by user_id={patient_id}")
            p = db.query(PatientORM).filter(PatientORM.user_id == patient_id).first()
            if p:
                print(f"DEBUG: [get_patient] Found patient by user_id: {p.patient_id}")
        
        # If still not found, raise error
        if not p:
            # Check if any patient exists with similar ID
            all_patients = db.query(PatientORM).limit(5).all()
            print(f"DEBUG: [get_patient] Sample patient IDs in DB: {[str(p.patient_id) for p in all_patients]}")
            raise HTTPException(status_code=404, detail="Patient not found")
    
    print(f"DEBUG: [get_patient] Found patient: {p.patient_id}, user_id: {p.user_id}")
    
    # Verify patient is accessible to this doctor:
    # 1. Patient is in doctor's clinic, OR
    # 2. Doctor has an appointment with this patient
    clinic_uuid = None
    has_access = False
    
    if doctor_user.organization_id:
        clinic_uuid = UUID(str(doctor_user.organization_id)) if isinstance(doctor_user.organization_id, str) else doctor_user.organization_id
        
        # Check if patient is in doctor's clinic
        org_patient = db.query(OrganizationPatient).filter(
            OrganizationPatient.patient_id == patient_id,
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        ).first()
        
        if org_patient:
            # Patient is in clinic, allow access
            has_access = True
            print(f"DEBUG: [get_patient] Patient is in doctor's clinic")
    
    # Check if doctor has an appointment with this patient (even if not in clinic)
    if not has_access and doctor_id:
        appointment = db.query(AppointmentORM).filter(
            AppointmentORM.patient_id == patient_id,
            AppointmentORM.doctor_id == doctor_id
        ).first()
        
        if appointment:
            has_access = True
            print(f"DEBUG: [get_patient] Doctor has appointment with patient")
    
    if not has_access:
        print(f"DEBUG: [get_patient] Patient not accessible - no clinic association and no appointment")
        raise HTTPException(status_code=403, detail="Patient not accessible to this doctor")
    
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
        
        logger.info("[get_patient] Querying vitals for patient_id: %s (UUID: %s)", patient_id_str, patient_id_uuid)
        
        # Query latest vital signs for height, weight, BMI, and measured_at (table has measured_at, not recorded_at)
        vitals_sql = text("""
            SELECT height, weight, bmi, measured_at, created_at
            FROM ehr.vital_signs
            WHERE patient_id = :patient_id
            AND (height IS NOT NULL OR weight IS NOT NULL)
            ORDER BY measured_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 1
        """)
        try:
            vitals_result = db.execute(vitals_sql, {"patient_id": patient_id_uuid}).first()
            logger.info("[get_patient] Vitals query result (UUID): %s", vitals_result)
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
                            logger.info("[get_patient] Calculated BMI on retrieval: %s (height=%scm, weight=%skg)", bmi_val, height_val, weight_val)
                    except (ValueError, TypeError, ZeroDivisionError) as e:
                        logger.warning("[get_patient] Could not calculate BMI: %s", e)
                        bmi_val = None
                
                bmi = str(bmi_val) if bmi_val is not None else None
                
                # Get the measurement date (prefer measured_at, fallback to created_at)
                measured_at_val = vitals_result[3] if len(vitals_result) > 3 else None
                created_at_val = vitals_result[4] if len(vitals_result) > 4 else None
                last_measured = measured_at_val or created_at_val
                if last_measured:
                    if hasattr(last_measured, 'isoformat'):
                        last_measured = last_measured.isoformat()
                    else:
                        last_measured = str(last_measured)
                logger.info("[get_patient] Extracted: height=%s, weight=%s, bmi=%s, last_measured=%s", height, weight, bmi, last_measured)
        except Exception as e1:
            logger.warning("[get_patient] UUID query failed: %s, trying string comparison", str(e1)[:200])
            try:
                db.rollback()
            except Exception:
                pass
            try:
                vitals_sql_str = text("""
                    SELECT height, weight, bmi, measured_at, created_at
                    FROM ehr.vital_signs
                    WHERE patient_id::text = :patient_id
                    AND (height IS NOT NULL OR weight IS NOT NULL)
                    ORDER BY measured_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                    LIMIT 1
                """)
                vitals_result = db.execute(vitals_sql_str, {"patient_id": patient_id_str}).first()
                logger.info("[get_patient] Vitals query result (string): %s", vitals_result)
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
                            logger.info("[get_patient] Calculated BMI on retrieval (string): %s (height=%scm, weight=%skg)", bmi_val, height_val, weight_val)
                        except (ValueError, TypeError, ZeroDivisionError) as e:
                            logger.warning("[get_patient] Could not calculate BMI: %s", e)
                            bmi_val = None
                    
                    bmi = str(bmi_val) if bmi_val is not None else None
                    
                    # Get the measurement date (prefer measured_at, fallback to created_at)
                    measured_at_val = vitals_result[3] if len(vitals_result) > 3 else None
                    created_at_val = vitals_result[4] if len(vitals_result) > 4 else None
                    last_measured = measured_at_val or created_at_val
                    if last_measured:
                        if hasattr(last_measured, 'isoformat'):
                            last_measured = last_measured.isoformat()
                        else:
                            last_measured = str(last_measured)
                    logger.info("[get_patient] Extracted: height=%s, weight=%s, bmi=%s, last_measured=%s", height, weight, bmi, last_measured)
            except Exception as e2:
                logger.warning("[get_patient] String query also failed: %s", str(e2)[:200])
                pass
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("[get_patient] Error querying vitals: %s", str(e)[:200], exc_info=True)
        pass
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info("[get_patient] Final values: height=%s, weight=%s, bmi=%s, last_measured=%s", height, weight, bmi, last_measured)
    
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
                    SELECT id, temperature, heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
                           respiratory_rate, oxygen_saturation, pain_scale, height, weight, bmi,
                           measured_by, measured_at
                    FROM ehr.vital_signs
                    WHERE patient_id = :patient_id
                    ORDER BY measured_at DESC NULLS LAST, id DESC
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
                        SELECT id, temperature, heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
                               respiratory_rate, oxygen_saturation, pain_scale, height, weight, bmi,
                               measured_by, measured_at
                        FROM ehr.vital_signs
                        WHERE patient_id::text = :patient_id
                        ORDER BY measured_at DESC NULLS LAST, id DESC
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
                measured_by = row[11] if len(row) > 11 else None
                measured_at = row[12] if len(row) > 12 else None
                
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
                    "recordedBy": str(measured_by) if measured_by else None,
                    "recordedAt": measured_at.isoformat() if measured_at else None,
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