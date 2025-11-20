"""Enhanced Patient portal authentication using centralized auth_service."""
from typing import Optional, Dict, Any
import logging

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_optional,
    require_patient_access,
)
from app.common.models.patient import Patient
from sqlalchemy.orm import joinedload
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import ProblemDetail, ErrorType, create_problem_detail
from app.common.utils.tracing import get_trace_id

class PatientUser(BaseModel):
    """Patient user model for route dependencies."""
    id: str
    email: str
    patient_id: str
    fhir_patient_id: str
    patient_profile: Optional[Dict[str, Any]] = None
    full_name: Optional[str] = None

async def get_current_patient(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
) -> PatientUser:
    """Get current patient user with tightened ownership validation."""
    try:
        # Debug logging
        logging.warning(f"[AUTH] get_current_patient - current_user.user_id: {current_user.user_id}")
        logging.warning(f"[AUTH] get_current_patient - current_user.email: {current_user.email}")
        logging.warning(f"[AUTH] get_current_patient - current_user.role: {current_user.role}")
        
        # Get patient profile with user relationship eagerly loaded
        patient_profile = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.user_id == current_user.user_id).first()
        logging.warning(f"[AUTH] get_current_patient - patient_profile found: {patient_profile is not None}")
        if patient_profile:
            logging.warning(f"[AUTH] get_current_patient - patient_profile.user_id: {patient_profile.user_id}")
        
        if not patient_profile:
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Required",
                status=403,
                detail="User does not have patient profile",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Extract patient name from User model (Patient doesn't have first_name/last_name)
        full_name = None
        if patient_profile.user and patient_profile.user.first_name and patient_profile.user.last_name:
            full_name = f"{patient_profile.user.first_name} {patient_profile.user.last_name}"
        elif patient_profile.user and patient_profile.user.full_name:
            full_name = patient_profile.user.full_name
        
        # Use patient_id directly (it's the primary key column name)
        # SQLAlchemy allows accessing primary key via .id, but let's use the actual column name
        patient_id_value = getattr(patient_profile, 'patient_id', None) or getattr(patient_profile, 'id', None)
        
        return PatientUser(
            id=current_user.user_id,
            email=current_user.email,
            patient_id=str(patient_id_value),
            fhir_patient_id=str(patient_id_value),  # Use patient_id as FHIR ID since Patient model doesn't have fhir_patient_id
            patient_profile=patient_profile.__dict__ if patient_profile else None,
            full_name=full_name,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Authentication Failed",
            status=500,
            detail=f"Failed to authenticate patient: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

async def get_current_patient_optional(
    request: Request,
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Optional[PatientUser]:
    """Get current patient user (optional - for public endpoints)."""
    if not current_user:
        return None
    
    try:
        # Get patient profile with user relationship eagerly loaded
        patient_profile = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.user_id == current_user.user_id).first()
        
        if not patient_profile:
            return None
        
        # Extract patient name from User model (Patient doesn't have first_name/last_name)
        full_name = None
        if patient_profile.user and patient_profile.user.first_name and patient_profile.user.last_name:
            full_name = f"{patient_profile.user.first_name} {patient_profile.user.last_name}"
        elif patient_profile.user and patient_profile.user.full_name:
            full_name = patient_profile.user.full_name
        
        # Use patient_id directly (it's the primary key column name)
        patient_id_value = getattr(patient_profile, 'patient_id', None) or getattr(patient_profile, 'id', None)
        
        return PatientUser(
            id=current_user.user_id,
            email=current_user.email,
            patient_id=str(patient_id_value),
            fhir_patient_id=str(patient_id_value),  # Use patient_id as FHIR ID since Patient model doesn't have fhir_patient_id
            patient_profile=patient_profile.__dict__ if patient_profile else None,
            full_name=full_name,
        )
        
    except Exception:
        return None

# Note: Do not redefine require_patient_access here; import and call the
# dependency from app.common.auth.auth_service as require_patient_access().

def validate_patient_ownership(patient_id: str, current_patient: PatientUser) -> bool:
    """Validate that the current patient owns the requested resource."""
    return current_patient.patient_id == patient_id or current_patient.fhir_patient_id == patient_id

def validate_fhir_subject(fhir_resource: Dict[str, Any], current_patient: PatientUser) -> bool:
    """Validate that FHIR resource subject matches current patient."""
    subject_ref = fhir_resource.get("subject", {}).get("reference", "")
    expected_ref = f"Patient/{current_patient.fhir_patient_id}"
    return subject_ref == expected_ref
