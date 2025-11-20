# portals/doctor/routes/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import uuid4
from datetime import date, datetime, timezone
from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.admin import admin as admin_crud
from app.crud.todo import todo as todo_crud
from app.crud.message import message as message_crud
from app.crud.patient import patient as patient_crud

router = APIRouter(tags=["Doctor · Dashboard"])

# ────── Pydantic models (local, mapped to shared response) ─────────────────
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

@router.get("/messages", response_model=SuccessResponse[List[Message]])
async def list_messages(
    limit: Optional[int] = Query(10, description="Number of messages to return"),
    unread_only: Optional[bool] = Query(False, description="Return only unread messages"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get recent messages with optional filtering from database"""
    try:
        # Get messages from database
        db_messages = message_crud.get_messages_by_user(
            db=db,
            user_id=current_doctor.id,
            unread_only=unread_only,
            limit=limit
        )
        
        # Convert database messages to dashboard format
        dashboard_messages = []
        for msg in db_messages:
            # Get patient name for sender
            patient_name = "Unknown Patient"
            if msg.sender_id:
                patient = patient_crud.get(db=db, id=msg.sender_id)
                if patient:
                    patient_name = f"{patient.first_name} {patient.last_name}".strip()
            
            # Create avatar from patient name
            avatar = "".join([name[0].upper() for name in patient_name.split()[:2]])
            if not avatar:
                avatar = "P"
            
            dashboard_message = Message(
                id=str(msg.id),
                name=patient_name,
                avatar=avatar,
                lastMessage=msg.content or "No message content",
                timestamp=msg.timestamp.isoformat() if msg.timestamp else None,
                unread=not msg.read if msg.recipient_id == current_doctor.id else False,
                sender_id=msg.sender_id
            )
            dashboard_messages.append(dashboard_message)
        
        # Sort by timestamp (most recent first)
        dashboard_messages.sort(key=lambda x: x.timestamp or "", reverse=True)
        
        return SuccessResponse(data=dashboard_messages, message="Messages retrieved")
        
    except Exception as e:
        # Log error but return empty array instead of mock data
        print(f"Error fetching messages from database: {e}")
        return SuccessResponse(data=[], message="No messages available")

@router.post("/messages/{message_id}/mark-read", response_model=SuccessResponse[Dict[str, str]])
async def mark_message_read(
    message_id: str = Path(..., description="Message ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Mark a message as read"""
    for message in _MESSAGES:
        if message.id == message_id:
            message.unread = False
            return SuccessResponse(data={"status": "marked"}, message="Message marked as read")
    
    raise HTTPException(status_code=404, detail="Message not found")

@router.get("/todos", response_model=SuccessResponse[List[Todo]])
async def list_todos(
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[str] = Query(None, description="Filter by priority: low, medium, high"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get todos with optional filtering (DB)."""
    try:
        todos_db = todo_crud.get_todos_by_user(
            db,
            user_id=current.id,
            completed=completed,
            priority=priority,
            category=category,
        )
        items = [
            Todo(
                id=str(t.id),
                date=t.date,
                description=t.description,
                provider=t.created_by,
                completed=t.completed,
                priority=t.priority,
                category=t.category,
                created_at=t.created_at.isoformat() if t.created_at else None,
            )
            for t in todos_db
        ]
        return SuccessResponse(data=items, message="Todos retrieved")
    except Exception as e:
        print(f"Error fetching todos from database: {e}")
        # Return empty array instead of failing
        return SuccessResponse(data=[], message="No todos available")

@router.patch("/todos/{todo_id}", response_model=SuccessResponse[Todo])
async def toggle_todo(
    todo_id: str = Path(..., description="Todo ID"),
    data: TodoToggle = Body(default_factory=TodoToggle),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    """Toggle todo completion status or update completion manually (DB)."""
    updated = todo_crud.toggle_todo(
        db,
        todo_id=todo_id,
        user_id=current.id,
        completed=data.completed,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Todo not found")
    item = Todo(
        id=str(updated.id),
        date=updated.date,
        description=updated.description,
        provider=updated.created_by,
        completed=updated.completed,
        priority=updated.priority,
        category=updated.category,
        created_at=updated.created_at.isoformat() if updated.created_at else None,
    )
    return SuccessResponse(data=item, message="Todo updated")

@router.post("/todos", response_model=SuccessResponse[Todo])
async def create_todo(
    todo_data: Todo,
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Create a new todo item (DB)."""
    created = todo_crud.create_todo(
        db,
        description=todo_data.description,
        created_by=current.id,
        assigned_to=current.id,
        priority=todo_data.priority,
        category=todo_data.category,
    )
    item = Todo(
        id=str(created.id),
        date=created.date,
        description=created.description,
        provider=created.created_by,
        completed=created.completed,
        priority=created.priority,
        category=created.category,
        created_at=created.created_at.isoformat() if created.created_at else None,
    )
    return SuccessResponse(data=item, message="Todo created")

@router.delete("/todos/{todo_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_todo(
    todo_id: str = Path(..., description="Todo ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Delete a todo item (DB)."""
    ok = todo_crud.delete_todo(db, todo_id=todo_id, user_id=current.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Todo not found")
    return SuccessResponse(data={"status": "deleted"}, message="Todo deleted")

@router.get("/appointments/{appt_date}", response_model=SuccessResponse[List[Appointment]])
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
    return SuccessResponse(data=appointments, message="Appointments retrieved")

@router.get("/appointments/range/{start_date}/{end_date}", response_model=SuccessResponse[List[Appointment]])
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
    return SuccessResponse(data=appointments, message="Appointments retrieved")

@router.get("/stats", response_model=SuccessResponse[DashboardStats])
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
    
    return SuccessResponse(
        data=DashboardStats(
            total_appointments=total_appointments,
            pending_todos=pending_todos,
            unread_messages=unread_messages,
            today_appointments=today_appointments,
            completed_todos=completed_todos,
            upcoming_appointments=upcoming_appointments
        ),
        message="Stats retrieved"
    )

@router.get("/overview", response_model=SuccessResponse[Dict[str, object]])
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
    
    return SuccessResponse(
        data={
            "stats": stats,
            "today_appointments": today_appointments[:5],
            "pending_todos": pending_todos[:5],
            "recent_messages": unread_messages[:3],
            "last_updated": datetime.now(timezone.utc).isoformat()
        },
        message="Overview retrieved"
    )

@router.get("/health", response_model=SuccessResponse[Dict[str, object]])
async def dashboard_health_check(db: Session = Depends(get_db)):
    """Health check endpoint specifically for dashboard using system health."""
    system_health = admin_crud.get_system_health(db)
    return SuccessResponse(
        data={
            "status": system_health.get("overall_status", "healthy"),
            "service": "dashboard",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": system_health.get("components", {}),
            "metrics": system_health.get("metrics", {}),
        },
        message="OK"
    )