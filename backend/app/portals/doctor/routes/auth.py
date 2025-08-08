"""Doctor portal authentication utilities."""
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.db.session import get_db
from app.common.auth.auth import verify_token, get_current_user
from app.common.models.doctor import Doctor

security = HTTPBearer()

class DoctorUser(BaseModel):
    """Doctor user model for authentication"""
    id: str
    email: str
    doctor_profile: Optional[Dict[str, Any]] = None

async def get_current_doctor(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DoctorUser:
    """Get current doctor user (requires doctor role)"""
    # Get doctor profile
    doctor_profile = db.query(Doctor).filter(
        Doctor.user_id == current_user["user_id"]
    ).first()
    
    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required"
        )
    
    return DoctorUser(
        id=current_user["user_id"],
        email=current_user["email"],
        doctor_profile=doctor_profile.__dict__ if doctor_profile else None
    )

async def get_current_doctor_optional(
    current_user: Optional[dict] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[DoctorUser]:
    """Get current doctor user (optional - for public endpoints)"""
    if not current_user:
        return None
    
    # Get doctor profile
    doctor_profile = db.query(Doctor).filter(
        Doctor.user_id == current_user["user_id"]
    ).first()
    
    if not doctor_profile:
        return None
    
    return DoctorUser(
        id=current_user["user_id"],
        email=current_user["email"],
        doctor_profile=doctor_profile.__dict__ if doctor_profile else None
    )
