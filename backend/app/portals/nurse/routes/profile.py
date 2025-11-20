"""Nurse profile routes backing the NurseProfile component."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.schemas.user_enhanced import PasswordChange
from app.portals.nurse.schemas.profile import (
    NurseProfileData,
    NurseProfilePartial,
    NurseProfileEnvelope,
    NurseProfileUpdateRequest,
    NurseProfilePatchRequest,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.common.models.user import User

router = APIRouter(prefix="/profile", tags=["Nurse Profile"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


_PROFILE_DATA = NurseProfileData(
    fullName="Nurse A. Karimova",
    email="a.karimova@fiattib.uz",
    phone="+998 90 123 45 67",
    department="Pediatrics",
    licenseNumber="NR-99871234",
    experience="5 years",
)

_LAST_UPDATED = _utc_now_iso()


def _build_envelope() -> NurseProfileEnvelope:
    return NurseProfileEnvelope(profileData=_PROFILE_DATA.copy(deep=True), lastUpdated=_LAST_UPDATED)


@router.get("", response_model=SuccessResponse[NurseProfileEnvelope])
async def get_profile(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Fetch the nurse user from database
    nurse_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not nurse_user:
        # Fallback to mock data if user not found
        return SuccessResponse(data=_build_envelope(), message="Profile retrieved")
    
    # Build full name
    full_name = f"{nurse_user.first_name} {nurse_user.last_name}"
    if nurse_user.middle_name:
        full_name = f"{nurse_user.first_name} {nurse_user.middle_name} {nurse_user.last_name}"
    
    # Create profile data from database
    profile_data = NurseProfileData(
        fullName=full_name,
        email=nurse_user.email,
        phone=nurse_user.phone or "Not provided",
        department="Nursing",  # Default department for nurses
        licenseNumber="NR-" + str(nurse_user.id)[:8].upper(),  # Generate license number from ID
        experience="Active since " + nurse_user.created_at.strftime("%Y") if nurse_user.created_at else "Not specified",
    )
    
    envelope = NurseProfileEnvelope(
        profileData=profile_data,
        lastUpdated=_utc_now_iso()
    )
    
    return SuccessResponse(data=envelope, message="Profile retrieved")


@router.put("", response_model=SuccessResponse[NurseProfileEnvelope])
async def replace_profile(
    payload: NurseProfileUpdateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    global _PROFILE_DATA, _LAST_UPDATED
    _PROFILE_DATA = payload.profileData.copy(deep=True)
    _LAST_UPDATED = _utc_now_iso()
    return SuccessResponse(data=_build_envelope(), message="Profile updated")


@router.patch("", response_model=SuccessResponse[NurseProfileEnvelope])
async def patch_profile(
    payload: NurseProfilePatchRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the nurse user from database
    nurse_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not nurse_user:
        # Fallback to mock data if user not found
        global _PROFILE_DATA, _LAST_UPDATED
        updates = payload.profileData.dict(exclude_none=True)
        if updates:
            _PROFILE_DATA = _PROFILE_DATA.copy(update=updates)
            _LAST_UPDATED = _utc_now_iso()
        return SuccessResponse(data=_build_envelope(), message="Profile patched")
    
    # Update the user in database
    updates = payload.profileData.dict(exclude_none=True)
    if updates:
        if 'fullName' in updates:
            # Parse full name into first_name, middle_name, last_name
            name_parts = updates['fullName'].split()
            if len(name_parts) >= 2:
                nurse_user.first_name = name_parts[0]
                nurse_user.last_name = name_parts[-1]
                if len(name_parts) > 2:
                    nurse_user.middle_name = ' '.join(name_parts[1:-1])
        if 'email' in updates:
            nurse_user.email = updates['email']
        if 'phone' in updates:
            nurse_user.phone = updates['phone']
        
        # Commit changes to database
        db.commit()
        db.refresh(nurse_user)
    
    # Build response with updated data
    full_name = f"{nurse_user.first_name} {nurse_user.last_name}"
    if nurse_user.middle_name:
        full_name = f"{nurse_user.first_name} {nurse_user.middle_name} {nurse_user.last_name}"
    
    profile_data = NurseProfileData(
        fullName=full_name,
        email=nurse_user.email,
        phone=nurse_user.phone or "Not provided",
        department="Nursing",  # Default department for nurses
        licenseNumber="NR-" + str(nurse_user.id)[:8].upper(),  # Generate license number from ID
        experience="Active since " + nurse_user.created_at.strftime("%Y") if nurse_user.created_at else "Not specified",
    )
    
    envelope = NurseProfileEnvelope(
        profileData=profile_data,
        lastUpdated=_utc_now_iso()
    )
    
    return SuccessResponse(data=envelope, message="Profile patched")


@router.post("/change-password", response_model=SuccessResponse[dict])
async def change_password(
    data: PasswordChange = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db)
):
    """Change nurse password."""
    from app.common.auth.auth_service import AuthService
    
    # Validate input
    if not data.currentPassword:
        raise HTTPException(status_code=400, detail="Current password is required")
    if len(data.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")
    
    # Get the user from database
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not AuthService.verify_password(data.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password_hash = AuthService.get_password_hash(data.newPassword)
    db.commit()
    
    return SuccessResponse(data={"message": "Password updated successfully"}, message="Password updated successfully")
