"""Backup service for clinic data."""
import os
import json
import zipfile
import shutil
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital
from app.crud.user import user as user_crud
from app.crud.admin import admin as admin_crud
from app.common.models.admin import ActivityType


class BackupService:
    """Service for managing clinic data backups."""
    
    def __init__(self):
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)
    
    def create_clinic_backup(
        self, 
        db: Session, 
        clinic_id: str, 
        backup_type: str = "manual",
        created_by: str = None
    ) -> Dict[str, Any]:
        """
        Create a backup for a specific clinic.
        
        Args:
            db: Database session
            clinic_id: The clinic/hospital ID
            backup_type: Type of backup (manual, scheduled, etc.)
            created_by: User ID who initiated the backup
            
        Returns:
            Dict with backup results
        """
        try:
            from uuid import UUID
            clinic_uuid = UUID(clinic_id)
            
            # Get clinic information
            clinic = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
            if not clinic:
                return {
                    "success": False,
                    "error": f"Clinic {clinic_id} not found",
                    "message": f"Failed to create backup: Clinic not found"
                }
            
            # Create backup directory for this clinic
            clinic_backup_dir = self.backup_dir / f"clinic_{clinic_id}"
            clinic_backup_dir.mkdir(exist_ok=True)
            
            # Generate backup filename with timestamp
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{clinic_id}_{timestamp}.zip"
            backup_path = clinic_backup_dir / backup_filename
            
            # Create temporary directory for backup data
            temp_dir = clinic_backup_dir / f"temp_{timestamp}"
            temp_dir.mkdir(exist_ok=True)
            
            try:
                # Backup clinic information
                clinic_data = {
                    "clinic_id": str(clinic.id),
                    "name": clinic.name,
                    "address": clinic.address,
                    "phone": clinic.phone,
                    "email": clinic.email,
                    "logo_url": clinic.logo_url,
                    "is_active": clinic.is_active,
                    "created_at": clinic.created_at.isoformat() if clinic.created_at else None
                }
                
                with open(temp_dir / "clinic_info.json", "w") as f:
                    json.dump(clinic_data, f, indent=2)
                
                # Backup staff members
                staff_members = db.query(User).filter(
                    User.organization_id == clinic_uuid,
                    User.is_active == True
                ).all()
                
                staff_data = []
                for staff in staff_members:
                    staff_info = {
                        "id": str(staff.id),
                        "username": staff.username,
                        "email": staff.email,
                        "first_name": staff.first_name,
                        "last_name": staff.last_name,
                        "role": staff.role,
                        "is_active": staff.is_active,
                        "custom_permissions": staff.custom_permissions,
                        "created_at": staff.created_at.isoformat() if staff.created_at else None,
                        "last_login": staff.last_login.isoformat() if staff.last_login else None
                    }
                    staff_data.append(staff_info)
                
                with open(temp_dir / "staff_members.json", "w") as f:
                    json.dump(staff_data, f, indent=2)
                
                # Backup departments
                from app.common.models.hospital import HospitalDepartment
                departments = db.query(HospitalDepartment).filter(
                    HospitalDepartment.hospital_id == clinic_uuid
                ).all()
                
                department_data = []
                for dept in departments:
                    dept_info = {
                        "id": str(dept.id),
                        "name": dept.name,
                        "code": dept.code,
                        "department_type": dept.department_type,
                        "head_id": str(dept.head_id) if dept.head_id else None,
                        "bed_capacity": dept.bed_capacity,
                        "description": dept.description,
                        "is_active": dept.is_active,
                        "created_at": dept.created_at.isoformat() if dept.created_at else None
                    }
                    department_data.append(dept_info)
                
                with open(temp_dir / "departments.json", "w") as f:
                    json.dump(department_data, f, indent=2)
                
                # Backup system configurations for this clinic
                from app.common.models.admin import SystemConfig
                clinic_configs = db.query(SystemConfig).filter(
                    SystemConfig.organization_id == clinic_uuid
                ).all()
                
                config_data = []
                for config in clinic_configs:
                    config_info = {
                        "id": str(config.id),
                        "key": config.key,
                        "value": config.value,
                        "category": config.category,
                        "description": config.description,
                        "is_global": config.is_global,
                        "created_at": config.created_at.isoformat() if config.created_at else None,
                        "updated_at": config.updated_at.isoformat() if config.updated_at else None
                    }
                    config_data.append(config_info)
                
                with open(temp_dir / "system_configs.json", "w") as f:
                    json.dump(config_data, f, indent=2)
                
                # Create backup metadata
                backup_metadata = {
                    "backup_id": f"backup_{clinic_id}_{timestamp}",
                    "clinic_id": clinic_id,
                    "clinic_name": clinic.name,
                    "backup_type": backup_type,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": created_by,
                    "data_files": [
                        "clinic_info.json",
                        "staff_members.json", 
                        "departments.json",
                        "system_configs.json"
                    ],
                    "backup_version": "1.0"
                }
                
                with open(temp_dir / "backup_metadata.json", "w") as f:
                    json.dump(backup_metadata, f, indent=2)
                
                # Create ZIP archive
                with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_path in temp_dir.rglob('*'):
                        if file_path.is_file():
                            arcname = file_path.relative_to(temp_dir)
                            zipf.write(file_path, arcname)
                
                # Clean up temporary directory
                shutil.rmtree(temp_dir)
                
                # Log the backup activity
                try:
                    admin_crud.log_admin_activity(
                        db=db,
                        admin_id=created_by,
                        activity_type=ActivityType.CONFIG_UPDATED,
                        description=f"Created backup for clinic '{clinic.name}'",
                        affected_resource_id=clinic_id,
                        affected_resource_type="clinic_backup",
                    )
                except Exception as log_error:
                    # Don't fail the operation if logging fails
                    pass
                
                return {
                    "success": True,
                    "backup_id": backup_metadata["backup_id"],
                    "clinic_id": clinic_id,
                    "clinic_name": clinic.name,
                    "backup_path": str(backup_path),
                    "backup_size": backup_path.stat().st_size,
                    "created_at": backup_metadata["created_at"],
                    "message": f"Backup created successfully for clinic '{clinic.name}'"
                }
                
            except Exception as e:
                # Clean up temporary directory on error
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
                raise e
                
        except Exception as e:
            return {
                "success": False,
                "clinic_id": clinic_id,
                "error": str(e),
                "message": f"Failed to create backup for clinic {clinic_id}: {str(e)}"
            }
    
    def create_global_backup(
        self, 
        db: Session, 
        created_by: str = None
    ) -> Dict[str, Any]:
        """
        Create a backup for all clinics (global backup).
        
        Args:
            db: Database session
            created_by: User ID who initiated the backup
            
        Returns:
            Dict with backup results
        """
        try:
            # Get all active clinics
            clinics = db.query(Hospital).filter(Hospital.is_active == True).all()
            
            backup_results = []
            total_size = 0
            
            for clinic in clinics:
                clinic_id = str(clinic.id)
                result = self.create_clinic_backup(
                    db=db,
                    clinic_id=clinic_id,
                    backup_type="global",
                    created_by=created_by
                )
                
                if result["success"]:
                    total_size += result.get("backup_size", 0)
                
                backup_results.append({
                    "clinic_id": clinic_id,
                    "clinic_name": clinic.name,
                    "result": result
                })
            
            # Log the global backup activity
            try:
                admin_crud.log_admin_activity(
                    db=db,
                    admin_id=created_by,
                    activity_type=ActivityType.CONFIG_UPDATED,
                    description="Created global backup for all clinics",
                    affected_resource_id="global",
                    affected_resource_type="global_backup",
                )
            except Exception as log_error:
                # Don't fail the operation if logging fails
                pass
            
            successful_backups = sum(1 for r in backup_results if r["result"]["success"])
            
            return {
                "success": True,
                "total_clinics": len(clinics),
                "successful_backups": successful_backups,
                "failed_backups": len(clinics) - successful_backups,
                "total_size": total_size,
                "backup_results": backup_results,
                "message": f"Global backup completed: {successful_backups}/{len(clinics)} clinics backed up successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to create global backup: {str(e)}"
            }
    
    def get_backup_list(
        self, 
        clinic_id: str = None
    ) -> Dict[str, Any]:
        """
        Get list of available backups for a clinic or all clinics.
        
        Args:
            clinic_id: Specific clinic ID, or None for all clinics
            
        Returns:
            Dict with backup list
        """
        try:
            if clinic_id:
                # Get backups for specific clinic
                clinic_backup_dir = self.backup_dir / f"clinic_{clinic_id}"
                if not clinic_backup_dir.exists():
                    return {
                        "success": True,
                        "clinic_id": clinic_id,
                        "backups": [],
                        "message": f"No backups found for clinic {clinic_id}"
                    }
                
                backups = []
                for backup_file in clinic_backup_dir.glob("backup_*.zip"):
                    try:
                        # Extract metadata from backup
                        with zipfile.ZipFile(backup_file, 'r') as zipf:
                            if 'backup_metadata.json' in zipf.namelist():
                                metadata_content = zipf.read('backup_metadata.json')
                                metadata = json.loads(metadata_content)
                                
                                backups.append({
                                    "backup_id": metadata.get("backup_id"),
                                    "clinic_id": metadata.get("clinic_id"),
                                    "clinic_name": metadata.get("clinic_name"),
                                    "backup_type": metadata.get("backup_type"),
                                    "created_at": metadata.get("created_at"),
                                    "created_by": metadata.get("created_by"),
                                    "file_path": str(backup_file),
                                    "file_size": backup_file.stat().st_size
                                })
                    except Exception as e:
                        # Skip corrupted backups
                        continue
                
                # Sort by creation date (newest first)
                backups.sort(key=lambda x: x["created_at"], reverse=True)
                
                return {
                    "success": True,
                    "clinic_id": clinic_id,
                    "backups": backups,
                    "message": f"Found {len(backups)} backups for clinic {clinic_id}"
                }
            else:
                # Get backups for all clinics
                all_backups = []
                for clinic_dir in self.backup_dir.glob("clinic_*"):
                    clinic_id = clinic_dir.name.replace("clinic_", "")
                    clinic_backups = self.get_backup_list(clinic_id=clinic_id)
                    if clinic_backups["success"]:
                        all_backups.extend(clinic_backups["backups"])
                
                # Sort by creation date (newest first)
                all_backups.sort(key=lambda x: x["created_at"], reverse=True)
                
                return {
                    "success": True,
                    "backups": all_backups,
                    "message": f"Found {len(all_backups)} backups across all clinics"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to get backup list: {str(e)}"
            }
    
    def cleanup_old_backups(
        self, 
        retention_years: int = 5
    ) -> Dict[str, Any]:
        """
        Clean up old backups based on retention policy.
        
        Args:
            retention_years: Number of years to retain backups
            
        Returns:
            Dict with cleanup results
        """
        try:
            cutoff_date = datetime.now(timezone.utc).replace(year=datetime.now().year - retention_years)
            deleted_count = 0
            total_size_freed = 0
            
            for clinic_dir in self.backup_dir.glob("clinic_*"):
                for backup_file in clinic_dir.glob("backup_*.zip"):
                    try:
                        # Check backup creation date
                        with zipfile.ZipFile(backup_file, 'r') as zipf:
                            if 'backup_metadata.json' in zipf.namelist():
                                metadata_content = zipf.read('backup_metadata.json')
                                metadata = json.loads(metadata_content)
                                created_at = datetime.fromisoformat(metadata["created_at"].replace('Z', '+00:00'))
                                
                                if created_at < cutoff_date:
                                    file_size = backup_file.stat().st_size
                                    backup_file.unlink()
                                    deleted_count += 1
                                    total_size_freed += file_size
                    except Exception as e:
                        # Skip corrupted backups
                        continue
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "total_size_freed": total_size_freed,
                "retention_years": retention_years,
                "message": f"Cleanup completed: {deleted_count} old backups deleted, {total_size_freed} bytes freed"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to cleanup old backups: {str(e)}"
            }


# Create service instance
backup_service = BackupService()
