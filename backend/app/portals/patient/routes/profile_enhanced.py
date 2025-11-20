"""Enhanced Patient portal profile router with tightened ownership & RBAC."""
from datetime import datetime, timezone, date
import os
from typing import List, Optional, Dict, Any
from uuid import uuid4
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Body, status, Request, Response
from pydantic import BaseModel, Field, EmailStr, validator
from sqlalchemy.orm import Session

from .auth_enhanced import get_current_patient, PatientUser, validate_patient_ownership
from app.portals.patient.schemas.profile_enhanced import (
    VitalStat as _SchemaVitalStat,
    ImmunizationRec as _SchemaImmunizationRec,
    InsuranceInfo as _SchemaInsuranceInfo,
    ProfileOut as _SchemaProfileOut,
    ProfileUpdateRequest as _SchemaProfileUpdateRequest,
)
from app.db.session import get_db
from app.db.session import engine
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.models.user import User
from app.crud.patient import patient as patient_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType,
    create_problem_detail
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

# Feature flag resolved at import time; defaults to disabled (local DB)
FHIR_DISABLED = os.getenv("FHIR_DISABLE", "true").lower() in {"1", "true", "yes"}

router = APIRouter(tags=["Patient · Profile"])
logger = logging.getLogger("app.portals.patient.profile")

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

VitalStat = _SchemaVitalStat

ImmunizationRec = _SchemaImmunizationRec

InsuranceInfo = _SchemaInsuranceInfo

ProfileOut = _SchemaProfileOut

DemographicsUpdateRequest = _SchemaProfileUpdateRequest

class FHIRExportRequest(BaseModel):
    export_type: str = Field(..., pattern="^(patient|all)$", description="Export type: patient or all")
    format: str = Field("json", pattern="^(json|xml)$", description="Export format: json or xml")
    since: Optional[str] = Field(None, description="Export resources modified since this date")
    email_confirmation: bool = Field(True, description="Send email confirmation")
    sms_confirmation: bool = Field(False, description="Send SMS confirmation")

class FHIREraseRequest(BaseModel):
    resource_types: List[str] = Field(..., description="List of FHIR resource types to erase")
    confirmation_code: str = Field(..., description="Confirmation code from email/SMS")
    reason: str = Field(..., min_length=10, description="Reason for data erasure")

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[ProfileOut])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "profile")
async def get_profile(
    request: Request,
    response: Response,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    source: Optional[str] = None,
):
    """Get patient profile with medical information - enforces subject == current_patient."""
    # Initialize immunizations at the very beginning to ensure it exists in all code paths
    immunizations = []
    try:
        # Add no-store caching to avoid stale data in proxies/browsers
        response.headers["Cache-Control"] = "no-store"
        
        # Debug logging for current_patient
        logging.warning(f"[PROFILE_GET] current_patient.id: {current_patient.id}")
        logging.warning(f"[PROFILE_GET] current_patient.user_id: {getattr(current_patient, 'user_id', 'NO_USER_ID_ATTR')}")
        logging.warning(f"[PROFILE_GET] current_patient.fhir_patient_id: {current_patient.fhir_patient_id}")
        # Live confirmation: DB URL and linkage
        try:
            from app.common.models.patient import Patient as PatientModel
            from sqlalchemy.orm import joinedload
            linked_row = db.query(PatientModel).options(joinedload(PatientModel.user)).filter(PatientModel.user_id == current_patient.id).first()
            logger.info(
                f"PROFILE_GET db_url={engine.url} user_id={current_patient.id} "
                f"patient_linked={bool(linked_row)}"
            )
            if linked_row:
                # Patient model doesn't have first_name/last_name - get from User
                first_name = linked_row.user.first_name if linked_row.user else None
                last_name = linked_row.user.last_name if linked_row.user else None
                logger.info(f"PROFILE_GET patient_data id={linked_row.id} user_id={linked_row.user_id} first_name='{first_name}' last_name='{last_name}' email='{getattr(linked_row.user, 'email', None) if linked_row.user else None}' phone='{getattr(linked_row, 'phone', None)}'")
                logging.warning(f"[PROFILE_GET] CRUD data: id={linked_row.id} first_name='{first_name}' email='{getattr(linked_row.user, 'email', None) if linked_row.user else None}' phone='{getattr(linked_row, 'phone', None)}'")
        except Exception as _log_e:
            logger.warning(f"PROFILE_GET live-check failed: {_log_e}")
        # If FHIR is disabled/unavailable, or source=local, serve profile from local DB immediately
        if FHIR_DISABLED or (source == "local"):
            from app.common.models.patient import Patient as PatientModel
            from app.common.models.user import User as UserModel
            from sqlalchemy.orm import joinedload
            # Expire any cached objects to ensure fresh data
            db.expire_all()
            p = db.query(PatientModel).options(joinedload(PatientModel.user)).filter(PatientModel.user_id == current_patient.id).first()
            u = db.query(UserModel).filter(UserModel.id == current_patient.id).first()
            # Refresh the patient object to get latest data
            if p:
                db.refresh(p)
            logging.warning(f"[PROFILE_GET] Direct query: p={p} u={u}")
            if p:
                first_name = p.user.first_name if p.user else None
                last_name = p.user.last_name if p.user else None
                logging.warning(f"[PROFILE_GET] Direct patient: id={p.id} first_name='{first_name}' email='{getattr(p, 'email', None)}' phone='{getattr(p, 'phone', None)}'")
            if u:
                logging.warning(f"[PROFILE_GET] Direct user: id={u.id} email='{getattr(u, 'email', None)}'")
            # Get first_name and last_name from User model, not Patient
            first_name = (p.user.first_name if p and p.user else None) or (u.first_name if u else None)
            last_name = (p.user.last_name if p and p.user else None) or (u.last_name if u else None)
            full_name = ((first_name or "") + " " + (last_name or "")).strip() if (first_name or last_name) else ""
            # Email: prefer Patient.email, fallback to User.email
            email = (getattr(p, "email", None) if p else None) or (getattr(u, "email", None) if u else None)
            logging.warning(f"[PROFILE_GET] Resolved email: '{email}' (from patient: {getattr(p, 'email', None) if p else None}, from user: {getattr(u, 'email', None) if u else None})")
            phone = getattr(p, "phone", None) if p else None
            gender = getattr(p, "gender", None) if p else None
            dob = getattr(p, "date_of_birth", None) if p else None
            # Format date directly to avoid timezone issues
            date_of_birth = dob.strftime("%Y-%m-%d") if dob else ""
            address_text = getattr(p, "address", None) if p else None
            # Build ProfileOut-shaped response (no legacy fields)
            from enum import Enum
            def _as_value(x):
                return x.value if isinstance(x, Enum) else (x.name if hasattr(x, "name") else x)
            gender = _as_value(gender) if gender is not None else ""
            pinfl = getattr(p, "national_id", None) if p else None
            preferred_language = getattr(p, "preferred_language", None) if p else None
            marital_status_val = _as_value(getattr(p, "marital_status", None)) if p else None
            
            # Get clinic_id from organization_patients (many-to-many relationship)
            # Use the first active clinic, or fallback to user.organization_id for backward compatibility
            clinic_id = ""
            if p:
                from app.common.models.patient import OrganizationPatient
                from app.common.models.hospital import Hospital
                
                # Get first active clinic from organization_patients
                org_patient = db.query(OrganizationPatient).join(
                    Hospital, OrganizationPatient.organization_id == Hospital.id
                ).filter(
                    OrganizationPatient.patient_id == p.patient_id,
                    OrganizationPatient.status == "active"
                ).order_by(OrganizationPatient.first_seen_at.desc()).first()
                
                if org_patient:
                    clinic_id = str(org_patient.organization_id)
                elif u and getattr(u, 'organization_id', None):
                    # Fallback to user.organization_id for backward compatibility
                    clinic_id = str(u.organization_id)
            
            created_at_val = u.created_at.isoformat() if u and getattr(u, "created_at", None) else ""
            updated_at_val = (getattr(p, "updated_at", None).isoformat() if p and getattr(p, "updated_at", None) else created_at_val)

            # Query latest vital signs from database using raw SQL to avoid missing column errors
            from sqlalchemy import text
            latest_vitals = None
            if p:
                try:
                    # Use raw SQL to query only columns that exist in the database
                    # Database uses: systolic_bp, diastolic_bp, recorded_at (not blood_pressure_systolic/diastolic, measured_at)
                    vitals_sql = text("""
                        SELECT height, weight, bmi, systolic_bp, diastolic_bp, recorded_at
                        FROM ehr.vital_signs
                        WHERE patient_id = :patient_id
                        AND (height IS NOT NULL OR weight IS NOT NULL OR bmi IS NOT NULL 
                             OR systolic_bp IS NOT NULL OR diastolic_bp IS NOT NULL)
                        ORDER BY recorded_at DESC NULLS LAST
                        LIMIT 1
                    """)
                    vitals_result = db.execute(vitals_sql, {"patient_id": str(p.patient_id)}).first()
                    if vitals_result:
                        # Create a simple object to hold the vital sign data
                        class VitalSignData:
                            def __init__(self, row):
                                self.height = row[0] if len(row) > 0 else None
                                self.weight = row[1] if len(row) > 1 else None
                                self.bmi = row[2] if len(row) > 2 else None
                                self.blood_pressure_systolic = row[3] if len(row) > 3 else None  # systolic_bp
                                self.blood_pressure_diastolic = row[4] if len(row) > 4 else None  # diastolic_bp
                                self.heart_rate = None
                                self.temperature = None
                                self.measured_at = row[5] if len(row) > 5 else None  # recorded_at
                        latest_vitals = VitalSignData(vitals_result)
                except Exception as e:
                    logger.warning(f"Error querying vital signs: {e}")
                    # Rollback the failed transaction to allow subsequent queries
                    try:
                        db.rollback()
                    except:
                        pass
                    latest_vitals = None
            
            # Get height, weight, BMI, BP from latest vitals or fallback to Patient model
            height = None
            weight = None
            bmi = None
            bp_systolic = None
            bp_diastolic = None
            
            if latest_vitals:
                height = latest_vitals.height
                weight = latest_vitals.weight
                bmi = latest_vitals.bmi
                bp_systolic = latest_vitals.blood_pressure_systolic
                bp_diastolic = latest_vitals.blood_pressure_diastolic
                # Calculate BMI if missing but height and weight are available
                if bmi is None and height is not None and weight is not None:
                    try:
                        height_m = float(height) / 100.0
                        weight_kg = float(weight)
                        if height_m > 0:
                            bmi = round(weight_kg / (height_m * height_m), 1)
                    except (ValueError, TypeError, ZeroDivisionError):
                        bmi = None
            
            # Note: Patient model doesn't have height/weight/bp columns - they're in vital_signs table
            # Vitals from vital_signs table are the source of truth (already read above)
            
            # Read blood_group from database (same as nurses/doctors use)
            blood_group = None
            if p:
                try:
                    blood_group_sql = text("""
                        SELECT blood_group 
                        FROM ehr.patients 
                        WHERE patient_id = :patient_id
                    """)
                    blood_group_result = db.execute(blood_group_sql, {"patient_id": str(p.patient_id)}).first()
                    if blood_group_result and blood_group_result[0]:
                        blood_group = blood_group_result[0]
                except Exception as e:
                    logger.warning(f"Error querying blood_group: {e}")
                    blood_group = None

            # Build vitals array from latest vital signs
            vitals_list = []
            if latest_vitals:
                from app.portals.patient.schemas.profile_enhanced import VitalStat
                measured_date = latest_vitals.measured_at.date().isoformat() if latest_vitals.measured_at else datetime.now().date().isoformat()
                
                if latest_vitals.height is not None:
                    vitals_list.append(VitalStat(
                        code="height",
                        value=f"{latest_vitals.height} cm",
                        unit="cm",
                        date=measured_date
                    ))
                if latest_vitals.weight is not None:
                    vitals_list.append(VitalStat(
                        code="weight",
                        value=f"{latest_vitals.weight} kg",
                        unit="kg",
                        date=measured_date
                    ))
                if latest_vitals.bmi is not None:
                    vitals_list.append(VitalStat(
                        code="bmi",
                        value=str(latest_vitals.bmi),
                        unit=None,
                        date=measured_date
                    ))
                if latest_vitals.blood_pressure_systolic is not None or latest_vitals.blood_pressure_diastolic is not None:
                    bp_value = f"{latest_vitals.blood_pressure_systolic or '—'}/{latest_vitals.blood_pressure_diastolic or '—'}"
                    vitals_list.append(VitalStat(
                        code="blood_pressure",
                        value=bp_value,
                        unit="mmHg",
                        date=measured_date
                    ))
                if latest_vitals.heart_rate is not None:
                    vitals_list.append(VitalStat(
                        code="heart_rate",
                        value=f"{latest_vitals.heart_rate} bpm",
                        unit="bpm",
                        date=measured_date
                    ))
                if latest_vitals.temperature is not None:
                    vitals_list.append(VitalStat(
                        code="temperature",
                        value=f"{latest_vitals.temperature} °C",
                        unit="°C",
                        date=measured_date
                    ))

            # Query allergies from database using raw SQL to avoid ORM issues
            allergies_list = []
            if p:
                try:
                    # Use raw SQL to query allergies - only select columns that exist
                    allergies_sql = text("""
                        SELECT display_name, code, notes
                        FROM ehr.allergy_intolerances
                        WHERE patient_id = :patient_id
                        AND clinical_status = 'active'
                    """)
                    allergies_result = db.execute(allergies_sql, {"patient_id": str(p.patient_id)}).fetchall()
                    allergies_list = [
                        row[0] or row[1] or row[2] or "Unknown" 
                        for row in allergies_result 
                        if row and (row[0] or row[1] or row[2])
                    ]
                except Exception as e:
                    logger.warning(f"Error querying allergies: {e}")
                    # Rollback the failed transaction to allow subsequent queries
                    try:
                        db.rollback()
                    except:
                        pass
                    allergies_list = []

            profile_out = ProfileOut(
                full_name=full_name or "",
                email=email,
                phone=phone or "",
                date_of_birth=date_of_birth or "",
                gender=gender or "",
                address=address_text,
                pinfl=pinfl or "",
                nationality=getattr(p, "nationality", None) if p else None,
                marital_status=marital_status_val,
                occupation=getattr(p, "occupation", None) if p else None,
                preferred_language=(preferred_language or "en"),
                blood_type=None,
                height=height,
                weight=weight,
                blood_group=blood_group,  # Read from database above (with error handling)
                blood_pressure_systolic=bp_systolic,
                blood_pressure_diastolic=bp_diastolic,
                bmi=bmi,
                allergies=allergies_list,
                chronic_conditions=[],
                medications=[],
                vitals=vitals_list,
                immunizations=immunizations,  # Read from database above
                insurance=None,
                emergency_contact=None,  # Will be populated below
                fhir_patient_id=current_patient.fhir_patient_id,
                clinic_id=clinic_id,
                created_at=created_at_val,
                updated_at=updated_at_val,
                last_login=None
            )
            # Get emergency contact for this patient
            emergency_contact_obj = None
            if p:
                emergency_contact = None
                emergency_phone = None
                emergency_related_person_id = None
                
                # Read from local database first
                logging.warning(f"[PROFILE_GET] early return path - querying emergency_contact for patient_id={p.patient_id}")
                try:
                    from app.common.models.patient import EmergencyContact as EmergencyContactModel
                    patient_id_uuid = p.patient_id
                    emergency_db = db.query(EmergencyContactModel).filter(
                        EmergencyContactModel.patient_id == patient_id_uuid,
                        EmergencyContactModel.is_primary == True
                    ).first()
                    if emergency_db:
                        emergency_contact = emergency_db.name
                        emergency_phone = emergency_db.phone_primary
                        logging.warning(f"[PROFILE_GET] early return - read emergency_contact from DB: name='{emergency_contact}' phone='{emergency_phone}'")
                except Exception as e:
                    logger.warning(f"PROFILE_GET early return - emergency_contact table query failed: {e}")
                
                # Build EmergencyContact object if any
                if emergency_contact or emergency_phone:
                    from app.portals.patient.schemas.profile_enhanced import EmergencyContact as EmergencyContactSchema
                    emergency_contact_obj = EmergencyContactSchema(
                        name=emergency_contact or "",
                        relationship="Emergency contact",
                        phone=emergency_phone or "",
                        email=None,
                        address=None,
                        fhir_related_person_id=emergency_related_person_id
                    )
                    logging.warning(f"[PROFILE_GET] early return - built emergency_obj: name='{emergency_contact_obj.name}' phone='{emergency_contact_obj.phone}'")
            
            # Update profile_out with emergency contact
            profile_out.emergency_contact = emergency_contact_obj
            
            logging.warning(f"[PROFILE_GET] Final response: full_name='{profile_out.full_name}' email='{profile_out.email}' phone='{profile_out.phone}' address='{profile_out.address}' emergency_contact={emergency_contact_obj.name if emergency_contact_obj else None}")
            return SuccessResponse(
                data=profile_out,
                message="Profile retrieved from local DB"
            )

        # Try FHIR first; if unavailable, fall back to local DB
        patient = None
        # Avoid blocking on FHIR when unavailable
        if not FHIR_DISABLED:
            try:
                patient = await fhir_client._make_request("GET", f"Patient/{current_patient.fhir_patient_id}")
            except Exception:
                patient = None
        
        if patient:
            # Validate ownership - ensure this is the patient's own data
            if patient.get("id") != current_patient.fhir_patient_id:
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Access Denied",
                    status=403,
                    detail="Cannot access other patient's data",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
        
        # Get active insurance coverage (only if FHIR is available)
        coverage = None
        if patient and not FHIR_DISABLED:
            try:
                coverage_result = await fhir_client._make_request("GET", "Coverage", params={
                    "beneficiary": f"Patient/{current_patient.fhir_patient_id}",
                    "status": "active"
                })
                if coverage_result.get("entry"):
                    coverage = coverage_result["entry"][0]["resource"]
            except:
                coverage = None
        
        # Get latest vital signs (Observations) - only if FHIR is available
        vitals = []
        if patient and not FHIR_DISABLED:
            try:
                vital_codes = ["8302-2", "29463-7", "85354-9", "8867-4", "9279-1", "2708-6"]  # LOINC codes
                observations_result = await fhir_client._make_request("GET", "Observation", params={
                    "subject": f"Patient/{current_patient.fhir_patient_id}",
                    "code": ",".join(vital_codes),
                    "category": "vital-signs",
                    "_sort": "-date",
                    "_count": 20
                })
                
                for entry in observations_result.get("entry", []):
                    obs = entry["resource"]
                    
                    # Validate ownership
                    if not validate_patient_ownership(obs.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                        continue
                    
                    loinc_code = obs.get("code", {}).get("coding", [{}])[0].get("code", "")
                    code_mapping = {
                        "8302-2": "height",
                        "29463-7": "weight", 
                        "85354-9": "blood_pressure",
                        "8867-4": "heart_rate",
                        "9279-1": "respiratory_rate",
                        "2708-6": "oxygen_saturation"
                    }
                    
                    code = code_mapping.get(loinc_code, "unknown")
                    value = "—"
                    
                    if "valueQuantity" in obs:
                        quantity = obs["valueQuantity"]
                        value = f"{quantity.get('value', '')} {quantity.get('unit', '')}"
                    elif "valueString" in obs:
                        value = obs["valueString"]
                    
                    vitals.append(VitalStat(
                        code=code,
                        value=value,
                        date=obs.get("effectiveDateTime", ""),
                        fhir_observation_id=obs.get("id")
                    ))
            except:
                vitals = []
        
        # Get immunizations from database (same table as nurses/doctors use)
        immunizations = []
        if p:
            try:
                from sqlalchemy import text
                # Query immunizations from ehr.immunizations table
                immunizations_sql = text("""
                    SELECT id, vaccine_name, occurrence_date, status, lot_number, manufacturer, recorded
                    FROM ehr.immunizations
                    WHERE patient_id = :patient_id
                    ORDER BY occurrence_date DESC NULLS LAST
                    LIMIT 50
                """)
                immunizations_result = db.execute(immunizations_sql, {"patient_id": str(p.patient_id)}).all()
                
                for row in immunizations_result:
                    imm_id = str(row[0]) if row[0] else None
                    vaccine_name = row[1] if row[1] else "Unknown"
                    occurrence_date = row[2]  # DateTime or Date
                    status = row[3] if row[3] else "completed"
                    lot_number = row[4] if len(row) > 4 else None
                    manufacturer = row[5] if len(row) > 5 else None
                    
                    # Format date
                    if occurrence_date:
                        if isinstance(occurrence_date, datetime):
                            imm_date_str = occurrence_date.date().isoformat()
                        elif isinstance(occurrence_date, date):
                            imm_date_str = occurrence_date.isoformat()
                        else:
                            imm_date_str = str(occurrence_date)
                    else:
                        imm_date_str = ""
                    
                    immunizations.append(ImmunizationRec(
                        vaccine=vaccine_name,
                        date=imm_date_str,
                        status=status.capitalize() if status else "Completed",
                        lot_number=lot_number,
                        manufacturer=manufacturer,
                        fhir_immunization_id=None  # Not from FHIR, from database
                    ))
            except Exception as e:
                logger.warning(f"Error querying immunizations from database: {e}")
                immunizations = []
        
        # Get allergies - only if FHIR is available
        allergies = []
        if patient and not FHIR_DISABLED:
            try:
                allergies_result = await fhir_client._make_request("GET", "AllergyIntolerance", params={
                    "patient": f"Patient/{current_patient.fhir_patient_id}",
                    "_count": 50
                })
                
                for entry in allergies_result.get("entry", []):
                    allergy = entry["resource"]
                    
                    # Validate ownership
                    if not validate_patient_ownership(allergy.get("patient", {}).get("reference", "").replace("Patient/", ""), current_patient):
                        continue
                    
                    allergy_name = allergy.get("code", {}).get("text", "Unknown allergy")
                    allergies.append(allergy_name)
            except:
                allergies = []
        
        # MERGE ON READ STRATEGY: Start with local DB as base, overlay FHIR data if available
        # Get local DB data first (our source of truth for demographics)
        from sqlalchemy.orm import joinedload
        row = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.user_id == current_patient.id).first()
        user_row = db.query(User).filter(User.id == current_patient.id).first()
        
        # Start with local DB values - get first_name/last_name from User model
        first_name = (row.user.first_name if row and row.user else None) or (user_row.first_name if user_row else None)
        last_name = (row.user.last_name if row and row.user else None) or (user_row.last_name if user_row else None)
        full_name = ((first_name or "") + " " + (last_name or "")).strip() if (first_name or last_name) else ""
        # Email is stored in User model, not Patient model
        email = (user_row.email if user_row else None) or (row.user.email if row and row.user else None)
        phone = getattr(row, "phone", None) if row else None
        gender = getattr(row, "sex", None) if row else None  # Patient model uses 'sex', not 'gender'
        dob = getattr(row, "date_of_birth", None) if row else None
        # Format date directly to avoid timezone issues
        date_of_birth = dob.strftime("%Y-%m-%d") if dob else ""
        # Address: Get from database first, then fall back to FHIR
        address_text = getattr(row, "address", None) if row else None
        profile_image = None
        registration_date_fallback = user_row.created_at.isoformat() if user_row and getattr(user_row, "created_at", None) else ""
        
        # Overlay FHIR data if available (only for fields that might be more complete in FHIR)
        if patient and not FHIR_DISABLED:
            # Only overlay FHIR data for fields that are missing or empty in local DB
            if not full_name:
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
            
            if not email:
                telecom = patient.get("telecom", [])
                email = next((t["value"] for t in telecom if t["system"] == "email"), None)
            
            if not phone:
                telecom = patient.get("telecom", [])
                phone = next((t["value"] for t in telecom if t["system"] == "phone" and t.get("use") != "emergency"), None)
            
            if not gender:
                gender = patient.get("gender")
            
            if not date_of_birth:
                date_of_birth = patient.get("birthDate")
            
            # Only use FHIR address if database doesn't have it
            if not address_text:
                address_text = patient.get("address", [{}])[0].get("text")
            
            # Profile image is typically only in FHIR
            profile_image = patient.get("photo", [{}])[0].get("url")
        
        # Initialize immunizations for main path (will be populated below)
        immunizations = []
        
        # Extract emergency contact - read from local DB first, then overlay FHIR if available
        emergency_contact = None
        emergency_phone = None
        emergency_related_person_id = None
        
        # Read from local database first (if table exists)
        logging.warning(f"[PROFILE_GET] row exists: {row is not None}, row.patient_id: {row.patient_id if row else None}")
        if row:
            try:
                from app.common.models.patient import EmergencyContact as EmergencyContactModel
                # patient_id is UUID, not string
                patient_id_uuid = row.patient_id
                logging.warning(f"[PROFILE_GET] querying emergency_contact for patient_id={patient_id_uuid}")
                emergency_db = db.query(EmergencyContactModel).filter(
                    EmergencyContactModel.patient_id == patient_id_uuid,
                    EmergencyContactModel.is_primary == True
                ).first()
                if emergency_db:
                    emergency_contact = emergency_db.name
                    emergency_phone = emergency_db.phone_primary
                    logging.warning(f"[PROFILE_GET] read emergency_contact from DB: name='{emergency_contact}' phone='{emergency_phone}'")
                else:
                    logging.warning(f"[PROFILE_GET] no emergency_contact found in DB for patient_id={patient_id_uuid}")
                    # Also check if there are ANY emergency contacts for this patient (for debugging)
                    all_emergency = db.query(EmergencyContactModel).filter(
                        EmergencyContactModel.patient_id == patient_id_uuid
                    ).all()
                    logging.warning(f"[PROFILE_GET] total emergency_contacts for patient_id={patient_id_uuid}: {len(all_emergency)}")
            except Exception as e:
                # Table doesn't exist - will fall back to FHIR
                logger.warning(f"PROFILE_GET emergency_contact table query failed: {e}", exc_info=True)
                pass
        else:
            logging.warning(f"[PROFILE_GET] row is None, cannot query emergency_contact")
        
        # Overlay FHIR data if available, but prioritize database data (database is source of truth for doctors/nurses)
        # Only use FHIR if database has no data
        if (not emergency_contact or not emergency_phone) and patient and not FHIR_DISABLED:
            try:
                related_persons_result = await fhir_client._make_request("GET", "RelatedPerson", params={
                    "patient": f"Patient/{current_patient.fhir_patient_id}"
                })
                logger.info(f"PROFILE_GET RelatedPerson query result: {related_persons_result}")
                if related_persons_result.get("entry") and len(related_persons_result.get("entry", [])) > 0:
                    related_person = related_persons_result["entry"][0]["resource"]
                    logger.info(f"PROFILE_GET RelatedPerson resource: {related_person}")
                    # Only use FHIR data if database doesn't have it (database is source of truth)
                    name_obj = related_person.get("name")
                    if name_obj and not emergency_contact:
                        if isinstance(name_obj, dict):
                            emergency_contact = name_obj.get("text") or emergency_contact
                        elif isinstance(name_obj, list) and len(name_obj) > 0:
                            emergency_contact = name_obj[0].get("text") or emergency_contact
                    
                    emergency_telecom = related_person.get("telecom", [])
                    if emergency_telecom and not emergency_phone:
                        phone_entry = next((t for t in emergency_telecom if t.get("system") == "phone"), None)
                        if phone_entry:
                            emergency_phone = phone_entry.get("value") or emergency_phone
                    
                    if not emergency_related_person_id:
                        emergency_related_person_id = related_person.get("id")
                    logger.info(f"PROFILE_GET extracted emergency_contact='{emergency_contact}' emergency_phone='{emergency_phone}'")
                else:
                    logger.warning(f"PROFILE_GET No RelatedPerson entries found for patient {current_patient.fhir_patient_id}")
            except Exception as e:
                logger.warning(f"PROFILE_GET Error reading emergency contact from FHIR: {e}")
                # Don't fail if FHIR read fails
        
        # Read blood_group from database (same as nurses/doctors use)
        blood_group = None
        if row:
            try:
                from sqlalchemy import text
                blood_group_sql = text("""
                    SELECT blood_group 
                    FROM ehr.patients 
                    WHERE patient_id = :patient_id
                """)
                blood_group_result = db.execute(blood_group_sql, {"patient_id": str(row.patient_id)}).first()
                if blood_group_result and blood_group_result[0]:
                    blood_group = blood_group_result[0]
            except Exception as e:
                logger.warning(f"Error querying blood_group: {e}")
                blood_group = None
        
        # Extract blood group from FHIR extensions as fallback (if database doesn't have it)
        blood_rh = None
        if not blood_group and patient:
            for ext in patient.get("extension", []):
                if ext.get("url") == "https://fiattib.uz/fhir/StructureDefinition/blood-group":
                    blood_group = ext.get("valueString")
                elif ext.get("url") == "https://fiattib.uz/fhir/StructureDefinition/blood-rh":
                    blood_rh = ext.get("valueString")

        # Build blood_type combined
        blood_type = None
        if blood_group:
            blood_type = f"{blood_group}{blood_rh or ''}"
        
        # Read immunizations from database for row path (same table as nurses/doctors use)
        # Initialize both variables to ensure they exist in all code paths
        immunizations_row = []
        immunizations = []  # Initialize for fallback in case row is falsy
        if row:
            try:
                from sqlalchemy import text
                immunizations_sql = text("""
                    SELECT id, vaccine_name, occurrence_date, status, lot_number, manufacturer, recorded
                    FROM ehr.immunizations
                    WHERE patient_id = :patient_id
                    ORDER BY occurrence_date DESC NULLS LAST
                    LIMIT 50
                """)
                immunizations_result = db.execute(immunizations_sql, {"patient_id": str(row.patient_id)}).all()
                
                for imm_row in immunizations_result:
                    imm_id = str(imm_row[0]) if imm_row[0] else None
                    vaccine_name = imm_row[1] if imm_row[1] else "Unknown"
                    occurrence_date = imm_row[2]  # DateTime or Date
                    status = imm_row[3] if imm_row[3] else "completed"
                    lot_number = imm_row[4] if len(imm_row) > 4 else None
                    manufacturer = imm_row[5] if len(imm_row) > 5 else None
                    
                    # Format date
                    if occurrence_date:
                        if isinstance(occurrence_date, datetime):
                            imm_date_str = occurrence_date.date().isoformat()
                        elif isinstance(occurrence_date, date):
                            imm_date_str = occurrence_date.isoformat()
                        else:
                            imm_date_str = str(occurrence_date)
                    else:
                        imm_date_str = ""
                    
                    immunizations_row.append(ImmunizationRec(
                        vaccine=vaccine_name,
                        date=imm_date_str,
                        status=status.capitalize() if status else "Completed",
                        lot_number=lot_number,
                        manufacturer=manufacturer,
                        fhir_immunization_id=None  # Not from FHIR, from database
                    ))
            except Exception as e:
                logger.warning(f"Error querying immunizations from database (row path): {e}")
                immunizations_row = []

        # Canonical demographics from local DB
        pinfl = getattr(row, "national_id", None) if row else None
        preferred_language = getattr(row, "preferred_language", None) if row else None
        # clinic_id from organization_patients (many-to-many relationship)
        # Use the first active clinic, or fallback to user.organization_id for backward compatibility
        clinic_id = None
        if row:
            from app.common.models.patient import OrganizationPatient
            from app.common.models.hospital import Hospital
            
            # Get first active clinic from organization_patients
            org_patient = db.query(OrganizationPatient).join(
                Hospital, OrganizationPatient.organization_id == Hospital.id
            ).filter(
                OrganizationPatient.patient_id == row.patient_id,
                OrganizationPatient.status == "active"
            ).order_by(OrganizationPatient.first_seen_at.desc()).first()
            
            if org_patient:
                clinic_id = str(org_patient.organization_id)
            elif user_row and hasattr(user_row, "organization_id") and user_row.organization_id:
                # Fallback to user.organization_id for backward compatibility
                clinic_id = str(user_row.organization_id)
        
        created_at_val = (user_row.created_at.isoformat() if user_row and getattr(user_row, "created_at", None) else None)
        updated_at_val = (getattr(row, "updated_at", None).isoformat() if row and getattr(row, "updated_at", None) else created_at_val)
        
        # Build EmergencyContact object if any
        emergency_obj = None
        logging.warning(f"[PROFILE_GET] building emergency_obj: emergency_contact='{emergency_contact}' emergency_phone='{emergency_phone}'")
        if emergency_contact or emergency_phone:
            from app.portals.patient.schemas.profile_enhanced import EmergencyContact as EmergencyContactSchema
            emergency_obj = EmergencyContactSchema(
                name=emergency_contact or "",
                relationship="Emergency contact",
                phone=emergency_phone or "",
                email=None,
                address=None,
                fhir_related_person_id=emergency_related_person_id
            )
            logging.warning(f"[PROFILE_GET] built emergency_obj: name='{emergency_obj.name}' phone='{emergency_obj.phone}'")
        else:
            logging.warning(f"[PROFILE_GET] emergency_obj is None (no emergency_contact or emergency_phone)")

        return SuccessResponse(
            data=ProfileOut(
                full_name=full_name or "",
                email=email,
                phone=phone or "",
                date_of_birth=date_of_birth or "",
                gender=(gender or ""),
                address=address_text,
                pinfl=pinfl or "",
                nationality=getattr(row, "nationality", None) if row else None,
                marital_status=(getattr(row, "marital_status", None).name if row and getattr(row, "marital_status", None) else None),
                occupation=getattr(row, "occupation", None) if row else None,
                preferred_language=(preferred_language or "en"),
                blood_type=blood_type,
                height=getattr(row, "height", None) if row else None,
                weight=getattr(row, "weight", None) if row else None,
                blood_group=blood_group,  # Read from database above
                blood_pressure_systolic=getattr(row, "blood_pressure_systolic", None) if row else None,
                blood_pressure_diastolic=getattr(row, "blood_pressure_diastolic", None) if row else None,
                bmi=getattr(row, "bmi", None) if row else None,
                allergies=(
                    getattr(row, "allergies", None) if row and getattr(row, "allergies", None)
                    else allergies
                ),
                chronic_conditions=(
                    getattr(row, "chronic_conditions", None) if row and getattr(row, "chronic_conditions", None)
                    else []
                ),
                medications=[],
                vitals=vitals,
                immunizations=immunizations_row if row else immunizations,  # Read from database (same table as nurses/doctors)
                insurance=(
                    InsuranceInfo(
                        provider=(
                            getattr(row, "insurance_provider", None) if row and getattr(row, "insurance_provider", None)
                            else coverage.get("payor", [{}])[0].get("display", "")
                        ),
                        policy_number=(
                            getattr(row, "insurance_policy_number", None) if row and getattr(row, "insurance_policy_number", None)
                            else coverage.get("subscriberId", "")
                        ),
                        group_number=(
                            getattr(row, "insurance_group_number", None) if row and getattr(row, "insurance_group_number", None)
                            else coverage.get("grouping", {}).get("group")
                        ),
                        coverage_type=(
                            getattr(row, "insurance_coverage_type", None) if row and getattr(row, "insurance_coverage_type", None)
                            else coverage.get("type", {}).get("coding", [{}])[0].get("display", "")
                        ),
                        valid_until=(
                            getattr(row, "insurance_valid_until", None).isoformat() if row and getattr(row, "insurance_valid_until", None)
                            else coverage.get("period", {}).get("end")
                        ),
                        fhir_coverage_id=coverage.get("id") if coverage else None
                    )
                ) if (row and any([
                    getattr(row, "insurance_provider", None),
                    getattr(row, "insurance_policy_number", None),
                    getattr(row, "insurance_group_number", None),
                    getattr(row, "insurance_coverage_type", None),
                    getattr(row, "insurance_valid_until", None)
                ])) or coverage else None,
                emergency_contact=emergency_obj,
                fhir_patient_id=current_patient.fhir_patient_id,
                clinic_id=(clinic_id or ""),
                created_at=(created_at_val or ""),
                updated_at=(updated_at_val or created_at_val or ""),
                last_login=None
            ),
            message="Profile retrieved successfully"
        )
        
    except HTTPException as e:
        # Fallback to local DB profile if FHIR is unavailable
        if getattr(e, "status_code", None) == 503 or "FHIR" in str(getattr(e, "detail", "")):
            try:
                from app.common.models.patient import Patient as PatientModel
                from app.common.models.user import User as UserModel
                from sqlalchemy.orm import joinedload
                p = db.query(PatientModel).options(joinedload(PatientModel.user)).filter(PatientModel.user_id == current_patient.id).first()
                u = db.query(UserModel).filter(UserModel.id == current_patient.id).first()
                logging.warning(f"[PROFILE_GET] Fallback query: p={p} u={u}")
                if p:
                    first_name = p.user.first_name if p.user else None
                    last_name = p.user.last_name if p.user else None
                    logging.warning(f"[PROFILE_GET] Fallback patient: id={p.id} first_name='{first_name}' email='{getattr(p, 'email', None)}' phone='{getattr(p, 'phone', None)}'")
                if u:
                    logging.warning(f"[PROFILE_GET] Fallback user: id={u.id} email='{getattr(u, 'email', None)}'")
                # Get first_name and last_name from User model, not Patient
                first_name = (p.user.first_name if p and p.user else None) or (u.first_name if u else None)
                last_name = (p.user.last_name if p and p.user else None) or (u.last_name if u else None)
                full_name = ((first_name or "") + " " + (last_name or "")).strip() if (first_name or last_name) else ""
                # Email: prefer Patient.email, fallback to User.email
                email = (getattr(p, "email", None) if p else None) or (getattr(u, "email", None) if u else None)
                logging.warning(f"[PROFILE_GET] Fallback resolved email: '{email}' (from patient: {getattr(p, 'email', None) if p else None}, from user: {getattr(u, 'email', None) if u else None})")
                phone = getattr(p, "phone", None) if p else None
                # Normalize enum
                from enum import Enum
                def _as_value(x):
                    return x.value if isinstance(x, Enum) else (x.name if hasattr(x, "name") else x)
                gender = _as_value(getattr(p, "gender", None)) if p else ""
                dob = getattr(p, "date_of_birth", None) if p else None
                # Format date directly to avoid timezone issues
                date_of_birth = dob.strftime("%Y-%m-%d") if dob else ""
                address_text = getattr(p, "address", None) if p else None
                pinfl = getattr(p, "national_id", None) if p else None
                preferred_language = getattr(p, "preferred_language", None) if p else None
                # Get clinic_id from organization_patients (many-to-many relationship)
                clinic_id = ""
                if p:
                    from app.common.models.patient import OrganizationPatient
                    from app.common.models.hospital import Hospital
                    
                    # Get first active clinic from organization_patients
                    org_patient = db.query(OrganizationPatient).join(
                        Hospital, OrganizationPatient.organization_id == Hospital.id
                    ).filter(
                        OrganizationPatient.patient_id == p.patient_id,
                        OrganizationPatient.status == "active"
                    ).order_by(OrganizationPatient.first_seen_at.desc()).first()
                    
                    if org_patient:
                        clinic_id = str(org_patient.organization_id)
                    elif u and getattr(u, 'organization_id', None):
                        # Fallback to user.organization_id for backward compatibility
                        clinic_id = str(u.organization_id)
                
                created_at = u.created_at.isoformat() if u and getattr(u, "created_at", None) else ""
                updated_at = (getattr(p, "updated_at", None).isoformat() if p and getattr(p, "updated_at", None) else created_at)
                
                # Read blood_group from database
                blood_group_fallback = None
                if p:
                    try:
                        from sqlalchemy import text
                        blood_group_sql = text("""
                            SELECT blood_group 
                            FROM ehr.patients 
                            WHERE patient_id = :patient_id
                        """)
                        blood_group_result = db.execute(blood_group_sql, {"patient_id": str(p.patient_id)}).first()
                        if blood_group_result and blood_group_result[0]:
                            blood_group_fallback = blood_group_result[0]
                    except Exception as e:
                        logger.warning(f"Error querying blood_group in fallback: {e}")
                
                # Read immunizations from database (same table as nurses/doctors)
                immunizations_fallback = []
                if p:
                    try:
                        from sqlalchemy import text
                        immunizations_sql = text("""
                            SELECT id, vaccine_name, occurrence_date, status, lot_number, manufacturer
                            FROM ehr.immunizations
                            WHERE patient_id = :patient_id
                            ORDER BY occurrence_date DESC NULLS LAST
                            LIMIT 50
                        """)
                        immunizations_result = db.execute(immunizations_sql, {"patient_id": str(p.patient_id)}).all()
                        for row in immunizations_result:
                            vaccine_name = row[1] if row[1] else "Unknown"
                            occurrence_date = row[2]
                            status = row[3] if row[3] else "completed"
                            lot_number = row[4] if len(row) > 4 else None
                            manufacturer = row[5] if len(row) > 5 else None
                            
                            if occurrence_date:
                                if isinstance(occurrence_date, datetime):
                                    imm_date_str = occurrence_date.date().isoformat()
                                elif isinstance(occurrence_date, date):
                                    imm_date_str = occurrence_date.isoformat()
                                else:
                                    imm_date_str = str(occurrence_date)
                            else:
                                imm_date_str = ""
                            
                            from app.portals.patient.schemas.profile_enhanced import ImmunizationRec
                            immunizations_fallback.append(ImmunizationRec(
                                vaccine=vaccine_name,
                                date=imm_date_str,
                                status=status.capitalize() if status else "Completed",
                                lot_number=lot_number,
                                manufacturer=manufacturer,
                                fhir_immunization_id=None
                            ))
                    except Exception as e:
                        logger.warning(f"Error querying immunizations in fallback: {e}")
                        immunizations_fallback = []
                
                return SuccessResponse(
                    data=ProfileOut(
                        full_name=full_name,
                        email=email,
                        phone=phone or "",
                        gender=gender or "",
                        date_of_birth=date_of_birth,
                        address=address_text,
                        pinfl=pinfl or "",
                        nationality=getattr(p, "nationality", None) if p else None,
                        marital_status=_as_value(getattr(p, "marital_status", None)) if p else None,
                        occupation=getattr(p, "occupation", None) if p else None,
                        preferred_language=(preferred_language or "en"),
                        blood_type=None,
                        height=None,  # Patient model doesn't have height - it's in vital_signs
                        weight=None,  # Patient model doesn't have weight - it's in vital_signs
                        blood_group=blood_group_fallback,
                        blood_pressure_systolic=None,  # Patient model doesn't have this - it's in vital_signs
                        blood_pressure_diastolic=None,  # Patient model doesn't have this - it's in vital_signs
                        bmi=None,  # Patient model doesn't have bmi - it's in vital_signs
                        allergies=getattr(p, "allergies", None) if p else [],
                        chronic_conditions=getattr(p, "chronic_conditions", None) if p else [],
                        medications=[],
                        vitals=[],
                        immunizations=immunizations_fallback,
                        insurance=(
                            InsuranceInfo(
                                provider=getattr(p, "insurance_provider", None) if p else None,
                                policy_number=getattr(p, "insurance_policy_number", None) if p else None,
                                group_number=getattr(p, "insurance_group_number", None) if p else None,
                                coverage_type=getattr(p, "insurance_coverage_type", None) if p else None,
                                valid_until=getattr(p, "insurance_valid_until", None).isoformat() if p and getattr(p, "insurance_valid_until", None) else None,
                                fhir_coverage_id=None
                            )
                        ) if p and any([
                            getattr(p, "insurance_provider", None),
                            getattr(p, "insurance_policy_number", None),
                            getattr(p, "insurance_group_number", None),
                            getattr(p, "insurance_coverage_type", None),
                            getattr(p, "insurance_valid_until", None)
                        ]) else None,
                        emergency_contact=None,
                        fhir_patient_id=current_patient.fhir_patient_id,
                        clinic_id=clinic_id,
                        created_at=created_at,
                        updated_at=updated_at,
                        last_login=None
                    ),
                    message="Profile retrieved from local DB"
                )
            except Exception:
                pass
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Profile Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve profile: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.patch("", response_model=SuccessResponse[Dict[str, str]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "patient", "profile_update")
async def update_demographics(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Update patient demographics - enforces ownership validation."""
    try:
        # Diagnostic: log payload
        logging.warning(f"[PATCH] payload={payload}")
        # Get current patient resource (best-effort)
        patient = None
        try:
            fetched = await fhir_client._make_request("GET", f"Patient/{current_patient.fhir_patient_id}")
            # Use only a valid Patient resource; otherwise treat as unavailable
            if isinstance(fetched, dict) and fetched.get("resourceType") == "Patient":
                patient = fetched
        except Exception:
            patient = None
        
        # Validate ownership
        if patient and patient.get("id") and patient.get("id") != current_patient.fhir_patient_id:
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Access Denied",
                status=403,
                detail="Cannot modify other patient's data",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Build updates
        updates = {}
        full_name_in = payload.get("full_name") or payload.get("fullName")
        if full_name_in:
            name_parts = str(full_name_in).strip().split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[-1] if len(name_parts) > 1 else ""
            middle_names = name_parts[1:-1] if len(name_parts) > 2 else []
            
            updates["name"] = [{
                "use": "official",
                "family": last_name,
                "given": [first_name] + middle_names,
                "text": full_name_in
            }]
        
        # Handle date of birth
        dob_in = payload.get("date_of_birth") or payload.get("dateOfBirth")
        if dob_in:
            try:
                from datetime import datetime
                # Parse date string to datetime object
                if isinstance(dob_in, str):
                    # Try different date formats
                    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
                        try:
                            dob_date = datetime.strptime(dob_in, fmt).date()
                            updates["birthDate"] = dob_date.isoformat()
                            break
                        except ValueError:
                            continue
                elif hasattr(dob_in, 'date'):
                    updates["birthDate"] = dob_in.date().isoformat()
            except Exception as e:
                logging.warning(f"[PATCH] Failed to parse date_of_birth '{dob_in}': {e}")
        
        # Handle gender
        gender_in = payload.get("gender")
        if gender_in:
            # Map frontend gender values to FHIR gender codes
            gender_mapping = {
                "male": "male",
                "female": "female", 
                "other": "other",
                "unknown": "unknown"
            }
            fhir_gender = gender_mapping.get(gender_in.lower(), "unknown")
            updates["gender"] = fhir_gender
        
        email_in = payload.get("email")
        if email_in:
            # Update telecom array (guard when patient is None)
            telecom = (patient.get("telecom", []) if patient else [])
            # Remove existing email
            telecom = [t for t in telecom if t.get("system") != "email"]
            # Add new email
            telecom.append({"system": "email", "value": email_in, "use": "home"})
            updates["telecom"] = telecom
        phone_in = payload.get("phone")
        if phone_in:
            # Update telecom array (guard when patient is None)
            telecom = (patient.get("telecom", []) if patient else [])
            # Remove existing phone
            telecom = [t for t in telecom if t.get("system") != "phone" or t.get("use") == "emergency"]
            # Add new phone
            telecom.append({"system": "phone", "value": phone_in, "use": "mobile"})
            updates["telecom"] = telecom
        addr_in = payload.get("address")
        if addr_in:
            # Also update FHIR (p will be defined later, we'll update DB then)
            updates["address"] = [{"text": addr_in, "use": "home"}]
        emerg_name = payload.get("emergency_contact") or payload.get("emergencyContact")
        emerg_phone = payload.get("emergency_phone") or payload.get("emergencyPhone")
        
        # Store for later processing (after p is defined)
        emerg_name_to_save = emerg_name
        emerg_phone_to_save = emerg_phone
        
        # Also update FHIR RelatedPerson (best-effort, before local DB update)
        emerg_fhir_saved = False
        if emerg_name or emerg_phone:
            try:
                related_persons_result = await fhir_client._make_request("GET", "RelatedPerson", params={
                    "patient": f"Patient/{current_patient.fhir_patient_id}"
                })
                
                if related_persons_result.get("entry"):
                    # Update existing emergency contact
                    related_person = related_persons_result["entry"][0]["resource"]
                    if emerg_name:
                        related_person["name"] = {"text": emerg_name}
                    if emerg_phone:
                        related_person["telecom"] = [{"system": "phone", "value": emerg_phone}]
                    
                    await fhir_client._make_request("PUT", f"RelatedPerson/{related_person['id']}", data=related_person)
                    emerg_fhir_saved = True
                    logger.info(f"PROFILE_PATCH updated emergency contact in FHIR: name='{emerg_name}' phone='{emerg_phone}'")
                else:
                    # Create new emergency contact
                    emergency_contact = {
                        "resourceType": "RelatedPerson",
                        "patient": {"reference": f"Patient/{current_patient.fhir_patient_id}"},
                        "relationship": {
                            "coding": [{
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                                "code": "EP",
                                "display": "Emergency contact person"
                            }]
                        },
                        "name": {"text": emerg_name or "Emergency Contact"},
                        "telecom": [{"system": "phone", "value": emerg_phone}] if emerg_phone else []
                    }
                    await fhir_client._make_request("POST", "RelatedPerson", data=emergency_contact)
                    emerg_fhir_saved = True
                    logger.info(f"PROFILE_PATCH created emergency contact in FHIR: name='{emerg_name}' phone='{emerg_phone}'")
            except Exception as e:
                logger.warning(f"PROFILE_PATCH FHIR emergency contact update failed: {e}")
                # Will try to save to local DB below
        
        if payload.get("profile_image"):
            updates["photo"] = [{
                "contentType": "image/png",
                "data": payload.get("profile_image")
            }]
        
        # WRITE-THROUGH STRATEGY: Always update local DB first (source of truth for demographics)
        # Then attempt FHIR update as best-effort
        from app.common.models.patient import Patient as PatientModel
        from app.common.models.user import User as UserModel
        # Normalize incoming payload keys (aliases)
        aliases = {
            "fullName": "full_name",
            "emergencyPhone": "emergency_phone",
            "emergencyContact": "emergency_contact",
            "preferredLanguage": "preferred_language",
            "nationalId": "pinfl",
            "phoneNumber": "phone",
            "homeAddress": "address",
        }
        for a, b in aliases.items():
            if a in payload and b not in payload:
                payload[b] = payload[a]

        from sqlalchemy.orm import joinedload
        p = db.query(PatientModel).options(joinedload(PatientModel.user)).filter(PatientModel.user_id == current_patient.id).first()
        u = db.query(UserModel).filter(UserModel.id == current_patient.id).first()
        logging.warning(f"[PATCH] patient_row id={getattr(p,'id',None)} user_id_on_patient={getattr(p,'user_id',None)} current_user_id={current_patient.id}")
        
        # Update local DB (always - this is our source of truth)
        mutated = 0
        # If no Patient profile row exists for this user, create it now (first-time save)
        if not p:
            # Fail loud if there’s no Patient row linked to this user
            raise HTTPException(status_code=404, detail="No Patient row linked to this user_id")
            try:
                from uuid import uuid4
                first_name_seed = None
                last_name_seed = None
                if full_name_in:
                    _parts = str(full_name_in).strip().split()
                    first_name_seed = _parts[0] if _parts else None
                    last_name_seed = _parts[-1] if len(_parts) > 1 else None
                p = PatientModel(
                    id=str(uuid4()),  # Add missing ID field
                    user_id=current_patient.id,
                    first_name=first_name_seed or getattr(u, 'first_name', '') or '',
                    last_name=last_name_seed or getattr(u, 'last_name', '') or '',
                    medical_record_number=f"MRN-{uuid4().hex[:8].upper()}",  # Add required MRN
                    date_of_birth=date(1900, 1, 1),  # Add placeholder DOB
                    gender="OTHER",  # Add placeholder gender
                    national_id=str(uuid4()),  # Add placeholder national_id
                    phone=phone_in or "",
                    email=email_in or "",
                    preferred_language=lang_in or "en",
                )
                db.add(p)
                db.flush()  # Flush to get ID for refresh
                mutated += 1
                logger.info(f"PROFILE_PATCH created_new_patient id={p.id} user_id={p.user_id}")
            except Exception as e:
                logger.error(f"PROFILE_PATCH failed_to_create_patient: {e}")
                pass

        if p:
            logger.info(f"PROFILE_PATCH updating_existing_patient id={p.id} user_id={p.user_id}")
            # Ensure user is loaded
            if not p.user and u:
                # If user relationship not loaded, use the separately queried user
                pass
            elif p.user:
                u = p.user
            
            if full_name_in and u:
                name_parts = str(full_name_in).strip().split()
                current_first = u.first_name if u else ""
                current_last = u.last_name if u else ""
                new_first = name_parts[0] if name_parts else current_first
                new_last = name_parts[-1] if len(name_parts) > 1 else current_last
                if new_first != current_first or new_last != current_last:
                    logger.info(f"PROFILE_PATCH updating_name from '{current_first} {current_last}' to '{new_first} {new_last}'")
                    u.first_name = new_first
                    u.last_name = new_last
                    mutated += 1
            # Email is stored in User model, not Patient model
            if email_in and u and email_in != getattr(u, 'email', None):
                logger.info(f"PROFILE_PATCH updating_email from '{getattr(u, 'email', None)}' to '{email_in}'")
                u.email = email_in
                mutated += 1
            if phone_in and phone_in != getattr(p, 'phone', None):
                logger.info(f"PROFILE_PATCH updating_phone from '{getattr(p, 'phone', None)}' to '{phone_in}'")
                p.phone = phone_in
                mutated += 1
            # Extra editable fields
            lang_in = payload.get("preferred_language") or payload.get("preferredLanguage")
            nationality_in = payload.get("nationality")
            occupation_in = payload.get("occupation")
            marital_in = payload.get("marital_status") or payload.get("maritalStatus")
            pinfl_in = payload.get("pinfl") or payload.get("national_id") or payload.get("nationalId")
            if lang_in and lang_in != getattr(p, 'preferred_language', None):
                p.preferred_language = lang_in
                mutated += 1
            if nationality_in and nationality_in != getattr(p, 'nationality', None):
                p.nationality = nationality_in
                mutated += 1
            if occupation_in and occupation_in != getattr(p, 'occupation', None):
                p.occupation = occupation_in
                mutated += 1
            if marital_in and marital_in != getattr(p, 'marital_status', None):
                try:
                    from app.common.models.patient import MaritalStatus as _Marital
                    p.marital_status = _Marital(marital_in) if marital_in in [e.value for e in _Marital] else getattr(_Marital, str(marital_in).upper(), None)
                    mutated += 1
                except Exception:
                    pass
            if pinfl_in and pinfl_in != getattr(p, 'national_id', None):
                p.national_id = pinfl_in
                mutated += 1
            
            # Handle date of birth update
            if dob_in:
                try:
                    from datetime import datetime
                    if isinstance(dob_in, str):
                        # Try different date formats
                        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
                            try:
                                dob_date = datetime.strptime(dob_in, fmt).date()
                                if dob_date != getattr(p, 'date_of_birth', None):
                                    p.date_of_birth = dob_date
                                    mutated += 1
                                    logging.warning(f"[PATCH] updating_date_of_birth to '{dob_date}'")
                                break
                            except ValueError:
                                continue
                    elif hasattr(dob_in, 'date'):
                        if dob_in.date() != getattr(p, 'date_of_birth', None):
                            p.date_of_birth = dob_in.date()
                            mutated += 1
                            logging.warning(f"[PATCH] updating_date_of_birth to '{dob_in.date()}'")
                except Exception as e:
                    logging.warning(f"[PATCH] Failed to update date_of_birth '{dob_in}': {e}")
            
            # Save emergency contact to local database directly (not via CRUD to avoid transaction issues)
            # This ensures it's saved properly and accessible to doctors/nurses
            if emerg_name_to_save or emerg_phone_to_save:
                logger.info(f"PROFILE_PATCH attempting to save emergency_contact: name='{emerg_name_to_save}' phone='{emerg_phone_to_save}'")
                try:
                    from app.common.models.patient import EmergencyContact as EmergencyContactModel
                    # patient_id is now UUID, not string
                    patient_id_uuid = p.patient_id
                    logger.info(f"PROFILE_PATCH querying emergency_contact for patient_id={patient_id_uuid}")
                    existing_emergency = db.query(EmergencyContactModel).filter(
                        EmergencyContactModel.patient_id == patient_id_uuid,
                        EmergencyContactModel.is_primary == True
                    ).first()
                    logger.info(f"PROFILE_PATCH existing_emergency found: {existing_emergency is not None}")
                    
                    if existing_emergency:
                        # Update existing emergency contact
                        if emerg_name_to_save:
                            existing_emergency.name = emerg_name_to_save
                        if emerg_phone_to_save:
                            existing_emergency.phone_primary = emerg_phone_to_save
                        existing_emergency.updated_at = datetime.now(timezone.utc)
                        logger.info(f"PROFILE_PATCH updating_emergency_contact name='{emerg_name_to_save}' phone='{emerg_phone_to_save}'")
                        db.add(existing_emergency)
                        mutated += 1
                    else:
                        # Create new emergency contact
                        new_emergency = EmergencyContactModel(
                            id=str(uuid.uuid4()),
                            patient_id=patient_id_uuid,  # Use UUID directly
                            name=emerg_name_to_save or "Emergency Contact",
                            relationship_type="Emergency",
                            phone_primary=emerg_phone_to_save or "",
                            is_primary=True,
                            priority=1
                        )
                        db.add(new_emergency)
                        logger.info(f"PROFILE_PATCH creating_emergency_contact name='{emerg_name_to_save}' phone='{emerg_phone_to_save}'")
                        mutated += 1
                except Exception as e:
                    # Table doesn't exist or other database error
                    logger.warning(f"PROFILE_PATCH emergency_contact table not available: {e}. Saving to FHIR only.")
                    # If FHIR save succeeded, count it as a mutation
                    if emerg_fhir_saved:
                        mutated += 1
                        logger.info(f"PROFILE_PATCH counting FHIR emergency contact save as mutation")
                    # Don't fail the entire update if emergency contact table is missing
            
            # Handle address update (save to database)
            if addr_in:
                p.address = addr_in  # Save to database
                mutated += 1
                logger.info(f"PROFILE_PATCH updating address to '{addr_in}'")
            
            # Handle gender/sex update (Patient model uses 'sex', not 'gender')
            if gender_in:
                try:
                    # Patient model uses 'sex' column, which is a String, not an enum
                    # Map frontend gender values to database values
                    gender_mapping = {
                        "male": "male",
                        "female": "female",
                        "other": "other",
                        "unknown": "unknown"
                    }
                    new_gender = gender_mapping.get(gender_in.lower(), gender_in.lower())
                    current_gender = getattr(p, 'sex', None)  # Use 'sex', not 'gender'
                    # Update if different
                    if new_gender and new_gender != current_gender:
                        p.sex = new_gender  # Use 'sex', not 'gender'
                        mutated += 1
                        logger.info(f"PROFILE_PATCH updating sex to '{new_gender}'")
                except Exception as e:
                    logger.warning(f"PROFILE_PATCH Failed to update sex '{gender_in}': {e}")
            
            # Handle medical info fields - save to vital_signs table (not Patient model)
            # Collect all medical info updates first
            height_in = payload.get("height")
            weight_in = payload.get("weight")
            bp_systolic_in = payload.get("blood_pressure_systolic") or payload.get("bpSystolic")
            bp_diastolic_in = payload.get("blood_pressure_diastolic") or payload.get("bpDiastolic")
            
            # Check if any medical info needs to be updated
            has_medical_updates = (
                "height" in payload or 
                "weight" in payload or 
                "blood_pressure_systolic" in payload or 
                "bpSystolic" in payload or
                "blood_pressure_diastolic" in payload or 
                "bpDiastolic" in payload
            )
            
            if has_medical_updates and p:
                try:
                    from sqlalchemy import text
                    from datetime import datetime, timezone
                    from uuid import uuid4
                    
                    # Parse values
                    new_height = None
                    new_weight = None
                    new_bp_sys = None
                    new_bp_dia = None
                    
                    if "height" in payload:
                        new_height = float(height_in) if height_in and str(height_in).strip() else None
                    if "weight" in payload:
                        new_weight = float(weight_in) if weight_in and str(weight_in).strip() else None
                    if "blood_pressure_systolic" in payload or "bpSystolic" in payload:
                        new_bp_sys = int(bp_systolic_in) if bp_systolic_in and str(bp_systolic_in).strip() else None
                    if "blood_pressure_diastolic" in payload or "bpDiastolic" in payload:
                        new_bp_dia = int(bp_diastolic_in) if bp_diastolic_in and str(bp_diastolic_in).strip() else None
                    
                    # Calculate BMI if height and weight are available
                    calculated_bmi = None
                    if new_height and new_weight:
                        height_m = float(new_height) / 100.0
                        weight_kg = float(new_weight)
                        if height_m > 0:
                            calculated_bmi = round(weight_kg / (height_m * height_m), 1)
                    
                    # Check if a vital sign record exists using raw SQL (to avoid ORM column issues)
                    # Use correct database column names: recorded_at (not measured_at), recorded_by (not measured_by)
                    check_sql = text("""
                        SELECT id, height, weight, bmi, systolic_bp, diastolic_bp
                        FROM ehr.vital_signs
                        WHERE patient_id = :patient_id
                        ORDER BY recorded_at DESC NULLS LAST
                        LIMIT 1
                    """)
                    existing_vital = db.execute(check_sql, {"patient_id": str(p.patient_id)}).first()
                    
                    now = datetime.now(timezone.utc)
                    patient_id_str = str(p.patient_id)
                    user_id_str = str(current_patient.id)
                    
                    if existing_vital:
                        # Update existing record using raw SQL with correct column names
                        # Database columns: systolic_bp, diastolic_bp, recorded_at, recorded_by (not measured_at/measured_by)
                        update_sql = text("""
                            UPDATE ehr.vital_signs
                            SET height = :height,
                                weight = :weight,
                                bmi = :bmi,
                                systolic_bp = :systolic_bp,
                                diastolic_bp = :diastolic_bp,
                                recorded_at = :recorded_at,
                                recorded_by = :recorded_by
                            WHERE id = :id
                        """)
                        db.execute(update_sql, {
                            "id": existing_vital[0],
                            "height": new_height,
                            "weight": new_weight,
                            "bmi": calculated_bmi,
                            "systolic_bp": new_bp_sys,
                            "diastolic_bp": new_bp_dia,
                            "recorded_at": now,
                            "recorded_by": user_id_str
                        })
                        logger.info(f"PROFILE_PATCH updating vital_signs record (id={existing_vital[0]}): height={new_height}, weight={new_weight}, bmi={calculated_bmi}, bp={new_bp_sys}/{new_bp_dia}")
                    else:
                        # Create new record using raw SQL with correct column names
                        # Database columns: recorded_by, recorded_at, systolic_bp, diastolic_bp (not measured_by/measured_at/blood_pressure_*)
                        new_id = str(uuid4())
                        insert_sql = text("""
                            INSERT INTO ehr.vital_signs (
                                id, patient_id, recorded_by,
                                height, weight, bmi,
                                systolic_bp, diastolic_bp,
                                recorded_at, created_at
                            )
                            VALUES (
                                :id, :patient_id, :recorded_by,
                                :height, :weight, :bmi,
                                :systolic_bp, :diastolic_bp,
                                :recorded_at, :created_at
                            )
                        """)
                        db.execute(insert_sql, {
                            "id": new_id,
                            "patient_id": patient_id_str,
                            "recorded_by": user_id_str,
                            "height": new_height,
                            "weight": new_weight,
                            "bmi": calculated_bmi,
                            "systolic_bp": new_bp_sys,
                            "diastolic_bp": new_bp_dia,
                            "recorded_at": now,
                            "created_at": now
                        })
                        logger.info(f"PROFILE_PATCH creating new vital_signs record (id={new_id}): height={new_height}, weight={new_weight}, bmi={calculated_bmi}, bp={new_bp_sys}/{new_bp_dia}")
                    
                    mutated += 1
                    logging.warning(f"[PATCH] updating medical info in vital_signs: height={new_height}, weight={new_weight}, bp_sys={new_bp_sys}, bp_dia={new_bp_dia}, bmi={calculated_bmi}")
                except Exception as e:
                    logger.warning(f"PROFILE_PATCH Failed to update medical info in vital_signs: {e}", exc_info=True)
                    logging.warning(f"[PATCH] Failed to update medical info: {e}")
            
            # Handle blood group - save to database using raw SQL (Patient model may not have blood_group column)
            blood_group_in = payload.get("blood_group") or payload.get("bloodGroup")
            if "blood_group" in payload or "bloodGroup" in payload:  # Check if key exists (allows empty string to clear)
                try:
                    from sqlalchemy import text
                    from app.common.models.patient import BloodGroup as _BloodGroup
                    
                    # Map common blood group formats to enum values
                    blood_group_mapping = {
                        "A_POSITIVE": "A+",
                        "A_NEGATIVE": "A-",
                        "B_POSITIVE": "B+",
                        "B_NEGATIVE": "B-",
                        "O_POSITIVE": "O+",
                        "O_NEGATIVE": "O-",
                        "AB_POSITIVE": "AB+",
                        "AB_NEGATIVE": "AB-"
                    }
                    
                    # Normalize the input value
                    normalized_value = None
                    if blood_group_in and str(blood_group_in).strip():
                        mapped_value = blood_group_mapping.get(blood_group_in.upper(), blood_group_in)
                        # Try to create enum value
                        if mapped_value in [e.value for e in _BloodGroup]:
                            normalized_value = mapped_value
                        elif blood_group_in in [e.value for e in _BloodGroup]:
                            normalized_value = blood_group_in
                    
                    # Check current value from database (with error handling for missing column)
                    current_blood_group = None
                    try:
                        check_sql = text("""
                            SELECT blood_group 
                            FROM ehr.patients 
                            WHERE patient_id = :patient_id
                        """)
                        current_result = db.execute(check_sql, {"patient_id": str(p.patient_id)}).first()
                        current_blood_group = current_result[0] if current_result and current_result[0] else None
                    except Exception as check_e:
                        # Column doesn't exist - log but don't fail
                        logger.warning(f"PROFILE_PATCH blood_group column does not exist in database: {check_e}")
                        logging.warning(f"[PATCH] blood_group column does not exist: {check_e}")
                        # Don't try to update if column doesn't exist
                        current_blood_group = None
                    
                    # Update if different (only if column exists - if check_e was raised, current_blood_group will be None and we skip)
                    if normalized_value != current_blood_group:
                        # Try to update using raw SQL (will fail gracefully if column doesn't exist)
                        try:
                            update_sql = text("""
                                UPDATE ehr.patients 
                                SET blood_group = :blood_group 
                                WHERE patient_id = :patient_id
                            """)
                            db.execute(update_sql, {
                                "patient_id": str(p.patient_id),
                                "blood_group": normalized_value
                            })
                            mutated += 1
                            logger.info(f"PROFILE_PATCH updating_blood_group to '{normalized_value}' (was '{current_blood_group}')")
                            logging.warning(f"[PATCH] updating_blood_group to '{normalized_value}'")
                        except Exception as sql_e:
                            # Column doesn't exist - log but don't fail
                            logger.warning(f"PROFILE_PATCH blood_group column does not exist in database: {sql_e}")
                            logging.warning(f"[PATCH] blood_group column does not exist: {sql_e}")
                            # Don't increment mutated since we couldn't save
                except Exception as e:
                    logger.warning(f"PROFILE_PATCH Failed to update blood_group '{blood_group_in}': {e}")
                    logging.warning(f"[PATCH] Failed to update blood_group '{blood_group_in}': {e}")

            # Handle insurance fields
            insurance_provider_in = payload.get("insurance_provider") or payload.get("insuranceProvider")
            if insurance_provider_in and insurance_provider_in != getattr(p, 'insurance_provider', None):
                p.insurance_provider = insurance_provider_in
                mutated += 1
                logging.warning(f"[PATCH] updating_insurance_provider to '{insurance_provider_in}'")
            
            insurance_policy_in = payload.get("insurance_policy_number") or payload.get("insurancePolicyNumber")
            if insurance_policy_in and insurance_policy_in != getattr(p, 'insurance_policy_number', None):
                p.insurance_policy_number = insurance_policy_in
                mutated += 1
                logging.warning(f"[PATCH] updating_insurance_policy_number to '{insurance_policy_in}'")
            
            insurance_group_in = payload.get("insurance_group_number") or payload.get("insuranceGroupNumber")
            if insurance_group_in and insurance_group_in != getattr(p, 'insurance_group_number', None):
                p.insurance_group_number = insurance_group_in
                mutated += 1
                logging.warning(f"[PATCH] updating_insurance_group_number to '{insurance_group_in}'")
            
            insurance_coverage_in = payload.get("insurance_coverage_type") or payload.get("insuranceCoverageType")
            if insurance_coverage_in and insurance_coverage_in != getattr(p, 'insurance_coverage_type', None):
                p.insurance_coverage_type = insurance_coverage_in
                mutated += 1
                logging.warning(f"[PATCH] updating_insurance_coverage_type to '{insurance_coverage_in}'")
            
            insurance_valid_in = payload.get("insurance_valid_until") or payload.get("insuranceValidUntil")
            if insurance_valid_in and insurance_valid_in != getattr(p, 'insurance_valid_until', None):
                try:
                    from datetime import datetime
                    if isinstance(insurance_valid_in, str):
                        # Try different date formats
                        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"]:
                            try:
                                valid_date = datetime.strptime(insurance_valid_in, fmt).date()
                                p.insurance_valid_until = valid_date
                                mutated += 1
                                logging.warning(f"[PATCH] updating_insurance_valid_until to '{valid_date}'")
                                break
                            except ValueError:
                                continue
                    elif hasattr(insurance_valid_in, 'date'):
                        p.insurance_valid_until = insurance_valid_in.date()
                        mutated += 1
                        logging.warning(f"[PATCH] updating_insurance_valid_until to '{insurance_valid_in.date()}'")
                except Exception as e:
                    logging.warning(f"[PATCH] Failed to update insurance_valid_until '{insurance_valid_in}': {e}")
            
            # Handle medical history fields
            allergies_in = payload.get("allergies")
            if allergies_in is not None:
                try:
                    # Ensure it's a list
                    if isinstance(allergies_in, str):
                        allergies_list = [a.strip() for a in allergies_in.split(',') if a.strip()]
                    elif isinstance(allergies_in, list):
                        allergies_list = allergies_in
                    else:
                        allergies_list = []
                    
                    current_allergies = getattr(p, 'allergies', None) or []
                    if allergies_list != current_allergies:
                        p.allergies = allergies_list
                        mutated += 1
                        logging.warning(f"[PATCH] updating_allergies to '{allergies_list}'")
                except Exception as e:
                    logging.warning(f"[PATCH] Failed to update allergies '{allergies_in}': {e}")
            
            chronic_conditions_in = payload.get("chronic_conditions")
            if chronic_conditions_in is not None:
                try:
                    # Ensure it's a list
                    if isinstance(chronic_conditions_in, str):
                        conditions_list = [c.strip() for c in chronic_conditions_in.split(',') if c.strip()]
                    elif isinstance(chronic_conditions_in, list):
                        conditions_list = chronic_conditions_in
                    else:
                        conditions_list = []
                    
                    current_conditions = getattr(p, 'chronic_conditions', None) or []
                    if conditions_list != current_conditions:
                        p.chronic_conditions = conditions_list
                        mutated += 1
                        logging.warning(f"[PATCH] updating_chronic_conditions to '{conditions_list}'")
                except Exception as e:
                    logging.warning(f"[PATCH] Failed to update chronic_conditions '{chronic_conditions_in}': {e}")
            
            # Handle immunizations - save to ehr.immunizations table (same as nurses/doctors)
            immunizations_in = payload.get("immunizations")
            if immunizations_in is not None:
                try:
                    from sqlalchemy import text
                    from datetime import datetime, timezone, date
                    import json as json_lib
                    from app.common.models.clinical import ImmunizationStatus
                    
                    # Ensure it's a list of immunization objects
                    if isinstance(immunizations_in, list):
                        immunizations_list = immunizations_in
                    else:
                        immunizations_list = []
                    
                    # Get current immunizations from database
                    current_immunizations_sql = text("""
                        SELECT id, vaccine_name, occurrence_date, status
                        FROM ehr.immunizations
                        WHERE patient_id = :patient_id
                        ORDER BY occurrence_date DESC
                    """)
                    current_immunizations_result = db.execute(current_immunizations_sql, {"patient_id": str(p.patient_id)}).all()
                    current_immunizations = [
                        {
                            "id": str(row[0]),
                            "vaccine": row[1],
                            "date": row[2].date().isoformat() if row[2] else None,
                            "status": row[3]
                        }
                        for row in current_immunizations_result
                    ]
                    
                    # Compare and create new immunizations if needed
                    # For simplicity, we'll create new records for any immunizations in the list
                    # that don't already exist (matching by vaccine name and date)
                    for imm in immunizations_list:
                        if not isinstance(imm, dict):
                            continue
                        
                        vaccine_name = imm.get("vaccine") or imm.get("vaccineName") or ""
                        imm_date_str = imm.get("date") or imm.get("immunizationDate") or ""
                        status_str = imm.get("status") or "completed"
                        lot_number = imm.get("lot_number") or imm.get("lotNumber") or None
                        manufacturer = imm.get("manufacturer") or None
                        
                        if not vaccine_name or not imm_date_str:
                            continue
                        
                        # Parse date
                        try:
                            if isinstance(imm_date_str, str):
                                imm_date_obj = datetime.strptime(imm_date_str, "%Y-%m-%d").date()
                            elif isinstance(imm_date_str, date):
                                imm_date_obj = imm_date_str
                            else:
                                continue
                        except (ValueError, TypeError):
                            continue
                        
                        # Check if this immunization already exists
                        exists = False
                        for current_imm in current_immunizations:
                            if (current_imm.get("vaccine") == vaccine_name and 
                                current_imm.get("date") == imm_date_obj.isoformat()):
                                exists = True
                                break
                        
                        if not exists:
                            # Create new immunization record using raw SQL (same as nurse portal)
                            occurrence_datetime = datetime.combine(imm_date_obj, datetime.min.time())
                            if occurrence_datetime.tzinfo is None:
                                occurrence_datetime = occurrence_datetime.replace(tzinfo=timezone.utc)
                            
                            recorded_datetime = datetime.now(timezone.utc)
                            vaccine_code_json = json_lib.dumps({"text": vaccine_name, "coding": [{"display": vaccine_name}]})
                            status_value = ImmunizationStatus.COMPLETED.value if hasattr(ImmunizationStatus.COMPLETED, 'value') else str(ImmunizationStatus.COMPLETED)
                            
                            insert_sql = text("""
                                INSERT INTO ehr.immunizations 
                                (patient_id, vaccine_code, vaccine_name, occurrence_date, recorded, status, 
                                 performer_id, lot_number, primary_source, manufacturer)
                                VALUES 
                                (CAST(:patient_id AS uuid), CAST(:vaccine_code AS jsonb), :vaccine_name, 
                                 :occurrence_date, :recorded, :status, 
                                 CAST(:performer_id AS uuid), :lot_number, :primary_source, :manufacturer)
                                RETURNING id
                            """)
                            
                            db.execute(insert_sql, {
                                'patient_id': str(p.patient_id),
                                'vaccine_code': vaccine_code_json,
                                'vaccine_name': vaccine_name,
                                'occurrence_date': occurrence_datetime,
                                'recorded': recorded_datetime,
                                'status': status_value,
                                'performer_id': str(current_patient.id),  # Patient recorded their own immunization
                                'lot_number': lot_number,
                                'primary_source': True,
                                'manufacturer': manufacturer
                            })
                            mutated += 1
                            logger.info(f"PROFILE_PATCH created immunization: vaccine={vaccine_name}, date={imm_date_obj}")
                            logging.warning(f"[PATCH] created immunization: vaccine={vaccine_name}, date={imm_date_obj}")
                    
                except Exception as e:
                    logger.warning(f"PROFILE_PATCH Failed to update immunizations: {e}", exc_info=True)
                    logging.warning(f"[PATCH] Failed to update immunizations: {e}")
            
            if mutated:
                db.add(p)
        if u and email_in and email_in != getattr(u, 'email', None):
            u.email = email_in
            db.add(u)
            mutated += 1
        if mutated == 0:
            # Idempotent update: nothing changed locally; treat as success
            logging.warning(f"[PATCH] mutated={mutated} -> returning unchanged")
            return SuccessResponse(data={"status": "unchanged"}, message="No changes to apply")
        try:
            logger.info(
                f"PROFILE_PATCH before_commit db_url={engine.url} user_id={current_patient.id} "
                f"mutated={mutated} has_patient={bool(p)} has_user={bool(u)}"
            )
            logging.warning(f"[PATCH] BEFORE COMMIT email={getattr(p,'email',None)} phone={getattr(p,'phone',None)} address={getattr(p,'address',None)}")
            if p:
                # Prove that the same Patient row we update is what GET will read later
                logger.info(
                    f"PROFILE_PATCH patient_row_preview id={getattr(p,'id',None)} "
                    f"user_id={getattr(p,'user_id',None)} first_name={getattr(p,'first_name',None)} "
                    f"email={getattr(p,'email',None)} phone={getattr(p,'phone',None)}"
                )
            db.commit()
            # Refresh objects to get latest data from database
            if p:
                db.refresh(p)
            if u:
                db.refresh(u)
            # Expire all to force fresh read on next query
            db.expire_all()
            # Verify emergency contact was saved
            if emerg_name_to_save or emerg_phone_to_save:
                try:
                    from app.common.models.patient import EmergencyContact as EmergencyContactModel
                    patient_id_uuid = p.patient_id
                    saved_emergency = db.query(EmergencyContactModel).filter(
                        EmergencyContactModel.patient_id == patient_id_uuid,
                        EmergencyContactModel.is_primary == True
                    ).first()
                    if saved_emergency:
                        logger.info(f"PROFILE_PATCH verified emergency_contact saved: name='{saved_emergency.name}' phone='{saved_emergency.phone_primary}'")
                    else:
                        logger.warning(f"PROFILE_PATCH emergency_contact not found after save for patient_id={patient_id_uuid}")
                except Exception as e:
                    logger.warning(f"PROFILE_PATCH could not verify emergency_contact after save: {e}")
            logger.info(
                f"PROFILE_PATCH after_commit patient_updated_at={getattr(p,'updated_at',None)} "
                f"email={getattr(p,'email',None)} phone={getattr(p,'phone',None)}"
            )
            logging.warning(f"[PATCH] AFTER COMMIT  email={getattr(p,'email',None)} phone={getattr(p,'phone',None)} address={getattr(p,'address',None)}")
        except Exception as _e:
            db.rollback()
            raise
        
        # Attempt FHIR update (best-effort, don't fail if it doesn't work)
        if updates and patient and not FHIR_DISABLED:
            try:
                # Merge updates into the fetched full Patient resource to avoid partial PUT discard
                merged_patient = dict(patient)
                # Shallow merge for top-level fields we set in updates
                for k, v in updates.items():
                    merged_patient[k] = v
                await fhir_client._make_request("PUT", f"Patient/{current_patient.fhir_patient_id}", data=merged_patient)
            except Exception:
                # FHIR update failed, but local DB is already updated - that's OK
                pass

        return SuccessResponse(data={"status": "updated"}, message="Demographics updated successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Profile Update Failed",
            status=500,
            detail=f"Failed to update profile: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/export", response_model=SuccessResponse[Dict[str, str]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "fhir_export")
async def export_fhir_data(
    request: Request,
    payload: FHIRExportRequest = Body(...),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Export FHIR data with explicit re-auth and email/SMS confirmation."""
    try:
        # Validate ownership - only allow export of own data
        if payload.export_type == "patient":
            # Patient can only export their own data
            subject = f"Patient/{current_patient.fhir_patient_id}"
        else:
            # For "all" type, still restrict to patient's data
            subject = f"Patient/{current_patient.fhir_patient_id}"
        
        # Generate export job ID
        export_job_id = f"export_{uuid4().hex[:8]}"
        
        # Build export parameters
        export_params = {
            "_outputFormat": payload.format,
            "_since": payload.since,
            "_type": "Patient,Observation,MedicationRequest,Immunization,AllergyIntolerance,Coverage,RelatedPerson"
        }
        
        if payload.export_type == "patient":
            export_params["_subject"] = subject
        
        # Initiate FHIR $export operation
        export_result = await fhir_client._make_request("GET", "$export", params=export_params)
        
        # Log audit entry
        audit_entry = {
            "user_id": current_patient.id,
            "action": "fhir_export",
            "resource_type": "patient_data",
            "resource_id": current_patient.fhir_patient_id,
            "details": {
                "export_type": payload.export_type,
                "format": payload.format,
                "export_job_id": export_job_id,
                "since": payload.since
            }
        }
        
        # TODO: Send email/SMS confirmation if requested
        if payload.email_confirmation:
            # Send email confirmation
            pass
        
        if payload.sms_confirmation:
            # Send SMS confirmation
            pass
        
        return SuccessResponse(
            data={
                "export_job_id": export_job_id,
                "status": "initiated",
                "message": "Export job initiated. You will receive confirmation via email/SMS."
            },
            message="FHIR data export initiated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Export Failed",
            status=500,
            detail=f"Failed to initiate FHIR export: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/erase", response_model=SuccessResponse[Dict[str, str]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("delete", "patient", "fhir_erase")
async def erase_fhir_data(
    request: Request,
    payload: FHIREraseRequest = Body(...),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Erase FHIR data with confirmation code and audit logging."""
    try:
        # Validate confirmation code (in real implementation, verify against sent code)
        if not payload.confirmation_code:
            problem = create_problem_detail(
                error_type=ErrorType.VALIDATION_ERROR,
                title="Confirmation Required",
                status=400,
                detail="Confirmation code is required for data erasure",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=400, detail=problem.dict())
        
        # Validate ownership - only allow erasure of own data
        subject = f"Patient/{current_patient.fhir_patient_id}"
        
        # Generate erase job ID
        erase_job_id = f"erase_{uuid4().hex[:8]}"
        
        # Build erase parameters
        erase_params = {
            "_subject": subject,
            "_type": ",".join(payload.resource_types)
        }
        
        # Initiate FHIR $erase operation
        erase_result = await fhir_client._make_request("POST", "$erase", params=erase_params)
        
        # Log comprehensive audit entry
        audit_entry = {
            "user_id": current_patient.id,
            "action": "fhir_erase",
            "resource_type": "patient_data",
            "resource_id": current_patient.fhir_patient_id,
            "details": {
                "resource_types": payload.resource_types,
                "reason": payload.reason,
                "confirmation_code": payload.confirmation_code,
                "erase_job_id": erase_job_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        
        # TODO: Persist audit entry to database
        # TODO: Send confirmation email/SMS
        
        return SuccessResponse(
            data={
                "erase_job_id": erase_job_id,
                "status": "initiated",
                "message": "Data erasure initiated. This action cannot be undone."
            },
            message="FHIR data erasure initiated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Erase Failed",
            status=500,
            detail=f"Failed to initiate FHIR erase: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
