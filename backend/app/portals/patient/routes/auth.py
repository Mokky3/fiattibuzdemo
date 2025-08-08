"""Patient portal authentication utilities."""
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.db.session import get_db
from app.common.auth.auth import verify_token, get_current_user
from app.common.models.patient import Patient

security = HTTPBearer()

class PatientUser(BaseModel):
    """Patient user model for authentication"""
    id: str
    email: str
    patient_profile: Optional[Dict[str, Any]] = None

async def get_current_patient(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PatientUser:
    """Get current patient user (requires patient role)"""
    # Get patient profile
    patient_profile = db.query(Patient).filter(
        Patient.user_id == current_user["user_id"]
    ).first()
    
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required"
        )
    
    return PatientUser(
        id=current_user["user_id"],
        email=current_user["email"],
        patient_profile=patient_profile.__dict__ if patient_profile else None
    )

async def get_current_patient_optional(
    current_user: Optional[dict] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[PatientUser]:
    """Get current patient user (optional - for public endpoints)"""
    if not current_user:
        return None
    
    # Get patient profile
    patient_profile = db.query(Patient).filter(
        Patient.user_id == current_user["user_id"]
    ).first()
    
    if not patient_profile:
        return None
    
    return PatientUser(
        id=current_user["user_id"],
        email=current_user["email"],
        patient_profile=patient_profile.__dict__ if patient_profile else None
    )
