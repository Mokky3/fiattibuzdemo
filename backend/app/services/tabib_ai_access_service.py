"""Tabib AI access control service for clinic staff."""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital
from app.crud.user import user as user_crud
from app.crud.admin import admin as admin_crud
from app.common.models.admin import ActivityType


class TabibAIAccessService:
    """Service for managing Tabib AI access for clinic staff."""
    
    def apply_tabib_ai_access_to_clinic_staff(
        self, 
        db: Session, 
        clinic_id: str, 
        enabled: bool, 
        updated_by: str
    ) -> Dict[str, Any]:
        """
        Apply Tabib AI access control to all staff members of a specific clinic.
        
        Args:
            db: Database session
            clinic_id: The clinic/hospital ID
            enabled: Whether to enable or disable Tabib AI access
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
                    # Update the staff member's Tabib AI access
                    # This could be stored in custom_permissions or a separate field
                    # For now, we'll use custom_permissions as a JSON field
                    current_permissions = staff_member.custom_permissions or {}
                    
                    if enabled:
                        # Enable Tabib AI access
                        current_permissions["tabib_ai_enabled"] = True
                        current_permissions["tabib_ai_features"] = [
                            "ai_diagnosis_assistance",
                            "ai_treatment_recommendations", 
                            "ai_medical_insights",
                            "ai_patient_analysis"
                        ]
                    else:
                        # Disable Tabib AI access
                        current_permissions["tabib_ai_enabled"] = False
                        # Remove Tabib AI features from permissions
                        if "tabib_ai_features" in current_permissions:
                            del current_permissions["tabib_ai_features"]
                    
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
                    description=f"Updated Tabib AI access for clinic staff: {'Enabled' if enabled else 'Disabled'}",
                    affected_resource_id=clinic_id,
                    affected_resource_type="clinic_tabib_ai_access",
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
                "message": f"Tabib AI access {'enabled' if enabled else 'disabled'} for {updated_count} staff members"
            }
            
        except Exception as e:
            return {
                "success": False,
                "clinic_id": clinic_id,
                "enabled": enabled,
                "error": str(e),
                "message": f"Failed to update Tabib AI access for clinic staff: {str(e)}"
            }
    
    def apply_global_tabib_ai_access(
        self, 
        db: Session, 
        enabled: bool, 
        updated_by: str
    ) -> Dict[str, Any]:
        """
        Apply Tabib AI access control to all staff members across all clinics.
        
        Args:
            db: Database session
            enabled: Whether to enable or disable Tabib AI access globally
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
                result = self.apply_tabib_ai_access_to_clinic_staff(
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
                    description=f"Updated global Tabib AI access: {'Enabled' if enabled else 'Disabled'}",
                    affected_resource_id="global",
                    affected_resource_type="global_tabib_ai_access",
                )
            except Exception as log_error:
                # Don't fail the operation if logging fails
                pass
            
            return {
                "success": True,
                "enabled": enabled,
                "total_updated_staff": total_updated,
                "clinic_results": clinic_results,
                "message": f"Global Tabib AI access {'enabled' if enabled else 'disabled'} for {total_updated} staff members across {len(clinics)} clinics"
            }
            
        except Exception as e:
            return {
                "success": False,
                "enabled": enabled,
                "error": str(e),
                "message": f"Failed to update global Tabib AI access: {str(e)}"
            }
    
    def get_staff_tabib_ai_status(
        self, 
        db: Session, 
        clinic_id: str
    ) -> Dict[str, Any]:
        """
        Get the current Tabib AI access status for staff members of a clinic.
        
        Args:
            db: Database session
            clinic_id: The clinic/hospital ID
            
        Returns:
            Dict with staff Tabib AI access status
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
                has_tabib_ai = permissions.get("tabib_ai_enabled", False)
                
                if has_tabib_ai:
                    enabled_count += 1
                
                staff_status.append({
                    "staff_id": str(staff_member.id),
                    "staff_name": f"{staff_member.first_name} {staff_member.last_name}",
                    "staff_email": staff_member.email,
                    "staff_role": staff_member.role,
                    "tabib_ai_enabled": has_tabib_ai,
                    "tabib_ai_features": permissions.get("tabib_ai_features", [])
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
                "message": f"Failed to get staff Tabib AI status: {str(e)}"
            }


# Create service instance
tabib_ai_access_service = TabibAIAccessService()
