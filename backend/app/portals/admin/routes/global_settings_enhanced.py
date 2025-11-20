"""Enhanced Admin portal global settings router for consolidated configuration management."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Body, UploadFile, File
from app.common.auth.auth_service import (
    AuthenticatedUser, require_admin_access, require_permission, Permission
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.models.admin import ActivityType

router = APIRouter(prefix="/settings", tags=["Admin · Global Settings"])

from app.portals.admin.schemas.global_settings_enhanced import (
    GlobalSetting,
    GlobalSettings,
    SettingsUpdateRequest,
    SettingCreateRequest,
    SettingUpdateRequest,
    NotificationSettings,
    PaymentSettings,
    FeatureFlags,
    SecuritySettings,
    SystemSettings,
    SettingsSearchRequest,
    SettingsListResponse,
    SettingsStats,
    SettingBulkUpdateRequest,
    SettingBulkUpdateResponse,
    SettingsValidationResult,
    SettingsAuditLog,
)

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

@router.get("/global", response_model=SuccessResponse[GlobalSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "global_settings")
async def get_global_settings(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get global system settings (super_admin only)."""
    try:
        # Only super_admin can access global settings
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get global settings
        settings = await _get_global_settings(db)
        
        return SuccessResponse(
            data=settings,
            message="Global settings retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Global Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve global settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/global", response_model=SuccessResponse[GlobalSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("update", "settings", "global_settings")
async def update_global_settings(
    request: Request,
    settings_update: SettingsUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Update global system settings (super_admin only)."""
    try:
        # Only super_admin can update global settings
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Validate settings update
        validation_result = await _validate_settings_update(settings_update)
        if not validation_result.valid:
            raise HTTPException(
                status_code=400,
                detail=f"Settings validation failed: {', '.join(validation_result.errors)}"
            )
        
        # Update global settings
        updated_settings = await _update_global_settings(settings_update, current_user, db)
        
        return SuccessResponse(
            data=updated_settings,
            message="Global settings updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Global Settings Update Failed",
            status=500,
            detail=f"Failed to update global settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/notifications", response_model=SuccessResponse[NotificationSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "notification_settings")
async def get_notification_settings(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get notification settings."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get notification settings
        settings = await _get_notification_settings(db)
        
        return SuccessResponse(
            data=settings,
            message="Notification settings retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Notification Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve notification settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/notifications", response_model=SuccessResponse[NotificationSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("update", "settings", "notification_settings")
async def update_notification_settings(
    request: Request,
    notification_settings: NotificationSettings,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Update notification settings (super_admin only)."""
    try:
        # Only super_admin can update notification settings
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Update notification settings
        updated_settings = await _update_notification_settings(notification_settings, current_user, db)
        
        return SuccessResponse(
            data=updated_settings,
            message="Notification settings updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Notification Settings Update Failed",
            status=500,
            detail=f"Failed to update notification settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/payments", response_model=SuccessResponse[PaymentSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "payment_settings")
async def get_payment_settings(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get payment settings (super_admin only)."""
    try:
        # Only super_admin can access payment settings
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get payment settings
        settings = await _get_payment_settings(db)
        
        return SuccessResponse(
            data=settings,
            message="Payment settings retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Payment Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve payment settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/payments", response_model=SuccessResponse[PaymentSettings])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("update", "settings", "payment_settings")
async def update_payment_settings(
    request: Request,
    payment_settings: PaymentSettings,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Update payment settings (super_admin only)."""
    try:
        # Only super_admin can update payment settings
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Update payment settings
        updated_settings = await _update_payment_settings(payment_settings, current_user, db)
        
        return SuccessResponse(
            data=updated_settings,
            message="Payment settings updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Payment Settings Update Failed",
            status=500,
            detail=f"Failed to update payment settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/features", response_model=SuccessResponse[FeatureFlags])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "feature_flags")
async def get_feature_flags(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get feature flags."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get feature flags
        flags = await _get_feature_flags(db)
        
        return SuccessResponse(
            data=flags,
            message="Feature flags retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Feature Flags Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve feature flags: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/features", response_model=SuccessResponse[FeatureFlags])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("update", "settings", "feature_flags")
async def update_feature_flags(
    request: Request,
    feature_flags: FeatureFlags,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Update feature flags (super_admin only)."""
    try:
        # Only super_admin can update feature flags
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Update feature flags
        updated_flags = await _update_feature_flags(feature_flags, current_user, db)
        
        return SuccessResponse(
            data=updated_flags,
            message="Feature flags updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Feature Flags Update Failed",
            status=500,
            detail=f"Failed to update feature flags: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/audit", response_model=PaginatedResponse[SettingsAuditLog])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "settings_audit")
async def get_settings_audit_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    section: Optional[str] = Query(None, description="Filter by settings section"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get settings audit logs (super_admin only)."""
    try:
        # Only super_admin can access settings audit logs
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get settings audit logs
        audit_logs = await _get_settings_audit_logs(
            page, size, section, actor_id, start_date, end_date, db
        )
        
        return create_paginated_response(
            data=audit_logs["logs"],
            page=page,
            size=size,
            total=audit_logs["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Settings Audit Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve settings audit logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/validate", response_model=SuccessResponse[SettingsValidationResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "settings", "settings_validation")
async def validate_settings(
    request: Request,
    settings_update: SettingsUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Validate settings without saving."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Validate settings
        validation_result = await _validate_settings_update(settings_update)
        
        return SuccessResponse(
            data=validation_result,
            message="Settings validation completed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Settings Validation Failed",
            status=500,
            detail=f"Failed to validate settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _get_global_settings(db: Session) -> GlobalSettings:
    """Get global settings from database."""
    try:
        # TODO: Implement actual settings retrieval from database
        # This would typically involve querying a settings table
        
        return GlobalSettings(
            notifications=NotificationSettings(),
            payments=PaymentSettings(),
            features=FeatureFlags(),
            security=SecuritySettings(
                password_policy={"min_length": 8, "require_uppercase": True, "require_lowercase": True, "require_numbers": True, "require_symbols": False},
                ip_whitelist=[],
                rate_limiting={"requests_per_minute": 100, "burst_limit": 200}
            ),
            system=SystemSettings(
                allowed_file_types=["pdf", "jpg", "jpeg", "png", "doc", "docx"]
            ),
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
            updated_by="admin"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve global settings: {str(e)}")

async def _update_global_settings(settings_update: SettingsUpdateRequest, current_user: dict, db: Session) -> GlobalSettings:
    """Update global settings in database."""
    try:
        # TODO: Implement actual settings update in database
        # This would typically involve:
        # 1. Updating settings in database
        # 2. Creating audit log entry
        # 3. Notifying other services of changes
        
        # Get current settings
        current_settings = await _get_global_settings(db)
        
        # Update settings
        if settings_update.notifications:
            current_settings.notifications = settings_update.notifications
        if settings_update.payments:
            current_settings.payments = settings_update.payments
        if settings_update.features:
            current_settings.features = settings_update.features
        if settings_update.security:
            current_settings.security = settings_update.security
        if settings_update.system:
            current_settings.system = settings_update.system
        
        # Update metadata
        current_settings.updated_at = datetime.now(timezone.utc).isoformat()
        current_settings.updated_by = current_user.get("user_id", "admin")
        
        return current_settings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update global settings: {str(e)}")

async def _get_notification_settings(db: Session) -> NotificationSettings:
    """Get notification settings from database."""
    try:
        # TODO: Implement actual notification settings retrieval
        return NotificationSettings()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve notification settings: {str(e)}")

async def _update_notification_settings(notification_settings: NotificationSettings, current_user: dict, db: Session) -> NotificationSettings:
    """Update notification settings in database."""
    try:
        # TODO: Implement actual notification settings update
        return notification_settings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update notification settings: {str(e)}")

async def _get_payment_settings(db: Session) -> PaymentSettings:
    """Get payment settings from database."""
    try:
        # TODO: Implement actual payment settings retrieval
        return PaymentSettings()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment settings: {str(e)}")

async def _update_payment_settings(payment_settings: PaymentSettings, current_user: dict, db: Session) -> PaymentSettings:
    """Update payment settings in database."""
    try:
        # TODO: Implement actual payment settings update
        return payment_settings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update payment settings: {str(e)}")

async def _get_feature_flags(db: Session) -> FeatureFlags:
    """Get feature flags from database."""
    try:
        # TODO: Implement actual feature flags retrieval
        return FeatureFlags()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve feature flags: {str(e)}")

async def _update_feature_flags(feature_flags: FeatureFlags, current_user: dict, db: Session) -> FeatureFlags:
    """Update feature flags in database."""
    try:
        # TODO: Implement actual feature flags update
        return feature_flags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update feature flags: {str(e)}")

async def _validate_settings_update(settings_update: SettingsUpdateRequest) -> SettingsValidationResult:
    """Validate settings update."""
    try:
        errors = []
        warnings = []
        
        # Validate notification settings
        if settings_update.notifications:
            if settings_update.notifications.email_notifications and not settings_update.notifications.email_smtp_host:
                errors.append("SMTP host is required when email notifications are enabled")
            
            if settings_update.notifications.sms_notifications and not settings_update.notifications.sms_provider:
                errors.append("SMS provider is required when SMS notifications are enabled")
        
        # Validate payment settings
        if settings_update.payments:
            if settings_update.payments.enable_payments and not settings_update.payments.stripe_secret_key:
                errors.append("Stripe secret key is required when payments are enabled")
            
            if settings_update.payments.currency not in ["USD", "EUR", "UZS", "RUB"]:
                warnings.append(f"Currency {settings_update.payments.currency} may not be supported by all payment providers")
        
        # Validate security settings
        if settings_update.security:
            if settings_update.security.session_timeout < 5 or settings_update.security.session_timeout > 480:
                errors.append("Session timeout must be between 5 and 480 minutes")
            
            if settings_update.security.max_login_attempts < 3 or settings_update.security.max_login_attempts > 10:
                errors.append("Max login attempts must be between 3 and 10")
        
        # Validate system settings
        if settings_update.system:
            if settings_update.system.data_retention_years < 1 or settings_update.system.data_retention_years > 50:
                errors.append("Data retention must be between 1 and 50 years")
            
            if not settings_update.system.theme_color.startswith("#") or len(settings_update.system.theme_color) != 7:
                errors.append("Theme color must be a valid hex color")
        
        return SettingsValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
        
    except Exception as e:
        return SettingsValidationResult(
            valid=False,
            errors=[f"Validation error: {str(e)}"],
            warnings=[]
        )

async def _get_settings_audit_logs(page: int, size: int, section: Optional[str], actor_id: Optional[str], start_date: Optional[str], end_date: Optional[str], db: Session) -> Dict[str, Any]:
    """Get settings audit logs with pagination."""
    try:
        # TODO: Implement actual settings audit log retrieval
        # This would typically involve querying an audit logs table
        
        # Mock audit logs
        audit_logs = [
            SettingsAuditLog(
                id="audit-001",
                actor_id="admin",
                action="update",
                section="notifications",
                changes={"email_notifications": True, "sms_notifications": False},
                timestamp=datetime.now(timezone.utc).isoformat(),
                ip_address="192.168.1.100"
            )
        ]
        
        # Apply filters
        if section:
            audit_logs = [log for log in audit_logs if log.section == section]
        
        if actor_id:
            audit_logs = [log for log in audit_logs if log.actor_id == actor_id]
        
        # Apply pagination
        start = (page - 1) * size
        end = start + size
        paginated_logs = audit_logs[start:end]
        
        return {
            "logs": paginated_logs,
            "total": len(audit_logs)
        }
        
    except Exception:
        return {"logs": [], "total": 0}


# Global Logo Management Endpoints - Temporarily disabled
# TODO: Re-enable these endpoints once the server startup issue is resolved
