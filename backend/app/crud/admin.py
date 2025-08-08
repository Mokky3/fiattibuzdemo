# app/crud/admin.py
"""CRUD operations for Admin models."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta
import uuid
import json

from app.crud.base import CRUDBase
from app.common.models.admin import (
    Department, OrganizationStats, DepartmentStats,
    ServicePrice, SystemConfig, AdminActivity,
    SystemAlert, BulkOperation, ReportTemplate,
    ScheduledReport, ActivityType, AlertType,
    AlertSeverity
)


class CRUDDepartment(CRUDBase[Department, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Department model."""
    
    def get_by_code(
        self, db: Session, *, code: str, organization_id: uuid.UUID
    ) -> Optional[Department]:
        """Get department by code within an organization."""
        return db.query(Department).filter(
            and_(
                Department.code == code,
                Department.organization_id == organization_id
            )
        ).first()
    
    def get_active_departments(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Department]:
        """Get active departments for an organization."""
        return db.query(Department).filter(
            and_(
                Department.organization_id == organization_id,
                Department.is_active == True
            )
        ).offset(skip).limit(limit).all()
    
    def update_occupancy(
        self,
        db: Session,
        *,
        department_id: uuid.UUID,
        occupancy: int
    ) -> Optional[Department]:
        """Update department occupancy."""
        dept = self.get(db, id=department_id)
        if dept:
            dept.current_occupancy = occupancy
            dept.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(dept)
        return dept


class CRUDOrganizationStats(CRUDBase[OrganizationStats, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for OrganizationStats model."""
    
    def get_by_organization(
        self, db: Session, *, organization_id: uuid.UUID
    ) -> Optional[OrganizationStats]:
        """Get stats for an organization."""
        return db.query(OrganizationStats).filter(
            OrganizationStats.organization_id == organization_id
        ).first()
    
    def update_or_create(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        stats_data: Dict[str, Any]
    ) -> OrganizationStats:
        """Update or create organization stats."""
        stats = self.get_by_organization(db, organization_id=organization_id)
        
        if stats:
            # Update existing
            for key, value in stats_data.items():
                if hasattr(stats, key):
                    setattr(stats, key, value)
            stats.last_calculated = datetime.utcnow()
        else:
            # Create new
            stats = OrganizationStats(
                id=uuid.uuid4(),
                organization_id=organization_id,
                **stats_data,
                last_calculated=datetime.utcnow()
            )
            db.add(stats)
        
        db.commit()
        db.refresh(stats)
        return stats
    
    def increment_counter(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        counter_name: str,
        value: int = 1
    ) -> Optional[OrganizationStats]:
        """Increment a specific counter."""
        stats = self.get_by_organization(db, organization_id=organization_id)
        if stats and hasattr(stats, counter_name):
            current_value = getattr(stats, counter_name, 0)
            setattr(stats, counter_name, current_value + value)
            stats.last_calculated = datetime.utcnow()
            db.commit()
            db.refresh(stats)
        return stats


class CRUDServicePrice(CRUDBase[ServicePrice, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for ServicePrice model."""
    
    def get_active_prices(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ServicePrice]:
        """Get active service prices."""
        query = db.query(ServicePrice).filter(
            and_(
                ServicePrice.organization_id == organization_id,
                ServicePrice.is_active == True,
                or_(
                    ServicePrice.valid_to == None,
                    ServicePrice.valid_to >= datetime.utcnow().date()
                )
            )
        )
        
        if category:
            query = query.filter(ServicePrice.service_category == category)
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_service_code(
        self,
        db: Session,
        *,
        service_code: str,
        organization_id: uuid.UUID
    ) -> Optional[ServicePrice]:
        """Get service price by code."""
        return db.query(ServicePrice).filter(
            and_(
                ServicePrice.service_code == service_code,
                ServicePrice.organization_id == organization_id,
                ServicePrice.is_active == True
            )
        ).first()
    
    def approve_price(
        self,
        db: Session,
        *,
        price_id: uuid.UUID,
        approver_id: uuid.UUID
    ) -> Optional[ServicePrice]:
        """Approve a service price."""
        price = self.get(db, id=price_id)
        if price:
            price.approved_by = approver_id
            price.approved_at = datetime.utcnow()
            price.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(price)
        return price


class CRUDSystemConfig(CRUDBase[SystemConfig, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for SystemConfig model."""
    
    def get_config(
        self,
        db: Session,
        *,
        key: str,
        organization_id: Optional[uuid.UUID] = None
    ) -> Optional[SystemConfig]:
        """Get configuration by key."""
        query = db.query(SystemConfig).filter(SystemConfig.key == key)
        
        if organization_id:
            query = query.filter(SystemConfig.organization_id == organization_id)
        else:
            query = query.filter(SystemConfig.is_global == True)
        
        return query.first()
    
    def get_configs_by_category(
        self,
        db: Session,
        *,
        category: str,
        organization_id: Optional[uuid.UUID] = None
    ) -> List[SystemConfig]:
        """Get all configurations in a category."""
        query = db.query(SystemConfig).filter(SystemConfig.category == category)
        
        if organization_id:
            query = query.filter(
                or_(
                    SystemConfig.organization_id == organization_id,
                    SystemConfig.is_global == True
                )
            )
        
        return query.all()
    
    def set_config(
        self,
        db: Session,
        *,
        key: str,
        value: Any,
        category: str,
        organization_id: Optional[uuid.UUID] = None,
        modified_by: Optional[uuid.UUID] = None,
        **kwargs
    ) -> SystemConfig:
        """Set or update a configuration value."""
        config = self.get_config(db, key=key, organization_id=organization_id)
        
        if config:
            # Update existing
            config.value = value
            config.modified_by = modified_by
            config.updated_at = datetime.utcnow()
            
            # Update optional fields
            for field in ['description', 'is_required', 'is_sensitive', 
                         'allowed_values', 'min_value', 'max_value']:
                if field in kwargs:
                    setattr(config, field, kwargs[field])
        else:
            # Create new
            config = SystemConfig(
                id=uuid.uuid4(),
                key=key,
                value=value,
                value_type=type(value).__name__,
                category=category,
                organization_id=organization_id,
                is_global=organization_id is None,
                modified_by=modified_by,
                created_at=datetime.utcnow(),
                **kwargs
            )
            db.add(config)
        
        db.commit()
        db.refresh(config)
        return config


class CRUDAdminActivity(CRUDBase[AdminActivity, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for AdminActivity model."""
    
    def log_activity(
        self,
        db: Session,
        *,
        user_id: uuid.UUID,
        activity_type: ActivityType,
        category: str,
        action: str,
        status: str = "success",
        organization_id: Optional[uuid.UUID] = None,
        **kwargs
    ) -> AdminActivity:
        """Log an admin activity."""
        activity = AdminActivity(
            id=uuid.uuid4(),
            user_id=user_id,
            organization_id=organization_id,
            activity_type=activity_type,
            category=category,
            action=action,
            status=status,
            performed_at=datetime.utcnow(),
            **kwargs
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity
    
    def get_user_activities(
        self,
        db: Session,
        *,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        activity_type: Optional[ActivityType] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[AdminActivity]:
        """Get activities for a specific user."""
        query = db.query(AdminActivity).filter(
            AdminActivity.user_id == user_id
        )
        
        if activity_type:
            query = query.filter(AdminActivity.activity_type == activity_type)
        
        if date_from:
            query = query.filter(AdminActivity.performed_at >= date_from)
        
        if date_to:
            query = query.filter(AdminActivity.performed_at <= date_to)
        
        return query.order_by(
            desc(AdminActivity.performed_at)
        ).offset(skip).limit(limit).all()
    
    def get_recent_activities(
        self,
        db: Session,
        *,
        organization_id: Optional[uuid.UUID] = None,
        limit: int = 10
    ) -> List[AdminActivity]:
        """Get recent activities."""
        query = db.query(AdminActivity)
        
        if organization_id:
            query = query.filter(AdminActivity.organization_id == organization_id)
        
        return query.order_by(
            desc(AdminActivity.performed_at)
        ).limit(limit).all()


class CRUDSystemAlert(CRUDBase[SystemAlert, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for SystemAlert model."""
    
    def create_alert(
        self,
        db: Session,
        *,
        alert_type: AlertType,
        severity: AlertSeverity,
        category: str,
        title: str,
        message: str,
        is_global: bool = False,
        organization_id: Optional[uuid.UUID] = None,
        department_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        **kwargs
    ) -> SystemAlert:
        """Create a new system alert."""
        alert = SystemAlert(
            id=uuid.uuid4(),
            alert_type=alert_type,
            severity=severity,
            category=category,
            title=title,
            message=message,
            is_global=is_global,
            organization_id=organization_id,
            department_id=department_id,
            user_id=user_id,
            created_at=datetime.utcnow(),
            **kwargs
        )
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    
    def get_active_alerts(
        self,
        db: Session,
        *,
        organization_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        severity: Optional[AlertSeverity] = None
    ) -> List[SystemAlert]:
        """Get active alerts."""
        query = db.query(SystemAlert).filter(
            and_(
                SystemAlert.is_active == True,
                or_(
                    SystemAlert.expires_at == None,
                    SystemAlert.expires_at > datetime.utcnow()
                )
            )
        )
        
        # Filter by visibility
        if user_id:
            query = query.filter(
                or_(
                    SystemAlert.is_global == True,
                    SystemAlert.user_id == user_id,
                    and_(
                        SystemAlert.organization_id == organization_id,
                        SystemAlert.user_id == None
                    )
                )
            )
        elif organization_id:
            query = query.filter(
                or_(
                    SystemAlert.is_global == True,
                    SystemAlert.organization_id == organization_id
                )
            )
        
        if severity:
            query = query.filter(SystemAlert.severity == severity)
        
        return query.order_by(desc(SystemAlert.created_at)).all()
    
    def acknowledge_alert(
        self,
        db: Session,
        *,
        alert_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[SystemAlert]:
        """Acknowledge an alert."""
        alert = self.get(db, id=alert_id)
        if alert:
            alert.is_acknowledged = True
            alert.acknowledged_by = user_id
            alert.acknowledged_at = datetime.utcnow()
            db.commit()
            db.refresh(alert)
        return alert
    
    def resolve_alert(
        self,
        db: Session,
        *,
        alert_id: uuid.UUID,
        user_id: uuid.UUID,
        resolution_notes: Optional[str] = None
    ) -> Optional[SystemAlert]:
        """Resolve an alert."""
        alert = self.get(db, id=alert_id)
        if alert:
            alert.is_resolved = True
            alert.resolved_by = user_id
            alert.resolved_at = datetime.utcnow()
            alert.resolution_notes = resolution_notes
            alert.is_active = False
            db.commit()
            db.refresh(alert)
        return alert


class CRUDBulkOperation(CRUDBase[BulkOperation, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for BulkOperation model."""
    
    def create_operation(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        operation_type: str,
        resource_type: str,
        performed_by: uuid.UUID,
        **kwargs
    ) -> BulkOperation:
        """Create a new bulk operation."""
        operation = BulkOperation(
            id=uuid.uuid4(),
            organization_id=organization_id,
            operation_type=operation_type,
            resource_type=resource_type,
            performed_by=performed_by,
            status="pending",
            created_at=datetime.utcnow(),
            **kwargs
        )
        
        db.add(operation)
        db.commit()
        db.refresh(operation)
        return operation
    
    def update_progress(
        self,
        db: Session,
        *,
        operation_id: uuid.UUID,
        processed_records: int,
        successful_records: int,
        failed_records: int,
        progress_percent: float
    ) -> Optional[BulkOperation]:
        """Update operation progress."""
        operation = self.get(db, id=operation_id)
        if operation:
            operation.processed_records = processed_records
            operation.successful_records = successful_records
            operation.failed_records = failed_records
            operation.progress_percent = progress_percent
            operation.updated_at = datetime.utcnow()
            
            if operation.status == "pending" and processed_records > 0:
                operation.status = "processing"
                operation.started_at = datetime.utcnow()
            
            db.commit()
            db.refresh(operation)
        return operation
    
    def complete_operation(
        self,
        db: Session,
        *,
        operation_id: uuid.UUID,
        result_summary: Optional[Dict[str, Any]] = None
    ) -> Optional[BulkOperation]:
        """Mark operation as completed."""
        operation = self.get(db, id=operation_id)
        if operation:
            operation.status = "completed"
            operation.completed_at = datetime.utcnow()
            operation.progress_percent = 100.0
            operation.result_summary = result_summary
            operation.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(operation)
        return operation
    
    def fail_operation(
        self,
        db: Session,
        *,
        operation_id: uuid.UUID,
        error_message: str
    ) -> Optional[BulkOperation]:
        """Mark operation as failed."""
        operation = self.get(db, id=operation_id)
        if operation:
            operation.status = "failed"
            operation.completed_at = datetime.utcnow()
            operation.errors = operation.errors or []
            operation.errors.append({
                "timestamp": datetime.utcnow().isoformat(),
                "message": error_message
            })
            operation.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(operation)
        return operation


class CRUDReportTemplate(CRUDBase[ReportTemplate, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for ReportTemplate model."""
    
    def get_by_code(
        self, db: Session, *, code: str
    ) -> Optional[ReportTemplate]:
        """Get report template by code."""
        return db.query(ReportTemplate).filter(
            ReportTemplate.code == code
        ).first()
    
    def get_available_templates(
        self,
        db: Session,
        *,
        organization_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> List[ReportTemplate]:
        """Get available report templates."""
        query = db.query(ReportTemplate).filter(
            ReportTemplate.is_active == True
        )
        
        # Filter by organization or system templates
        if organization_id:
            query = query.filter(
                or_(
                    ReportTemplate.organization_id == organization_id,
                    ReportTemplate.is_system == True
                )
            )
        
        if category:
            query = query.filter(ReportTemplate.category == category)
        
        if user_role:
            query = query.filter(
                or_(
                    ReportTemplate.required_role == None,
                    ReportTemplate.required_role == user_role
                )
            )
        
        return query.all()


class CRUDScheduledReport(CRUDBase[ScheduledReport, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for ScheduledReport model."""
    
    def get_active_scheduled_reports(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID
    ) -> List[ScheduledReport]:
        """Get active scheduled reports."""
        return db.query(ScheduledReport).filter(
            and_(
                ScheduledReport.organization_id == organization_id,
                ScheduledReport.is_active == True
            )
        ).all()
    
    def get_due_reports(
        self, db: Session
    ) -> List[ScheduledReport]:
        """Get reports that are due to run."""
        return db.query(ScheduledReport).filter(
            and_(
                ScheduledReport.is_active == True,
                or_(
                    ScheduledReport.next_run_at == None,
                    ScheduledReport.next_run_at <= datetime.utcnow()
                )
            )
        ).all()
    
    def update_run_status(
        self,
        db: Session,
        *,
        report_id: uuid.UUID,
        status: str,
        next_run_at: datetime,
        error: Optional[str] = None
    ) -> Optional[ScheduledReport]:
        """Update scheduled report run status."""
        report = self.get(db, id=report_id)
        if report:
            report.last_run_at = datetime.utcnow()
            report.last_run_status = status
            report.last_run_error = error
            report.next_run_at = next_run_at
            report.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(report)
        return report


# Create instances
department = CRUDDepartment(Department)
organization_stats = CRUDOrganizationStats(OrganizationStats)
department_stats = CRUDBase(DepartmentStats)
service_price = CRUDServicePrice(ServicePrice)
system_config = CRUDSystemConfig(SystemConfig)
admin_activity = CRUDAdminActivity(AdminActivity)
system_alert = CRUDSystemAlert(SystemAlert)
bulk_operation = CRUDBulkOperation(BulkOperation)
report_template = CRUDReportTemplate(ReportTemplate)
scheduled_report = CRUDScheduledReport(ScheduledReport)