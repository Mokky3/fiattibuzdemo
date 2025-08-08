from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel
from typing import List
from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor/settings", tags=["Doctor · Settings"])

# ─── Models matching frontend exactly ──────────────────────────
class Notifications(BaseModel):
    emailNotifications: bool
    smsNotifications: bool
    appointmentReminders: bool
    patientMessages: bool
    systemUpdates: bool
    marketingEmails: bool
    reminderTiming: str         # e.g. "1hour"

class Security(BaseModel):
    currentPassword: str = ""
    newPassword: str = ""
    confirmPassword: str = ""
    twoFactorEnabled: bool
    loginAlerts: bool
    sessionTimeout: str         # minutes as string: "15" | "30" | …

class WorkingHours(BaseModel):
    start: str                  # "09:00"
    end: str                    # "17:00"

class LunchBreak(BaseModel):
    enabled: bool
    start: str
    end: str

class Availability(BaseModel):
    workingDays: List[str]      # ["monday", "tuesday", …]
    workingHours: WorkingHours
    lunchBreak: LunchBreak
    consultationDuration: str   # "30"
    bufferTime: str             # "10"

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str

class AllSettings(BaseModel):
    """Combined settings model for bulk save"""
    notifications: Notifications
    security: Security
    availability: Availability

# ─── In-memory store (swap for DB later) ────────────────────────
_NOTIF = Notifications(
    emailNotifications=True, 
    smsNotifications=False,
    appointmentReminders=True, 
    patientMessages=True,
    systemUpdates=True, 
    marketingEmails=False,
    reminderTiming="1hour",
)

_SEC = Security(
    twoFactorEnabled=False, 
    loginAlerts=True, 
    sessionTimeout="30"
)

_AVAIL = Availability(
    workingDays=["monday", "tuesday", "wednesday", "thursday", "friday"],
    workingHours=WorkingHours(start="09:00", end="17:00"),
    lunchBreak=LunchBreak(enabled=True, start="12:00", end="13:00"),
    consultationDuration="30",
    bufferTime="10",
)

# ─── All Settings (for frontend bulk operations) ───────────────
@router.get("", response_model=AllSettings)
async def get_all_settings(_: DoctorUser = Depends(get_current_doctor)):
    """Get all settings at once"""
    return AllSettings(
        notifications=_NOTIF,
        security=_SEC,
        availability=_AVAIL
    )

@router.put("", response_model=AllSettings)
async def update_all_settings(
    data: AllSettings = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Update all settings at once"""
    global _NOTIF, _SEC, _AVAIL
    _NOTIF = data.notifications
    _SEC = data.security
    _AVAIL = data.availability
    return data

# ─── Notification prefs ─────────────────────────────────────────
@router.get("/notifications", response_model=Notifications)
async def get_notifications(_: DoctorUser = Depends(get_current_doctor)):
    return _NOTIF

@router.put("/notifications", response_model=Notifications)
async def update_notifications(
    data: Notifications = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    global _NOTIF
    _NOTIF = data
    return _NOTIF

# ─── Security ───────────────────────────────────────────────────
@router.get("/security", response_model=Security)
async def get_security(_: DoctorUser = Depends(get_current_doctor)):
    return _SEC

@router.put("/security", response_model=Security)
async def update_security(
    data: Security = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    global _SEC
    _SEC = data
    return _SEC

@router.post("/change-password")
async def change_password(
    data: PasswordChange = Body(...),
    current_user: DoctorUser = Depends(get_current_doctor),
):
    """Change user password"""
    
    # Validate current password (in real implementation, check against database)
    if not data.currentPassword:
        raise HTTPException(status_code=400, detail="Current password is required")
    
    # Validate new password
    if len(data.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
    
    # Validate password confirmation
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")
    
    # In real implementation:
    # 1. Verify current password against database
    # 2. Hash new password
    # 3. Update database
    # 4. Possibly invalidate existing sessions
    
    return {"message": "Password updated successfully"}

@router.post("/toggle-2fa")
async def toggle_two_factor(
    data: dict = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Enable/disable two-factor authentication"""
    global _SEC
    
    enabled = data.get("enabled", False)
    _SEC.twoFactorEnabled = enabled
    
    return {
        "message": f"Two-factor authentication {'enabled' if enabled else 'disabled'}",
        "twoFactorEnabled": enabled
    }

# ─── Availability ───────────────────────────────────────────────
@router.get("/availability", response_model=Availability)
async def get_availability(_: DoctorUser = Depends(get_current_doctor)):
    return _AVAIL

@router.put("/availability", response_model=Availability)
async def update_availability(
    data: Availability = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    global _AVAIL
    _AVAIL = data
    return _AVAIL

# ─── Utility endpoints ──────────────────────────────────────────
@router.post("/reset-to-defaults")
async def reset_to_defaults(
    _: DoctorUser = Depends(get_current_doctor),
):
    """Reset all settings to default values"""
    global _NOTIF, _SEC, _AVAIL
    
    _NOTIF = Notifications(
        emailNotifications=True, 
        smsNotifications=False,
        appointmentReminders=True, 
        patientMessages=True,
        systemUpdates=True, 
        marketingEmails=False,
        reminderTiming="1hour",
    )
    
    _SEC = Security(
        twoFactorEnabled=False, 
        loginAlerts=True, 
        sessionTimeout="30"
    )
    
    _AVAIL = Availability(
        workingDays=["monday", "tuesday", "wednesday", "thursday", "friday"],
        workingHours=WorkingHours(start="09:00", end="17:00"),
        lunchBreak=LunchBreak(enabled=True, start="12:00", end="13:00"),
        consultationDuration="30",
        bufferTime="10",
    )
    
    return {"message": "Settings reset to defaults successfully"}

@router.get("/export")
async def export_settings(
    _: DoctorUser = Depends(get_current_doctor),
):
    """Export all settings as JSON"""
    return {
        "export_date": "2024-07-13",
        "settings": {
            "notifications": _NOTIF.dict(),
            "security": {
                "twoFactorEnabled": _SEC.twoFactorEnabled,
                "loginAlerts": _SEC.loginAlerts,
                "sessionTimeout": _SEC.sessionTimeout
            },
            "availability": _AVAIL.dict()
        }
    }