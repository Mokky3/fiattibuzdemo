"""Admin CRUD operations
Connected to admin models and database operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.common.models.admin import (
    AdminActivity, ActivityType, SystemConfig, SystemAlert, AlertType, AlertSeverity,
    ReportTemplate, ScheduledReport, BulkOperation, ServicePrice, SystemLog, AuditTrail
)
from app.common.models.user import User, UserRole, UserStatus, Permission as PermissionModel, RolePermission
from app.common.models.hospital import Hospital, HospitalStatus, HospitalDepartment
from app.crud.base import CRUDBase
from pydantic import BaseModel

# ──────────────────────────────────────────────────────────────────────────────
# Admin Activity CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDAdminActivity(CRUDBase[AdminActivity, BaseModel, BaseModel]):
    def log_admin_activity(
        self,
        db: Session,
        admin_id: UUID,
        activity_type: ActivityType,
        description: str,
        affected_resource_id: Optional[UUID] = None,
        affected_resource_type: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AdminActivity:
        """Log admin activity."""
        activity_data = {
            "user_id": admin_id,  # Map admin_id parameter to user_id field
            "activity_type": activity_type,
            "action": description,  # Map description to action field
            "category": "config",  # Set category for config updates
            "resource_id": affected_resource_id,
            "resource_type": affected_resource_type,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": "success"  # Set status for successful operations
        }
        return self.create(db=db, obj_in=activity_data)
    
    def get_activity_logs(
        self,
        db: Session,
        activity_type: Optional[str] = None,
        admin_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AdminActivity]:
        """Get activity logs with filtering."""
        query = db.query(AdminActivity)
        
        if activity_type:
            query = query.filter(AdminActivity.activity_type == ActivityType(activity_type))
        if admin_id:
            query = query.filter(AdminActivity.user_id == admin_id)
        if resource_type:
            query = query.filter(AdminActivity.resource_type == resource_type)
        if date_from:
            query = query.filter(AdminActivity.performed_at >= date_from)
        if date_to:
            query = query.filter(AdminActivity.performed_at <= date_to)

        return query.order_by(desc(AdminActivity.performed_at)).offset(skip).limit(limit).all()
    
    def count_activity_logs(
        self,
        db: Session,
        activity_type: Optional[str] = None,
        admin_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> int:
        """Count activity logs with filtering."""
        query = db.query(AdminActivity)
        
        if activity_type:
            query = query.filter(AdminActivity.activity_type == ActivityType(activity_type))
        if admin_id:
            query = query.filter(AdminActivity.user_id == admin_id)
        if resource_type:
            query = query.filter(AdminActivity.resource_type == resource_type)
        if date_from:
            query = query.filter(AdminActivity.performed_at >= date_from)
        if date_to:
            query = query.filter(AdminActivity.performed_at <= date_to)
        
        return query.count()
    
    def get_activity_log(self, db: Session, activity_id: str) -> Optional[AdminActivity]:
        """Get specific activity log."""
        return db.query(AdminActivity).filter(AdminActivity.id == activity_id).first()

# ──────────────────────────────────────────────────────────────────────────────
# System Config CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDSystemConfig(CRUDBase[SystemConfig, BaseModel, BaseModel]):
    def get_system_configs(
        self,
        db: Session,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemConfig]:
        """Get system configurations."""
        query = db.query(SystemConfig)
        
        if category:
            query = query.filter(SystemConfig.category == category)
        
        return query.order_by(asc(SystemConfig.key)).offset(skip).limit(limit).all()
        
    def get_system_config_by_key(self, db: Session, key: str) -> Optional[SystemConfig]:
        """Get system configuration by key."""
        return db.query(SystemConfig).filter(SystemConfig.key == key).first()
    
    def update_system_config(
        self,
        db: Session,
        key: str,
        value: Any,
        description: Optional[str] = None,
        updated_by: Optional[UUID] = None
    ) -> Optional[SystemConfig]:
        """Update system configuration."""
        config = self.get_system_config_by_key(db=db, key=key)
        if not config:
            return None
        
        update_data = {
            "value": value,
            "updated_at": datetime.now(timezone.utc),
            "modified_by": updated_by
        }
        
        if description is not None:
            update_data["description"] = description
        
        return self.update(db=db, db_obj=config, obj_in=update_data)
    
    def count_system_configs(self, db: Session, category: Optional[str] = None) -> int:
        """Count system configurations."""
        query = db.query(SystemConfig)
        
        if category:
            query = query.filter(SystemConfig.category == category)
        
        return query.count()

    def get_config_json(self, db: Session, key: str) -> Optional[Any]:
        """Return the JSON value for a config key, if present."""
        config = self.get_system_config_by_key(db=db, key=key)
        return config.value if config else None

    def set_config_json(
        self,
        db: Session,
        key: str,
        value: Any,
        *,
        category: str = "settings",
        is_global: bool = True,
        organization_id: Optional[str] = None,
        updated_by: Optional[UUID] = None,
        description: Optional[str] = None,
        value_type: str = "json",
    ) -> SystemConfig:
        """Create or update a JSON config value for a key."""
        config = self.get_system_config_by_key(db=db, key=key)
        if config:
            update_data = {
                "value": value,
                "value_type": value_type,
                "modified_by": str(updated_by) if updated_by else None,  # Convert UUID to string
            }
            if description is not None:
                update_data["description"] = description
            return self.update(db=db, db_obj=config, obj_in=update_data)
        create_data = {
            "key": key,
            "category": category,
            "value": value,
            "value_type": value_type,
            "is_global": is_global,
            "organization_id": organization_id,
            "description": description,
        }
        return self.create(db=db, obj_in=create_data)

# ──────────────────────────────────────────────────────────────────────────────
# System Alert CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDSystemAlert(CRUDBase[SystemAlert, BaseModel, BaseModel]):
    def get_system_alerts(
        self,
        db: Session,
        severity: Optional[str] = None,
        alert_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemAlert]:
        """Get system alerts with filtering."""
        query = db.query(SystemAlert)
        
        if severity:
            query = query.filter(SystemAlert.severity == AlertSeverity(severity))
        if alert_type:
            query = query.filter(SystemAlert.alert_type == AlertType(alert_type))
        if status:
            # Backward-compat: map status to flags
            if status == "active":
                query = query.filter(SystemAlert.is_active == True)
            elif status == "resolved":
                query = query.filter(SystemAlert.is_resolved == True)
            elif status == "acknowledged":
                query = query.filter(SystemAlert.is_acknowledged == True)
        
        return query.order_by(desc(SystemAlert.created_at)).offset(skip).limit(limit).all()
    
    def resolve_system_alert(
        self,
        db: Session,
        alert_id: str,
        resolved_by: Optional[UUID] = None
    ) -> Optional[SystemAlert]:
        """Resolve a system alert."""
        alert = db.query(SystemAlert).filter(SystemAlert.id == alert_id).first()
        if not alert:
            return None
        
        update_data = {
            "is_resolved": True,
            "is_active": False,
            "resolved_at": datetime.now(timezone.utc),
            "resolved_by": resolved_by
        }
        
        return self.update(db=db, db_obj=alert, obj_in=update_data)
    
    def count_system_alerts(
        self,
        db: Session,
        severity: Optional[str] = None,
        alert_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> int:
        """Count system alerts with filtering."""
        query = db.query(SystemAlert)
        
        if severity:
            query = query.filter(SystemAlert.severity == AlertSeverity(severity))
        if alert_type:
            query = query.filter(SystemAlert.alert_type == AlertType(alert_type))
        if status:
            if status == "active":
                query = query.filter(SystemAlert.is_active == True)
            elif status == "resolved":
                query = query.filter(SystemAlert.is_resolved == True)
            elif status == "acknowledged":
                query = query.filter(SystemAlert.is_acknowledged == True)
        
        return query.count()

    def mark_alert_read(
        self,
        db: Session,
        alert_id: str,
        acknowledged_by: Optional[UUID] = None
    ) -> Optional[SystemAlert]:
        """Mark alert as acknowledged (read)."""
        alert = db.query(SystemAlert).filter(SystemAlert.id == alert_id).first()
        if not alert:
            return None
        update_data = {
            "is_acknowledged": True,
            "acknowledged_at": datetime.now(timezone.utc),
            "acknowledged_by": acknowledged_by,
        }
        return self.update(db=db, db_obj=alert, obj_in=update_data)

# ──────────────────────────────────────────────────────────────────────────────
# Report Template CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDReportTemplate(CRUDBase[ReportTemplate, BaseModel, BaseModel]):
    def get_report_templates(
        self,
        db: Session,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ReportTemplate]:
        """Get report templates with filtering."""
        query = db.query(ReportTemplate)
        
        if category:
            query = query.filter(ReportTemplate.category == category)
        if is_active is not None:
            query = query.filter(ReportTemplate.is_active == is_active)
        
        return query.order_by(asc(ReportTemplate.name)).offset(skip).limit(limit).all()
    
    def count_report_templates(
        self,
        db: Session,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Count report templates with filtering."""
        query = db.query(ReportTemplate)
        
        if category:
            query = query.filter(ReportTemplate.category == category)
        if is_active is not None:
            query = query.filter(ReportTemplate.is_active == is_active)
        
        return query.count()

# ──────────────────────────────────────────────────────────────────────────────
# Bulk Operation CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDBulkOperation(CRUDBase[BulkOperation, BaseModel, BaseModel]):
    def create_bulk_operation(
        self,
        db: Session,
        operation_id: str,
        operation_type: str,
        user_ids: List[str],
        reason: Optional[str] = None,
        created_by: Optional[UUID] = None
    ) -> BulkOperation:
        """Create a bulk operation record aligned to BulkOperation model."""
        operation_data = {
            "id": operation_id,
            "operation_type": operation_type,
            "resource_type": "users",
            "options": {"user_ids": user_ids, "reason": reason},
            "filters": None,
            "total_records": len(user_ids),
            "status": "pending",
            "performed_by": created_by,
        }
        return self.create(db=db, obj_in=operation_data)
    
    def get_bulk_operation(self, db: Session, operation_id: str) -> Optional[BulkOperation]:
        return db.query(BulkOperation).filter(BulkOperation.id == operation_id).first()
    
    def update_bulk_operation(
        self,
        db: Session,
        operation_id: str,
        successful_count: int,
        failed_count: int,
        status: str
    ) -> Optional[BulkOperation]:
        operation = self.get_bulk_operation(db=db, operation_id=operation_id)
        if not operation:
            return None
        update_data = {
            "successful_records": successful_count,
            "failed_records": failed_count,
            "status": status,
            "completed_at": datetime.now(timezone.utc)
        }
        return self.update(db=db, db_obj=operation, obj_in=update_data)

# ──────────────────────────────────────────────────────────────────────────────
# Permission CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDPermission(CRUDBase[PermissionModel, BaseModel, BaseModel]):
    def get_permissions(
        self,
        db: Session,
        role: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PermissionModel]:
        """Get permissions with optional role filtering."""
        query = db.query(PermissionModel)
        
        if role:
            # Join with RolePermission to filter by role
            query = query.join(RolePermission, RolePermission.permission_id == PermissionModel.id).filter(RolePermission.role == role)
        
        return query.order_by(asc(PermissionModel.name)).offset(skip).limit(limit).all()
    
    def count_permissions(self, db: Session, role: Optional[str] = None) -> int:
        """Count permissions with optional role filtering."""
        query = db.query(PermissionModel)
        
        if role:
            query = query.join(RolePermission, RolePermission.permission_id == PermissionModel.id).filter(RolePermission.role == role)
        
        return query.count()
    
    def get_role_permissions(self, db: Session) -> Dict[str, List[PermissionModel]]:
        """Get role-permission mappings."""
        role_permissions = {}
        
        # Get all role permissions
        role_perms = db.query(RolePermission).all()
        
        for role_perm in role_perms:
            if role_perm.role not in role_permissions:
                role_permissions[role_perm.role] = []
            
            # Get permission details
            permission = db.query(PermissionModel).filter(PermissionModel.id == role_perm.permission_id).first()
            if permission:
                role_permissions[role_perm.role].append(permission)
        
        return role_permissions
    
    def assign_user_permissions(
        self,
        db: Session,
        user_id: str,
        permissions: List[str]
    ) -> bool:
        """Assign additional permissions to a user."""
        try:
            # This would typically involve creating user-specific permission records
            # For now, we'll just log the assignment
            return True
        except Exception:
            return False

# ──────────────────────────────────────────────────────────────────────────────
# System Health and Stats CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDSystemHealth:
    def get_system_health(self, db: Session) -> Dict[str, Any]:
        """Get system health metrics."""
        try:
            # Get basic system metrics - simplified to avoid relationship issues
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            
            # Get recent activity from audit logs
            from app.common.models.admin import AuditTrail
            recent_activities = db.query(AuditTrail).filter(
                AuditTrail.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
            ).count()
            
            # Get system alerts (if table exists)
            try:
                critical_alerts = db.query(SystemAlert).filter(
                    and_(
                        SystemAlert.severity == AlertSeverity.CRITICAL,
                        SystemAlert.is_active == True
                    )
                ).count()
            except:
                critical_alerts = 0
            
            return {
                "status": "healthy" if critical_alerts == 0 else "warning",
                "total_users": total_users,
                "active_users": active_users,
                "recent_activities": recent_activities,
                "critical_alerts": critical_alerts,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
    
    def get_system_stats(self, db: Session) -> Dict[str, Any]:
        """Get system statistics."""
        try:
            # User statistics
            total_users = db.query(User).count()
            users_by_role = {}
            for role in UserRole:
                count = db.query(User).filter(User.role == role).count()
                users_by_role[role.value] = count
            
            # Hospital statistics
            total_hospitals = db.query(Hospital).count()
            hospitals_by_type = {}
            for status in HospitalStatus:
                count = db.query(Hospital).filter(Hospital.status == status).count()
                hospitals_by_type[status.value] = count
            
            # Activity statistics
            total_activities = db.query(AdminActivity).count()
            recent_activities = db.query(AdminActivity).filter(
                AdminActivity.performed_at >= datetime.now(timezone.utc) - timedelta(days=7)
            ).count()
            
            return {
                "total_users": total_users,
                "users_by_role": users_by_role,
                "total_hospitals": total_hospitals,
                "hospitals_by_type": hospitals_by_type,
                "total_activities": total_activities,
                "recent_activities": recent_activities,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "error": str(e),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }

# ──────────────────────────────────────────────────────────────────────────────
# Log Management CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDLogManagement:
    def get_system_logs(
        self,
        db: Session,
        level: Optional[str] = None,
        module: Optional[str] = None,
        user_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemLog]:
        """Get system logs with filtering."""
        query = db.query(SystemLog)
        
        if level:
            query = query.filter(SystemLog.level == level)
        if module:
            query = query.filter(SystemLog.module == module)
        if user_id:
            query = query.filter(SystemLog.user_id == user_id)
        if date_from:
            query = query.filter(SystemLog.timestamp >= date_from)
        if date_to:
            query = query.filter(SystemLog.timestamp <= date_to)
        
        return query.order_by(desc(SystemLog.timestamp)).offset(skip).limit(limit).all()
    
    def count_system_logs(
        self,
        db: Session,
        level: Optional[str] = None,
        module: Optional[str] = None,
        user_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> int:
        """Count system logs with filtering."""
        query = db.query(SystemLog)
        
        if level:
            query = query.filter(SystemLog.level == level)
        if module:
            query = query.filter(SystemLog.module == module)
        if user_id:
            query = query.filter(SystemLog.user_id == user_id)
        if date_from:
            query = query.filter(SystemLog.timestamp >= date_from)
        if date_to:
            query = query.filter(SystemLog.timestamp <= date_to)
        
        return query.count()
    
    def get_audit_trail(
        self,
        db: Session,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditTrail]:
        """Get audit trail with filtering."""
        query = db.query(AuditTrail)
        
        if user_id:
            query = query.filter(AuditTrail.user_id == user_id)
        if action:
            query = query.filter(AuditTrail.action == action)
        if resource_type:
            query = query.filter(AuditTrail.resource_type == resource_type)
        if date_from:
            query = query.filter(AuditTrail.timestamp >= date_from)
        if date_to:
            query = query.filter(AuditTrail.timestamp <= date_to)
        
        return query.order_by(desc(AuditTrail.timestamp)).offset(skip).limit(limit).all()
    
    def count_audit_trail(
        self,
        db: Session,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> int:
        """Count audit trail records with filtering."""
        query = db.query(AuditTrail)
        
        if user_id:
            query = query.filter(AuditTrail.user_id == user_id)
        if action:
            query = query.filter(AuditTrail.action == action)
        if resource_type:
            query = query.filter(AuditTrail.resource_type == resource_type)
        if date_from:
            query = query.filter(AuditTrail.timestamp >= date_from)
        if date_to:
            query = query.filter(AuditTrail.timestamp <= date_to)
        
        return query.count()
    
    def get_log_stats(self, db: Session) -> Dict[str, Any]:
        """Get log statistics."""
        try:
            total_activities = db.query(AdminActivity).count()
            recent_activities = db.query(AdminActivity).filter(
                AdminActivity.performed_at >= datetime.now(timezone.utc) - timedelta(hours=24)
            ).count()
            
            # Get activities by type
            activities_by_type = {}
            for activity_type in ActivityType:
                count = db.query(AdminActivity).filter(
                    AdminActivity.activity_type == activity_type
                ).count()
                activities_by_type[activity_type.value] = count
            
            # System log stats
            total_system_logs = db.query(SystemLog).count()
            logs_by_level_rows = db.query(SystemLog.level, func.count(SystemLog.id)).group_by(SystemLog.level).all()
            logs_by_level = {level: count for level, count in logs_by_level_rows}
            
            # Audit stats
            total_audit_trails = db.query(AuditTrail).count()
            
            return {
                "total_activities": total_activities,
                "total_system_logs": total_system_logs,
                "total_audit_trails": total_audit_trails,
                "activities_by_type": activities_by_type,
                "logs_by_level": logs_by_level,
                "recent_activities": recent_activities
            }
        except Exception as e:
            return {
                "error": str(e),
                "total_activities": 0,
                "total_system_logs": 0,
                "total_audit_trails": 0,
                "activities_by_type": {},
                "logs_by_level": {},
                "recent_activities": 0
            }
    
    def export_logs(
        self,
        db: Session,
        log_type: str,
        format: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, str]:
        """Export logs in various formats."""
        # This would generate actual export files
        # For now, return mock data
        return {
            "file_url": f"/exports/{log_type}_{format}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}",
            "file_size": "1.2MB",
            "record_count": 1000
        }
    
    def cleanup_logs(
        self,
        db: Session,
        log_type: str,
        older_than_days: int
    ) -> Dict[str, Any]:
        """Cleanup old logs."""
        # This would actually delete old log records
        # For now, return mock data
        return {
            "deleted_records": 500,
            "freed_space": "50MB",
            "cleanup_date": datetime.now(timezone.utc).isoformat()
        }

# ──────────────────────────────────────────────────────────────────────────────
# Service Pricing CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDServicePrice(CRUDBase[ServicePrice, BaseModel, BaseModel]):
    def get_by_organization(
        self,
        db: Session,
        organization_id: str,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[ServicePrice]:
        # Convert string to UUID for proper comparison
        org_uuid = UUID(organization_id) if isinstance(organization_id, str) else organization_id
        query = db.query(ServicePrice).filter(ServicePrice.organization_id == org_uuid)
        if is_active is not None:
            query = query.filter(ServicePrice.is_active == is_active)
        return query.order_by(asc(ServicePrice.service_name)).offset(skip).limit(limit).all()

    def update_price(self, db: Session, price_id: str, data: Dict[str, Any]) -> Optional[ServicePrice]:
        price = db.query(ServicePrice).filter(ServicePrice.id == price_id).first()
        if not price:
            return None
        return self.update(db=db, db_obj=price, obj_in=data)

    def delete_price(self, db: Session, price_id: str) -> bool:
        price = db.query(ServicePrice).filter(ServicePrice.id == price_id).first()
        if not price:
            return False
        db.delete(price)
        db.commit()
        return True

# ──────────────────────────────────────────────────────────────────────────────
# Create CRUD instances
# ──────────────────────────────────────────────────────────────────────────────

admin_activity = CRUDAdminActivity(AdminActivity)
system_config = CRUDSystemConfig(SystemConfig)
system_alert = CRUDSystemAlert(SystemAlert)
report_template = CRUDReportTemplate(ReportTemplate)
bulk_operation = CRUDBulkOperation(BulkOperation)
permission = CRUDPermission(PermissionModel)
system_health = CRUDSystemHealth()
log_management = CRUDLogManagement()
service_price = CRUDServicePrice(ServicePrice)

# ──────────────────────────────────────────────────────────────────────────────
# Combined Admin CRUD
# ──────────────────────────────────────────────────────────────────────────────

class AdminCRUD:
    """Combined admin CRUD operations."""
    
    def __init__(self):
        self.activity = admin_activity
        self.config = system_config
        self.alert = system_alert
        self.report_template = report_template
        self.bulk_operation = bulk_operation
        self.permission = permission
        self.health = system_health
        self.logs = log_management
    
    # Activity methods
    def log_admin_activity(self, db: Session, **kwargs) -> AdminActivity:
        return self.activity.log_admin_activity(db=db, **kwargs)
    
    def get_activity_logs(self, db: Session, **kwargs) -> List[AdminActivity]:
        return self.activity.get_activity_logs(db=db, **kwargs)
    
    def count_activity_logs(self, db: Session, **kwargs) -> int:
        return self.activity.count_activity_logs(db=db, **kwargs)
    
    def get_activity_log(self, db: Session, activity_id: str) -> Optional[AdminActivity]:
        return self.activity.get_activity_log(db=db, activity_id=activity_id)
    
    # Config methods
    def get_system_configs(self, db: Session, **kwargs) -> List[SystemConfig]:
        return self.config.get_system_configs(db=db, **kwargs)
    
    def get_system_config_by_key(self, db: Session, key: str) -> Optional[SystemConfig]:
        return self.config.get_system_config_by_key(db=db, key=key)
    
    def update_system_config(self, db: Session, **kwargs) -> Optional[SystemConfig]:
        return self.config.update_system_config(db=db, **kwargs)
    
    def get_config_json(self, db: Session, key: str) -> Optional[Any]:
        return self.config.get_config_json(db=db, key=key)

    def set_config_json(self, db: Session, **kwargs) -> SystemConfig:
        return self.config.set_config_json(db=db, **kwargs)
    
    def count_system_configs(self, db: Session, **kwargs) -> int:
        return self.config.count_system_configs(db=db, **kwargs)
    
    # Alert methods
    def get_system_alerts(self, db: Session, **kwargs) -> List[SystemAlert]:
        return self.alert.get_system_alerts(db=db, **kwargs)
    
    def resolve_system_alert(self, db: Session, **kwargs) -> Optional[SystemAlert]:
        return self.alert.resolve_system_alert(db=db, **kwargs)
    
    def count_system_alerts(self, db: Session, **kwargs) -> int:
        return self.alert.count_system_alerts(db=db, **kwargs)

    def mark_alert_read(self, db: Session, **kwargs) -> Optional[SystemAlert]:
        return self.alert.mark_alert_read(db=db, **kwargs)
    
    # Report template methods
    def get_report_templates(self, db: Session, **kwargs) -> List[ReportTemplate]:
        return self.report_template.get_report_templates(db=db, **kwargs)
    
    def count_report_templates(self, db: Session, **kwargs) -> int:
        return self.report_template.count_report_templates(db=db, **kwargs)
    
    # Bulk operation methods
    def create_bulk_operation(self, db: Session, **kwargs) -> BulkOperation:
        return self.bulk_operation.create_bulk_operation(db=db, **kwargs)
    
    def get_bulk_operation(self, db: Session, operation_id: str) -> Optional[BulkOperation]:
        return self.bulk_operation.get_bulk_operation(db=db, operation_id=operation_id)
    
    def update_bulk_operation(self, db: Session, **kwargs) -> Optional[BulkOperation]:
        return self.bulk_operation.update_bulk_operation(db=db, **kwargs)
    
    # Permission methods
    def get_permissions(self, db: Session, **kwargs) -> List[PermissionModel]:
        return self.permission.get_permissions(db=db, **kwargs)
    
    def count_permissions(self, db: Session, **kwargs) -> int:
        return self.permission.count_permissions(db=db, **kwargs)
    
    def get_role_permissions(self, db: Session) -> Dict[str, List[PermissionModel]]:
        return self.permission.get_role_permissions(db=db)
    
    def assign_user_permissions(self, db: Session, **kwargs) -> bool:
        return self.permission.assign_user_permissions(db=db, **kwargs)
    
    # Health and stats methods
    def get_system_health(self, db: Session) -> Dict[str, Any]:
        return self.health.get_system_health(db=db)
    
    def get_system_stats(self, db: Session) -> Dict[str, Any]:
        return self.health.get_system_stats(db=db)
    
    # Log methods
    def get_system_logs(self, db: Session, **kwargs) -> List[SystemLog]:
        return self.logs.get_system_logs(db=db, **kwargs)
    
    def count_system_logs(self, db: Session, **kwargs) -> int:
        return self.logs.count_system_logs(db=db, **kwargs)
    
    def get_audit_trail(self, db: Session, **kwargs) -> List[AuditTrail]:
        return self.logs.get_audit_trail(db=db, **kwargs)
    
    def count_audit_trail(self, db: Session, **kwargs) -> int:
        return self.logs.count_audit_trail(db=db, **kwargs)
    
    def get_log_stats(self, db: Session) -> Dict[str, Any]:
        return self.logs.get_log_stats(db=db)
    
    def export_logs(self, db: Session, **kwargs) -> Dict[str, str]:
        return self.logs.export_logs(db=db, **kwargs)
    
    def cleanup_logs(self, db: Session, **kwargs) -> Dict[str, Any]:
        return self.logs.cleanup_logs(db=db, **kwargs)

    # Service Price methods
    def get_service_prices(self, db: Session, **kwargs) -> List[ServicePrice]:
        return service_price.get_by_organization(db=db, **kwargs)

    def create_service_price(self, db: Session, obj_in: Dict[str, Any]) -> ServicePrice:
        # Convert string UUIDs to UUID objects for PostgreSQL compatibility
        if 'organization_id' in obj_in and isinstance(obj_in['organization_id'], str):
            obj_in['organization_id'] = UUID(obj_in['organization_id'])
        if 'department_id' in obj_in:
            if obj_in['department_id'] and isinstance(obj_in['department_id'], str):
                # Handle special cases for general and laboratory
                if obj_in['department_id'] in ['general', 'laboratory']:
                    obj_in['department_id'] = None  # Set to None for special departments
                else:
                    obj_in['department_id'] = UUID(obj_in['department_id'])
            elif obj_in['department_id'] == '' or obj_in['department_id'] is None:
                obj_in['department_id'] = None  # Set to None for empty/null department
        if 'created_by' in obj_in and isinstance(obj_in['created_by'], str):
            obj_in['created_by'] = UUID(obj_in['created_by'])
        return service_price.create(db=db, obj_in=obj_in)

    def update_service_price(self, db: Session, price_id: str, data: Dict[str, Any]) -> Optional[ServicePrice]:
        # Convert string UUIDs to UUID objects for PostgreSQL compatibility
        if 'organization_id' in data and isinstance(data['organization_id'], str):
            data['organization_id'] = UUID(data['organization_id'])
        if 'department_id' in data:
            if data['department_id'] and isinstance(data['department_id'], str):
                # Handle special cases for general and laboratory
                if data['department_id'] in ['general', 'laboratory']:
                    data['department_id'] = None  # Set to None for special departments
                else:
                    data['department_id'] = UUID(data['department_id'])
            elif data['department_id'] == '' or data['department_id'] is None:
                data['department_id'] = None  # Set to None for empty/null department
        if 'created_by' in data and isinstance(data['created_by'], str):
            data['created_by'] = UUID(data['created_by'])
        return service_price.update_price(db=db, price_id=price_id, data=data)

    def delete_service_price(self, db: Session, price_id: str) -> bool:
        return service_price.delete_price(db=db, price_id=price_id)

# Create the main admin CRUD instance
admin = AdminCRUD()