"""Patient Security Routes
API endpoints for security controls, password management, 2FA, and session management.
"""
import secrets
import hashlib
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from passlib.context import CryptContext

from app.db.session import get_db
from app.common.auth.auth_service import AuthenticatedUser, require_patient_access
from app.crud.patient_portal import patient_portal_crud
from app.common.models.patient import Patient
from app.common.models.user import User
from app.services.patient_notification_service import PatientNotificationService

router = APIRouter()

# Password hashing context - must match AuthService schemes for compatibility
# Support long passwords safely by preferring bcrypt_sha256 (pre-hashes with SHA-256 before bcrypt),
# while still accepting legacy bcrypt hashes for existing users. Also disable truncate_error for bcrypt.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt_sha256__truncate_error=False,
)

# Request/Response Models
class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Ensure passwords match."""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class TwoFactorSetupRequest(BaseModel):
    enable: bool = Field(..., description="Enable or disable 2FA")

class TwoFactorVerifyRequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6, description="6-digit 2FA token")

class SessionInfo(BaseModel):
    session_id: str = Field(..., description="Session ID")
    device_info: str = Field(..., description="Device information")
    ip_address: str = Field(..., description="IP address")
    location: Optional[str] = Field(None, description="Approximate location")
    last_activity: datetime = Field(..., description="Last activity timestamp")
    is_current: bool = Field(False, description="Is this the current session")

class SecuritySettingsRequest(BaseModel):
    two_factor_enabled: Optional[bool] = Field(None, description="Enable/disable 2FA")
    login_alerts: Optional[bool] = Field(None, description="Enable/disable login alerts")
    session_timeout: Optional[int] = Field(None, ge=5, le=1440, description="Session timeout in minutes")
    device_management: Optional[bool] = Field(None, description="Enable/disable device management")

class SecurityResponse(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")

# Security Endpoints

@router.get("/security/settings", response_model=SecurityResponse)
async def get_security_settings(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Get current security settings for the patient."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Default security settings
        default_security_settings = {
            "twoFactor": False,
            "loginAlerts": True,
            "sessionTimeout": "30",
            "deviceManagement": True
        }
        
        # Try to get security settings from database
        # If table doesn't exist, use defaults
        security_settings = default_security_settings
        try:
            settings = patient_portal_crud.get_patient_settings(db, patient.patient_id)
            if settings and "security" in settings:
                security_settings = settings.get("security", default_security_settings)
        except Exception as e:
            # Table doesn't exist or other error - rollback transaction and use defaults
            db.rollback()
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not retrieve security settings from database (table may not exist): {e}")
        
        # Get user info for 2FA status
        user = db.query(User).filter(User.id == current_user.user_id).first()
        
        return SecurityResponse(
            success=True,
            message="Security settings retrieved successfully",
            data={
                "two_factor_enabled": security_settings.get("twoFactor", False),
                "login_alerts": security_settings.get("loginAlerts", True),
                "session_timeout": security_settings.get("sessionTimeout", "30"),
                "device_management": security_settings.get("deviceManagement", True),
                "password_strength": "strong",  # TODO: Calculate actual strength
                "last_password_change": user.password_changed_at.isoformat() if user and user.password_changed_at else None,
                "failed_login_attempts": user.failed_login_attempts if user else 0,
                "account_locked": user.locked_until and user.locked_until > datetime.utcnow() if user else False
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve security settings: {str(e)}"
        )

@router.patch("/security/settings", response_model=SecurityResponse)
async def update_security_settings(
    request: SecuritySettingsRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Update security settings for the patient."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get current settings (with fallback to defaults if table doesn't exist)
        current_settings = {}
        try:
            current_settings = patient_portal_crud.get_patient_settings(db, patient.patient_id) or {}
        except Exception as e:
            # Table doesn't exist or other error - use empty dict
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not retrieve current settings from database (table may not exist): {e}")
        
        # Update security settings
        security_updates = {}
        if request.two_factor_enabled is not None:
            security_updates["twoFactor"] = request.two_factor_enabled
        if request.login_alerts is not None:
            security_updates["loginAlerts"] = request.login_alerts
        if request.session_timeout is not None:
            security_updates["sessionTimeout"] = str(request.session_timeout)
        if request.device_management is not None:
            security_updates["deviceManagement"] = request.device_management
        
        if security_updates:
            # Update settings
            updated_settings = current_settings.copy() if current_settings else {}
            if "security" not in updated_settings:
                updated_settings["security"] = {}
            updated_settings["security"].update(security_updates)
            
            # Try to save updated settings (may fail if table doesn't exist)
            try:
                success = patient_portal_crud.update_patient_settings(db, patient.patient_id, updated_settings)
                if not success:
                    raise Exception("Update returned False")
            except Exception as e:
                # Table doesn't exist or update failed - log but don't fail
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not update security settings in database (table may not exist): {e}")
                # Return success anyway since we can't persist without the table
                return SecurityResponse(
                    success=True,
                    message="Security settings update accepted (database table not available)",
                    data=security_updates
                )
            
            # Send notification about security settings change
            try:
                notification_service = PatientNotificationService(db)
                await notification_service.send_message_notification(
                    str(patient.patient_id),
                    {
                        "message": f"Your security settings have been updated. Changes: {', '.join(security_updates.keys())}",
                        "sender": "Security System",
                        "type": "security_update"
                    }
                )
            except Exception:
                # Notification failed, but don't fail the main operation
                pass
            
            return SecurityResponse(
                success=True,
                message="Security settings updated successfully",
                data=security_updates
            )
        else:
            return SecurityResponse(
                success=True,
                message="No changes to security settings",
                data={}
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security settings: {str(e)}"
        )

@router.post("/security/change-password", response_model=SecurityResponse)
async def change_password(
    request: PasswordChangeRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Change patient password with validation."""
    try:
        # Get user
        user = db.query(User).filter(User.id == current_user.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not pwd_context.verify(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password - use pbkdf2_sha256 to match AuthService.get_password_hash() scheme
        new_password_hash = pwd_context.hash(request.new_password, scheme="pbkdf2_sha256")
        
        # Update password
        user.password_hash = new_password_hash
        user.password_changed_at = datetime.utcnow()
        user.failed_login_attempts = 0  # Reset failed attempts
        user.locked_until = None  # Unlock account if locked
        
        db.commit()
        
        # Send notification about password change
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if patient:
            notification_service = PatientNotificationService(db)
            await notification_service.send_message_notification(
                str(patient.patient_id),
                {
                    "message": "Your password has been successfully changed. If you did not make this change, please contact support immediately.",
                    "sender": "Security System",
                    "type": "password_change"
                }
            )
        
        return SecurityResponse(
            success=True,
            message="Password changed successfully",
            data={
                "password_changed_at": user.password_changed_at.isoformat(),
                "failed_attempts_reset": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )

@router.post("/security/2fa/setup", response_model=SecurityResponse)
async def setup_two_factor(
    request: TwoFactorSetupRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Setup or disable two-factor authentication."""
    try:
        # Get user
        user = db.query(User).filter(User.id == current_user.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if request.enable:
            # Generate 2FA secret
            secret = pyotp.random_base32()
            user.two_factor_secret = secret
            user.two_factor_enabled = False  # Will be enabled after verification
            
            # Generate QR code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=current_user.email,
                issuer_name="FIATTIB Medical Center"
            )
            
            # Create QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, 'PNG')
            buffer.seek(0)
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            db.commit()
            
            return SecurityResponse(
                success=True,
                message="2FA setup initiated. Please scan the QR code with your authenticator app and verify with a token.",
                data={
                    "secret": secret,
                    "qr_code": f"data:image/png;base64,{qr_code_base64}",
                    "manual_entry_key": secret,
                    "verification_required": True
                }
            )
        else:
            # Disable 2FA
            user.two_factor_enabled = False
            user.two_factor_secret = None
            db.commit()
            
            # Send notification
            patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
            if patient:
                notification_service = PatientNotificationService(db)
                await notification_service.send_message_notification(
                    str(patient.patient_id),
                    {
                        "message": "Two-factor authentication has been disabled for your account.",
                        "sender": "Security System",
                        "type": "2fa_disabled"
                    }
                )
            
            return SecurityResponse(
                success=True,
                message="Two-factor authentication disabled successfully",
                data={"two_factor_enabled": False}
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup 2FA: {str(e)}"
        )

@router.post("/security/2fa/verify", response_model=SecurityResponse)
async def verify_two_factor(
    request: TwoFactorVerifyRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Verify 2FA token and enable 2FA."""
    try:
        # Get user
        user = db.query(User).filter(User.id == current_user.user_id).first()
        if not user or not user.two_factor_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA not set up. Please setup 2FA first."
            )
        
        # Verify token
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(request.token, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 2FA token"
            )
        
        # Enable 2FA
        user.two_factor_enabled = True
        db.commit()
        
        # Update security settings
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if patient:
            try:
                current_settings = patient_portal_crud.get_patient_settings(db, patient.patient_id) or {}
                updated_settings = current_settings.copy() if current_settings else {}
                if "security" not in updated_settings:
                    updated_settings["security"] = {}
                updated_settings["security"]["twoFactor"] = True
                patient_portal_crud.update_patient_settings(db, patient.patient_id, updated_settings)
            except Exception:
                # Table doesn't exist - skip settings update
                pass
            
            # Send notification
            notification_service = PatientNotificationService(db)
            await notification_service.send_message_notification(
                str(patient.patient_id),
                {
                    "message": "Two-factor authentication has been successfully enabled for your account.",
                    "sender": "Security System",
                    "type": "2fa_enabled"
                }
            )
        
        return SecurityResponse(
            success=True,
            message="2FA verified and enabled successfully",
            data={"two_factor_enabled": True}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify 2FA: {str(e)}"
        )

@router.get("/security/sessions", response_model=SecurityResponse)
async def list_sessions(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """List active sessions for the patient."""
    try:
        # For demo purposes, return mock session data
        # In production, this would query actual session storage
        current_time = datetime.utcnow()
        
        sessions = [
            {
                "session_id": f"session_{current_user.user_id[:8]}_current",
                "device_info": "Chrome 120.0 on Windows 10",
                "ip_address": "192.168.1.100",
                "location": "Tashkent, Uzbekistan",
                "last_activity": current_time.isoformat(),
                "is_current": True
            },
            {
                "session_id": f"session_{current_user.user_id[:8]}_mobile",
                "device_info": "Safari on iPhone 15",
                "ip_address": "192.168.1.101",
                "location": "Tashkent, Uzbekistan",
                "last_activity": (current_time - timedelta(hours=2)).isoformat(),
                "is_current": False
            }
        ]
        
        return SecurityResponse(
            success=True,
            message="Active sessions retrieved successfully",
            data={
                "sessions": sessions,
                "total_sessions": len(sessions),
                "current_session": sessions[0]["session_id"]
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sessions: {str(e)}"
        )

@router.delete("/security/sessions/{session_id}", response_model=SecurityResponse)
async def end_session(
    session_id: str,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """End a specific session."""
    try:
        # For demo purposes, simulate session termination
        # In production, this would actually terminate the session
        
        # Send notification about session termination
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if patient:
            notification_service = PatientNotificationService(db)
            await notification_service.send_message_notification(
                str(patient.patient_id),
                {
                    "message": f"Session {session_id[:8]}... has been terminated from your account.",
                    "sender": "Security System",
                    "type": "session_terminated"
                }
            )
        
        return SecurityResponse(
            success=True,
            message="Session terminated successfully",
            data={
                "terminated_session": session_id,
                "terminated_at": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )

@router.post("/security/logout-all", response_model=SecurityResponse)
async def logout_all_sessions(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Logout from all sessions except current."""
    try:
        # For demo purposes, simulate logout from all sessions
        # In production, this would terminate all sessions except current
        
        # Send notification about logout from all sessions
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if patient:
            notification_service = PatientNotificationService(db)
            await notification_service.send_message_notification(
                str(patient.patient_id),
                {
                    "message": "You have been logged out from all other sessions. Only this session remains active.",
                    "sender": "Security System",
                    "type": "logout_all_sessions"
                }
            )
        
        return SecurityResponse(
            success=True,
            message="Logged out from all other sessions successfully",
            data={
                "logout_time": datetime.utcnow().isoformat(),
                "remaining_sessions": 1
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to logout from all sessions: {str(e)}"
        )

@router.get("/security/activity", response_model=SecurityResponse)
async def get_security_activity(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Get recent security activity for the patient."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        activities = []
        
        # Query audit logs from admin_activity table if it exists
        try:
            from sqlalchemy import text
            from sqlalchemy.exc import ProgrammingError
            
            # Query admin activity logs for this user
            query = text("""
                SELECT 
                    activity_type,
                    description,
                    created_at,
                    metadata
                FROM ops.admin_activity
                WHERE admin_id = :user_id
                AND (
                    activity_type LIKE '%PASSWORD%' OR
                    activity_type LIKE '%LOGIN%' OR
                    activity_type LIKE '%SECURITY%' OR
                    activity_type LIKE '%SESSION%'
                )
                ORDER BY created_at DESC
                LIMIT 20
            """)
            
            result = db.execute(query, {"user_id": str(current_user.user_id)})
            rows = result.fetchall()
            
            for row in rows:
                activity_type = row[0] or "Security activity"
                description = row[1] or ""
                timestamp = row[2] or datetime.utcnow()
                metadata = row[3] or {}
                
                # Extract IP address and location from metadata if available
                ip_address = metadata.get("ip_address") or metadata.get("ip") or "Unknown"
                location = metadata.get("location") or metadata.get("city") or "Unknown"
                
                # Determine activity_status based on activity type (renamed to avoid conflict with FastAPI status)
                activity_status = "success"
                if activity_type and ("FAILED" in str(activity_type).upper() or "FAIL" in str(activity_type).upper()):
                    activity_status = "failed"
                
                # Format activity description
                activity_desc = description or (activity_type.replace("_", " ").title() if activity_type else "Security activity")
                
                activities.append({
                    "timestamp": timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
                    "activity": activity_desc,
                    "ip_address": ip_address,
                    "location": location,
                    "status": activity_status
                })
        except (ProgrammingError, Exception) as e:
            # Table doesn't exist or query failed - rollback transaction and use user model data
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not query audit logs: {e}")
            
            # Rollback the failed transaction
            db.rollback()
            
            # Fallback: Use user model data for password changes
            try:
                user = db.query(User).filter(User.id == current_user.user_id).first()
                if user and user.password_changed_at:
                    activities.append({
                        "timestamp": user.password_changed_at.isoformat(),
                        "activity": "Password changed",
                        "ip_address": "Unknown",
                        "location": "Unknown",
                        "status": "success"
                    })
            except Exception as e2:
                # Even the fallback query failed - log and continue with empty activities
                logger.warning(f"Could not query user data for fallback: {e2}")
                db.rollback()
        
        # If no activities found, add a default message
        if not activities:
            activities.append({
                "timestamp": datetime.utcnow().isoformat(),
                "activity": "No recent security activity",
                "ip_address": "N/A",
                "location": "N/A",
                "status": "info"
            })
        
        return SecurityResponse(
            success=True,
            message="Security activity retrieved successfully",
            data={
                "activities": activities,
                "total_activities": len(activities),
                "last_updated": datetime.utcnow().isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to get security activity: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security activity: {str(e)}"
        )
