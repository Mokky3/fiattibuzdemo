"""
System Metrics Service
Handles collection and storage of daily system metrics for hospitals.
"""
import os
import psutil
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.crud.system_metrics import system_metrics
from app.common.models.user import User
from app.common.models.appointment import Appointment
from app.common.models.admin import AuditTrail


class SystemMetricsService:
    """Service for collecting and managing system metrics."""
    
    def __init__(self):
        self.metrics_cache = {}
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics using psutil."""
        try:
            # Get CPU metrics (sample over 1 second)
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Get memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Get disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Get process metrics
            process_count = len(psutil.pids())
            
            # Get system uptime
            boot_time = psutil.boot_time()
            uptime_seconds = datetime.now().timestamp() - boot_time
            uptime_hours = uptime_seconds / 3600
            
            return {
                "cpu_usage": cpu_percent,
                "memory_usage": memory_percent,
                "disk_usage": disk_percent,
                "process_count": process_count,
                "uptime_hours": uptime_hours,
                "timestamp": datetime.now()
            }
        except Exception as e:
            print(f"Error collecting system metrics: {e}")
            return {
                "cpu_usage": 0,
                "memory_usage": 0,
                "disk_usage": 0,
                "process_count": 0,
                "uptime_hours": 0,
                "timestamp": datetime.now(),
                "error": str(e)
            }
    
    def collect_database_metrics(self, db: Session) -> Dict[str, int]:
        """Collect database-related metrics."""
        try:
            # Get user counts
            total_users = db.query(User).count()
            
            # Get appointment counts
            total_appointments = db.query(Appointment).count()
            completed_appointments = db.query(Appointment).filter(
                Appointment.status == "completed"
            ).count()
            
            # Get activity counts (last 24 hours)
            yesterday = datetime.now() - timedelta(days=1)
            total_activities = db.query(AuditTrail).filter(
                AuditTrail.created_at >= yesterday
            ).count()
            
            return {
                "total_users": total_users,
                "active_users": total_users,  # Assuming all users are active
                "total_appointments": total_appointments,
                "completed_appointments": completed_appointments,
                "total_activities": total_activities
            }
        except Exception as e:
            print(f"Error collecting database metrics: {e}")
            return {
                "total_users": 0,
                "active_users": 0,
                "total_appointments": 0,
                "completed_appointments": 0,
                "total_activities": 0
            }
    
    def collect_hospital_metrics(self, db: Session, hospital_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Collect metrics for a specific hospital or system-wide."""
        # Collect system metrics
        system_metrics_data = self.collect_system_metrics()
        
        # Collect database metrics
        db_metrics = self.collect_database_metrics(db)
        
        # Combine all metrics
        metrics = {
            "avg_cpu_usage": system_metrics_data["cpu_usage"],
            "max_cpu_usage": system_metrics_data["cpu_usage"],  # For single sample
            "avg_memory_usage": system_metrics_data["memory_usage"],
            "max_memory_usage": system_metrics_data["memory_usage"],  # For single sample
            "avg_disk_usage": system_metrics_data["disk_usage"],
            "max_disk_usage": system_metrics_data["disk_usage"],  # For single sample
            "avg_process_count": system_metrics_data["process_count"],
            "max_process_count": system_metrics_data["process_count"],  # For single sample
            "system_uptime_hours": system_metrics_data["uptime_hours"],
            "error_count": 1 if "error" in system_metrics_data else 0,
            "warning_count": 0,  # Could be enhanced to detect warnings
            **db_metrics
        }
        
        return metrics
    
    def save_daily_metrics(
        self, 
        db: Session, 
        hospital_id: Optional[UUID] = None,
        metric_date: Optional[date] = None
    ) -> bool:
        """Save daily metrics for a hospital."""
        try:
            if metric_date is None:
                metric_date = date.today()
            
            # Collect metrics
            metrics_data = self.collect_hospital_metrics(db, hospital_id)
            
            # Save to database
            system_metrics.create_or_update_daily_metrics(
                db=db,
                hospital_id=hospital_id,
                metric_date=metric_date,
                metrics_data=metrics_data
            )
            
            print(f"✅ Saved daily metrics for hospital {hospital_id} on {metric_date}")
            return True
            
        except Exception as e:
            print(f"❌ Error saving daily metrics: {e}")
            return False
    
    def get_hospital_metrics_summary(
        self, 
        db: Session, 
        hospital_id: Optional[UUID] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get metrics summary for a hospital."""
        return system_metrics.get_metrics_summary(db, hospital_id, days)
    
    def get_latest_metrics(
        self, 
        db: Session, 
        hospital_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get the latest metrics for a hospital."""
        latest = system_metrics.get_latest_metrics(db, hospital_id)
        if latest:
            return {
                "hospital_id": str(latest.hospital_id) if latest.hospital_id else None,
                "metric_date": latest.metric_date.isoformat(),
                "cpu_usage": float(latest.avg_cpu_usage),
                "memory_usage": float(latest.avg_memory_usage),
                "disk_usage": float(latest.avg_disk_usage),
                "process_count": latest.avg_process_count,
                "uptime_hours": float(latest.system_uptime_hours),
                "total_users": latest.total_users,
                "total_appointments": latest.total_appointments,
                "status": latest.status,
                "is_healthy": latest.is_healthy
            }
        return None
    
    def collect_and_save_all_hospitals_metrics(self, db: Session) -> Dict[str, bool]:
        """Collect and save metrics for all hospitals (including system-wide)."""
        results = {}
        
        # Save system-wide metrics (hospital_id = None)
        results["system_wide"] = self.save_daily_metrics(db, hospital_id=None)
        
        # TODO: When hospitals are added, iterate through them
        # For now, we only have system-wide metrics
        
        return results


# Create service instance
system_metrics_service = SystemMetricsService()
