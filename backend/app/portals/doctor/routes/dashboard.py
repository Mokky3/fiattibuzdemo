# portals/doctor/routes/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import uuid4
from datetime import date, datetime, timezone
from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor/dashboard", tags=["Doctor · Dashboard"])

# ────── Pydantic models ─────────────────────────────────────────
class Message(BaseModel):
    id: str
    name: str
    avatar: str
    lastMessage: str
    timestamp: Optional[str] = None
    unread: bool = True
    sender_id: Optional[str] = None

class Todo(BaseModel):
    id: str
    date: str         # ISO YYYY-MM-DD
    description: str
    provider: str
    completed: bool = False
    priority: str = "medium"  # low, medium, high
    category: Optional[str] = None
    created_at: Optional[str] = None

class Appointment(BaseModel):
    id: str
    date: str         # ISO YYYY-MM-DD
    time: str         # "09:30"
    patient: str
    problem: str
    description: str
    provider: str
    status: str = "upcoming"
    patient_id: Optional[str] = None
    appointment_type: Optional[str] = None

class DashboardStats(BaseModel):
    total_appointments: int
    pending_todos: int
    unread_messages: int
    today_appointments: int
    completed_todos: int
    upcoming_appointments: int

class TodoToggle(BaseModel):
    completed: Optional[bool] = None

# ────── Enhanced in-memory stores (seeded with demo data) ────────────────
_MESSAGES: List[Message] = [
    Message(
        id="m1", 
        name="Jane Doe", 
        avatar="JD", 
        lastMessage="Thanks for the prescription, doctor!",
        timestamp="2024-07-13T14:30:00Z",
        unread=True,
        sender_id="p1"
    ),
    Message(
        id="m2", 
        name="John Smith", 
        avatar="JS", 
        lastMessage="Need prescription refill for my back pain medication",
        timestamp="2024-07-13T10:15:00Z",
        unread=True,
        sender_id="p2"
    ),
    Message(
        id="m3", 
        name="Mary Wilson", 
        avatar="MW", 
        lastMessage="Appointment went well, feeling much better",
        timestamp="2024-07-12T16:45:00Z",
        unread=False,
        sender_id="p3"
    ),
    Message(
        id="m4", 
        name="Robert Brown", 
        avatar="RB", 
        lastMessage="Can we reschedule tomorrow's appointment?",
        timestamp="2024-07-13T09:20:00Z",
        unread=True,
        sender_id="p4"
    )
]

_TODOS: Dict[str, Todo] = {
    "t1": Todo(
        id="t1", 
        date="2024-07-14", 
        description="Review lab results for Jane Doe",
        provider="Lab Technician Anvar",
        completed=False,
        priority="high",
        category="lab_review",
        created_at="2024-07-13T08:00:00Z"
    ),
    "t2": Todo(
        id="t2", 
        date="2024-07-13", 
        description="Approve MRI scan report",
        provider="Radiology Department",
        completed=True,
        priority="medium",
        category="imaging",
        created_at="2024-07-12T15:30:00Z"
    ),
    "t3": Todo(
        id="t3", 
        date="2024-07-15", 
        description="Update patient treatment plan",
        provider="Nurse Gulnara",
        completed=False,
        priority="medium",
        category="treatment",
        created_at="2024-07-13T11:00:00Z"
    ),
    "t4": Todo(
        id="t4", 
        date="2024-07-14", 
        description="Sign prescription renewals",
        provider="Pharmacy",
        completed=False,
        priority="high",
        category="prescriptions",
        created_at="2024-07-13T13:15:00Z"
    ),
    "t5": Todo(
        id="t5", 
        date="2024-07-13", 
        description="Call patient about test results",
        provider="Dr. Khasanov",
        completed=True,
        priority="high",
        category="communication",
        created_at="2024-07-13T07:30:00Z"
    )
}

_APPOINTMENTS: List[Appointment] = [
    Appointment(
        id="a1",
        date="2024-07-13",
        time="09:00",
        patient="Jane Doe",
        problem="Follow-up",
        description="Routine checkup and lab result review",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p1",
        appointment_type="Follow-up"
    ),
    Appointment(
        id="a2",
        date="2024-07-13",
        time="10:30",
        patient="John Smith",
        problem="Back pain",
        description="Initial consultation for chronic back pain",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p2",
        appointment_type="Consultation"
    ),
    Appointment(
        id="a3",
        date="2024-07-13",
        time="14:00",
        patient="Mary Wilson",
        problem="Anxiety management",
        description="Therapy session for anxiety treatment",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p3",
        appointment_type="Therapy"
    ),
    Appointment(
        id="a4",
        date="2024-07-14",
        time="09:30",
        patient="Robert Brown",
        problem="Emergency consultation",
        description="Urgent check for chest pain symptoms",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p4",
        appointment_type="Emergency"
    ),
    Appointment(
        id="a5",
        date="2024-07-14",
        time="11:00",
        patient="Sarah Davis",
        problem="Routine checkup",
        description="Annual health screening",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p5",
        appointment_type="Checkup"
    ),
    Appointment(
        id="a6",
        date="2024-07-15",
        time="15:30",
        patient="David Lee",
        problem="Medication review",
        description="Review current medications and dosages",
        provider="Dr. Khasanov",
        status="upcoming",
        patient_id="p6",
        appointment_type="Medication Review"
    )
]

# ────── routes ─────────────────────────────────────────────────

@router.get("/messages", response_model=List[Message])
async def list_messages(
    limit: Optional[int] = Query(10, description="Number of messages to return"),
    unread_only: Optional[bool] = Query(False, description="Return only unread messages"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get recent messages with optional filtering"""
    messages = _MESSAGES.copy()
    
    if unread_only:
        messages = [msg for msg in messages if msg.unread]
    
    # Sort by timestamp (most recent first)
    messages.sort(key=lambda x: x.timestamp or "", reverse=True)
    
    return messages[:limit]

@router.post("/messages/{message_id}/mark-read")
async def mark_message_read(
    message_id: str = Path(..., description="Message ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Mark a message as read"""
    for message in _MESSAGES:
        if message.id == message_id:
            message.unread = False
            return {"message": "Message marked as read"}
    
    raise HTTPException(status_code=404, detail="Message not found")

@router.get("/todos", response_model=List[Todo])
async def list_todos(
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[str] = Query(None, description="Filter by priority: low, medium, high"),
    category: Optional[str] = Query(None, description="Filter by category"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get todos with optional filtering"""
    todos = list(_TODOS.values())
    
    if completed is not None:
        todos = [todo for todo in todos if todo.completed == completed]
    
    if priority:
        todos = [todo for todo in todos if todo.priority == priority]
    
    if category:
        todos = [todo for todo in todos if todo.category == category]
    
    # Sort by priority (high first) then by date
    priority_order = {"high": 0, "medium": 1, "low": 2}
    todos.sort(key=lambda x: (priority_order.get(x.priority, 1), x.date))
    
    return todos

@router.patch("/todos/{todo_id}", response_model=Todo)
async def toggle_todo(
    todo_id: str = Path(..., description="Todo ID"),
    data: TodoToggle = Body(default_factory=TodoToggle),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Toggle todo completion status or update completion manually"""
    if todo_id not in _TODOS:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    todo = _TODOS[todo_id]
    
    if data.completed is not None:
        # Explicit completion status provided
        new_completed = data.completed
    else:
        # Toggle current status
        new_completed = not todo.completed
    
    _TODOS[todo_id] = todo.copy(update={"completed": new_completed})
    return _TODOS[todo_id]

@router.post("/todos", response_model=Todo)
async def create_todo(
    todo_data: Todo,
    _: DoctorUser = Depends(get_current_doctor)
):
    """Create a new todo item"""
    new_id = f"t{uuid4().hex[:6]}"
    todo_data.id = new_id
    todo_data.created_at = datetime.now(timezone.utc).isoformat()
    
    _TODOS[new_id] = todo_data
    return todo_data

@router.delete("/todos/{todo_id}")
async def delete_todo(
    todo_id: str = Path(..., description="Todo ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Delete a todo item"""
    if todo_id not in _TODOS:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    del _TODOS[todo_id]
    return {"message": "Todo deleted successfully"}

@router.get("/appointments/{appt_date}", response_model=List[Appointment])
async def list_appointments_for_date(
    appt_date: str = Path(..., description="Date in YYYY-MM-DD format"),
    status: Optional[str] = Query(None, description="Filter by status"),
    _: DoctorUser = Depends(get_current_doctor),
):
    """Get appointments for a specific date with optional status filtering"""
    appointments = [a for a in _APPOINTMENTS if a.date == appt_date]
    
    if status:
        appointments = [a for a in appointments if a.status == status]
    
    # Sort by time
    appointments.sort(key=lambda x: x.time)
    return appointments

@router.get("/appointments/range/{start_date}/{end_date}", response_model=List[Appointment])
async def list_appointments_for_range(
    start_date: str = Path(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Path(..., description="End date in YYYY-MM-DD format"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get appointments for a date range"""
    appointments = [
        a for a in _APPOINTMENTS 
        if start_date <= a.date <= end_date
    ]
    
    appointments.sort(key=lambda x: (x.date, x.time))
    return appointments

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(_: DoctorUser = Depends(get_current_doctor)):
    """Get dashboard statistics for overview"""
    today = date.today().isoformat()
    
    # Count appointments
    total_appointments = len(_APPOINTMENTS)
    today_appointments = len([a for a in _APPOINTMENTS if a.date == today])
    upcoming_appointments = len([a for a in _APPOINTMENTS if a.date >= today and a.status == "upcoming"])
    
    # Count todos
    pending_todos = len([t for t in _TODOS.values() if not t.completed])
    completed_todos = len([t for t in _TODOS.values() if t.completed])
    
    # Count messages
    unread_messages = len([m for m in _MESSAGES if m.unread])
    
    return DashboardStats(
        total_appointments=total_appointments,
        pending_todos=pending_todos,
        unread_messages=unread_messages,
        today_appointments=today_appointments,
        completed_todos=completed_todos,
        upcoming_appointments=upcoming_appointments
    )

@router.get("/overview")
async def get_dashboard_overview(_: DoctorUser = Depends(get_current_doctor)):
    """Get complete dashboard overview with recent data"""
    today = date.today().isoformat()
    
    # Get today's appointments
    today_appointments = [a for a in _APPOINTMENTS if a.date == today]
    today_appointments.sort(key=lambda x: x.time)
    
    # Get pending todos (high priority first)
    pending_todos = [t for t in _TODOS.values() if not t.completed]
    priority_order = {"high": 0, "medium": 1, "low": 2}
    pending_todos.sort(key=lambda x: priority_order.get(x.priority, 1))
    
    # Get recent unread messages
    unread_messages = [m for m in _MESSAGES if m.unread]
    unread_messages.sort(key=lambda x: x.timestamp or "", reverse=True)
    
    # Get stats
    stats = {
        "total_appointments": len(_APPOINTMENTS),
        "pending_todos": len(pending_todos),
        "unread_messages": len(unread_messages),
        "today_appointments": len(today_appointments),
        "completed_todos": len([t for t in _TODOS.values() if t.completed])
    }
    
    return {
        "stats": stats,
        "today_appointments": today_appointments[:5],  # Limit to 5 most recent
        "pending_todos": pending_todos[:5],  # Limit to 5 highest priority
        "recent_messages": unread_messages[:3],  # Limit to 3 most recent
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health")
async def dashboard_health_check():
    """Health check endpoint specifically for dashboard"""
    return {
        "status": "healthy",
        "service": "dashboard",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_counts": {
            "appointments": len(_APPOINTMENTS),
            "todos": len(_TODOS),
            "messages": len(_MESSAGES)
        }
    }