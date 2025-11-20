"""Admin portal - settings router
Connected to models and CRUD operations
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.admin import (
    SystemConfig, AdminActivity, ActivityType, SystemAlert, 
    AlertType, AlertSeverity, ReportTemplate, ScheduledReport
)
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.hospital import Hospital
from app.crud.admin import admin as admin_crud
from app.crud.user import user as user_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.auth.auth_service import (
    AuthenticatedUser, require_admin_access, require_permission, Permission
)
from app.common.schemas.user_enhanced import (
    SecuritySettings as SecuritySettingsSchema,
    NotificationSettings as NotificationSettingsSchema,
)
from app.common.schemas.settings_enhanced import (
    GeneralSettings,
    FeatureSettings,
    BackupSettings,
)
from app.services.security_settings_service import security_settings_service
from app.services.tabib_ai_access_service import tabib_ai_access_service
from app.services.notification_access_service import notification_access_service
from app.services.backup_service import backup_service

router = APIRouter(tags=["Admin · Settings"])

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

def check_clinic_access(current_user: AuthenticatedUser, clinic_id: str, db: Session) -> bool:
    """
    Check if the current user has access to the specified clinic.
    
    Args:
        current_user: The authenticated user
        clinic_id: The clinic/hospital ID to check access for
        db: Database session
        
    Returns:
        bool: True if user has access, False otherwise
    """
    # Super admins can access all clinics
    if current_user.role == UserRole.SUPER_ADMIN:
        return True
    
    # Get the user from database to check organization_id
    user = user_crud.get(db=db, id=current_user.user_id)
    if not user:
        return False
    
    # Check if user's organization_id matches the clinic_id
    from uuid import UUID
    clinic_uuid = UUID(clinic_id)
    return user.organization_id == clinic_uuid

def cascade_global_settings_to_clinics(settings_bundle: "SettingsBundle", db: Session, updated_by: str) -> List[str]:
    """
    Cascade global settings changes to all linked clinics.
    
    Args:
        settings_bundle: The global settings bundle to cascade
        db: Database session
        updated_by: User ID who made the changes
        
    Returns:
        List of clinic IDs that were updated
    """
    updated_clinics = []
    
    try:
        # Get all active clinics/hospitals
        clinics = db.query(Hospital).filter(Hospital.is_active == True).all()
        
        for clinic in clinics:
            try:
                clinic_id = str(clinic.id)
                key = CLINIC_SETTINGS_KEY.format(clinic_id=clinic_id)
                
                # Update clinic settings with global settings
                admin_crud.set_config_json(
                    db=db,
                    key=key,
                    value=settings_bundle.dict(),
                    category="settings",
                    is_global=False,
                    organization_id=clinic_id,
                    updated_by=updated_by,
                    description=f"Clinic settings updated from global settings cascade",
                )
                
                updated_clinics.append(clinic_id)
                
            except Exception as clinic_error:
                # Log error but continue with other clinics
                continue
            
        return updated_clinics
        
    except Exception as e:
        # Log error but don't fail the global update
        return updated_clinics

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class SystemConfigResponse(BaseModel):
    id: str = Field(..., description="Configuration ID")
    key: str = Field(..., description="Configuration key")
    value: str = Field(..., description="Configuration value")
    description: Optional[str] = Field(None, description="Configuration description")
    category: str = Field(..., description="Configuration category")
    is_encrypted: bool = Field(False, description="Whether value is encrypted")
    updated_at: str = Field(..., description="Last updated timestamp")
    updated_by: str = Field(..., description="Updated by user ID")

class SystemConfigUpdateRequest(BaseModel):
    value: str = Field(..., description="New configuration value")
    description: Optional[str] = Field(None, description="Updated description")

class SystemAlertResponse(BaseModel):
    id: str = Field(..., description="Alert ID")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    alert_type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity")
    status: str = Field(..., description="Alert status")
    created_at: str = Field(..., description="Created timestamp")
    resolved_at: Optional[str] = Field(None, description="Resolved timestamp")
    resolved_by: Optional[str] = Field(None, description="Resolved by user ID")

class ReportTemplateResponse(BaseModel):
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: str = Field(..., description="Template category")
    is_active: bool = Field(..., description="Whether template is active")
    created_at: str = Field(..., description="Created timestamp")
    created_by: str = Field(..., description="Created by user ID")

# ──────────────────────────────────────────────────────────────────────────────
# Unified Settings Bundle Models
# ──────────────────────────────────────────────────────────────────────────────

class SettingsBundle(BaseModel):
    general: GeneralSettings
    security: SecuritySettingsSchema
    features: FeatureSettings
    notifications: NotificationSettingsSchema
    backup: BackupSettings

# ──────────────────────────────────────────────────────────────────────────────
# System Configuration Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/settings/config", response_model=PaginatedResponse[SystemConfigResponse])
@audit_pii_access("read", "system_config", "config_list")
async def get_system_configs(
    request: Request,
    category: Optional[str] = None,
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db)
):
    """Get system configuration settings with pagination."""
    try:
        # Get configurations using CRUD
        configs = admin_crud.get_system_configs(
            db=db,
            category=category,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        config_responses = []
        for config in configs:
            config_responses.append(SystemConfigResponse(
                id=str(config.id),
                key=config.key,
                value=config.value,
                description=config.description,
                category=config.category,
                is_encrypted=getattr(config, "is_sensitive", False),
                updated_at=config.updated_at.isoformat() if getattr(config, "updated_at", None) else "",
                updated_by=str(getattr(config, "modified_by", "")) if getattr(config, "modified_by", None) else ""
            ))
        
        # Get total count
        total = admin_crud.count_system_configs(db=db, category=category)
        
        return create_paginated_response(
            data=config_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Config Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system configurations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Unified Settings Bundle Endpoints (Global & Clinic-Scoped)
# ──────────────────────────────────────────────────────────────────────────────

def _default_settings_bundle() -> SettingsBundle:
    return SettingsBundle(
        general=GeneralSettings(
            timezone="Asia/Tashkent",
            language="en",
            theme_color="#5ACCC3",
        ),
        security=SecuritySettingsSchema(
            currentPassword="",
            newPassword="",
            confirmPassword="",
            twoFactorEnabled=False,
            loginAlerts=True,
            sessionTimeout="30",
            passwordExpiryDays=90,
            maxFailedAttempts=5,
            lockoutDurationMinutes=15,
            requireStrongPassword=True,
            sessionConcurrencyLimit=3,
        ),
        features=FeatureSettings(tabib_ai_enabled=False, notifications_enabled=True),
        notifications=NotificationSettingsSchema(
            emailNotifications=True,
            smsNotifications=False,
            pushNotifications=True,
            appointmentReminders=True,
            patientMessages=True,
            systemUpdates=True,
            marketingEmails=False,
            reminderTiming="1hour",
            prescriptionReminders=True,
            labResultNotifications=True,
            imagingResultNotifications=True,
            emergencyAlerts=True,
            fhirSyncNotifications=False,
            auditLogNotifications=False,
        ),
        backup=BackupSettings(
            backup_frequency="Weekly",
            data_retention_years=5,
        ),
    )

GLOBAL_SETTINGS_KEY = "admin.settings.global"
CLINIC_SETTINGS_KEY = "admin.settings.clinic.{clinic_id}"

@router.get("/settings/global", response_model=SuccessResponse[SettingsBundle])
@audit_pii_access("read", "system_settings", "settings_global_get")
async def get_global_settings(
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get global (all clinics) settings bundle."""
    try:
        data = admin_crud.get_config_json(db=db, key=GLOBAL_SETTINGS_KEY)
        if data is None:
            settings_bundle = _default_settings_bundle()
        else:
            settings_bundle = SettingsBundle(**data)
        
        return SuccessResponse(data=settings_bundle, message="Global settings retrieved successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Global Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve global settings: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.put("/settings/global", response_model=SuccessResponse[SettingsBundle])
@audit_pii_access("write", "system_settings", "settings_global_update")
async def update_global_settings(
    request: Request,
    payload: SettingsBundle = Body(...),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
    """Update global (all clinics) settings bundle."""
    try:
        updated_by = current_user.user_id  # Use actual authenticated user ID
        
        # Preserve existing logo URL when saving settings
        existing_logo_config = admin_crud.get_config_json(
            db=db,
            key="global_logo_url"
        )
        
        # Persist to config store
        admin_crud.set_config_json(
            db=db,
            key=GLOBAL_SETTINGS_KEY,
            value=payload.dict(),
            category="settings",
            is_global=True,
            updated_by=updated_by,
            description="Global admin settings bundle",
        )
        
        # Restore logo URL if it existed before settings save
        if existing_logo_config and "logo_url" in existing_logo_config:
            admin_crud.set_config_json(
                db=db,
                key="global_logo_url",
                value=existing_logo_config,
                category="global_settings",
                is_global=True,
                updated_by=updated_by,
                description="Global logo URL preserved after settings save",
        )
        
        # Cascade global settings to all linked clinics
        updated_clinics = cascade_global_settings_to_clinics(payload, db, updated_by)
        
        # Apply security settings to all staff members globally
        if hasattr(payload, 'security') and payload.security:
            security_result = security_settings_service.apply_global_security_settings(
                db=db, 
                security_settings=payload.security
            )
        
        # Apply Tabib AI access control to all staff members globally
        if hasattr(payload, 'features') and payload.features:
            tabib_ai_result = tabib_ai_access_service.apply_global_tabib_ai_access(
                db=db,
                enabled=payload.features.tabib_ai_enabled,
                updated_by=updated_by
            )
            if tabib_ai_result['success']:
                print(f"Applied Tabib AI access to {tabib_ai_result['total_updated_staff']} staff members globally")
            else:
                print(f"Warning: Failed to apply Tabib AI access globally: {tabib_ai_result['message']}")
        
        # Apply notification access control to all staff members globally
        if hasattr(payload, 'features') and payload.features:
            notification_result = notification_access_service.apply_global_notification_access(
                db=db,
                enabled=payload.features.notifications_enabled,
                updated_by=updated_by
            )
            if notification_result['success']:
                print(f"Applied notification access to {notification_result['total_updated_staff']} staff members globally")
            else:
                print(f"Warning: Failed to apply notification access globally: {notification_result['message']}")
        
        # Create backup if backup settings are configured
        if hasattr(payload, 'backup') and payload.backup:
            backup_result = backup_service.create_global_backup(
                db=db,
                created_by=updated_by
            )
            if backup_result['success']:
                print(f"Created global backup: {backup_result['message']}")
            else:
                print(f"Warning: Failed to create global backup: {backup_result['message']}")
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=updated_by,  # Use admin_id parameter name
            activity_type=ActivityType.CONFIG_UPDATED,
            description=f"Updated global system settings and cascaded to {len(updated_clinics)} clinics",
            affected_resource_id=None,
            affected_resource_type="system_settings",
        )
        
        message = f"Global settings updated successfully and cascaded to {len(updated_clinics)} clinics"
        return SuccessResponse(data=payload, message=message)
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Global Settings Update Failed",
            status=500,
            detail=f"Failed to update global settings: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/{clinic_id}", response_model=SuccessResponse[SettingsBundle])
@audit_pii_access("read", "clinic_settings", "settings_clinic_get")
async def get_clinic_settings(
    request: Request,
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get clinic-scoped settings bundle."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        key = CLINIC_SETTINGS_KEY.format(clinic_id=clinic_id)
        data = admin_crud.get_config_json(db=db, key=key)
        if data is None:
            settings_bundle = _default_settings_bundle()
        else:
            settings_bundle = SettingsBundle(**data)
        return SuccessResponse(data=settings_bundle, message="Clinic settings retrieved successfully")
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions (like 403 Access Denied) without modification
        raise http_exc
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Clinic Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve clinic settings: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.put("/settings/{clinic_id}", response_model=SuccessResponse[SettingsBundle])
@audit_pii_access("write", "clinic_settings", "settings_clinic_update")
async def update_clinic_settings(
    request: Request,
    clinic_id: str,
    payload: SettingsBundle = Body(...),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
    """Update clinic-scoped settings bundle."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        from uuid import UUID
        clinic_uuid = UUID(clinic_id)
        
        key = CLINIC_SETTINGS_KEY.format(clinic_id=clinic_id)
        admin_crud.set_config_json(
            db=db,
            key=key,
            value=payload.dict(),
            category="settings",
            is_global=False,
            organization_id=clinic_uuid,
            updated_by=current_user.user_id,  # Use actual authenticated user ID
            description=f"Settings bundle for clinic {clinic_id}",
        )
        
        # Apply security settings to clinic staff members
        if hasattr(payload, 'security') and payload.security:
            security_result = security_settings_service.apply_security_settings_to_clinic_staff(
                db=db, 
                clinic_id=clinic_id,
                security_settings=payload.security
            )
            if security_result['success']:
                print(f"Applied security settings to {security_result['updated_count']} staff members in clinic {clinic_id}")
            else:
                print(f"Warning: Failed to apply security settings to clinic {clinic_id}: {security_result['message']}")
        
        # Apply Tabib AI access control to clinic staff members
        if hasattr(payload, 'features') and payload.features:
            tabib_ai_result = tabib_ai_access_service.apply_tabib_ai_access_to_clinic_staff(
                db=db,
                clinic_id=clinic_id,
                enabled=payload.features.tabib_ai_enabled,
                updated_by=current_user.user_id
            )
            if tabib_ai_result['success']:
                print(f"Applied Tabib AI access to {tabib_ai_result['updated_staff_count']} staff members in clinic {clinic_id}")
            else:
                print(f"Warning: Failed to apply Tabib AI access to clinic {clinic_id}: {tabib_ai_result['message']}")
        
        # Apply notification access control to clinic staff members
        if hasattr(payload, 'features') and payload.features:
            notification_result = notification_access_service.apply_notification_access_to_clinic_staff(
                db=db,
                clinic_id=clinic_id,
                enabled=payload.features.notifications_enabled,
                updated_by=current_user.user_id
            )
            if notification_result['success']:
                print(f"Applied notification access to {notification_result['updated_staff_count']} staff members in clinic {clinic_id}")
            else:
                print(f"Warning: Failed to apply notification access to clinic {clinic_id}: {notification_result['message']}")
        
        # Create backup for this clinic if backup settings are configured
        if hasattr(payload, 'backup') and payload.backup:
            backup_result = backup_service.create_clinic_backup(
                db=db,
                clinic_id=clinic_id,
                backup_type="settings_update",
                created_by=current_user.user_id
            )
            if backup_result['success']:
                print(f"Created clinic backup: {backup_result['message']}")
            else:
                print(f"Warning: Failed to create clinic backup: {backup_result['message']}")
        
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,  # Use actual authenticated user ID
            activity_type=ActivityType.CONFIG_UPDATED,
            description=f"Updated clinic settings for clinic {clinic_id}",
            affected_resource_id=clinic_id,
            affected_resource_type="clinic_settings",
        )
        return SuccessResponse(data=payload, message="Clinic settings updated successfully")
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions (like 403 Access Denied) without modification
        raise http_exc
    except Exception as e:
        print(f"DEBUG: Settings update error: {str(e)}")
        import traceback
        traceback.print_exc()
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Clinic Settings Update Failed",
            status=500,
            detail=f"Failed to update clinic settings: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/{clinic_id}/staff-security", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "clinic_staff_security", "staff_security_status")
async def get_clinic_staff_security_status(
    request: Request,
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get security status of all staff members in a clinic."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        security_status = security_settings_service.get_clinic_staff_security_status(
            db=db, 
            clinic_id=clinic_id
        )
        
        if security_status['success']:
            return SuccessResponse(
                data=security_status, 
                message=f"Retrieved security status for {security_status['staff_count']} staff members"
            )
        else:
            problem = create_problem_detail(
                error_type=ErrorType.INTERNAL_ERROR,
                title="Staff Security Status Retrieval Failed",
                status=500,
                detail=security_status['message'],
                trace_id=get_trace_id(),
            )
            raise HTTPException(status_code=500, detail=problem.dict())
            
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Staff Security Status Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve staff security status: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/{clinic_id}/staff-tabib-ai", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "clinic_staff_tabib_ai", "staff_tabib_ai_status")
async def get_clinic_staff_tabib_ai_status(
    request: Request,
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get Tabib AI access status of all staff members in a clinic."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        tabib_ai_status = tabib_ai_access_service.get_staff_tabib_ai_status(
            db=db, 
            clinic_id=clinic_id
        )
        
        return SuccessResponse(data=tabib_ai_status, message="Clinic staff Tabib AI status retrieved successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Staff Tabib AI Status Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve staff Tabib AI status: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/{clinic_id}/staff-notifications", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "clinic_staff_notifications", "staff_notification_status")
async def get_clinic_staff_notification_status(
    request: Request,
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get notification access status of all staff members in a clinic."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        notification_status = notification_access_service.get_staff_notification_status(
            db=db, 
            clinic_id=clinic_id
        )
        
        return SuccessResponse(data=notification_status, message="Clinic staff notification status retrieved successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Staff Notification Status Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve staff notification status: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/settings/backup/global", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("write", "backup", "create_global_backup")
async def create_global_backup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
    """Create a backup for all clinics."""
    try:
        backup_result = backup_service.create_global_backup(
            db=db,
            created_by=current_user.user_id
        )
        
        return SuccessResponse(data=backup_result, message="Global backup created successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Global Backup Creation Failed",
            status=500,
            detail=f"Failed to create global backup: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/settings/backup/{clinic_id}", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("write", "backup", "create_clinic_backup")
async def create_clinic_backup(
    request: Request,
    clinic_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
    """Create a backup for a specific clinic."""
    # Check if user has access to this clinic
    if not check_clinic_access(current_user, clinic_id, db):
        problem = create_problem_detail(
            error_type=ErrorType.ACCESS_DENIED_ERROR,
            title="Access Denied",
            status=403,
            detail=f"User does not have access to clinic {clinic_id}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=403, detail=problem.dict())
    
    try:
        backup_result = backup_service.create_clinic_backup(
            db=db,
            clinic_id=clinic_id,
            backup_type="manual",
            created_by=current_user.user_id
        )
        
        return SuccessResponse(data=backup_result, message="Clinic backup created successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Clinic Backup Creation Failed",
            status=500,
            detail=f"Failed to create clinic backup: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/backup/list", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "backup", "list_backups")
async def list_backups(
    request: Request,
    clinic_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
):
    """Get list of available backups."""
    try:
        backup_list = backup_service.get_backup_list(clinic_id=clinic_id)
        
        return SuccessResponse(data=backup_list, message="Backup list retrieved successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Backup List Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve backup list: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/settings/backup/cleanup", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("write", "backup", "cleanup_backups")
async def cleanup_old_backups(
    request: Request,
    retention_years: int = 5,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
):
    """Clean up old backups based on retention policy."""
    try:
        cleanup_result = backup_service.cleanup_old_backups(retention_years=retention_years)
        
        return SuccessResponse(data=cleanup_result, message="Backup cleanup completed successfully")
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Backup Cleanup Failed",
            status=500,
            detail=f"Failed to cleanup old backups: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/settings/config/{config_key}", response_model=SuccessResponse[SystemConfigResponse])
@audit_pii_access("read", "system_config", "config_detail")
async def get_system_config(
    request: Request,
    config_key: str,
    db: Session = Depends(get_db)
):
    """Get specific system configuration."""
    try:
        config = admin_crud.get_system_config_by_key(db=db, key=config_key)
        
        if not config:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Configuration Not Found",
                status=404,
                detail=f"Configuration '{config_key}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        config_response = SystemConfigResponse(
            id=str(config.id),
            key=config.key,
            value=config.value,
            description=config.description,
            category=config.category,
            is_encrypted=config.is_encrypted,
            updated_at=config.updated_at.isoformat() if config.updated_at else "",
            updated_by=str(config.updated_by) if config.updated_by else ""
        )
        
        return SuccessResponse(
            data=config_response,
            message="System configuration retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Config Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system configuration: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/settings/config/{config_key}", response_model=SuccessResponse[SystemConfigResponse])
@audit_pii_access("write", "system_config", "config_update")
async def update_system_config(
    request: Request,
    config_key: str,
    payload: SystemConfigUpdateRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Update system configuration."""
    try:
        # Update configuration using CRUD
        updated_config = admin_crud.update_system_config(
            db=db,
            key=config_key,
            value=payload.value,
            description=payload.description,
            updated_by=current_user.user_id  # Use actual authenticated user ID
        )
        
        if not updated_config:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Configuration Not Found",
                status=404,
                detail=f"Configuration '{config_key}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        config_response = SystemConfigResponse(
            id=str(updated_config.id),
            key=updated_config.key,
            value=updated_config.value,
            description=updated_config.description,
            category=updated_config.category,
            is_encrypted=updated_config.is_encrypted,
            updated_at=updated_config.updated_at.isoformat() if updated_config.updated_at else "",
            updated_by=str(updated_config.updated_by) if updated_config.updated_by else ""
        )
        
        return SuccessResponse(
            data=config_response,
            message="System configuration updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Config Update Failed",
            status=500,
            detail=f"Failed to update system configuration: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# System Alerts Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/settings/alerts", response_model=PaginatedResponse[SystemAlertResponse])
@audit_pii_access("read", "system_alert", "alerts_list")
async def get_system_alerts(
    request: Request,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db)
):
    """Get system alerts with filtering and pagination."""
    try:
        # Get alerts using CRUD
        alerts = admin_crud.get_system_alerts(
            db=db,
            severity=severity,
            alert_type=alert_type,
            status=status,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        alert_responses = []
        for alert in alerts:
            alert_responses.append(SystemAlertResponse(
                id=str(alert.id),
                title=alert.title,
                message=alert.message,
                alert_type=alert.alert_type.value if alert.alert_type else "",
                severity=alert.severity.value if alert.severity else "",
                status=alert.status,
                created_at=alert.created_at.isoformat() if alert.created_at else "",
                resolved_at=alert.resolved_at.isoformat() if alert.resolved_at else None,
                resolved_by=str(alert.resolved_by) if alert.resolved_by else None
            ))
        
        # Get total count
        total = admin_crud.count_system_alerts(
            db=db,
            severity=severity,
            alert_type=alert_type,
            status=status
        )
        
        return create_paginated_response(
            data=alert_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Alerts Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system alerts: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/settings/alerts/{alert_id}/resolve", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "system_alert", "alert_resolve")
async def resolve_system_alert(
    request: Request,
    alert_id: str,
    db: Session = Depends(get_db)
):
    """Resolve a system alert."""
    try:
        # Resolve alert using CRUD
        resolved = admin_crud.resolve_system_alert(
            db=db,
            alert_id=alert_id,
            resolved_by=current_user.user_id  # Use actual authenticated user ID
        )
        
        if not resolved:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Alert Not Found",
                status=404,
                detail=f"Alert '{alert_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        return SuccessResponse(
            data={"status": "resolved"},
            message="System alert resolved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Alert Resolution Failed",
            status=500,
            detail=f"Failed to resolve system alert: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Report Templates Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/settings/report-templates", response_model=PaginatedResponse[ReportTemplateResponse])
@audit_pii_access("read", "report_template", "templates_list")
async def get_report_templates(
    request: Request,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_db)
):
    """Get report templates with filtering and pagination."""
    try:
        # Get templates using CRUD
        templates = admin_crud.get_report_templates(
            db=db,
            category=category,
            is_active=is_active,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        template_responses = []
        for template in templates:
            template_responses.append(ReportTemplateResponse(
                id=str(template.id),
                name=template.name,
                description=template.description,
                category=template.category,
                is_active=template.is_active,
                created_at=template.created_at.isoformat() if template.created_at else "",
                created_by=str(template.created_by) if template.created_by else ""
            ))
        
        # Get total count
        total = admin_crud.count_report_templates(
            db=db,
            category=category,
            is_active=is_active
        )
        
        return create_paginated_response(
            data=template_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Report Templates Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve report templates: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# System Health Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/settings/health", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "system_health", "health_check")
async def get_system_health(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get system health status."""
    try:
        # Get system health metrics
        health_data = admin_crud.get_system_health(db=db)
        
        return SuccessResponse(
            data=health_data,
            message="System health retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Health Check Failed",
            status=500,
            detail=f"Failed to retrieve system health: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/settings/stats", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "system_stats", "stats_summary")
async def get_system_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get system statistics summary."""
    try:
        # Get system statistics
        stats_data = admin_crud.get_system_stats(db=db)
        
        return SuccessResponse(
            data=stats_data,
            message="System statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
