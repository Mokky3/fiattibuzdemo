"""Nurse patients routes supporting nurse-facing patient management."""
from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.nurse.schemas.patients import (
    NursePatient,
    NursePatientCreate,
    NursePatientUpdate,
    NursePatientCollection,
    NursePatientProfile,
    PatientProfileOverview,
    PatientProfileClinical,
    PatientProfileDocuments,
    AssignedDoctor,
    RoomBedInfo,
    EmergencyContactInfo,
    VitalSignEntry,
    ClinicalObservation,
    AllergyInfo,
    ImmunizationInfo,
    MedicationInfo,
    TreatmentPlanItem,
    LabResultInfo,
    NoteInfo,
    ImagingResultInfo,
    DocumentInfo,
    MedicalHistoryItem,
    CreateVitalSignRequest,
    CreateObservationRequest,
    AddAllergyRequest,
    AddImmunizationRequest,
    MarkTreatmentAdministeredRequest,
)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, String, desc, text
from datetime import date, datetime
from app.db.session import get_db
from app.crud.patient import patient as patient_crud
from app.crud.vitals import vitals as vitals_crud
from app.crud.clinical import observation as observations_crud, allergy_intolerance as allergies_crud
from app.common.models.patient import Patient as PatientModel
from app.common.models.user import User
from app.common.models.medical import VitalSign, MedicalRecord
from app.common.models.clinical import (
    Observation, AllergyIntolerance,
    AllergyType, AllergyCriticality, ClinicalStatus, VerificationStatus,
    ObservationStatus, ObservationCategory
)
from app.common.models.lab_insurance import LabResult
from app.common.models.doctor import Doctor
from app.common.models.nurse import NursePatientAssignment
import logging
import uuid as uuid_lib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patients", tags=["Nurse Patients"])


def _to_schema_from_patient_row(row: PatientModel) -> NursePatient:
    # Calculate age from date of birth
    age = 0
    if row.date_of_birth:
        from datetime import date
        today = date.today()
        age = today.year - row.date_of_birth.year - (
            (today.month, today.day) < (row.date_of_birth.month, row.date_of_birth.day)
        )
    
    # Get name from related User model if available
    first_name = ""
    last_name = ""
    email = None
    phone = row.phone
    gender = row.sex or ""
    
    if row.user:
        first_name = row.user.first_name or ""
        last_name = row.user.last_name or ""
        email = row.user.email
        if not phone:
            phone = row.user.phone
        if not gender:
            # Try to get gender from user if available
            try:
                gender = row.user.gender.value if row.user.gender else ""
            except (AttributeError, TypeError):
                pass
    
    return NursePatient(
        id=str(row.id),
        firstName=first_name,
        lastName=last_name,
        patientId=str(row.id),  # Use patient_id as patientId
        age=age,
        gender=gender,
        phone=phone,
        email=email,
        address=None,  # Address not directly on Patient model
        diagnosis=None,  # Could be enhanced to get from medical records
        notes=None,
    )


def _to_schema_from_detail(detail: Dict[str, object]) -> NursePatient:
    return NursePatient(
        id=str(detail.get("id") or ""),
        firstName=str(detail.get("first_name") or ""),
        lastName=str(detail.get("last_name") or ""),
        patientId=str(detail.get("patient_code") or detail.get("id") or ""),
        age=int(detail.get("age") or 0),
        gender=str(detail.get("gender") or ""),
        phone=str(detail.get("phone_number") or "") or None,
        email=str(detail.get("email") or "") or None,
        address=str(detail.get("address") or "") or None,
        diagnosis=None,
        notes=None,
    )


@router.get("", response_model=SuccessResponse[NursePatientCollection])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by name or patient id"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        # Get patients from database via organization_patients (many-to-many relationship)
        # Filter by nurse's clinic
        from app.common.models.patient import Patient, OrganizationPatient
        from app.common.models.user import User
        from uuid import UUID
        
        # Get nurse's clinic (organization_id) from User model
        nurse_user = db.query(User).filter(User.id == current_user.user_id).first()
        if not nurse_user or not nurse_user.organization_id:
            # If no clinic, return empty results
            collection = NursePatientCollection(items=[], total=0)
            return SuccessResponse(data=collection, message="No patients found - nurse not associated with a clinic")
        
        clinic_uuid = UUID(str(nurse_user.organization_id)) if isinstance(nurse_user.organization_id, str) else nurse_user.organization_id
        
        # Query patients through organization_patients, filtered by clinic
        query = db.query(Patient).join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        ).options(joinedload(Patient.user))
        
        if search:
            # Search in both Patient and User tables
            search_like = f"%{search}%"
            query = query.join(User, Patient.user_id == User.id).filter(
                or_(
                    User.first_name.ilike(search_like),
                    User.last_name.ilike(search_like),
                    User.email.ilike(search_like),
                    Patient.phone.ilike(search_like),
                    func.cast(Patient.patient_id, String).ilike(search_like)
                )
            )
        else:
            # Join with User for all queries to get name data
            query = query.outerjoin(User, Patient.user_id == User.id)
        
        # Get total count before pagination
        total_count = query.distinct().count()
        
        # Apply pagination
        rows = query.distinct().offset(skip).limit(limit).all()
        
        items = [_to_schema_from_patient_row(r) for r in rows]
        
        collection = NursePatientCollection(items=items, total=total_count)
        return SuccessResponse(data=collection, message="Patients retrieved")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error listing patients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")


@router.post("", response_model=SuccessResponse[NursePatient], status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: NursePatientCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Map schema to CRUD expected fields
    created = patient_crud.create_patient(
        db,
        patient_data={
            "first_name": payload.firstName,
            "last_name": payload.lastName,
            "email": payload.email,
            "phone_number": payload.phone,
            "gender": payload.gender,
        },
        created_by=current_user.user_id,
    )
    dto = _to_schema_from_detail(created)
    return SuccessResponse(data=dto, message="Patient created")


@router.get("/{patient_key}", response_model=SuccessResponse[NursePatient])
async def get_patient(
    patient_key: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    detail = patient_crud.get_patient_by_id(db, patient_id=patient_key)
    if not detail:
        # fallback to ORM get
        row = patient_crud.get(db, id=patient_key)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        dto = _to_schema_from_patient_row(row)
    else:
        dto = _to_schema_from_detail(detail)
    return SuccessResponse(data=dto, message="Patient retrieved")


@router.patch("/{patient_key}", response_model=SuccessResponse[NursePatient])
async def patch_patient(
    patient_key: str,
    payload: NursePatientUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    updates = payload.dict(exclude_none=True)
    # Map to CRUD fields
    mapped = {}
    if "firstName" in updates:
        mapped["first_name"] = updates["firstName"]
    if "lastName" in updates:
        mapped["last_name"] = updates["lastName"]
    if "email" in updates:
        mapped["email"] = updates["email"]
    if "phone" in updates:
        mapped["phone_number"] = updates["phone"]
    if "gender" in updates:
        mapped["gender"] = updates["gender"]

    updated = patient_crud.update_patient(db, patient_id=patient_key, patient_data=mapped)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    dto = _to_schema_from_detail(updated)
    return SuccessResponse(data=dto, message="Patient updated")


@router.delete("/{patient_key}", response_model=SuccessResponse[Dict[str, str]])
async def delete_patient(
    patient_key: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    row = db.query(PatientModel).filter(PatientModel.id == patient_key).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    db.delete(row)
    db.commit()
    return SuccessResponse(data={"status": "deleted"}, message="Patient deleted")


@router.get("/{patient_key}/profile", response_model=SuccessResponse[NursePatientProfile])
async def get_patient_profile(
    patient_key: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get comprehensive patient profile for nurse view"""
    logger = logging.getLogger(__name__)
    try:
        # Get patient with relationships - handle missing tables gracefully
        # Start with basic query to avoid transaction abort issues
        patient = None
        try:
            # Try with all relationships first
            patient = db.query(PatientModel).options(
                joinedload(PatientModel.user),
                joinedload(PatientModel.emergency_contacts),
                joinedload(PatientModel.allergies),
                joinedload(PatientModel.medications),
                joinedload(PatientModel.medical_records),
                joinedload(PatientModel.vital_signs),
                joinedload(PatientModel.lab_results),
                joinedload(PatientModel.immunizations),
            ).filter(PatientModel.patient_id == patient_key).first()
        except Exception as e:
            # If emergency_contacts or other tables don't exist, rollback and try without them
            logger.warning(f"Error loading patient with all relationships (some tables may not exist): {e}")
            try:
                db.rollback()  # Rollback the aborted transaction
                # Try without emergency_contacts
                patient = db.query(PatientModel).options(
                    joinedload(PatientModel.user),
                    joinedload(PatientModel.allergies),
                    joinedload(PatientModel.medications),
                    joinedload(PatientModel.medical_records),
                    joinedload(PatientModel.vital_signs),
                    joinedload(PatientModel.lab_results),
                    joinedload(PatientModel.immunizations),
                ).filter(PatientModel.patient_id == patient_key).first()
            except Exception as e2:
                # Rollback and fallback to basic query with just user
                logger.warning(f"Error loading patient with most relationships: {e2}")
                try:
                    db.rollback()  # Rollback the aborted transaction
                    patient = db.query(PatientModel).options(
                        joinedload(PatientModel.user),
                    ).filter(PatientModel.patient_id == patient_key).first()
                except Exception as e3:
                    # Final fallback - rollback and try without any relationships
                    logger.warning(f"Error loading patient with user relationship: {e3}")
                    db.rollback()
                    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Calculate age
        age = 0
        if patient.date_of_birth:
            today = date.today()
            age = today.year - patient.date_of_birth.year - (
                (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
            )
        
        # Get patient name from User
        first_name = ""
        last_name = ""
        email = None
        phone = patient.phone
        gender = patient.sex or ""
        
        if patient.user:
            first_name = patient.user.first_name or ""
            last_name = patient.user.last_name or ""
            email = patient.user.email
            if not phone:
                phone = patient.user.phone
            if not gender:
                try:
                    gender = patient.user.gender.value if patient.user.gender else ""
                except (AttributeError, TypeError):
                    pass
        
        full_name = f"{first_name} {last_name}".strip() or f"Patient {str(patient.patient_id)[:8]}"
        
        # Get assigned doctors from medical records
        assigned_doctors = []
        try:
            recent_records = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == str(patient.patient_id)
            ).order_by(desc(MedicalRecord.record_date)).limit(5).all()
            
            doctor_ids = set()
            for record in recent_records:
                if record.doctor_id and record.doctor_id not in doctor_ids:
                    doctor_ids.add(record.doctor_id)
                    doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(
                        Doctor.id == record.doctor_id
                    ).first()
                    if doctor:
                        doctor_name = "Unknown Doctor"
                        if doctor.user:
                            doctor_name = f"{doctor.user.first_name or ''} {doctor.user.last_name or ''}".strip()
                        assigned_doctors.append(AssignedDoctor(
                            id=str(doctor.id),
                            name=doctor_name,
                            department=None,  # Could be enhanced
                            specialty=None,  # Could be enhanced
                        ))
        except Exception as e:
            logger.warning(f"Error getting assigned doctors: {e}")
            # Rollback to reset transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get room/bed info (if available)
        room_bed = None
        try:
            # Check if patient has location assignment
            from app.common.models.hospital import Location
            location = db.query(Location).filter(
                Location.current_patient_id == str(patient.patient_id),
                Location.is_occupied.is_(True)
            ).first()
            if location:
                room_bed = RoomBedInfo(
                    roomNumber=location.room_number,
                    bedNumber=location.bed_number,
                    department=location.department_id,
                    location=location.name,
                )
        except Exception as e:
            logger.warning(f"Error getting room/bed info: {e}")
            # Rollback to reset transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get emergency contact (handle missing table gracefully)
        emergency_contact = None
        try:
            if hasattr(patient, 'emergency_contacts') and patient.emergency_contacts:
                ec = patient.emergency_contacts[0]  # Get first emergency contact
                emergency_contact = EmergencyContactInfo(
                    name=f"{ec.first_name or ''} {ec.last_name or ''}".strip() if hasattr(ec, 'first_name') else (ec.name if hasattr(ec, 'name') else None),
                    relationship=ec.relationship_type if hasattr(ec, 'relationship_type') else (ec.relationship if hasattr(ec, 'relationship') else None),
                    phone=ec.phone_primary if hasattr(ec, 'phone_primary') else (ec.phone if hasattr(ec, 'phone') else None),
                    email=ec.email if hasattr(ec, 'email') else None,
                )
        except Exception as e:
            logger.warning(f"Error getting emergency contact: {e}")
            emergency_contact = None
            # Rollback to reset transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Build overview
        overview = PatientProfileOverview(
            id=str(patient.patient_id),
            firstName=first_name,
            lastName=last_name,
            fullName=full_name,
            age=age,
            gender=gender,
            photo=None,  # Could be enhanced to get from user profile
            patientId=str(patient.patient_id),
            pinfl=None,  # Could be enhanced if PINFL is stored
            phone=phone,
            email=email,
            address=None,  # Could be enhanced
            assignedDoctors=assigned_doctors,
            department=None,  # Could be enhanced
            roomBed=room_bed,
            emergencyContact=emergency_contact,
            isEditable=False,  # Nurses typically can't edit demographic info
        )
        
        # Get vital signs using raw SQL to avoid selecting non-existent columns
        # IMPORTANT: Rollback any previous transaction errors before querying vital signs
        vital_signs = []
        try:
            # Ensure we're in a clean transaction state
            try:
                db.rollback()
            except Exception:
                pass
            
            # Use patient_key from the URL parameter to match what was used when creating the vital sign
            # This ensures we're querying with the exact same value that was used during creation
            patient_id_to_query = str(patient_key)
            logger.info(f"Querying vital signs for patient_key: {patient_id_to_query} (patient.patient_id: {patient.patient_id})")
            
            # First, check if the vital_signs table exists and has any data
            try:
                count_sql = text("SELECT COUNT(*) FROM ehr.vital_signs")
                total_count = db.execute(count_sql).scalar()
                logger.info(f"Total vital signs in table: {total_count}")
            except Exception as e:
                logger.warning(f"Could not count vital signs: {e}")
                # Rollback and continue
                try:
                    db.rollback()
                except Exception:
                    pass
            
            # Query with patient_key first (this is what was used when creating)
            # Try multiple query formats to handle UUID vs string comparison
            # First, try with UUID cast (most common case) - try with all columns including BP
            results = []
            # Use correct database column names: systolic_bp, diastolic_bp (not blood_pressure_*)
            try:
                select_sql = text("""
                    SELECT id, patient_id, temperature, heart_rate, created_at,
                           respiratory_rate, oxygen_saturation, pain_scale,
                           systolic_bp, diastolic_bp, height, weight, bmi
                    FROM ehr.vital_signs
                    WHERE patient_id::text = :patient_id
                    ORDER BY created_at DESC NULLS LAST, id DESC
                    LIMIT 50
                """)
                results = db.execute(select_sql, {"patient_id": patient_id_to_query}).all()
                logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using UUID cast with all columns)")
            except Exception as e:
                logger.warning(f"UUID cast query with all columns failed: {e}, trying without BP columns")
                # Rollback to reset transaction state
                try:
                    db.rollback()
                except Exception:
                    pass
                # Try without blood pressure columns (they might not exist)
                try:
                    select_sql_no_bp = text("""
                        SELECT id, patient_id, temperature, heart_rate, created_at,
                               respiratory_rate, oxygen_saturation, pain_scale
                        FROM ehr.vital_signs
                        WHERE patient_id::text = :patient_id
                        ORDER BY created_at DESC NULLS LAST, id DESC
                        LIMIT 50
                    """)
                    results = db.execute(select_sql_no_bp, {"patient_id": patient_id_to_query}).all()
                    logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using UUID cast without BP columns)")
                except Exception as e2:
                    logger.warning(f"UUID cast query without BP also failed: {e2}, trying with only basic columns")
                    # Rollback to reset transaction state
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    # Try with only basic columns
                    try:
                        select_sql_basic = text("""
                            SELECT id, patient_id, temperature, heart_rate, created_at
                            FROM ehr.vital_signs
                            WHERE patient_id::text = :patient_id
                            ORDER BY created_at DESC NULLS LAST, id DESC
                            LIMIT 50
                        """)
                        results = db.execute(select_sql_basic, {"patient_id": patient_id_to_query}).all()
                        logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using basic columns)")
                    except Exception as e3:
                        logger.warning(f"Basic columns query also failed: {e3}, trying with only id and patient_id")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        # Final fallback: only id and patient_id
                        try:
                            select_sql_minimal = text("""
                                SELECT id, patient_id
                                FROM ehr.vital_signs
                                WHERE patient_id::text = :patient_id
                                ORDER BY id DESC
                                LIMIT 50
                            """)
                            results = db.execute(select_sql_minimal, {"patient_id": patient_id_to_query}).all()
                            logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using minimal columns)")
                        except Exception as e4:
                            logger.warning(f"Minimal query also failed: {e4}")
                            results = []
            
            # If no results, try without cast (in case column is already text)
            if len(results) == 0:
                try:
                    select_sql_text = text("""
                        SELECT id, patient_id, temperature, heart_rate, created_at,
                               respiratory_rate, oxygen_saturation, pain_scale,
                               systolic_bp, diastolic_bp, height, weight, bmi
                        FROM ehr.vital_signs
                        WHERE patient_id = :patient_id
                        ORDER BY created_at DESC NULLS LAST, id DESC
                        LIMIT 50
                    """)
                    results = db.execute(select_sql_text, {"patient_id": patient_id_to_query}).all()
                    logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using direct comparison with all columns)")
                except Exception as e:
                    logger.warning(f"Direct comparison query with all columns failed: {e}, trying without BP")
                    # Rollback to reset transaction state
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    # Try without blood pressure columns
                    try:
                        select_sql_text_no_bp = text("""
                            SELECT id, patient_id, temperature, heart_rate, created_at,
                                   respiratory_rate, oxygen_saturation, pain_scale
                            FROM ehr.vital_signs
                            WHERE patient_id = :patient_id
                            ORDER BY created_at DESC NULLS LAST, id DESC
                            LIMIT 50
                        """)
                        results = db.execute(select_sql_text_no_bp, {"patient_id": patient_id_to_query}).all()
                        logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using direct comparison without BP)")
                    except Exception as e2:
                        logger.warning(f"Direct comparison query without BP also failed: {e2}")
                        # Rollback to reset transaction state
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        results = []
            
            # If still no results, try with UUID type casting
            if len(results) == 0:
                try:
                    from sqlalchemy import cast
                    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
                    uuid_select_sql = text("""
                        SELECT id, patient_id
                        FROM ehr.vital_signs
                        WHERE patient_id = CAST(:patient_id AS UUID)
                        ORDER BY created_at DESC NULLS LAST, id DESC
                        LIMIT 50
                    """)
                    results = db.execute(uuid_select_sql, {"patient_id": patient_id_to_query}).all()
                    logger.info(f"Found {len(results)} vital signs for patient {patient_id_to_query} (using CAST AS UUID)")
                except Exception as e:
                    logger.warning(f"CAST AS UUID query failed: {e}")
                    # Rollback to reset transaction state
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    results = []
            
            # If no results, try with patient.patient_id (in case they're different)
            if len(results) == 0:
                patient_id_str = str(patient.patient_id)
                if patient_id_str != patient_id_to_query:
                    logger.warning(f"No vital signs found with patient_key={patient_id_to_query}, trying with patient.patient_id={patient_id_str}")
                    results = db.execute(select_sql, {"patient_id": patient_id_str}).all()
                    logger.info(f"Found {len(results)} vital signs with patient.patient_id {patient_id_str}")
            
            # If still no results, try with UUID casting (already done above, but keep for compatibility)
            # This section is now redundant but kept for backward compatibility
            
            # If still no results, try to see what patient_ids exist in the table
            if len(results) == 0:
                try:
                    # Ensure we're in a clean transaction state before trying debug queries
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    
                    # Try a simpler approach: get all vital signs with their data and filter in Python
                    # Get all vital signs with their data columns
                    all_vitals = []
                    try:
                        all_vitals_sql = text("""
                            SELECT id, patient_id, temperature, heart_rate, created_at,
                                   respiratory_rate, oxygen_saturation, pain_scale,
                                   systolic_bp, diastolic_bp, height, weight, bmi
                            FROM ehr.vital_signs
                            ORDER BY created_at DESC NULLS LAST, id DESC
                            LIMIT 100
                        """)
                        all_vitals = db.execute(all_vitals_sql).all()
                        logger.info(f"Retrieved {len(all_vitals)} vital signs from database with full data including BP and pain")
                    except Exception as all_e:
                        logger.warning(f"Could not get full vital signs data with all columns: {all_e}, trying without BP columns")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        # Try without blood pressure columns
                        try:
                            all_vitals_sql_no_bp = text("""
                                SELECT id, patient_id, temperature, heart_rate, created_at,
                                       respiratory_rate, oxygen_saturation, pain_scale
                                FROM ehr.vital_signs
                                ORDER BY created_at DESC NULLS LAST, id DESC
                                LIMIT 100
                            """)
                            all_vitals = db.execute(all_vitals_sql_no_bp).all()
                            logger.info(f"Retrieved {len(all_vitals)} vital signs from database without BP columns")
                        except Exception as all_e2:
                            logger.warning(f"Could not get vital signs data without BP: {all_e2}, trying minimal columns")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                            # Fallback to minimal columns
                            all_vitals_sql_minimal = text("SELECT id, patient_id FROM ehr.vital_signs ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 100")
                            all_vitals = db.execute(all_vitals_sql_minimal).all()
                            logger.info(f"Retrieved {len(all_vitals)} vital signs from database (minimal columns)")
                    
                    # Filter by patient_id (comparing as strings) and extract data
                    filtered_results = []
                    for row in all_vitals:
                        vital_id = row[0]
                        vital_patient_id = row[1]
                        vital_patient_id_str = str(vital_patient_id)
                        
                        if vital_patient_id_str == patient_id_to_query or vital_patient_id_str == str(patient.patient_id):
                            # If we got full data, use it; otherwise we'll query separately
                            if len(row) > 2:
                                # We have full data in the row
                                filtered_results.append(row)
                                logger.info(f"Found matching vital sign with data: id={vital_id}, patient_id={vital_patient_id_str}, temp={row[2] if len(row) > 2 else None}, hr={row[3] if len(row) > 3 else None}")
                            else:
                                # Only have id and patient_id, will query separately later
                                filtered_results.append(row)
                                logger.info(f"Found matching vital sign: id={vital_id}, patient_id={vital_patient_id_str}")
                    
                    if filtered_results:
                        logger.info(f"Found {len(filtered_results)} vital signs using Python filtering")
                        results = filtered_results
                    else:
                        # Debug: log what patient_ids exist
                        try:
                            debug_sql = text("SELECT DISTINCT patient_id FROM ehr.vital_signs LIMIT 10")
                            debug_results = db.execute(debug_sql).all()
                            logger.warning(f"No vital signs found. Sample patient_ids in table: {[str(r[0]) for r in debug_results]}")
                            # Also check the most recent vital signs
                            recent_sql = text("SELECT id, patient_id FROM ehr.vital_signs ORDER BY id DESC LIMIT 5")
                            recent_results = db.execute(recent_sql).all()
                            logger.warning(f"Most recent vital signs: {[(str(r[0]), str(r[1])) for r in recent_results]}")
                            logger.warning(f"Looking for patient_id: {patient_id_to_query} (type: {type(patient_id_to_query)})")
                        except Exception as debug_e:
                            logger.warning(f"Could not run debug queries: {debug_e}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                except Exception as e:
                    logger.error(f"Error in debug queries: {e}", exc_info=True)
                    # Rollback to reset transaction state
                    try:
                        db.rollback()
                    except Exception:
                        pass
            
            for row in results:
                # Parse the row based on how many columns were selected
                vital_id = row[0]
                vital_patient_id = row[1]
                
                # Initialize all variables
                temperature = None
                heart_rate = None
                notes = None
                created_at = None
                respiratory_rate = None
                oxygen_saturation = None
                pain_scale = None
                bp_systolic = None
                bp_diastolic = None
                height = None
                weight = None
                bmi = None
                
                # If we got all columns in the initial query, use them directly
                # Query returns: id(0), patient_id(1), temperature(2), heart_rate(3), created_at(4),
                #                respiratory_rate(5), oxygen_saturation(6), pain_scale(7), 
                #                systolic_bp(8), diastolic_bp(9), height(10), weight(11), bmi(12)
                if len(row) >= 5:
                    # We have at least: id, patient_id, temperature, heart_rate, created_at
                    temperature = row[2] if len(row) > 2 and row[2] is not None else None
                    heart_rate = row[3] if len(row) > 3 and row[3] is not None else None
                    created_at = row[4] if len(row) > 4 and row[4] is not None else None
                    notes = None  # notes column doesn't exist
                    
                    # If we have additional columns (8 columns: id, patient_id, temp, hr, created_at, rr, spo2, pain)
                    if len(row) >= 8:
                        respiratory_rate = row[5] if len(row) > 5 and row[5] is not None else None
                        oxygen_saturation = row[6] if len(row) > 6 and row[6] is not None else None
                        pain_scale = row[7] if len(row) > 7 and row[7] is not None else None
                        logger.info(f"Parsed 8 columns for vital {vital_id}: rr={respiratory_rate}, spo2={oxygen_saturation}, pain={pain_scale}")
                    else:
                        # We only got 5 columns, need to query for additional columns
                        logger.info(f"Only got {len(row)} columns for vital {vital_id}, will query for additional columns")
                    
                    # If we have blood pressure columns (10 columns total: id, patient_id, temp, hr, created_at, rr, spo2, pain, systolic_bp, diastolic_bp)
                    if len(row) >= 10:
                        bp_systolic = row[8] if len(row) > 8 and row[8] is not None else None
                        bp_diastolic = row[9] if len(row) > 9 and row[9] is not None else None
                        logger.info(f"Parsed 10 columns for vital {vital_id}: bp={bp_systolic}/{bp_diastolic}")
                    
                    # If we have height and weight columns (12 columns total: id, patient_id, temp, hr, created_at, rr, spo2, pain, systolic_bp, diastolic_bp, height, weight)
                    # Or 13 columns if BMI is included: id, patient_id, temp, hr, created_at, rr, spo2, pain, systolic_bp, diastolic_bp, height, weight, bmi
                    if len(row) >= 12:
                        height = row[10] if len(row) > 10 and row[10] is not None else None
                        weight = row[11] if len(row) > 11 and row[11] is not None else None
                        bmi = row[12] if len(row) > 12 and row[12] is not None else None
                        
                        # Calculate BMI if missing but height and weight are available
                        if bmi is None and height is not None and weight is not None:
                            try:
                                height_m = float(height) / 100.0
                                weight_kg = float(weight)
                                if height_m > 0:
                                    bmi = round(weight_kg / (height_m * height_m), 1)
                                    logger.info(f"Calculated BMI on retrieval: {bmi} (height={height}cm, weight={weight}kg)")
                            except (ValueError, TypeError, ZeroDivisionError) as e:
                                logger.warning(f"Could not calculate BMI: {e}")
                                bmi = None
                        
                        logger.info(f"Parsed {len(row)} columns for vital {vital_id}: height={height}, weight={weight}, bmi={bmi}")
                    
                    # If we got 5 or 8 columns but not 10, we still need to query for missing columns
                    if len(row) < 12:
                        # Query for missing columns using correct database column names
                        for col_name, var_ref in [
                            ("respiratory_rate", "respiratory_rate"),
                            ("oxygen_saturation", "oxygen_saturation"),
                            ("pain_scale", "pain_scale"),
                            ("systolic_bp", "bp_systolic"),  # Use correct DB column name
                            ("diastolic_bp", "bp_diastolic"),  # Use correct DB column name
                            ("height", "height"),
                            ("weight", "weight"),
                            ("bmi", "bmi"),
                        ]:
                            # Skip if we already have the value from the row
                            if len(row) >= 8 and var_ref in ["respiratory_rate", "oxygen_saturation", "pain_scale"]:
                                if var_ref == "respiratory_rate" and respiratory_rate is not None:
                                    continue
                                elif var_ref == "oxygen_saturation" and oxygen_saturation is not None:
                                    continue
                                elif var_ref == "pain_scale" and pain_scale is not None:
                                    continue
                            if len(row) >= 10 and var_ref in ["bp_systolic", "bp_diastolic"]:
                                if var_ref == "bp_systolic" and bp_systolic is not None:
                                    continue
                                elif var_ref == "bp_diastolic" and bp_diastolic is not None:
                                    continue
                            if len(row) >= 12 and var_ref in ["height", "weight", "bmi"]:
                                if var_ref == "height" and height is not None:
                                    continue
                                elif var_ref == "weight" and weight is not None:
                                    continue
                                elif var_ref == "bmi" and bmi is not None:
                                    continue
                            
                            try:
                                col_sql = text(f"SELECT {col_name} FROM ehr.vital_signs WHERE id = :vital_id")
                                col_result = db.execute(col_sql, {"vital_id": vital_id}).first()
                                if col_result and col_result[0] is not None:
                                    if var_ref == "respiratory_rate":
                                        respiratory_rate = col_result[0]
                                    elif var_ref == "oxygen_saturation":
                                        oxygen_saturation = col_result[0]
                                    elif var_ref == "pain_scale":
                                        pain_scale = col_result[0]
                                    elif var_ref == "bp_systolic":
                                        bp_systolic = col_result[0]
                                    elif var_ref == "bp_diastolic":
                                        bp_diastolic = col_result[0]
                                    elif var_ref == "height":
                                        height = col_result[0]
                                    elif var_ref == "weight":
                                        weight = col_result[0]
                                    elif var_ref == "bmi":
                                        bmi = col_result[0]
                                    logger.info(f"Queried {col_name} for vital {vital_id}: {col_result[0]}")
                                
                                # Calculate BMI if missing but height and weight are available
                                if var_ref == "weight" and bmi is None and height is not None and weight is not None:
                                    try:
                                        height_m = float(height) / 100.0
                                        weight_kg = float(weight)
                                        if height_m > 0:
                                            bmi = round(weight_kg / (height_m * height_m), 1)
                                            logger.info(f"Calculated BMI after querying weight: {bmi} (height={height}cm, weight={weight}kg)")
                                    except (ValueError, TypeError, ZeroDivisionError) as e:
                                        logger.warning(f"Could not calculate BMI: {e}")
                                        bmi = None
                            except Exception as col_e:
                                # Column doesn't exist or error - that's okay, just skip it
                                logger.debug(f"Column {col_name} does not exist or error for vital {vital_id}: {col_e}")
                                try:
                                    db.rollback()
                                except Exception:
                                    pass
                    
                    logger.info(f"Retrieved vital {vital_id} from row: temp={temperature}, hr={heart_rate}, created_at={created_at}, rr={respiratory_rate}, spo2={oxygen_saturation}, pain={pain_scale}, bp={bp_systolic}/{bp_diastolic}, height={height}, weight={weight}")
                else:
                    # Fallback: query columns separately if we only got id and patient_id
                    logger.warning(f"Only got {len(row)} columns for vital {vital_id}, querying separately")
                    try:
                        full_sql = text("""
                            SELECT 
                                temperature, heart_rate, created_at
                            FROM ehr.vital_signs
                            WHERE id = :vital_id
                        """)
                        full_result = db.execute(full_sql, {"vital_id": vital_id}).first()
                        
                        if full_result:
                            temperature = full_result[0] if full_result[0] is not None else None
                            heart_rate = full_result[1] if full_result[1] is not None else None
                            created_at = full_result[2] if full_result[2] is not None else None
                            notes = None  # notes column doesn't exist
                            logger.info(f"Retrieved vital {vital_id}: temp={temperature}, hr={heart_rate}, created_at={created_at}")
                    except Exception as full_e:
                        logger.warning(f"Could not query columns for vital {vital_id}: {full_e}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                    
                    # Try to get additional columns that might exist (with separate queries)
                    # Use correct database column names
                    for col_name, var_ref in [
                        ("respiratory_rate", "respiratory_rate"),
                        ("oxygen_saturation", "oxygen_saturation"),
                        ("pain_scale", "pain_scale"),
                        ("systolic_bp", "bp_systolic"),  # Use correct DB column name
                        ("diastolic_bp", "bp_diastolic"),  # Use correct DB column name
                        ("height", "height"),
                        ("weight", "weight"),
                    ]:
                        try:
                            col_sql = text(f"SELECT {col_name} FROM ehr.vital_signs WHERE id = :vital_id")
                            col_result = db.execute(col_sql, {"vital_id": vital_id}).first()
                            if col_result and col_result[0] is not None:
                                if var_ref == "respiratory_rate":
                                    respiratory_rate = col_result[0]
                                elif var_ref == "oxygen_saturation":
                                    oxygen_saturation = col_result[0]
                                elif var_ref == "pain_scale":
                                    pain_scale = col_result[0]
                                elif var_ref == "bp_systolic":
                                    bp_systolic = col_result[0]
                                elif var_ref == "bp_diastolic":
                                    bp_diastolic = col_result[0]
                                elif var_ref == "height":
                                    height = col_result[0]
                                elif var_ref == "weight":
                                    weight = col_result[0]
                                elif var_ref == "bmi":
                                    bmi = col_result[0]
                                
                                # Calculate BMI if missing but height and weight are available
                                if var_ref == "weight" and bmi is None and height is not None and weight is not None:
                                    try:
                                        height_m = float(height) / 100.0
                                        weight_kg = float(weight)
                                        if height_m > 0:
                                            bmi = round(weight_kg / (height_m * height_m), 1)
                                            logger.info(f"Calculated BMI after querying weight (fallback 1): {bmi} (height={height}cm, weight={weight}kg)")
                                    except (ValueError, TypeError, ZeroDivisionError) as e:
                                        logger.warning(f"Could not calculate BMI: {e}")
                                        bmi = None
                        except Exception as col_e:
                            # Column doesn't exist or error - that's okay, just skip it
                            logger.debug(f"Column {col_name} does not exist or error for vital {vital_id}: {col_e}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                    
                    # Fallback: try each column separately (excluding notes which doesn't exist)
                    for col_name, var_ref in [
                        ("temperature", "temperature"),
                        ("heart_rate", "heart_rate"),
                        ("created_at", "created_at"),
                        ("respiratory_rate", "respiratory_rate"),
                        ("oxygen_saturation", "oxygen_saturation"),
                        ("pain_scale", "pain_scale"),
                        ("systolic_bp", "bp_systolic"),  # Use correct DB column name
                        ("diastolic_bp", "bp_diastolic"),  # Use correct DB column name
                        ("height", "height"),
                        ("weight", "weight"),
                    ]:
                        try:
                            col_sql = text(f"SELECT {col_name} FROM ehr.vital_signs WHERE id = :vital_id")
                            col_result = db.execute(col_sql, {"vital_id": vital_id}).first()
                            if col_result and col_result[0] is not None:
                                if var_ref == "temperature":
                                    temperature = col_result[0]
                                elif var_ref == "heart_rate":
                                    heart_rate = col_result[0]
                                elif var_ref == "created_at":
                                    created_at = col_result[0]
                                # notes column doesn't exist, so skip it
                                elif var_ref == "respiratory_rate":
                                    respiratory_rate = col_result[0]
                                elif var_ref == "oxygen_saturation":
                                    oxygen_saturation = col_result[0]
                                elif var_ref == "pain_scale":
                                    pain_scale = col_result[0]
                                elif var_ref == "bp_systolic":
                                    bp_systolic = col_result[0]
                                elif var_ref == "bp_diastolic":
                                    bp_diastolic = col_result[0]
                                elif var_ref == "height":
                                    height = col_result[0]
                                elif var_ref == "weight":
                                    weight = col_result[0]
                                elif var_ref == "bmi":
                                    bmi = col_result[0]
                                
                                # Calculate BMI if missing but height and weight are available
                                if var_ref == "weight" and bmi is None and height is not None and weight is not None:
                                    try:
                                        height_m = float(height) / 100.0
                                        weight_kg = float(weight)
                                        if height_m > 0:
                                            bmi = round(weight_kg / (height_m * height_m), 1)
                                            logger.info(f"Calculated BMI after querying weight (fallback 2): {bmi} (height={height}cm, weight={weight}kg)")
                                    except (ValueError, TypeError, ZeroDivisionError) as e:
                                        logger.warning(f"Could not calculate BMI: {e}")
                                        bmi = None
                        except Exception as col_e:
                            logger.debug(f"Could not get {col_name} for vital {vital_id}: {col_e}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                
                # Format blood pressure
                bp_str = None
                if bp_systolic is not None and bp_diastolic is not None:
                    bp_str = f"{bp_systolic}/{bp_diastolic}"
                elif bp_systolic is not None:
                    bp_str = f"{bp_systolic}/?"
                elif bp_diastolic is not None:
                    bp_str = f"?/{bp_diastolic}"
                
                # Calculate BMI if missing but height and weight are available
                if bmi is None and height is not None and weight is not None:
                    try:
                        height_m = float(height) / 100.0
                        weight_kg = float(weight)
                        if height_m > 0:
                            bmi = round(weight_kg / (height_m * height_m), 1)
                            logger.info(f"Calculated BMI before creating VitalSignEntry: {bmi} (height={height}cm, weight={weight}kg)")
                    except (ValueError, TypeError, ZeroDivisionError) as e:
                        logger.warning(f"Could not calculate BMI: {e}")
                        bmi = None
                
                vital_signs.append(VitalSignEntry(
                    id=str(vital_id),
                    measuredAt=created_at or datetime.utcnow(),
                    temperature=temperature,
                    bloodPressure=bp_str,
                    heartRate=heart_rate,
                    respiratoryRate=respiratory_rate,
                    oxygenSaturation=oxygen_saturation,
                    painScale=pain_scale,
                    height=height,
                    weight=weight,
                    bmi=bmi,
                    measuredBy=None,  # This column doesn't exist in the database
                    notes=notes,
                ))
            logger.info(f"Successfully processed {len(vital_signs)} vital signs for patient {patient_id_to_query}")
        except Exception as e:
            logger.error(f"Error getting vital signs: {e}", exc_info=True)
            # Log the full traceback to help debug
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Get clinical observations - use raw SQL to avoid enum conversion issues
        observations = []
        observations_results = []
        try:
            # First, check if any observations exist at all (for debugging)
            try:
                test_sql = text("SELECT COUNT(*) FROM ehr.observations")
                total_count = db.execute(test_sql).scalar()
                logger.info(f"🔍 [get_patient_profile] Total observations in database: {total_count}")
                
                # Also get a sample of patient_ids from observations to see what's in the database
                if total_count > 0:
                    sample_sql = text("SELECT DISTINCT patient_id FROM ehr.observations LIMIT 5")
                    sample_results = db.execute(sample_sql).all()
                    logger.info(f"🔍 [get_patient_profile] Sample patient_ids in observations: {[str(r[0]) for r in sample_results]}")
            except Exception as test_e:
                logger.warning(f"🔍 [get_patient_profile] Could not count observations: {test_e}")
            
            # Try UUID comparison first
            try:
                logger.info(f"🔍 [get_patient_profile] Querying observations for patient_id: {patient.patient_id} (type: {type(patient.patient_id)})")
                observations_sql = text("""
                    SELECT id, patient_id, display_name, value_string,
                           effective_date, issued, category, performers, code
                    FROM ehr.observations
                    WHERE patient_id = :patient_id
                    ORDER BY effective_date DESC NULLS LAST, issued DESC NULLS LAST
                    LIMIT 50
                """)
                observations_results = db.execute(observations_sql, {"patient_id": patient.patient_id}).all()
                logger.info(f"🔍 [get_patient_profile] Observations query result (UUID): {len(observations_results)} rows")
                if observations_results:
                    logger.info(f"🔍 [get_patient_profile] First observation row: {observations_results[0]}")
                    logger.info(f"🔍 [get_patient_profile] First observation patient_id: {observations_results[0][1]} (type: {type(observations_results[0][1])})")
            except Exception as e1:
                logger.warning(f"🔍 [get_patient_profile] UUID query failed: {e1}, trying string comparison")
                logger.warning(f"🔍 [get_patient_profile] Error details: {str(e1)}", exc_info=True)
                try:
                    db.rollback()
                except Exception:
                    pass
                # Fallback to string comparison
                try:
                    observations_sql_str = text("""
                        SELECT id, patient_id, display_name, value_string,
                               effective_date, issued, category, performers, code
                        FROM ehr.observations
                        WHERE patient_id::text = :patient_id
                        ORDER BY effective_date DESC NULLS LAST, issued DESC NULLS LAST
                        LIMIT 50
                    """)
                    observations_results = db.execute(observations_sql_str, {"patient_id": str(patient.patient_id)}).all()
                    logger.info(f"🔍 [get_patient_profile] Observations query result (string): {len(observations_results)} rows")
                except Exception as e2:
                    logger.warning(f"🔍 [get_patient_profile] String query also failed: {e2}")
                    logger.warning(f"🔍 [get_patient_profile] Error details: {str(e2)}", exc_info=True)
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    observations_results = []
            
            # Map results to ClinicalObservation schema
            for row in observations_results:
                obs_id = row[0]
                obs_patient_id = row[1]
                display_name = row[2]
                value_string = row[3]
                effective_date = row[4]
                issued = row[5]
                category = row[6]
                performers = row[7] if len(row) > 7 else None
                code_data = row[8] if len(row) > 8 else None
                
                # Get recorded date (prefer effective_date, fallback to issued)
                recorded_at = effective_date or issued
                
                # Get recorded by from performers JSON
                recorded_by = "Unknown"
                if performers:
                    try:
                        import json
                        if isinstance(performers, str):
                            performers_data = json.loads(performers)
                        else:
                            performers_data = performers
                        
                        if isinstance(performers_data, list) and len(performers_data) > 0:
                            first_performer = performers_data[0]
                            if isinstance(first_performer, dict):
                                recorded_by = first_performer.get("display") or first_performer.get("reference", "Unknown")
                            elif isinstance(first_performer, str):
                                recorded_by = first_performer
                    except Exception:
                        pass
                
                # Get observation text
                observation_text = value_string or display_name or ""
                
                # Get category - try to get original frontend category from code JSON first
                category_str = None
                if code_data:
                    try:
                        import json
                        if isinstance(code_data, str):
                            code_json = json.loads(code_data)
                        else:
                            code_json = code_data
                        
                        # Check if original_category is stored in code JSON
                        if isinstance(code_json, dict) and "original_category" in code_json:
                            category_str = code_json["original_category"]
                            logger.info(f"🔍 [get_patient_profile] Found original category in code JSON: '{category_str}'")
                    except Exception as e:
                        logger.warning(f"🔍 [get_patient_profile] Could not parse code JSON for original category: {e}")
                
                # If we couldn't get original category from code, use the enum value
                if not category_str:
                    if category:
                        if hasattr(category, 'value'):
                            category_str = category.value
                        else:
                            category_str = str(category)
                    else:
                        category_str = "general"  # Default fallback
                
                observations.append(ClinicalObservation(
                    id=str(obs_id),
                    recordedAt=recorded_at or datetime.utcnow(),
                    observation=observation_text,
                    recordedBy=recorded_by,
                    category=category_str,
                ))
            
            logger.info(f"🔍 [get_patient_profile] Mapped {len(observations)} observations")
        except Exception as e:
            logger.warning(f"Error getting observations: {e}", exc_info=True)
            observations = []
        
        # Get allergies - query directly to avoid enum conversion issues
        allergies = []
        try:
            # Query allergies using raw SQL to avoid enum conversion issues
            # The database stores clinical_status as TEXT (e.g., 'active'), not as enum
            allergies_sql = text("""
                SELECT id, display_name, criticality, clinical_status, recorded_date, notes
                FROM ehr.allergy_intolerances
                WHERE patient_id = :patient_id
                ORDER BY recorded_date DESC
            """)
            allergies_results = db.execute(allergies_sql, {"patient_id": str(patient.patient_id)}).all()
            
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
                
                # Also try to get reaction from AllergyReaction table
                if not reaction:
                    try:
                        reaction_sql = text("""
                            SELECT description
                            FROM ehr.allergy_reactions
                            WHERE allergy_id = :allergy_id
                            ORDER BY created_at DESC
                            LIMIT 1
                        """)
                        reaction_result = db.execute(reaction_sql, {"allergy_id": str(allergy_id)}).first()
                        if reaction_result and reaction_result[0]:
                            reaction = reaction_result[0]
                    except Exception:
                        pass
                
                # Map clinical_status to status string
                status_str = "active"
                if clinical_status:
                    clinical_status_lower = str(clinical_status).lower()
                    if clinical_status_lower in ["resolved", "inactive", "remission"]:
                        status_str = "inactive"
                    else:
                        status_str = "active"
                
                allergies.append(AllergyInfo(
                    id=str(allergy_id),
                    allergen=display_name or "Unknown",
                    severity=criticality if criticality else None,
                    reaction=reaction,
                    status=status_str,
                    recordedAt=recorded_date,
                ))
        except Exception as e:
            logger.warning(f"Error getting allergies: {e}")
            # Rollback to ensure clean transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get immunizations - query directly to avoid relationship issues
        immunizations = []
        try:
            # Query immunizations using raw SQL to avoid relationship/enum issues
            # Try multiple approaches to match patient_id (UUID vs String)
            immunizations_results = None
            try:
                # First try with UUID cast - patient_id in DB is UUID type
                # Convert patient.patient_id to UUID if it's a string
                patient_id_uuid = patient.patient_id
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
                logger.warning(f"Error getting immunizations (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    # Fallback to direct string comparison
                    immunizations_sql = text("""
                        SELECT id, vaccine_name, occurrence_date, lot_number, performer_id, recorded
                        FROM ehr.immunizations
                        WHERE patient_id::text = :patient_id
                        ORDER BY occurrence_date DESC NULLS LAST, recorded DESC
                    """)
                    immunizations_results = db.execute(immunizations_sql, {"patient_id": str(patient.patient_id)}).all()
                except Exception as e2:
                    logger.warning(f"Error getting immunizations (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    try:
                        # Final fallback - try with patient_key directly
                        immunizations_sql = text("""
                            SELECT id, vaccine_name, occurrence_date, lot_number, performer_id, recorded
                            FROM ehr.immunizations
                            WHERE patient_id::text = :patient_key
                            ORDER BY occurrence_date DESC NULLS LAST, recorded DESC
                        """)
                        immunizations_results = db.execute(immunizations_sql, {"patient_key": str(patient_key)}).all()
                    except Exception as e3:
                        logger.warning(f"Error getting immunizations (patient_key): {e3}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        immunizations_results = []
            
            if not immunizations_results:
                immunizations_results = []
            
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
                
                immunizations.append(ImmunizationInfo(
                    id=str(imm_id),
                    vaccine=vaccine_name or "Unknown",
                    date=imm_date,
                    lotNumber=lot_number,
                    administeredBy=str(performer_id) if performer_id else None,
                ))
        except Exception as e:
            logger.warning(f"Error getting immunizations: {e}")
            # Rollback to ensure clean transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get medications
        medications = []
        try:
            for med in patient.medications:
                medications.append(MedicationInfo(
                    id=str(med.id),
                    name=med.medication_name or "Unknown",
                    dosage=med.dosage if hasattr(med, 'dosage') else None,
                    frequency=med.frequency if hasattr(med, 'frequency') else None,
                    route=med.route if hasattr(med, 'route') else None,
                    status=med.status if hasattr(med, 'status') else "active",
                    prescribedBy=str(med.prescribed_by) if hasattr(med, 'prescribed_by') else None,
                    startDate=med.start_date if hasattr(med, 'start_date') else None,
                    endDate=med.end_date if hasattr(med, 'end_date') else None,
                ))
        except Exception as e:
            logger.warning(f"Error getting medications: {e}")
        
        # Get treatment plans (from medical records)
        treatment_plans = []
        try:
            for record in patient.medical_records:
                if record.medications_prescribed:
                    meds = record.medications_prescribed if isinstance(record.medications_prescribed, list) else []
                    for med in meds:
                        treatment_plans.append(TreatmentPlanItem(
                            id=f"{record.id}-{med.get('id', 'unknown')}",
                            description=med.get('name', 'Unknown medication'),
                            type="medication",
                            status="pending",  # Could be enhanced
                            orderedBy=str(record.doctor_id),
                            orderedAt=record.record_date,
                            administeredAt=None,
                            administeredBy=None,
                            notes=None,
                        ))
        except Exception as e:
            logger.warning(f"Error getting treatment plans: {e}")
        
        # Get lab results - use raw SQL to avoid ORM relationship issues
        lab_results = []
        lab_results_results = []
        try:
            # Try UUID comparison first
            try:
                logger.info(f"🔍 [get_patient_profile] Querying lab results for patient_id: {patient.patient_id} (type: {type(patient.patient_id)})")
                lab_results_sql = text("""
                    SELECT id, patient_id, test_name, result_value, result_unit, reference_range,
                           test_date, resulted_date, is_abnormal, is_critical, status
                    FROM ehr.lab_results
                    WHERE patient_id = :patient_id
                    ORDER BY resulted_date DESC NULLS LAST, test_date DESC NULLS LAST
                    LIMIT 50
                """)
                lab_results_results = db.execute(lab_results_sql, {"patient_id": patient.patient_id}).all()
                logger.info(f"🔍 [get_patient_profile] Lab results query result (UUID): {len(lab_results_results)} rows")
            except Exception as e1:
                logger.warning(f"🔍 [get_patient_profile] UUID query failed: {e1}, trying string comparison")
                logger.warning(f"🔍 [get_patient_profile] Error details: {str(e1)}", exc_info=True)
                try:
                    db.rollback()
                except Exception:
                    pass
                # Fallback to string comparison
                try:
                    lab_results_sql_str = text("""
                        SELECT id, patient_id, test_name, result_value, result_unit, reference_range,
                               test_date, resulted_date, is_abnormal, is_critical, status
                        FROM ehr.lab_results
                        WHERE patient_id::text = :patient_id
                        ORDER BY resulted_date DESC NULLS LAST, test_date DESC NULLS LAST
                        LIMIT 50
                    """)
                    lab_results_results = db.execute(lab_results_sql_str, {"patient_id": str(patient.patient_id)}).all()
                    logger.info(f"🔍 [get_patient_profile] Lab results query result (string): {len(lab_results_results)} rows")
                except Exception as e2:
                    logger.warning(f"🔍 [get_patient_profile] String query also failed: {e2}")
                    logger.warning(f"🔍 [get_patient_profile] Error details: {str(e2)}", exc_info=True)
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    lab_results_results = []
            
            # Map results to LabResultInfo schema
            for row in lab_results_results:
                lab_id = row[0]
                lab_patient_id = row[1]
                test_name = row[2]
                result_value = row[3]
                result_unit = row[4]
                reference_range = row[5]
                test_date = row[6]
                resulted_date = row[7]
                is_abnormal = row[8]
                is_critical = row[9]
                status = row[10]
                
                # Determine status string
                status_str = "normal"
                if is_critical:
                    status_str = "critical"
                elif is_abnormal:
                    status_str = "abnormal"
                elif status:
                    # Map enum status to string
                    if hasattr(status, 'value'):
                        status_str = status.value
                    else:
                        status_str = str(status).lower()
                
                # Parse result value to float if possible
                value_float = None
                try:
                    if result_value:
                        value_float = float(result_value)
                except (ValueError, TypeError):
                    pass
                
                lab_results.append(LabResultInfo(
                    id=str(lab_id),
                    testName=test_name or "Unknown",
                    result=result_value,
                    value=value_float,
                    unit=result_unit,
                    referenceRange=reference_range,
                    status=status_str,
                    orderedAt=test_date,  # Use test_date as orderedAt
                    completedAt=resulted_date,  # Use resulted_date as completedAt
                ))
            
            logger.info(f"🔍 [get_patient_profile] Mapped {len(lab_results)} lab results")
        except Exception as e:
            logger.warning(f"Error getting lab results: {e}", exc_info=True)
            lab_results = []
        
        # Get imaging results (placeholder - would need imaging model)
        imaging_results = []
        
        # Get medical history - query directly to avoid relationship issues
        medical_history = []
        try:
            # Query medical history using raw SQL to avoid relationship issues
            # Try multiple approaches to match patient_id (UUID vs String)
            medical_history_results = None
            try:
                # First try with UUID cast - patient_id in DB might be UUID type
                patient_id_uuid = patient.patient_id
                if isinstance(patient_id_uuid, str):
                    try:
                        patient_id_uuid = uuid_lib.UUID(patient_id_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                medical_history_sql = text("""
                    SELECT id, condition, diagnosed_date, status, notes
                    FROM ehr.medical_history
                    WHERE patient_id = :patient_id
                    ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
                """)
                medical_history_results = db.execute(medical_history_sql, {"patient_id": patient_id_uuid}).all()
                logger.info(f"Found {len(medical_history_results) if medical_history_results else 0} medical history records for patient {patient.patient_id} (UUID query)")
            except Exception as e1:
                logger.warning(f"Error getting medical history (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    # Fallback to direct string comparison
                    medical_history_sql = text("""
                        SELECT id, condition, diagnosed_date, status, notes
                        FROM ehr.medical_history
                        WHERE patient_id::text = :patient_id
                        ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
                    """)
                    medical_history_results = db.execute(medical_history_sql, {"patient_id": str(patient.patient_id)}).all()
                    logger.info(f"Found {len(medical_history_results) if medical_history_results else 0} medical history records for patient {patient.patient_id} (string query)")
                except Exception as e2:
                    logger.warning(f"Error getting medical history (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    try:
                        # Final fallback - try with patient_key directly
                        medical_history_sql = text("""
                            SELECT id, condition, diagnosed_date, status, notes
                            FROM ehr.medical_history
                            WHERE patient_id::text = :patient_key
                            ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
                        """)
                        medical_history_results = db.execute(medical_history_sql, {"patient_key": str(patient_key)}).all()
                    except Exception as e3:
                        logger.warning(f"Error getting medical history (patient_key): {e3}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                        medical_history_results = []
            
            if not medical_history_results:
                medical_history_results = []
            
            for row in medical_history_results:
                hist_id = row[0]
                condition = row[1]
                diagnosed_date = row[2]
                status = row[3]
                notes = row[4]
                
                medical_history.append(MedicalHistoryItem(
                    id=str(hist_id),
                    condition=condition or "Unknown",
                    diagnosisDate=diagnosed_date,
                    status=status if status else "active",
                    notes=notes,
                ))
        except Exception as e:
            logger.warning(f"Error getting medical history: {e}")
            # Rollback to ensure clean transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get reports from clinical_notes and general_reports tables
        try:
            # Query clinical_notes
            try:
                patient_id_uuid = patient.patient_id
                if isinstance(patient_id_uuid, str):
                    try:
                        patient_id_uuid = uuid_lib.UUID(patient_id_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                # Get clinical notes (reports)
                clinical_notes_sql = text("""
                    SELECT id, note_type, note_date, assessment, plan, created_at
                    FROM ehr.clinical_notes
                    WHERE patient_id = :patient_id
                    ORDER BY note_date DESC NULLS LAST, created_at DESC
                    LIMIT 20
                """)
                clinical_notes_results = db.execute(clinical_notes_sql, {"patient_id": patient_id_uuid}).all()
            except Exception as e1:
                logger.warning(f"Error getting clinical notes (UUID cast): {e1}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    clinical_notes_sql = text("""
                        SELECT id, note_type, note_date, assessment, plan, created_at
                        FROM ehr.clinical_notes
                        WHERE patient_id::text = :patient_id
                        ORDER BY note_date DESC NULLS LAST, created_at DESC
                        LIMIT 20
                    """)
                    clinical_notes_results = db.execute(clinical_notes_sql, {"patient_id": str(patient.patient_id)}).all()
                except Exception as e2:
                    logger.warning(f"Error getting clinical notes (string comparison): {e2}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    clinical_notes_results = []
            
            if not clinical_notes_results:
                clinical_notes_results = []
            
            # Add clinical notes as medical history items
            for row in clinical_notes_results:
                note_id = row[0]
                note_type = row[1]
                note_date = row[2]
                assessment = row[3]
                plan = row[4]
                created_at = row[5]
                
                # Use note_date or created_at for diagnosis date
                diagnosis_date = None
                if note_date:
                    if isinstance(note_date, datetime):
                        diagnosis_date = note_date.date()
                    elif isinstance(note_date, date):
                        diagnosis_date = note_date
                elif created_at:
                    if isinstance(created_at, datetime):
                        diagnosis_date = created_at.date()
                
                # Format condition from note type
                condition_text = f"Report: {note_type or 'Clinical Note'}"
                
                # Parse and format assessment if it's JSON
                assessment_text = None
                if assessment:
                    try:
                        import json
                        if isinstance(assessment, str):
                            assessment_data = json.loads(assessment)
                        else:
                            assessment_data = assessment
                        
                        # Extract working diagnosis or assessment text
                        if isinstance(assessment_data, dict):
                            if 'working' in assessment_data and assessment_data['working']:
                                # Get first working diagnosis
                                working = assessment_data['working']
                                if isinstance(working, list) and len(working) > 0:
                                    first_diag = working[0]
                                    if isinstance(first_diag, dict) and 'term' in first_diag:
                                        assessment_text = first_diag['term']
                                    elif isinstance(first_diag, str):
                                        assessment_text = first_diag
                            elif 'ddx' in assessment_data and assessment_data['ddx']:
                                # Get first differential diagnosis
                                ddx = assessment_data['ddx']
                                if isinstance(ddx, list) and len(ddx) > 0:
                                    first_ddx = ddx[0]
                                    if isinstance(first_ddx, dict) and 'term' in first_ddx:
                                        assessment_text = first_ddx['term']
                                    elif isinstance(first_ddx, str):
                                        assessment_text = first_ddx
                            # If no structured data, try to get a simple text field
                            if not assessment_text:
                                for key in ['diagnosis', 'impression', 'assessment', 'text']:
                                    if key in assessment_data and assessment_data[key]:
                                        assessment_text = str(assessment_data[key])
                                        break
                        elif isinstance(assessment_data, str):
                            assessment_text = assessment_data
                    except Exception:
                        # If parsing fails, use as string (truncated)
                        assessment_text = str(assessment)[:200] + "..." if len(str(assessment)) > 200 else str(assessment)
                    
                    if assessment_text:
                        # Truncate if too long
                        if len(assessment_text) > 200:
                            assessment_text = assessment_text[:200] + "..."
                        condition_text = f"{condition_text} - {assessment_text}"
                
                # Parse and format plan if it's JSON
                plan_text = None
                if plan:
                    try:
                        import json
                        if isinstance(plan, str):
                            plan_data = json.loads(plan)
                        else:
                            plan_data = plan
                        
                        # Extract meaningful plan information
                        if isinstance(plan_data, dict):
                            plan_parts = []
                            if 'med_changes' in plan_data and plan_data['med_changes']:
                                med_count = len(plan_data['med_changes']) if isinstance(plan_data['med_changes'], list) else 1
                                plan_parts.append(f"{med_count} medication(s)")
                            if 'tests' in plan_data and plan_data['tests']:
                                test_count = len(plan_data['tests']) if isinstance(plan_data['tests'], list) else 1
                                plan_parts.append(f"{test_count} test(s)")
                            if 'referrals' in plan_data and plan_data['referrals']:
                                ref_count = len(plan_data['referrals']) if isinstance(plan_data['referrals'], list) else 1
                                plan_parts.append(f"{ref_count} referral(s)")
                            if 'follow_up' in plan_data and plan_data['follow_up']:
                                plan_parts.append("Follow-up scheduled")
                            
                            if plan_parts:
                                plan_text = ", ".join(plan_parts)
                            elif 'lifestyle' in plan_data and plan_data['lifestyle']:
                                plan_text = "Lifestyle recommendations"
                        elif isinstance(plan_data, str):
                            plan_text = plan_data
                    except Exception:
                        # If parsing fails, use as string (truncated)
                        plan_text = str(plan)[:200] + "..." if len(str(plan)) > 200 else str(plan)
                
                medical_history.append(MedicalHistoryItem(
                    id=f"note-{str(note_id)}",
                    condition=condition_text,
                    diagnosisDate=diagnosis_date,
                    status="active",
                    notes=plan_text,
                ))
            
            # Get general reports
            try:
                general_reports_sql = text("""
                    SELECT id, report_code, report_type, chief_complaint, created_at
                    FROM ehr.general_reports
                    WHERE patient_id = :patient_id
                    ORDER BY created_at DESC
                    LIMIT 20
                """)
                general_reports_results = db.execute(general_reports_sql, {"patient_id": patient_id_uuid}).all()
            except Exception as e3:
                logger.warning(f"Error getting general reports (UUID cast): {e3}")
                try:
                    db.rollback()
                except Exception:
                    pass
                try:
                    general_reports_sql = text("""
                        SELECT id, report_code, report_type, chief_complaint, created_at
                        FROM ehr.general_reports
                        WHERE patient_id::text = :patient_id
                        ORDER BY created_at DESC
                        LIMIT 20
                    """)
                    general_reports_results = db.execute(general_reports_sql, {"patient_id": str(patient.patient_id)}).all()
                except Exception as e4:
                    logger.warning(f"Error getting general reports (string comparison): {e4}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    general_reports_results = []
            
            if not general_reports_results:
                general_reports_results = []
            
            # Add general reports as medical history items
            for row in general_reports_results:
                report_id = row[0]
                report_code = row[1]
                report_type = row[2]
                chief_complaint = row[3]
                created_at = row[4]
                
                # Use created_at for diagnosis date
                diagnosis_date = None
                if created_at:
                    if isinstance(created_at, datetime):
                        diagnosis_date = created_at.date()
                    elif isinstance(created_at, date):
                        diagnosis_date = created_at
                
                # Format condition from report code and chief complaint
                condition_text = f"Report {report_code or report_type or 'General'}"
                if chief_complaint:
                    # Truncate chief complaint if too long
                    complaint_text = str(chief_complaint)[:200] + "..." if len(str(chief_complaint)) > 200 else str(chief_complaint)
                    condition_text = f"{condition_text}: {complaint_text}"
                
                medical_history.append(MedicalHistoryItem(
                    id=f"report-{str(report_id)}",
                    condition=condition_text,
                    diagnosisDate=diagnosis_date,
                    status="active",
                    notes=chief_complaint if chief_complaint else None,
                ))
            
            # Sort all medical history by date (most recent first)
            medical_history.sort(key=lambda x: x.diagnosisDate or date.min, reverse=True)
            
        except Exception as e:
            logger.warning(f"Error getting reports for medical history: {e}")
            # Rollback to ensure clean transaction state
            try:
                db.rollback()
            except Exception:
                pass
        
        # Get clinical notes - use raw SQL to avoid ORM relationship issues
        notes = []
        notes_results = []
        try:
            # Try UUID comparison first
            try:
                logger.info(f"🔍 [get_patient_profile] Querying clinical notes for patient_id: {patient.patient_id} (type: {type(patient.patient_id)})")
                notes_sql = text("""
                    SELECT id, patient_id, note_type, note_date, content,
                           subjective, objective, assessment, plan,
                           created_by, created_at
                    FROM ehr.clinical_notes
                    WHERE patient_id = :patient_id
                    ORDER BY note_date DESC NULLS LAST, created_at DESC NULLS LAST
                    LIMIT 50
                """)
                notes_results = db.execute(notes_sql, {"patient_id": patient.patient_id}).all()
                logger.info(f"🔍 [get_patient_profile] Clinical notes query result (UUID): {len(notes_results)} rows")
            except Exception as e1:
                logger.warning(f"🔍 [get_patient_profile] UUID query failed: {e1}, trying string comparison")
                logger.warning(f"🔍 [get_patient_profile] Error details: {str(e1)}", exc_info=True)
                try:
                    db.rollback()
                except Exception:
                    pass
                # Fallback to string comparison
                try:
                    notes_sql_str = text("""
                        SELECT id, patient_id, note_type, note_date, content,
                               subjective, objective, assessment, plan,
                               created_by, created_at
                        FROM ehr.clinical_notes
                        WHERE patient_id::text = :patient_id
                        ORDER BY note_date DESC NULLS LAST, created_at DESC NULLS LAST
                        LIMIT 50
                    """)
                    notes_results = db.execute(notes_sql_str, {"patient_id": str(patient.patient_id)}).all()
                    logger.info(f"🔍 [get_patient_profile] Clinical notes query result (string): {len(notes_results)} rows")
                except Exception as e2:
                    logger.warning(f"🔍 [get_patient_profile] String query also failed: {e2}")
                    logger.warning(f"🔍 [get_patient_profile] Error details: {str(e2)}", exc_info=True)
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    notes_results = []
            
            # Map results to NoteInfo schema
            for row in notes_results:
                note_id = row[0]
                note_patient_id = row[1]
                note_type = row[2]
                note_date = row[3]
                content = row[4]
                subjective = row[5]
                objective = row[6]
                assessment = row[7]
                plan = row[8]
                created_by = row[9]
                created_at = row[10] if len(row) > 10 else None
                
                # Get created by name if possible
                created_by_name = None
                if created_by:
                    try:
                        # Try to get user name
                        user_sql = text("SELECT first_name, last_name FROM core.users WHERE id = :user_id")
                        user_result = db.execute(user_sql, {"user_id": created_by}).first()
                        if user_result:
                            first_name = user_result[0] or ""
                            last_name = user_result[1] or ""
                            created_by_name = f"{first_name} {last_name}".strip() or str(created_by)
                        else:
                            created_by_name = str(created_by)
                    except Exception:
                        created_by_name = str(created_by) if created_by else None
                
                notes.append(NoteInfo(
                    id=str(note_id),
                    noteType=note_type or "consultation",
                    noteDate=note_date or datetime.utcnow(),
                    content=content,
                    subjective=subjective,
                    objective=objective,
                    assessment=assessment,
                    plan=plan,
                    createdBy=created_by_name,
                    createdAt=created_at,
                ))
            
            logger.info(f"🔍 [get_patient_profile] Mapped {len(notes)} clinical notes")
        except Exception as e:
            logger.warning(f"Error getting clinical notes: {e}", exc_info=True)
            notes = []
        
        # Get documents (placeholder - would need document model)
        documents = []
        
        # Build clinical section
        clinical = PatientProfileClinical(
            vitalSigns=vital_signs,
            observations=observations,
            medicalHistory=medical_history,
            allergies=allergies,
            immunizations=immunizations,
            medications=medications,
            treatmentPlans=treatment_plans,
            labResults=lab_results,
            imagingResults=imaging_results,
            notes=notes,
        )
        
        # Build documents section
        docs = PatientProfileDocuments(
            documents=documents,
            canUpload=True,
            canDelete=False,
        )
        
        # Build complete profile
        profile = NursePatientProfile(
            overview=overview,
            clinical=clinical,
            documents=docs,
            lastUpdated=datetime.utcnow(),
        )
        
        return SuccessResponse(data=profile, message="Patient profile retrieved")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving patient profile: {str(e)}")


@router.post("/{patient_key}/vitals", response_model=SuccessResponse[VitalSignEntry], status_code=status.HTTP_201_CREATED)
async def create_patient_vital(
    patient_key: str,
    payload: CreateVitalSignRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Create a new vital sign entry for a patient"""
    try:
        # Verify patient exists
        patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Create vital sign
        measured_at = payload.measuredAt or datetime.utcnow()
        
        vital = vitals_crud.create(
            db,
            patient_id=patient_key,
            measured_by=current_user.user_id,
            measured_at=measured_at,
            values={
                "temperature": payload.temperature,
                "blood_pressure_systolic": payload.bloodPressureSystolic,
                "blood_pressure_diastolic": payload.bloodPressureDiastolic,
                "heart_rate": payload.heartRate,
                "respiratory_rate": payload.respiratoryRate,
                "oxygen_saturation": payload.oxygenSaturation,
                "pain_scale": payload.painScale,
                "height": payload.height,
                "weight": payload.weight,
                "notes": payload.notes,
            },
        )
        
        # Verify the vital sign was created and log the patient_id
        logger.info(f"Created vital sign with id={vital.id}, patient_id={vital.patient_id}, patient_key={patient_key}")
        
        # Immediately verify it can be queried
        try:
            verify_sql = text("""
                SELECT id, patient_id
                FROM ehr.vital_signs
                WHERE id = :vital_id
            """)
            verify_result = db.execute(verify_sql, {"vital_id": str(vital.id)}).first()
            if verify_result:
                logger.info(f"Verified vital sign exists in database: id={verify_result[0]}, patient_id={verify_result[1]}")
            else:
                logger.warning(f"Warning: Created vital sign {vital.id} but cannot verify it exists in database")
        except Exception as e:
            logger.warning(f"Could not verify vital sign: {e}")
        
        bp_str = None
        if vital.blood_pressure_systolic and vital.blood_pressure_diastolic:
            bp_str = f"{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}"
        
        vital_entry = VitalSignEntry(
            id=str(vital.id),
            measuredAt=vital.measured_at,
            temperature=vital.temperature,
            bloodPressure=bp_str,
            heartRate=vital.heart_rate,
            respiratoryRate=vital.respiratory_rate,
            oxygenSaturation=vital.oxygen_saturation,
            painScale=vital.pain_scale,
            height=vital.height if hasattr(vital, 'height') else None,
            weight=vital.weight if hasattr(vital, 'weight') else None,
            measuredBy=str(vital.measured_by),
            notes=vital.notes,
        )
        
        return SuccessResponse(data=vital_entry, message="Vital sign recorded")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating vital sign: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error recording vital sign: {str(e)}")


@router.post("/{patient_key}/observations", response_model=SuccessResponse[ClinicalObservation], status_code=status.HTTP_201_CREATED)
async def create_patient_observation(
    patient_key: str,
    payload: CreateObservationRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Create a new clinical observation for a patient"""
    try:
        # Verify patient exists
        patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Create observation
        recorded_at = payload.recordedAt or datetime.utcnow()
        
        # Convert patient_id to UUID
        import uuid as uuid_lib
        patient_uuid = uuid_lib.UUID(patient_key) if isinstance(patient_key, str) else patient_key
        
        # Store original frontend category in code JSON for retrieval later
        original_category = (payload.category or "general").lower()
        
        # Prepare code (required field - use a simple code structure)
        # Store original category in code JSON for later retrieval
        code = {
            "coding": [{
                "system": "http://loinc.org",
                "code": "33999-4",
                "display": payload.observation[:100]  # Truncate if too long
            }],
            "text": payload.observation[:100],
            "original_category": original_category  # Store original frontend category
        }
        
        # Map category string to ObservationCategory enum value (string)
        # Frontend categories: general, pain, wound, behavioral, safety
        # Backend enum: vital_signs, laboratory, imaging, procedure, survey, exam, therapy, activity
        category_map = {
            "general": ObservationCategory.EXAM.value,
            "pain": ObservationCategory.EXAM.value,
            "wound": ObservationCategory.EXAM.value,
            "behavioral": ObservationCategory.EXAM.value,
            "safety": ObservationCategory.EXAM.value,
            "vital_signs": ObservationCategory.VITAL_SIGNS.value,
            "laboratory": ObservationCategory.LABORATORY.value,
            "imaging": ObservationCategory.IMAGING.value,
            "procedure": ObservationCategory.PROCEDURE.value,
            "survey": ObservationCategory.SURVEY.value,
            "exam": ObservationCategory.EXAM.value,
            "therapy": ObservationCategory.THERAPY.value,
            "activity": ObservationCategory.ACTIVITY.value,
        }
        observation_category_str = category_map.get(
            original_category, 
            ObservationCategory.EXAM.value
        )
        logger.info(f"🔍 [create_patient_observation] Category mapping: '{original_category}' -> '{observation_category_str}' (storing original in code JSON)")
        
        # Use create_observation method with correct parameters
        observation = observations_crud.create_observation(
            db,
            patient_id=patient_uuid,
            code=code,
            display_name=payload.observation[:500],  # Truncate to max length
            category=observation_category_str,  # Pass as string value
            status=ObservationStatus.FINAL,
            value_string=payload.observation[:500]  # Truncate to max length
        )
        
        # Set effective_date and issued after creation (since create_observation sets them to utcnow())
        observation.effective_date = recorded_at
        observation.issued = recorded_at
        
        # Add performer information if needed (performers is a JSON column)
        if current_user.user_id:
            observation.performers = [{
                "reference": f"Practitioner/{current_user.user_id}",
                "display": current_user.email or "Nurse"
            }]
        
        db.commit()
        db.refresh(observation)
        
        # Map to response schema
        # Get category string - prefer the original payload category if it was provided, otherwise use the saved enum value
        category_str = payload.category or (observation.category.value if hasattr(observation.category, 'value') else str(observation.category))
        logger.info(f"🔍 [create_patient_observation] Response category: '{category_str}' (from payload: '{payload.category}', from observation: '{observation.category}')")
        
        obs_entry = ClinicalObservation(
            id=str(observation.id),
            recordedAt=observation.effective_date or observation.issued or datetime.utcnow(),
            observation=observation.value_string or payload.observation,
            recordedBy=str(current_user.user_id),
            category=category_str,
        )
        
        return SuccessResponse(data=obs_entry, message="Clinical observation recorded")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating observation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error recording observation: {str(e)}")


@router.post("/{patient_key}/allergies", response_model=SuccessResponse[AllergyInfo], status_code=status.HTTP_201_CREATED)
async def add_patient_allergy(
    patient_key: str,
    payload: AddAllergyRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Add a new allergy for a patient (nurses can add but not delete)"""
    try:
        # Verify patient exists
        patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Create allergy using create_allergy method
        recorded_at = payload.recordedAt or datetime.utcnow()
        
        # Map severity string to AllergyCriticality enum
        criticality = None
        if payload.severity:
            severity_lower = payload.severity.lower()
            if severity_lower in ["mild", "low"]:
                criticality = AllergyCriticality.LOW
            elif severity_lower in ["moderate", "severe", "high"]:
                criticality = AllergyCriticality.HIGH
            elif severity_lower == "life-threatening":
                criticality = AllergyCriticality.HIGH  # Map to HIGH as life-threatening is not in enum
            # else: criticality remains None
        
        # Prepare notes with reaction if provided
        notes = None
        if payload.reaction:
            notes = [{
                "text": payload.reaction,
                "author": {
                    "reference": f"User/{current_user.user_id}",
                    "display": current_user.email or "Nurse"
                },
                "time": recorded_at.isoformat() if isinstance(recorded_at, datetime) else recorded_at
            }]
        
        # Convert patient_key and user_id to UUID if needed
        import uuid as uuid_lib
        patient_uuid = uuid_lib.UUID(patient_key) if isinstance(patient_key, str) else patient_key
        recorder_uuid = uuid_lib.UUID(current_user.user_id) if isinstance(current_user.user_id, str) else current_user.user_id
        
        allergy = allergies_crud.create_allergy(
            db,
            patient_id=patient_uuid,
            code={"text": payload.allergen, "coding": [{"display": payload.allergen}]},
            display_name=payload.allergen,
            allergy_type=AllergyType.ALLERGY,
            categories=[],  # Can be enhanced later
            recorder_id=recorder_uuid,
            criticality=criticality,
            notes=notes,
        )
        
        # If reaction was provided, also create an AllergyReaction record
        reaction_description = None
        if payload.reaction:
            try:
                from app.common.models.clinical import AllergyReaction, ReactionSeverity
                # Map severity to ReactionSeverity
                reaction_severity = None
                if payload.severity:
                    severity_lower = payload.severity.lower()
                    if severity_lower == "mild":
                        reaction_severity = ReactionSeverity.MILD
                    elif severity_lower == "moderate":
                        reaction_severity = ReactionSeverity.MODERATE
                    elif severity_lower in ["severe", "life-threatening"]:
                        reaction_severity = ReactionSeverity.SEVERE
                
                reaction = allergies_crud.add_reaction(
                    db,
                    allergy_id=uuid_lib.UUID(str(allergy.id)),
                    manifestations=[{"text": payload.reaction}],
                    severity=reaction_severity.value if reaction_severity else None,
                    description=payload.reaction,
                    onset=recorded_at,
                )
                reaction_description = payload.reaction
            except Exception as reaction_error:
                logger.warning(f"Could not create allergy reaction record: {reaction_error}")
                # Continue without reaction record, we still have it in notes
                reaction_description = payload.reaction
        
        # Get reaction from the first reaction if available
        if not reaction_description and hasattr(allergy, 'reactions') and allergy.reactions:
            reaction_description = allergy.reactions[0].description if allergy.reactions[0].description else None
        
        allergy_entry = AllergyInfo(
            id=str(allergy.id),
            allergen=allergy.display_name or payload.allergen,
            severity=allergy.criticality.value if allergy.criticality else payload.severity,
            reaction=reaction_description or payload.reaction,
            status="active",
            recordedAt=allergy.recorded_date if hasattr(allergy, 'recorded_date') else recorded_at,
        )
        
        return SuccessResponse(data=allergy_entry, message="Allergy added")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding allergy: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error adding allergy: {str(e)}")


@router.post("/{patient_key}/immunizations", response_model=SuccessResponse[ImmunizationInfo], status_code=status.HTTP_201_CREATED)
async def add_patient_immunization(
    patient_key: str,
    payload: AddImmunizationRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Add a new immunization for a patient"""
    try:
        # Verify patient exists
        patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Create immunization
        from app.common.models.clinical import Immunization, ImmunizationStatus
        import uuid as uuid_lib
        from datetime import timezone
        
        # Parse date if it's a string
        if isinstance(payload.date, str):
            try:
                immunization_date_obj = datetime.strptime(payload.date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {payload.date}. Expected YYYY-MM-DD")
        elif isinstance(payload.date, date):
            immunization_date_obj = payload.date
        else:
            immunization_date_obj = date.today()
        
        # Convert date to datetime with timezone for occurrence_date
        occurrence_datetime = datetime.combine(immunization_date_obj, datetime.min.time())
        if occurrence_datetime.tzinfo is None:
            occurrence_datetime = occurrence_datetime.replace(tzinfo=timezone.utc)
        
        # Get current datetime with timezone for recorded
        recorded_datetime = datetime.now(timezone.utc)
        
        # Convert patient_key and user_id to UUID objects (database expects UUID type)
        patient_id_uuid = uuid_lib.UUID(str(patient_key)) if isinstance(patient_key, str) else patient_key
        performer_id_uuid = uuid_lib.UUID(str(current_user.user_id)) if isinstance(current_user.user_id, str) else current_user.user_id
        
        # Use raw SQL to insert immunization to avoid model/database type mismatch
        # The model says String(36) but database expects UUID
        import json as json_lib
        from sqlalchemy import text
        
        vaccine_code_json = json_lib.dumps({"text": payload.vaccine, "coding": [{"display": payload.vaccine}]})
        status_value = ImmunizationStatus.COMPLETED.value if hasattr(ImmunizationStatus.COMPLETED, 'value') else str(ImmunizationStatus.COMPLETED)
        
        insert_sql = text("""
            INSERT INTO ehr.immunizations 
            (patient_id, vaccine_code, vaccine_name, occurrence_date, recorded, status, 
             performer_id, lot_number, primary_source)
            VALUES 
            (CAST(:patient_id AS uuid), CAST(:vaccine_code AS jsonb), :vaccine_name, 
             :occurrence_date, :recorded, :status, 
             CAST(:performer_id AS uuid), :lot_number, :primary_source)
            RETURNING id, patient_id, vaccine_name, occurrence_date, recorded, status, 
                      performer_id, lot_number, created_at
        """)
        
        params = {
            'patient_id': str(patient_id_uuid),
            'vaccine_code': vaccine_code_json,
            'vaccine_name': payload.vaccine,
            'occurrence_date': occurrence_datetime,
            'recorded': recorded_datetime,
            'status': status_value,
            'performer_id': str(performer_id_uuid),
            'lot_number': payload.lotNumber,
            'primary_source': True
        }
        
        result = db.execute(insert_sql, params)
        db.commit()
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create immunization")
        
        # Extract data from the result
        immunization_id = row[0]
        immunization_vaccine_name = row[2]
        immunization_occurrence_date = row[3]
        immunization_lot_number = row[7] if len(row) > 7 else payload.lotNumber
        immunization_performer_id = row[6] if len(row) > 6 else performer_id_uuid
        
        # Extract date from occurrence_date datetime
        immunization_date_obj = immunization_occurrence_date.date() if isinstance(immunization_occurrence_date, datetime) else immunization_occurrence_date
        
        imm_entry = ImmunizationInfo(
            id=str(immunization_id),
            vaccine=immunization_vaccine_name or payload.vaccine,
            date=immunization_date_obj,
            lotNumber=immunization_lot_number,
            administeredBy=str(immunization_performer_id) if immunization_performer_id else str(current_user.user_id),
        )
        
        return SuccessResponse(data=imm_entry, message="Immunization added")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding immunization: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding immunization: {str(e)}")


@router.post("/{patient_key}/treatment-plans/{treatment_id}/administer", response_model=SuccessResponse[TreatmentPlanItem])
async def mark_treatment_administered(
    patient_key: str,
    treatment_id: str,
    payload: MarkTreatmentAdministeredRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Mark a treatment plan item as administered"""
    try:
        # Verify patient exists
        patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_key).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
        # Find the treatment plan (it's stored in medical records)
        # The treatment_id format is "{record_id}-{med_id}"
        parts = treatment_id.split("-", 1)
        if len(parts) < 2:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment plan not found")
        
        record_id = parts[0]
        med_id = parts[1] if len(parts) > 1 else None
        
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.patient_id == patient_key
        ).first()
        
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment plan not found")
        
        # Update the medication in medications_prescribed
        administered_at = payload.administeredAt or datetime.utcnow()
        
        if record.medications_prescribed:
            meds = record.medications_prescribed if isinstance(record.medications_prescribed, list) else []
            updated_meds = []
            found = False
            
            for med in meds:
                if med.get('id') == med_id or (not med_id and len(meds) == 1):
                    med['status'] = 'administered'
                    med['administered_at'] = administered_at.isoformat()
                    med['administered_by'] = str(current_user.user_id)
                    if payload.notes:
                        med['notes'] = payload.notes
                    found = True
                updated_meds.append(med)
            
            if found:
                record.medications_prescribed = updated_meds
                db.commit()
                db.refresh(record)
                
                # Find the updated medication
                updated_med = next((m for m in updated_meds if m.get('id') == med_id or (not med_id and len(updated_meds) == 1)), None)
                
                treatment_item = TreatmentPlanItem(
                    id=treatment_id,
                    description=updated_med.get('name', 'Unknown medication') if updated_med else 'Unknown',
                    type="medication",
                    status="completed",
                    orderedBy=str(record.doctor_id),
                    orderedAt=record.record_date,
                    administeredAt=administered_at,
                    administeredBy=str(current_user.user_id),
                    notes=payload.notes,
                )
                
                return SuccessResponse(data=treatment_item, message="Treatment marked as administered")
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment plan item not found")
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No medications found in treatment plan")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking treatment as administered: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error marking treatment as administered: {str(e)}")
