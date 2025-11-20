"""
System Metrics CRUD operations
Handles daily system metrics collection and retrieval for hospitals.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from app.crud.base import CRUDBase
from app.common.models.system_metrics import SystemMetrics
from pydantic import BaseModel


class SystemMetricsCreate(BaseModel):
    """Schema for creating system metrics."""
    hospital_id: Optional[UUID] = None
    metric_date: date
    avg_cpu_usage: float
    max_cpu_usage: float
    avg_memory_usage: float
    max_memory_usage: float
    avg_disk_usage: float
    max_disk_usage: float
    avg_process_count: int
    max_process_count: int
    total_users: int = 0
    active_users: int = 0
    total_appointments: int = 0
    completed_appointments: int = 0
    total_activities: int = 0
    system_uptime_hours: float
    error_count: int = 0
    warning_count: int = 0


class SystemMetricsUpdate(BaseModel):
    """Schema for updating system metrics."""
    avg_cpu_usage: Optional[float] = None
    max_cpu_usage: Optional[float] = None
    avg_memory_usage: Optional[float] = None
    max_memory_usage: Optional[float] = None
    avg_disk_usage: Optional[float] = None
    max_disk_usage: Optional[float] = None
    avg_process_count: Optional[int] = None
    max_process_count: Optional[int] = None
    total_users: Optional[int] = None
    active_users: Optional[int] = None
    total_appointments: Optional[int] = None
    completed_appointments: Optional[int] = None
    total_activities: Optional[int] = None
    system_uptime_hours: Optional[float] = None
    error_count: Optional[int] = None
    warning_count: Optional[int] = None


class CRUDSystemMetrics(CRUDBase[SystemMetrics, SystemMetricsCreate, SystemMetricsUpdate]):
    """CRUD operations for system metrics."""
    
    def get_by_hospital_and_date(
        self, 
        db: Session, 
        hospital_id: Optional[UUID], 
        metric_date: date
    ) -> Optional[SystemMetrics]:
        """Get system metrics for a specific hospital and date."""
        return db.query(SystemMetrics).filter(
            and_(
                SystemMetrics.hospital_id == hospital_id,
                SystemMetrics.metric_date == metric_date
            )
        ).first()
    
    def get_hospital_metrics(
        self, 
        db: Session, 
        hospital_id: Optional[UUID], 
        days: int = 30
    ) -> List[SystemMetrics]:
        """Get system metrics for a hospital over the last N days."""
        start_date = date.today() - timedelta(days=days)
        return db.query(SystemMetrics).filter(
            and_(
                SystemMetrics.hospital_id == hospital_id,
                SystemMetrics.metric_date >= start_date
            )
        ).order_by(desc(SystemMetrics.metric_date)).all()
    
    def get_all_hospitals_metrics(
        self, 
        db: Session, 
        days: int = 7
    ) -> List[SystemMetrics]:
        """Get system metrics for all hospitals over the last N days."""
        start_date = date.today() - timedelta(days=days)
        return db.query(SystemMetrics).filter(
            SystemMetrics.metric_date >= start_date
        ).order_by(desc(SystemMetrics.metric_date)).all()
    
    def get_latest_metrics(
        self, 
        db: Session, 
        hospital_id: Optional[UUID] = None
    ) -> Optional[SystemMetrics]:
        """Get the latest system metrics for a hospital or system-wide."""
        query = db.query(SystemMetrics)
        if hospital_id is not None:
            query = query.filter(SystemMetrics.hospital_id == hospital_id)
        
        return query.order_by(desc(SystemMetrics.metric_date)).first()
    
    def get_metrics_summary(
        self, 
        db: Session, 
        hospital_id: Optional[UUID] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get summary statistics for system metrics."""
        start_date = date.today() - timedelta(days=days)
        query = db.query(SystemMetrics).filter(
            SystemMetrics.metric_date >= start_date
        )
        
        if hospital_id is not None:
            query = query.filter(SystemMetrics.hospital_id == hospital_id)
        
        metrics = query.all()
        
        if not metrics:
            return {
                "total_days": 0,
                "avg_cpu": 0,
                "max_cpu": 0,
                "avg_memory": 0,
                "max_memory": 0,
                "avg_disk": 0,
                "max_disk": 0,
                "total_errors": 0,
                "total_warnings": 0,
                "healthy_days": 0,
                "status": "unknown"
            }
        
        # Calculate summary statistics
        total_days = len(metrics)
        avg_cpu = sum(m.avg_cpu_usage for m in metrics) / total_days
        max_cpu = max(m.max_cpu_usage for m in metrics)
        avg_memory = sum(m.avg_memory_usage for m in metrics) / total_days
        max_memory = max(m.max_memory_usage for m in metrics)
        avg_disk = sum(m.avg_disk_usage for m in metrics) / total_days
        max_disk = max(m.max_disk_usage for m in metrics)
        total_errors = sum(m.error_count for m in metrics)
        total_warnings = sum(m.warning_count for m in metrics)
        healthy_days = sum(1 for m in metrics if m.is_healthy)
        
        # Determine overall status
        latest_metric = max(metrics, key=lambda m: m.metric_date)
        status = latest_metric.status
        
        return {
            "total_days": total_days,
            "avg_cpu": round(avg_cpu, 2),
            "max_cpu": round(max_cpu, 2),
            "avg_memory": round(avg_memory, 2),
            "max_memory": round(max_memory, 2),
            "avg_disk": round(avg_disk, 2),
            "max_disk": round(max_disk, 2),
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "healthy_days": healthy_days,
            "status": status
        }
    
    def create_or_update_daily_metrics(
        self, 
        db: Session, 
        hospital_id: Optional[UUID],
        metric_date: date,
        metrics_data: Dict[str, Any]
    ) -> SystemMetrics:
        """Create or update daily metrics for a hospital."""
        existing = self.get_by_hospital_and_date(db, hospital_id, metric_date)
        
        if existing:
            # Update existing metrics
            for key, value in metrics_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new metrics
            create_data = SystemMetricsCreate(
                hospital_id=hospital_id,
                metric_date=metric_date,
                **metrics_data
            )
            return self.create(db=db, obj_in=create_data)


# Create the CRUD instance
system_metrics = CRUDSystemMetrics(SystemMetrics)
