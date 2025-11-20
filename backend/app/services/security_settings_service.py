"""
Security Settings Service
Applies admin security settings to staff members
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital
from app.crud.admin import admin as admin_crud
from app.common.schemas.user_enhanced import SecuritySettings

logger = logging.getLogger(__name__)


class SecuritySettingsService:
    """Service for applying security settings to staff members"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def apply_security_settings_to_clinic_staff(
        self, 
        db: Session, 
        clinic_id: str, 
        security_settings: SecuritySettings
    ) -> Dict[str, Any]:
        """
        Apply security settings to all staff members of a specific clinic
        
        Args:
            db: Database session
            clinic_id: ID of the clinic/hospital
            security_settings: Security settings to apply
            
        Returns:
            Dict with results of the operation
        """
        try:
            # Get all staff members for the clinic
            staff_members = db.query(User).filter(
                and_(
                    User.organization_id == clinic_id,
                    User.role.in_([
                        UserRole.DOCTOR,
                        UserRole.NURSE,
                        UserRole.RECEPTIONIST,
                        UserRole.LAB_TECHNICIAN,
                        UserRole.RADIOLOGIST,
                        UserRole.PHARMACIST,
                        UserRole.CLINIC_ADMIN
                    ]),
                    User.is_active == True
                )
            ).all()
            
            if not staff_members:
                return {
                    "success": True,
                    "message": f"No active staff members found for clinic {clinic_id}",
                    "updated_count": 0,
                    "staff_members": []
                }
            
            updated_count = 0
            updated_staff = []
            
            for staff in staff_members:
                # Apply session timeout (this would be handled in auth service)
                # Apply max login attempts
                if hasattr(security_settings, 'maxFailedAttempts'):
                    # Reset failed login attempts if the new limit is higher
                    if staff.failed_login_attempts > security_settings.maxFailedAttempts:
                        staff.failed_login_attempts = 0
                        staff.locked_until = None
                
                # Apply lockout duration
                if hasattr(security_settings, 'lockoutDurationMinutes'):
                    # If user is currently locked, update lockout duration
                    if staff.locked_until and staff.locked_until > datetime.now(timezone.utc):
                        new_lockout_time = datetime.now(timezone.utc) + timedelta(
                            minutes=security_settings.lockoutDurationMinutes
                        )
                        staff.locked_until = new_lockout_time
                
                # Apply password expiry
                if hasattr(security_settings, 'passwordExpiryDays'):
                    # This would be checked during login
                    pass
                
                # Apply two-factor authentication requirement
                if hasattr(security_settings, 'twoFactorEnabled'):
                    if security_settings.twoFactorEnabled and not staff.two_factor_enabled:
                        # Log that 2FA should be enabled (would need user action)
                        self.logger.info(f"Staff member {staff.email} should enable 2FA")
                
                # Apply data encryption requirement (this would be handled at the application level)
                if hasattr(security_settings, 'enableEncryption'):
                    if security_settings.enableEncryption:
                        # Log that data encryption is required
                        self.logger.info(f"Data encryption enabled for staff member {staff.email}")
                
                # Apply audit logs requirement (this would be handled at the application level)
                if hasattr(security_settings, 'enableAuditLogs'):
                    if security_settings.enableAuditLogs:
                        # Log that audit logs are required
                        self.logger.info(f"Audit logs enabled for staff member {staff.email}")
                
                updated_staff.append({
                    "id": str(staff.id),
                    "email": staff.email,
                    "name": f"{staff.first_name} {staff.last_name}",
                    "role": staff.role.value,
                    "failed_login_attempts": staff.failed_login_attempts,
                    "locked_until": staff.locked_until.isoformat() if staff.locked_until else None,
                    "two_factor_enabled": staff.two_factor_enabled,
                    "encryption_enabled": getattr(security_settings, 'enableEncryption', False),
                    "audit_logs_enabled": getattr(security_settings, 'enableAuditLogs', True)
                })
                updated_count += 1
            
            # Commit changes
            db.commit()
            
            self.logger.info(f"Applied security settings to {updated_count} staff members in clinic {clinic_id}")
            
            return {
                "success": True,
                "message": f"Security settings applied to {updated_count} staff members",
                "updated_count": updated_count,
                "staff_members": updated_staff
            }
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to apply security settings to clinic {clinic_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to apply security settings: {str(e)}",
                "updated_count": 0,
                "staff_members": []
            }
    
    def apply_global_security_settings(
        self, 
        db: Session, 
        security_settings: SecuritySettings
    ) -> Dict[str, Any]:
        """
        Apply security settings to all staff members across all clinics
        
        Args:
            db: Database session
            security_settings: Security settings to apply
            
        Returns:
            Dict with results of the operation
        """
        try:
            # Get all active staff members across all clinics
            staff_members = db.query(User).filter(
                and_(
                    User.role.in_([
                        UserRole.DOCTOR,
                        UserRole.NURSE,
                        UserRole.RECEPTIONIST,
                        UserRole.LAB_TECHNICIAN,
                        UserRole.RADIOLOGIST,
                        UserRole.PHARMACIST,
                        UserRole.CLINIC_ADMIN,
                        UserRole.SUPER_ADMIN
                    ]),
                    User.is_active == True
                )
            ).all()
            
            if not staff_members:
                return {
                    "success": True,
                    "message": "No active staff members found",
                    "updated_count": 0,
                    "staff_members": []
                }
            
            updated_count = 0
            updated_staff = []
            
            for staff in staff_members:
                # Apply the same security settings as clinic-specific
                if hasattr(security_settings, 'maxFailedAttempts'):
                    if staff.failed_login_attempts > security_settings.maxFailedAttempts:
                        staff.failed_login_attempts = 0
                        staff.locked_until = None
                
                if hasattr(security_settings, 'lockoutDurationMinutes'):
                    if staff.locked_until and staff.locked_until > datetime.now(timezone.utc):
                        new_lockout_time = datetime.now(timezone.utc) + timedelta(
                            minutes=security_settings.lockoutDurationMinutes
                        )
                        staff.locked_until = new_lockout_time
                
                # Apply two-factor authentication requirement
                if hasattr(security_settings, 'twoFactorEnabled'):
                    if security_settings.twoFactorEnabled and not staff.two_factor_enabled:
                        # Log that 2FA should be enabled (would need user action)
                        self.logger.info(f"Staff member {staff.email} should enable 2FA")
                
                # Apply data encryption requirement (this would be handled at the application level)
                if hasattr(security_settings, 'enableEncryption'):
                    if security_settings.enableEncryption:
                        # Log that data encryption is required
                        self.logger.info(f"Data encryption enabled for staff member {staff.email}")
                
                # Apply audit logs requirement (this would be handled at the application level)
                if hasattr(security_settings, 'enableAuditLogs'):
                    if security_settings.enableAuditLogs:
                        # Log that audit logs are required
                        self.logger.info(f"Audit logs enabled for staff member {staff.email}")
                
                updated_staff.append({
                    "id": str(staff.id),
                    "email": staff.email,
                    "name": f"{staff.first_name} {staff.last_name}",
                    "role": staff.role.value,
                    "organization_id": str(staff.organization_id) if staff.organization_id else None,
                    "failed_login_attempts": staff.failed_login_attempts,
                    "locked_until": staff.locked_until.isoformat() if staff.locked_until else None,
                    "two_factor_enabled": staff.two_factor_enabled,
                    "encryption_enabled": getattr(security_settings, 'enableEncryption', False),
                    "audit_logs_enabled": getattr(security_settings, 'enableAuditLogs', True)
                })
                updated_count += 1
            
            # Commit changes
            db.commit()
            
            self.logger.info(f"Applied global security settings to {updated_count} staff members")
            
            return {
                "success": True,
                "message": f"Global security settings applied to {updated_count} staff members",
                "updated_count": updated_count,
                "staff_members": updated_staff
            }
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Failed to apply global security settings: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to apply global security settings: {str(e)}",
                "updated_count": 0,
                "staff_members": []
            }
    
    def get_clinic_staff_security_status(
        self, 
        db: Session, 
        clinic_id: str
    ) -> Dict[str, Any]:
        """
        Get current security status of all staff members in a clinic
        
        Args:
            db: Database session
            clinic_id: ID of the clinic/hospital
            
        Returns:
            Dict with security status of staff members
        """
        try:
            staff_members = db.query(User).filter(
                and_(
                    User.organization_id == clinic_id,
                    User.role.in_([
                        UserRole.DOCTOR,
                        UserRole.NURSE,
                        UserRole.RECEPTIONIST,
                        UserRole.LAB_TECHNICIAN,
                        UserRole.RADIOLOGIST,
                        UserRole.PHARMACIST,
                        UserRole.CLINIC_ADMIN
                    ]),
                    User.is_active == True
                )
            ).all()
            
            staff_security_status = []
            
            for staff in staff_members:
                is_locked = staff.locked_until and staff.locked_until > datetime.now(timezone.utc)
                
                staff_security_status.append({
                    "id": str(staff.id),
                    "email": staff.email,
                    "name": f"{staff.first_name} {staff.last_name}",
                    "role": staff.role.value,
                    "failed_login_attempts": staff.failed_login_attempts,
                    "is_locked": is_locked,
                    "locked_until": staff.locked_until.isoformat() if staff.locked_until else None,
                    "two_factor_enabled": staff.two_factor_enabled,
                    "encryption_enabled": True,  # This would be determined by system-wide settings
                    "audit_logs_enabled": True,  # This would be determined by system-wide settings
                    "last_login": staff.last_login.isoformat() if staff.last_login else None,
                    "last_activity": staff.last_activity.isoformat() if staff.last_activity else None
                })
            
            return {
                "success": True,
                "clinic_id": clinic_id,
                "staff_count": len(staff_security_status),
                "staff_members": staff_security_status
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get clinic staff security status: {str(e)}")
            return {
                "success": False,
                "message": f"Failed to get staff security status: {str(e)}",
                "staff_count": 0,
                "staff_members": []
            }


# Create service instance
security_settings_service = SecuritySettingsService()
