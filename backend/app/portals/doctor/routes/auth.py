"""Doctor portal authentication utilities (centralized auth_service)."""
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_optional,
    require_doctor_access,
)
from app.common.models.doctor import Doctor


class DoctorUser(BaseModel):
    """Doctor user model for route dependencies."""
    id: str
    email: str
    doctor_profile: Optional[Dict[str, Any]] = None


async def get_current_doctor(
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
) -> DoctorUser:
    """Return current doctor with verified doctor role and profile."""
    print(f"DEBUG: get_current_doctor - current_user.user_id = {current_user.user_id} (type: {type(current_user.user_id)})")
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_user.user_id).first()
    print(f"DEBUG: get_current_doctor - doctor_profile = {doctor_profile} (type: {type(doctor_profile)})")
    if not doctor_profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    
    # Safety check for doctor_profile.__dict__
    try:
        doctor_profile_dict = doctor_profile.__dict__ if hasattr(doctor_profile, '__dict__') else None
        print(f"DEBUG: get_current_doctor - doctor_profile.__dict__ = {doctor_profile_dict}")
    except Exception as e:
        print(f"DEBUG: get_current_doctor - Error accessing doctor_profile.__dict__: {e}")
        doctor_profile_dict = None
    
    return DoctorUser(
        id=str(current_user.user_id),
        email=current_user.email,
        doctor_profile=doctor_profile_dict,
    )


async def get_current_doctor_optional(
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> Optional[DoctorUser]:
    """Return doctor context if authenticated and has a doctor profile, else None."""
    if not current_user:
        return None
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_user.user_id).first()
    if not doctor_profile:
        return None
    return DoctorUser(
        id=str(current_user.user_id),
        email=current_user.email,
        doctor_profile=doctor_profile.__dict__ if doctor_profile else None,
    )
