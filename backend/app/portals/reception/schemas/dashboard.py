# app/portals/reception/schemas/dashboard.py
"""Dashboard and analytics schemas."""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.common.schemas.base import Priority, NotificationType


# ============================= Dashboard Components =============================
class DashboardStats(BaseModel):
    """Main dashboard statistics."""
    total_appointments: int = Field(..., alias="totalAppointments")
    checked_in: int = Field(..., alias="checkedIn")
    walk_ins: int = Field(..., alias="walkIns")
    waiting: int
    
    class Config:
        populate_by_name = True


class UpcomingAppointment(BaseModel):
    """Upcoming appointment summary for dashboard."""
    id: str
    time: str
    patient: str
    doctor: str
    type: str
    status: str
    
    class Config:
        from_attributes = True


class Task(BaseModel):
    """Reception task item."""
    id: str
    task: str = Field(..., min_length=5, max_length=200)
    completed: bool = False
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None
    created_at: str
    
    class Config:
        from_attributes = True


class Notification(BaseModel):
    """System notification."""
    id: str
    message: str
    time: str
    type: NotificationType = NotificationType.INFO
    read: bool = False
    action_required: bool = False
    
    class Config:
        from_attributes = True


class QuickOverview(BaseModel):
    """Quick overview statistics."""
    total_today: int
    completed: int
    pending: int
    completion_rate: float = Field(..., ge=0.0, le=100.0)


class DashboardData(BaseModel):
    """Complete dashboard data response."""
    stats: DashboardStats
    upcoming_appointments: List[UpcomingAppointment]
    tasks: List[Task]
    notifications: List[Notification]
    quick_overview: QuickOverview


# ============================= Task Management =============================
class TaskCreate(BaseModel):
    """Create task request schema."""
    task: str = Field(..., min_length=5, max_length=200)
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    """Update task request schema."""
    completed: Optional[bool] = None
    priority: Optional[Priority] = None
    due_date: Optional[str] = None


# ============================= Activity Feed =============================
class ActivityFeedItem(BaseModel):
    """Activity feed item for dashboard."""
    id: str
    type: str  # appointment_created, task_created, task_completed, etc.
    message: str
    time: str
    details: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        from_attributes = True


# ============================= Quick Actions =============================
class QuickAction(BaseModel):
    """Quick action button configuration."""
    id: str
    label: str
    icon: str
    enabled: bool = True


class QuickActionsData(BaseModel):
    """Quick actions panel data."""
    pending_tasks: int
    unread_notifications: int
    today_appointments: int
    recent_walk_ins: int
    actions: List[QuickAction]


# ============================= Analytics =============================
class TimeSeriesData(BaseModel):
    """Time series data point."""
    timestamp: datetime
    value: float
    label: Optional[str] = None


class ChartData(BaseModel):
    """Generic chart data structure."""
    labels: List[str]
    datasets: List[Dict[str, Any]]
    chart_type: str = "line"  # line, bar, pie, doughnut


class PerformanceMetrics(BaseModel):
    """Reception performance metrics."""
    average_wait_time: int  # minutes
    check_in_rate: float  # percentage
    appointments_per_day: float
    patient_satisfaction: Optional[float] = None
    busiest_hours: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True