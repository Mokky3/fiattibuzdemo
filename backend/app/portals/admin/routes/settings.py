from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
import uuid

# TODO: Import these when created
# from app.db.session import get_db
# from app.common.auth.auth_utils import get_current_admin_user, check_admin_permission
# from app.common.schemas.settings import (
#     SystemSettings,
#     SettingsUpdate,
#     ClinicInfo,
#     AdminActivity
# )
# from app.crud.settings import settings as settings_crud

router = APIRouter()

# Mock clinic data
MOCK_CLINICS = [
    {"id": "clinic1", "name": "Main Hospital"},
    {"id": "clinic2", "name": "Downtown Branch"},
    {"id": "clinic3", "name": "Eastside Clinic"},
    {"id": "clinic4", "name": "West Medical Center"},
    {"id": "clinic5", "name": "North Healthcare Facility"}
]

# Mock settings data structure
MOCK_SETTINGS = {
    "global": {
        "general": {
            "timezone": "Asia/Tashkent",
            "language": "en",
            "theme_color": "#5ACCC3"
        },
        "security": {
            "session_timeout": 30,
            "max_login_attempts": 5,
            "enable_two_factor": False,
            "enable_encryption": True,
            "enable_audit_logs": True
        },
        "features": {
            "ai_module": True
        },
        "notifications": {
            "enable_notifications": True,
            "email_notifications": True,
            "sms_notifications": False
        },
        "backup": {
            "backup_frequency": "Weekly",
            "data_retention_years": 5
        }
    },
    "clinic1": {
        "general": {
            "timezone": "Asia/Tashkent",
            "language": "uz",
            "theme_color": "#4DB6B0"
        },
        "security": {
            "session_timeout": 60,
            "max_login_attempts": 3,
            "enable_two_factor": True,
            "enable_encryption": True,
            "enable_audit_logs": True
        },
        "features": {
            "ai_module": True
        },
        "notifications": {
            "enable_notifications": True,
            "email_notifications": True,
            "sms_notifications": True
        },
        "backup": {
            "backup_frequency": "Daily",
            "data_retention_years": 7
        }
    },
    "clinic2": {
        "general": {
            "timezone": "Asia/Dubai",
            "language": "en",
            "theme_color": "#5ACCC3"
        },
        "security": {
            "session_timeout": 45,
            "max_login_attempts": 5,
            "enable_two_factor": False,
            "enable_encryption": True,
            "enable_audit_logs": False
        },
        "features": {
            "ai_module": False
        },
        "notifications": {
            "enable_notifications": True,
            "email_notifications": True,
            "sms_notifications": False
        },
        "backup": {
            "backup_frequency": "Weekly",
            "data_retention_years": 3
        }
    }
}

@router.get("/admin/clinics")
async def get_clinics(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of available clinics"""
    # TODO: Replace with actual implementation
    # Check if user is HeadAdmin or BranchAdmin
    
    return MOCK_CLINICS

@router.get("/admin/settings/{clinic_id}")
async def get_settings(
    clinic_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get settings for a specific clinic or global settings"""
    # TODO: Replace with actual implementation
    
    # Check if user has permission to view settings for this clinic
    # if clinic_id != "global" and not user_has_access_to_clinic(current_admin, clinic_id):
    #     raise HTTPException(status_code=403, detail="Access denied to this clinic's settings")
    
    # Get settings from mock data
    if clinic_id in MOCK_SETTINGS:
        return MOCK_SETTINGS[clinic_id]
    
    # Return default settings if clinic doesn't have custom settings
    return MOCK_SETTINGS["global"]

@router.put("/admin/settings/{clinic_id}")
async def update_settings(
    clinic_id: str,
    settings_data: dict,  # TODO: Replace with SettingsUpdate schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Update settings for a specific clinic or global settings"""
    # TODO: Replace with actual implementation
    
    # Check permissions
    # if not check_admin_permission(current_admin, "MODIFY_SYSTEM_SETTINGS"):
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Validate settings
    validation_errors = validate_settings(settings_data)
    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": validation_errors}
        )
    
    # Update settings in mock data
    if clinic_id not in MOCK_SETTINGS:
        MOCK_SETTINGS[clinic_id] = {}
    
    MOCK_SETTINGS[clinic_id] = settings_data
    
    # Log the activity
    activity_log = {
        "id": f"activity-{uuid.uuid4().hex[:8]}",
        "user_id": "current_admin_id",  # Would come from current_admin
        "action": f"Updated system settings for {clinic_id}",
        "action_type": "config",
        "details": f"Modified settings: {', '.join(settings_data.keys())}",
        "timestamp": datetime.now().isoformat(),
        "clinic_id": clinic_id
    }
    
    return {
        "message": "Settings updated successfully",
        "settings": settings_data,
        "activity_id": activity_log["id"]
    }

@router.post("/admin/activity")
async def log_admin_activity(
    activity_data: dict,  # TODO: Replace with AdminActivity schema
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Log admin activity"""
    # TODO: Replace with actual implementation
    
    activity = {
        "id": f"activity-{uuid.uuid4().hex[:8]}",
        "user_id": "current_admin_id",  # Would come from current_admin
        "timestamp": datetime.now().isoformat(),
        **activity_data
    }
    
    return {
        "message": "Activity logged successfully",
        "activity_id": activity["id"]
    }

@router.get("/admin/settings/validate")
async def validate_settings_endpoint(
    settings_data: dict,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Validate settings without saving"""
    # TODO: Replace with actual implementation
    
    errors = validate_settings(settings_data)
    
    if errors:
        return {
            "valid": False,
            "errors": errors
        }
    
    return {
        "valid": True,
        "message": "Settings are valid"
    }

@router.get("/admin/settings/defaults")
async def get_default_settings(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get default system settings"""
    # TODO: Replace with actual implementation
    
    return {
        "general": {
            "timezone": "UTC",
            "language": "en",
            "theme_color": "#5ACCC3"
        },
        "security": {
            "session_timeout": 30,
            "max_login_attempts": 5,
            "enable_two_factor": False,
            "enable_encryption": True,
            "enable_audit_logs": True
        },
        "features": {
            "ai_module": True
        },
        "notifications": {
            "enable_notifications": True,
            "email_notifications": True,
            "sms_notifications": False
        },
        "backup": {
            "backup_frequency": "Weekly",
            "data_retention_years": 5
        }
    }

@router.post("/admin/settings/{clinic_id}/reset")
async def reset_settings(
    clinic_id: str,
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Reset clinic settings to defaults"""
    # TODO: Replace with actual implementation
    
    # Check permissions
    # if not check_admin_permission(current_admin, "MODIFY_SYSTEM_SETTINGS"):
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Reset to global settings
    if clinic_id in MOCK_SETTINGS and clinic_id != "global":
        MOCK_SETTINGS[clinic_id] = MOCK_SETTINGS["global"].copy()
    
    return {
        "message": f"Settings reset to defaults for {clinic_id}",
        "settings": MOCK_SETTINGS.get(clinic_id, MOCK_SETTINGS["global"])
    }

@router.get("/admin/settings/timezones")
async def get_supported_timezones(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of supported timezones"""
    
    return [
        {"value": "Asia/Tashkent", "label": "Asia/Tashkent (GMT+5)", "offset": "+05:00"},
        {"value": "Europe/Moscow", "label": "Europe/Moscow (GMT+3)", "offset": "+03:00"},
        {"value": "Asia/Dubai", "label": "Asia/Dubai (GMT+4)", "offset": "+04:00"},
        {"value": "Europe/Istanbul", "label": "Europe/Istanbul (GMT+3)", "offset": "+03:00"},
        {"value": "UTC", "label": "UTC", "offset": "+00:00"},
        {"value": "Asia/Kolkata", "label": "Asia/Kolkata (GMT+5:30)", "offset": "+05:30"},
        {"value": "Asia/Shanghai", "label": "Asia/Shanghai (GMT+8)", "offset": "+08:00"},
        {"value": "Europe/London", "label": "Europe/London (GMT)", "offset": "+00:00"},
        {"value": "America/New_York", "label": "America/New York (GMT-5)", "offset": "-05:00"}
    ]

@router.get("/admin/settings/languages")
async def get_supported_languages(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get list of supported languages"""
    
    return [
        {"value": "en", "label": "English", "native": "English"},
        {"value": "ru", "label": "Russian", "native": "Русский"},
        {"value": "uz", "label": "Uzbek", "native": "O'zbek"},
        {"value": "ar", "label": "Arabic", "native": "العربية"},
        {"value": "tr", "label": "Turkish", "native": "Türkçe"},
        {"value": "fa", "label": "Persian", "native": "فارسی"}
    ]

@router.get("/admin/settings/backup-options")
async def get_backup_options(
    # current_admin: dict = Depends(get_current_admin_user),
    # db: Session = Depends(get_db)
):
    """Get available backup frequency options"""
    
    return [
        {"value": "Hourly", "label": "Every Hour", "description": "Backup data every hour"},
        {"value": "Daily", "label": "Daily", "description": "Backup data once a day at midnight"},
        {"value": "Weekly", "label": "Weekly", "description": "Backup data once a week on Sunday"},
        {"value": "Monthly", "label": "Monthly", "description": "Backup data on the 1st of each month"},
        {"value": "Custom", "label": "Custom Schedule", "description": "Define custom backup schedule"}
    ]

# Helper function to validate settings
def validate_settings(settings: dict) -> dict:
    """Validate settings and return errors"""
    errors = {}
    
    # Validate security settings
    if "security" in settings:
        security = settings["security"]
        
        if "session_timeout" in security:
            timeout = security["session_timeout"]
            if timeout < 5 or timeout > 480:
                errors["session_timeout"] = "Session timeout must be between 5 and 480 minutes"
        
        if "max_login_attempts" in security:
            attempts = security["max_login_attempts"]
            if attempts < 3 or attempts > 10:
                errors["max_login_attempts"] = "Max login attempts must be between 3 and 10"
    
    # Validate backup settings
    if "backup" in settings:
        backup = settings["backup"]
        
        if "data_retention_years" in backup:
            retention = backup["data_retention_years"]
            if retention < 1 or retention > 50:
                errors["data_retention_years"] = "Data retention must be between 1 and 50 years"
    
    # Validate general settings
    if "general" in settings:
        general = settings["general"]
        
        if "theme_color" in general:
            color = general["theme_color"]
            if not color.startswith("#") or len(color) != 7:
                errors["theme_color"] = "Theme color must be a valid hex color (e.g., #5ACCC3)"
    
    return errors