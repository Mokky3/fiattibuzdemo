from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.schemas.user_enhanced import (
    NotificationSettings,
    SecuritySettings,
    WorkingHours,
    LunchBreak,
    AvailabilitySettings,
    AllSettings,
    PasswordChange,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.admin import admin as admin_crud

router = APIRouter(prefix="/settings", tags=["Doctor · Settings"])

# Storage keys per user
_DEF_KEY = lambda user_id: f"doctor.settings.{user_id}"

# ─── All Settings (for frontend bulk operations) ───────────────
@router.get("", response_model=SuccessResponse[AllSettings])
async def get_all_settings(current: DoctorUser = Depends(get_current_doctor), db: Session = Depends(get_db)):
    """Get all settings at once from SystemConfig JSON."""
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    data = AllSettings(
        notifications=NotificationSettings(**bundle.get("notifications", {})),
        security=SecuritySettings(**bundle.get("security", {})),
        availability=AvailabilitySettings(**bundle.get("availability", {}))
    )
    return SuccessResponse(data=data, message="Settings retrieved")

@router.put("", response_model=SuccessResponse[AllSettings])
async def update_all_settings(
    data: AllSettings = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Update all settings at once to SystemConfig JSON."""
    bundle = {
        "notifications": data.notifications.dict(),
        "security": data.security.dict(),
        "availability": data.availability.dict(),
    }
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(data=data, message="Settings updated")

# ─── Notification prefs ─────────────────────────────────────────
@router.get("/notifications", response_model=SuccessResponse[NotificationSettings])
async def get_notifications(current: DoctorUser = Depends(get_current_doctor), db: Session = Depends(get_db)):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    notif = NotificationSettings(**bundle.get("notifications", {}))
    return SuccessResponse(data=notif, message="Notifications retrieved")

@router.put("/notifications", response_model=SuccessResponse[NotificationSettings])
async def update_notifications(
    data: NotificationSettings = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    bundle["notifications"] = data.dict()
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(data=data, message="Notifications updated")

# ─── Security ───────────────────────────────────────────────────
@router.get("/security", response_model=SuccessResponse[SecuritySettings])
async def get_security(current: DoctorUser = Depends(get_current_doctor), db: Session = Depends(get_db)):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    sec = SecuritySettings(**bundle.get("security", {}))
    return SuccessResponse(data=sec, message="Security retrieved")

@router.put("/security", response_model=SuccessResponse[SecuritySettings])
async def update_security(
    data: SecuritySettings = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    bundle["security"] = data.dict()
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(data=data, message="Security updated")

@router.post("/change-password", response_model=SuccessResponse[Dict[str, str]])
async def change_password(
    data: PasswordChange = Body(...),
    current_user: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    from app.common.auth.auth_service import AuthService
    from app.common.models.user import User
    
    # Validate input
    if not data.currentPassword:
        raise HTTPException(status_code=400, detail="Current password is required")
    if len(data.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")
    
    # Get the user from database
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not AuthService.verify_password(data.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password_hash = AuthService.get_password_hash(data.newPassword)
    db.commit()
    
    return SuccessResponse(data={"message": "Password updated successfully"}, message="Password updated successfully")

@router.post("/toggle-2fa", response_model=SuccessResponse[Dict[str, bool]])
async def toggle_two_factor(
    data: dict = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    enabled = data.get("enabled", False)
    sec = SecuritySettings(**bundle.get("security", {}))
    sec.twoFactorEnabled = enabled
    bundle["security"] = sec.dict()
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(data={"twoFactorEnabled": enabled}, message="Two-factor updated")

# ─── Availability ───────────────────────────────────────────────
@router.get("/availability", response_model=SuccessResponse[AvailabilitySettings])
async def get_availability(current: DoctorUser = Depends(get_current_doctor), db: Session = Depends(get_db)):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    avail = AvailabilitySettings(**bundle.get("availability", {}))
    return SuccessResponse(data=avail, message="Availability retrieved")

@router.put("/availability", response_model=SuccessResponse[AvailabilitySettings])
async def update_availability(
    data: AvailabilitySettings = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    bundle["availability"] = data.dict()
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(data=data, message="Availability updated")

# ─── Utility endpoints ──────────────────────────────────────────
@router.post("/reset-to-defaults", response_model=SuccessResponse[AllSettings])
async def reset_to_defaults(
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = {
        "notifications": NotificationSettings().dict(),
        "security": SecuritySettings().dict(),
        "availability": AvailabilitySettings().dict(),
    }
    admin_crud.set_config_json(db=db, key=_DEF_KEY(current.id), value=bundle)
    return SuccessResponse(
        data=AllSettings(
            notifications=NotificationSettings(**bundle["notifications"]),
            security=SecuritySettings(**bundle["security"]),
            availability=AvailabilitySettings(**bundle["availability"])
        ),
        message="Defaults restored"
    )

@router.get("/export", response_model=SuccessResponse[Dict[str, Dict]])
async def export_settings(
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    bundle = admin_crud.get_config_json(db=db, key=_DEF_KEY(current.id)) or {}
    return SuccessResponse(
        data={
            "settings": bundle
        },
        message="Settings exported"
    )