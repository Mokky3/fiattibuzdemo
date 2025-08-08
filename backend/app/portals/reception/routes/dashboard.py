"""Reception portal – dashboard router
Provides aggregated data for the ReceptionDashboard.jsx component.
Includes real-time stats, upcoming appointments, tasks, and notifications.
"""
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from pydantic import BaseModel, Field

from .auth import get_current_receptionist, ReceptionistUser
# from db import fhir_repo  # TODO: implement FHIR repository

router = APIRouter(prefix="/api/v1/dashboard", tags=["Reception · Dashboard"])

# ─────────────────────────────────────────────────────────────── Dashboard DTOs ──
class DashboardStats(BaseModel):
    totalAppointments: int
    checkedIn: int
    walkIns: int
    waiting: int
    
class UpcomingAppointment(BaseModel):
    id: str
    time: str
    patient: str
    doctor: str
    type: str
    status: str
    
class Task(BaseModel):
    id: str
    task: str
    completed: bool
    priority: str  # low | medium | high
    due_date: Optional[str] = None
    created_at: str
    
class Notification(BaseModel):
    id: str
    message: str
    time: str
    type: str  # info | warning | urgent | success
    read: bool = False
    action_required: bool = False

class QuickOverview(BaseModel):
    total_today: int
    completed: int
    pending: int
    completion_rate: float

class DashboardData(BaseModel):
    stats: DashboardStats
    upcoming_appointments: List[UpcomingAppointment]
    tasks: List[Task]
    notifications: List[Notification]
    quick_overview: QuickOverview

# ──────────────────────────────────────────────────────── In-Memory Storage ───
_TASKS: Dict[str, Task] = {}
_NOTIFICATIONS: Dict[str, Notification] = {}

# Initialize with some default tasks
_DEFAULT_TASKS = [
    {
        "id": "task-1",
        "task": "Verify patient insurance for 11:00 AM visit",
        "completed": False,
        "priority": "high",
        "created_at": datetime.now().isoformat()
    },
    {
        "id": "task-2", 
        "task": "Print reports for cardiology department",
        "completed": True,
        "priority": "medium",
        "created_at": (datetime.now() - timedelta(hours=2)).isoformat()
    },
    {
        "id": "task-3",
        "task": "Prepare files for new patient intake",
        "completed": False,
        "priority": "low",
        "created_at": (datetime.now() - timedelta(minutes=30)).isoformat()
    },
    {
        "id": "task-4",
        "task": "Call patient to confirm tomorrow appointment",
        "completed": False,
        "priority": "high",
        "due_date": (datetime.now() + timedelta(hours=2)).isoformat(),
        "created_at": (datetime.now() - timedelta(hours=1)).isoformat()
    }
]

# Initialize tasks
for task_data in _DEFAULT_TASKS:
    _TASKS[task_data["id"]] = Task(**task_data)

# ──────────────────────────────────────────────────────── Helper Functions ───
def _reverse_appointment_status(fhir_status: str) -> str:
    """Convert FHIR status to frontend status."""
    status_map = {
        "proposed": "pending",
        "booked": "confirmed", 
        "arrived": "checked-in",
        "fulfilled": "completed",
        "cancelled": "cancelled"
    }
    return status_map.get(fhir_status, "pending")

async def _resolve_patient_name(patient_ref: str) -> str:
    """Resolve patient reference to name."""
    if not patient_ref.startswith("Patient/"):
        return "Unknown Patient"
    
    patient_id = patient_ref.split("/")[1]
    patient = fhir_repo.get("Patient", patient_id)
    
    if not patient:
        return "Unknown Patient"
    
    name_obj = patient.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    return f"{' '.join(given)} {family}".strip() or "Unknown Patient"

async def _resolve_doctor_name(practitioner_ref: str) -> str:
    """Resolve practitioner reference to doctor name."""
    if not practitioner_ref.startswith("Practitioner/"):
        return "Unknown Doctor"
    
    doctor_id = practitioner_ref.split("/")[1]
    practitioner = fhir_repo.get("Practitioner", doctor_id)
    
    if not practitioner:
        return "Unknown Doctor"
    
    name_obj = practitioner.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    return f"Dr. {' '.join(given)} {family}".strip() or "Unknown Doctor"

def _generate_system_notifications() -> List[Notification]:
    """Generate system notifications based on current state."""
    notifications = []
    
    # Check for overdue tasks
    overdue_tasks = [t for t in _TASKS.values() 
                    if not t.completed and t.due_date and 
                    datetime.fromisoformat(t.due_date) < datetime.now()]
    
    if overdue_tasks:
        notifications.append(Notification(
            id=f"notif-overdue-{datetime.now().timestamp()}",
            message=f"{len(overdue_tasks)} overdue task(s) require attention",
            time=datetime.now().isoformat(),
            type="warning",
            action_required=True
        ))
    
    # Check for high priority incomplete tasks
    urgent_tasks = [t for t in _TASKS.values() 
                   if not t.completed and t.priority == "high"]
    
    if urgent_tasks:
        notifications.append(Notification(
            id=f"notif-urgent-{datetime.now().timestamp()}",
            message=f"{len(urgent_tasks)} high priority task(s) pending",
            time=datetime.now().isoformat(),
            type="urgent",
            action_required=True
        ))
    
    # Add some example notifications
    base_notifications = [
        Notification(
            id="notif-1",
            message="New walk-in patient registered",
            time=(datetime.now() - timedelta(minutes=5)).isoformat(),
            type="info"
        ),
        Notification(
            id="notif-2", 
            message="Dr. Smith running 15 minutes late",
            time=(datetime.now() - timedelta(minutes=10)).isoformat(),
            type="warning"
        ),
        Notification(
            id="notif-3",
            message="Insurance verification needed for next patient",
            time=(datetime.now() - timedelta(minutes=20)).isoformat(),
            type="urgent",
            action_required=True
        )
    ]
    
    return notifications + base_notifications

# ───────────────────────────────────────────────────────────── Dashboard Routes ─────────
@router.get("", response_model=DashboardData)
async def get_dashboard_data(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get complete dashboard data in a single request."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    # Get appointment statistics
    stats = await get_appointment_stats(target_date, current)
    
    # Get upcoming appointments
    upcoming = await get_upcoming_appointments(limit=4, current=current)
    
    # Get tasks
    tasks = list(_TASKS.values())
    tasks.sort(key=lambda x: (x.completed, x.priority != "high", x.created_at), reverse=True)
    
    # Get notifications
    notifications = _generate_system_notifications()
    notifications.extend(_NOTIFICATIONS.values())
    notifications.sort(key=lambda x: x.time, reverse=True)
    
    # Calculate quick overview
    today_appointments = stats.totalAppointments
    completed_appointments = stats.checkedIn
    pending_appointments = today_appointments - completed_appointments
    completion_rate = (completed_appointments / today_appointments * 100) if today_appointments > 0 else 0
    
    quick_overview = QuickOverview(
        total_today=today_appointments,
        completed=completed_appointments,
        pending=pending_appointments,
        completion_rate=round(completion_rate, 1)
    )
    
    return DashboardData(
        stats=stats,
        upcoming_appointments=upcoming[:4],  # Limit to 4 for dashboard
        tasks=tasks[:6],  # Limit to 6 for dashboard
        notifications=notifications[:5],  # Limit to 5 for dashboard
        quick_overview=quick_overview
    )

@router.get("/stats", response_model=DashboardStats)
async def get_appointment_stats(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get appointment statistics for specified date."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    # Get all appointments for the date
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    
    total_appointments = 0
    checked_in = 0
    completed = 0
    walk_ins = 0
    
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res or apt_res["start"][:10] != target_date:
            continue
        
        total_appointments += 1
        status = _reverse_appointment_status(apt_res["status"])
        
        if status == "checked-in":
            checked_in += 1
        elif status == "completed":
            completed += 1
        
        # Check if it's a walk-in (created same day as appointment)
        created_date = bundle.get("timestamp", "")[:10]
        if created_date == target_date:
            walk_ins += 1
    
    waiting = checked_in  # Simplified: checked-in patients are waiting
    
    return DashboardStats(
        totalAppointments=total_appointments,
        checkedIn=checked_in + completed,
        walkIns=walk_ins,
        waiting=waiting
    )

@router.get("/upcoming", response_model=List[UpcomingAppointment])
async def get_upcoming_appointments(
    limit: int = Query(10, ge=1, le=50),
    hours_ahead: int = Query(24, ge=1, le=168),  # Max 1 week
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get upcoming appointments for the next specified hours."""
    now = datetime.now()
    end_time = now + timedelta(hours=hours_ahead)
    
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    upcoming = []
    
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res:
            continue
        
        # Parse appointment datetime
        apt_start = datetime.fromisoformat(apt_res["start"].replace('+05:00', '+00:00'))
        
        # Filter for upcoming appointments
        if apt_start < now or apt_start > end_time:
            continue
        
        status = _reverse_appointment_status(apt_res["status"])
        if status in ["cancelled", "completed"]:
            continue
        
        # Resolve patient and doctor names
        participants = apt_res.get("participant", [])
        patient_ref = next((p["actor"]["reference"] for p in participants 
                          if p["actor"]["reference"].startswith("Patient/")), "Patient/unknown")
        doctor_ref = next((p["actor"]["reference"] for p in participants 
                         if p["actor"]["reference"].startswith("Practitioner/")), "Practitioner/unknown")
        
        patient_name = await _resolve_patient_name(patient_ref)
        doctor_name = await _resolve_doctor_name(doctor_ref)
        
        # Determine appointment type from reason or description
        apt_type = "General Consultation"
        if apt_res.get("reasonCode"):
            apt_type = apt_res["reasonCode"][0].get("coding", [{}])[0].get("display", apt_type)
        elif apt_res.get("description"):
            desc = apt_res["description"].lower()
            if "follow" in desc:
                apt_type = "Follow-up Visit"
            elif "check" in desc:
                apt_type = "Check-up"
            elif "procedure" in desc:
                apt_type = "Procedure"
        
        upcoming.append(UpcomingAppointment(
            id=apt_res["id"],
            time=apt_res["start"][11:16],  # HH:MM format
            patient=patient_name,
            doctor=doctor_name,
            type=apt_type,
            status=status
        ))
    
    # Sort by appointment time
    upcoming.sort(key=lambda x: x.time)
    
    return upcoming[:limit]

@router.get("/tasks", response_model=List[Task])
async def get_tasks(
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[str] = Query(None, description="Filter by priority: low|medium|high"),
    limit: int = Query(20, ge=1, le=100),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get reception tasks with filtering."""
    tasks = list(_TASKS.values())
    
    # Apply filters
    if completed is not None:
        tasks = [t for t in tasks if t.completed == completed]
    
    if priority:
        tasks = [t for t in tasks if t.priority == priority]
    
    # Sort by priority and creation time
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(key=lambda x: (x.completed, priority_order.get(x.priority, 3), x.created_at), reverse=True)
    
    return tasks[:limit]

class TaskCreate(BaseModel):
    task: str = Field(..., min_length=5, max_length=200)
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    due_date: Optional[str] = None

@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Create a new reception task."""
    task_id = f"task-{uuid4().hex[:8]}"
    
    task = Task(
        id=task_id,
        task=task_data.task,
        completed=False,
        priority=task_data.priority,
        due_date=task_data.due_date,
        created_at=datetime.now().isoformat()
    )
    
    _TASKS[task_id] = task
    return task

class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    due_date: Optional[str] = None

@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Update a task."""
    if task_id not in _TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _TASKS[task_id]
    
    if updates.completed is not None:
        task.completed = updates.completed
    if updates.priority is not None:
        task.priority = updates.priority
    if updates.due_date is not None:
        task.due_date = updates.due_date
    
    return task

@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Delete a task."""
    if task_id not in _TASKS:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del _TASKS[task_id]

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    unread_only: bool = Query(False),
    type_filter: Optional[str] = Query(None, description="Filter by type: info|warning|urgent|success"),
    limit: int = Query(20, ge=1, le=100),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get notifications with filtering."""
    notifications = _generate_system_notifications()
    notifications.extend(_NOTIFICATIONS.values())
    
    # Apply filters
    if unread_only:
        notifications = [n for n in notifications if not n.read]
    
    if type_filter:
        notifications = [n for n in notifications if n.type == type_filter]
    
    # Sort by time (newest first)
    notifications.sort(key=lambda x: x.time, reverse=True)
    
    return notifications[:limit]

@router.post("/notifications/{notification_id}/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: str,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Mark a notification as read."""
    if notification_id in _NOTIFICATIONS:
        _NOTIFICATIONS[notification_id].read = True

@router.post("/notifications/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Mark all notifications as read."""
    for notification in _NOTIFICATIONS.values():
        notification.read = True

class NotificationCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=200)
    type: str = Field("info", pattern="^(info|warning|urgent|success)$")
    action_required: bool = False

@router.post("/notifications", response_model=Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Create a new notification."""
    notification_id = f"notif-{uuid4().hex[:8]}"
    
    notification = Notification(
        id=notification_id,
        message=notification_data.message,
        time=datetime.now().isoformat(),
        type=notification_data.type,
        action_required=notification_data.action_required
    )
    
    _NOTIFICATIONS[notification_id] = notification
    return notification

@router.get("/quick-actions", response_model=Dict[str, Any])
async def get_quick_actions_data(
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get data needed for quick action buttons."""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Count pending tasks
    pending_tasks = len([t for t in _TASKS.values() if not t.completed])
    
    # Count unread notifications
    notifications = _generate_system_notifications()
    notifications.extend(_NOTIFICATIONS.values())
    unread_notifications = len([n for n in notifications if not n.read])
    
    # Count today's appointments
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    today_appointments = len([b for b in bundles 
                            if b["entry"] and b["entry"][0]["resource"]["start"][:10] == today])
    
    # Get recent walk-ins
    recent_walk_ins = len([b for b in bundles 
                         if b["entry"] and 
                         b["entry"][0]["resource"]["start"][:10] == today and
                         b.get("timestamp", "")[:10] == today])
    
    return {
        "pending_tasks": pending_tasks,
        "unread_notifications": unread_notifications,
        "today_appointments": today_appointments,
        "recent_walk_ins": recent_walk_ins,
        "actions": [
            {
                "id": "call_patient",
                "label": "Call Patient",
                "icon": "phone",
                "enabled": today_appointments > 0
            },
            {
                "id": "register_walkin",
                "label": "Register Walk-In",
                "icon": "user-plus",
                "enabled": True
            },
            {
                "id": "print_reports",
                "label": "Print Reports",
                "icon": "printer",
                "enabled": True
            },
            {
                "id": "schedule_appointment",
                "label": "Schedule Appointment",
                "icon": "calendar",
                "enabled": True
            }
        ]
    }

@router.get("/overview", response_model=QuickOverview)
async def get_quick_overview(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get quick overview statistics."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    total_today = 0
    completed = 0
    
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res or apt_res["start"][:10] != target_date:
            continue
        
        total_today += 1
        status = _reverse_appointment_status(apt_res["status"])
        
        if status in ["completed", "checked-in"]:
            completed += 1
    
    pending = total_today - completed
    completion_rate = (completed / total_today * 100) if total_today > 0 else 0
    
    return QuickOverview(
        total_today=total_today,
        completed=completed,
        pending=pending,
        completion_rate=round(completion_rate, 1)
    )

@router.get("/activity-feed", response_model=List[Dict[str, Any]])
async def get_activity_feed(
    limit: int = Query(10, ge=1, le=50),
    hours_back: int = Query(24, ge=1, le=168),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get recent activity feed for dashboard."""
    cutoff_time = datetime.now() - timedelta(hours=hours_back)
    activities = []
    
    # Get recent appointments
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res:
            continue
        
        created_time = datetime.fromisoformat(bundle.get("timestamp", "").replace('Z', '+00:00'))
        if created_time < cutoff_time:
            continue
        
        # Resolve patient name
        participants = apt_res.get("participant", [])
        patient_ref = next((p["actor"]["reference"] for p in participants 
                          if p["actor"]["reference"].startswith("Patient/")), "Patient/unknown")
        patient_name = await _resolve_patient_name(patient_ref)
        
        activities.append({
            "id": f"apt-{apt_res['id']}",
            "type": "appointment_created",
            "message": f"New appointment scheduled for {patient_name}",
            "time": created_time.isoformat(),
            "details": {
                "patient": patient_name,
                "date": apt_res["start"][:10],
                "time": apt_res["start"][11:16]
            }
        })
    
    # Get recent tasks
    for task in _TASKS.values():
        task_time = datetime.fromisoformat(task.created_at)
        if task_time < cutoff_time:
            continue
        
        activities.append({
            "id": f"task-{task.id}",
            "type": "task_created" if not task.completed else "task_completed",
            "message": f"Task {'completed' if task.completed else 'created'}: {task.task[:50]}...",
            "time": task.created_at,
            "details": {
                "priority": task.priority,
                "completed": task.completed
            }
        })
    
    # Sort by time (newest first)
    activities.sort(key=lambda x: x["time"], reverse=True)
    
    return activities[:limit]