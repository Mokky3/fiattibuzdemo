"""Notification access control service for clinic staff."""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital
from app.crud.user import user as user_crud
from app.crud.admin import admin as admin_crud
from app.common.models.admin import ActivityType


class NotificationAccessService:
    """Service for managing notification access for clinic staff."""
    
    def apply_notification_access_to_clinic_staff(
        self, 
        db: Session, 
        clinic_id: str, 
        enabled: bool, 
        updated_by: str
    ) -> Dict[str, Any]:
        """
        Apply notification access control to all staff members of a specific clinic.
        
        Args:
            db: Database session
            clinic_id: The clinic/hospital ID
            enabled: Whether to enable or disable notification access
            updated_by: User ID who made the change
            
        Returns:
            Dict with results of the operation
        """
        try:
            from uuid import UUID
            clinic_uuid = UUID(clinic_id)
            
            # Get all staff members of the clinic (excluding super admins)
            staff_members = db.query(User).filter(
                User.organization_id == clinic_uuid,
                User.role != UserRole.SUPER_ADMIN,
                User.is_active == True
            ).all()
            
            updated_count = 0
            failed_updates = []
            
            for staff_member in staff_members:
                try:
                    # Update the staff member's notification access
                    # This could be stored in custom_permissions or a separate field
                    # For now, we'll use custom_permissions as a JSON field
                    current_permissions = staff_member.custom_permissions or {}
                    
                    if enabled:
                        # Enable notification access
                        current_permissions["notifications_enabled"] = True
                        current_permissions["notification_features"] = [
                            "send_patient_notifications",
                            "send_appointment_reminders",
                            "send_lab_result_notifications",
                            "send_emergency_alerts",
                            "send_system_notifications",
                            "receive_notifications"
                        ]
                    else:
                        # Disable notification access
                        current_permissions["notifications_enabled"] = False
                        # Remove notification features from permissions
                        if "notification_features" in current_permissions:
                            del current_permissions["notification_features"]
                    
                    # Update the staff member
                    user_crud.update(
                        db=db,
                        db_obj=staff_member,
                        obj_in={"custom_permissions": current_permissions}
                    )
                    
                    updated_count += 1
                    
                except Exception as staff_error:
                    failed_updates.append({
                        "staff_id": str(staff_member.id),
                        "staff_name": f"{staff_member.first_name} {staff_member.last_name}",
                        "error": str(staff_error)
                    })
            
            # Log the admin activity
            try:
                admin_crud.log_admin_activity(
                    db=db,
                    admin_id=updated_by,
                    activity_type=ActivityType.CONFIG_UPDATED,
                    description=f"Updated notification access for clinic staff: {'Enabled' if enabled else 'Disabled'}",
                    affected_resource_id=clinic_id,
                    affected_resource_type="clinic_notification_access",
                )
            except Exception as log_error:
                # Don't fail the operation if logging fails
                pass
            
            return {
                "success": True,
                "clinic_id": clinic_id,
                "enabled": enabled,
                "updated_staff_count": updated_count,
                "failed_updates": failed_updates,
                "message": f"Notification access {'enabled' if enabled else 'disabled'} for {updated_count} staff members"
            }
            
        except Exception as e:
            return {
                "success": False,
                "clinic_id": clinic_id,
                "enabled": enabled,
                "error": str(e),
                "message": f"Failed to update notification access for clinic staff: {str(e)}"
            }
    
    def apply_global_notification_access(
        self, 
        db: Session, 
        enabled: bool, 
        updated_by: str
    ) -> Dict[str, Any]:
        """
        Apply notification access control to all staff members across all clinics.
        
        Args:
            db: Database session
            enabled: Whether to enable or disable notification access globally
            updated_by: User ID who made the change
            
        Returns:
            Dict with results of the operation
        """
        try:
            # Get all active clinics
            clinics = db.query(Hospital).filter(Hospital.is_active == True).all()
            
            total_updated = 0
            clinic_results = []
            
            for clinic in clinics:
                clinic_id = str(clinic.id)
                result = self.apply_notification_access_to_clinic_staff(
                    db=db,
                    clinic_id=clinic_id,
                    enabled=enabled,
                    updated_by=updated_by
                )
                
                if result["success"]:
                    total_updated += result["updated_staff_count"]
                
                clinic_results.append({
                    "clinic_id": clinic_id,
                    "clinic_name": clinic.name,
                    "result": result
                })
            
            # Log the global admin activity
            try:
                admin_crud.log_admin_activity(
                    db=db,
                    admin_id=updated_by,
                    activity_type=ActivityType.CONFIG_UPDATED,
                    description=f"Updated global notification access: {'Enabled' if enabled else 'Disabled'}",
                    affected_resource_id="global",
                    affected_resource_type="global_notification_access",
                )
            except Exception as log_error:
                # Don't fail the operation if logging fails
                pass
            
            return {
                "success": True,
                "enabled": enabled,
                "total_updated_staff": total_updated,
                "clinic_results": clinic_results,
                "message": f"Global notification access {'enabled' if enabled else 'disabled'} for {total_updated} staff members across {len(clinics)} clinics"
            }
            
        except Exception as e:
            return {
                "success": False,
                "enabled": enabled,
                "error": str(e),
                "message": f"Failed to update global notification access: {str(e)}"
            }
    
    def get_staff_notification_status(
        self, 
        db: Session, 
        clinic_id: str
    ) -> Dict[str, Any]:
        """
        Get the current notification access status for staff members of a clinic.
        
        Args:
            db: Database session
            clinic_id: The clinic/hospital ID
            
        Returns:
            Dict with staff notification access status
        """
        try:
            from uuid import UUID
            clinic_uuid = UUID(clinic_id)
            
            # Get all staff members of the clinic
            staff_members = db.query(User).filter(
                User.organization_id == clinic_uuid,
                User.role != UserRole.SUPER_ADMIN,
                User.is_active == True
            ).all()
            
            staff_status = []
            enabled_count = 0
            
            for staff_member in staff_members:
                permissions = staff_member.custom_permissions or {}
                has_notifications = permissions.get("notifications_enabled", False)
                
                if has_notifications:
                    enabled_count += 1
                
                staff_status.append({
                    "staff_id": str(staff_member.id),
                    "staff_name": f"{staff_member.first_name} {staff_member.last_name}",
                    "staff_email": staff_member.email,
                    "staff_role": staff_member.role,
                    "notifications_enabled": has_notifications,
                    "notification_features": permissions.get("notification_features", [])
                })
            
            return {
                "success": True,
                "clinic_id": clinic_id,
                "total_staff": len(staff_members),
                "enabled_count": enabled_count,
                "disabled_count": len(staff_members) - enabled_count,
                "staff_status": staff_status
            }
            
        except Exception as e:
            return {
                "success": False,
                "clinic_id": clinic_id,
                "error": str(e),
                "message": f"Failed to get staff notification status: {str(e)}"
            }


# Create service instance
notification_access_service = NotificationAccessService()
