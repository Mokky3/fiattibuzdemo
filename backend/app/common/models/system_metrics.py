"""
System Metrics Model
Stores daily system performance metrics for each hospital.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from app.db.base_class import Base


class SystemMetrics(Base):
    """System metrics for daily hospital performance tracking."""
    
    __tablename__ = "system_metrics"
    __table_args__ = {"schema": "core"}
    
    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=None)
    
    # Hospital reference (nullable for system-wide metrics)
    hospital_id = Column(PostgresUUID(as_uuid=True), nullable=True)
    
    # Date for daily metrics
    metric_date = Column(Date, nullable=False)
    
    # System Performance Metrics
    avg_cpu_usage = Column(Numeric(5, 2), nullable=False)
    max_cpu_usage = Column(Numeric(5, 2), nullable=False)
    avg_memory_usage = Column(Numeric(5, 2), nullable=False)
    max_memory_usage = Column(Numeric(5, 2), nullable=False)
    avg_disk_usage = Column(Numeric(5, 2), nullable=False)
    max_disk_usage = Column(Numeric(5, 2), nullable=False)
    
    # Process Metrics
    avg_process_count = Column(Integer, nullable=False)
    max_process_count = Column(Integer, nullable=False)
    
    # Database Metrics
    total_users = Column(Integer, nullable=False, default=0)
    active_users = Column(Integer, nullable=False, default=0)
    total_appointments = Column(Integer, nullable=False, default=0)
    completed_appointments = Column(Integer, nullable=False, default=0)
    total_activities = Column(Integer, nullable=False, default=0)
    
    # System Health
    system_uptime_hours = Column(Numeric(8, 2), nullable=False)
    error_count = Column(Integer, nullable=False, default=0)
    warning_count = Column(Integer, nullable=False, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SystemMetrics(hospital_id={self.hospital_id}, date={self.metric_date}, cpu={self.avg_cpu_usage}%)>"
    
    @property
    def is_healthy(self) -> bool:
        """Check if system metrics indicate healthy status."""
        return (
            self.avg_cpu_usage < 80 and
            self.avg_memory_usage < 80 and
            self.avg_disk_usage < 90 and
            self.error_count == 0
        )
    
    @property
    def status(self) -> str:
        """Get system status based on metrics."""
        if self.avg_cpu_usage > 95 or self.avg_memory_usage > 95 or self.error_count > 0:
            return "degraded"
        elif self.avg_cpu_usage > 80 or self.avg_memory_usage > 80 or self.avg_disk_usage > 90:
            return "warning"
        else:
            return "operational"
