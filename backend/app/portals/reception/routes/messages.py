"""Reception portal – patient messaging router - ENHANCED
Enhanced features:
- Real patient data resolution
- Message status tracking (read/unread)
- Real-time WebSocket updates
- Message search and filtering
- Attachment support
- Message templates
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, status, Query, WebSocket, WebSocketDisconnect, File, UploadFile
from pydantic import BaseModel

from .auth import get_current_receptionist, ReceptionistUser
# from db import fhir_repo  # TODO: implement FHIR repository
# from services.notifications import send_sms_notification, send_email_notification  # TODO: implement notifications

router = APIRouter(prefix="/api/v1/messages", tags=["Reception · Messages"])

# ─────────────────────────────────────────────────────────────── Enhanced DTOs ──
class SendMessage(BaseModel):
    patient_id: str
    text: str
    message_type: str = "general"  # general | appointment | reminder | urgent
    template_id: Optional[str] = None

class ConversationItem(BaseModel):
    id: str
    sender: str               # "patient" | "reception"
    text: str
    time: str                 # ISO‑8601
    read: bool = False
    message_type: str = "general"
    attachment_url: Optional[str] = None

class ConversationMeta(BaseModel):
    patient_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    lastMessage: str          # human readable ("2 min ago")
    lastMessageText: str      # actual message content preview
    issue: str | None = None
    active: bool = False
    unread_count: int = 0
    priority: str = "normal"  # normal | urgent

class MessageStats(BaseModel):
    total_conversations: int
    unread_messages: int
    urgent_messages: int
    active_conversations: int

class MessageTemplate(BaseModel):
    id: str
    name: str
    content: str
    category: str
    variables: List[str] = []

# ──────────────────────────────────────────────────────── Enhanced Storage ───
# Enhanced in‑memory thread index with metadata
_THREADS: Dict[str, List[str]] = {}
_MESSAGE_METADATA: Dict[str, Dict] = {}  # message_id -> metadata
_PATIENT_CACHE: Dict[str, Dict] = {}     # patient_id -> patient data
_WS_CONNECTIONS: List[WebSocket] = []    # Active WebSocket connections

# Message templates
_MESSAGE_TEMPLATES: Dict[str, MessageTemplate] = {
    "appointment_reminder": MessageTemplate(
        id="appointment_reminder",
        name="Appointment Reminder",
        content="Dear {patient_name}, this is a reminder for your appointment on {date} at {time} with {doctor}. Please arrive 15 minutes early.",
        category="appointment",
        variables=["patient_name", "date", "time", "doctor"]
    ),
    "appointment_confirmation": MessageTemplate(
        id="appointment_confirmation", 
        name="Appointment Confirmation",
        content="Your appointment has been confirmed for {date} at {time}. If you need to reschedule, please call us at {clinic_phone}.",
        category="appointment",
        variables=["date", "time", "clinic_phone"]
    ),
    "test_results": MessageTemplate(
        id="test_results",
        name="Test Results Available",
        content="Hello {patient_name}, your test results are now available. Please contact us to schedule a follow-up appointment to discuss the results.",
        category="medical",
        variables=["patient_name"]
    ),
    "payment_reminder": MessageTemplate(
        id="payment_reminder",
        name="Payment Reminder", 
        content="Dear {patient_name}, you have an outstanding balance of {amount}. Please contact our billing department at {billing_phone} to arrange payment.",
        category="billing",
        variables=["patient_name", "amount", "billing_phone"]
    )
}

# ──────────────────────────────────────────────────────── Enhanced Helpers ───
async def _resolve_patient_data(patient_id: str) -> Dict:
    """Get patient details from FHIR store with caching."""
    if patient_id in _PATIENT_CACHE:
        return _PATIENT_CACHE[patient_id]
    
    patient = fhir_repo.get("Patient", patient_id)
    if not patient:
        return {
            "name": f"Patient {patient_id}",
            "phone": None,
            "email": None,
            "id": patient_id
        }
    
    # Extract patient data
    name_obj = patient.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    full_name = f"{' '.join(given)} {family}".strip() or f"Patient {patient_id}"
    
    telecom = patient.get("telecom", [])
    phone = next((t["value"] for t in telecom if t["system"] == "phone"), None)
    email = next((t["value"] for t in telecom if t["system"] == "email"), None)
    
    result = {
        "name": full_name,
        "phone": phone,
        "email": email,
        "id": patient_id
    }
    
    _PATIENT_CACHE[patient_id] = result
    return result

def _make_comm(patient_id: str, sender: str, text: str, message_type: str = "general") -> tuple:
    """Create FHIR Communication resource with enhanced metadata."""
    comm_id = f"comm-{uuid4().hex[:8]}"
    authored = datetime.now(timezone.utc)
    
    resource = {
        "resourceType": "Communication",
        "id": comm_id,
        "status": "completed",
        "sent": authored.isoformat(),
        "subject": {"reference": f"Patient/{patient_id}"},
        "sender": {"identifier": {"value": sender}},
        "payload": [{"contentString": text}],
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/communication-category",
                "code": message_type,
                "display": message_type.title()
            }]
        }],
        "meta": {
            "lastUpdated": authored.isoformat(),
            "source": "reception-portal"
        }
    }
    
    return comm_id, resource, authored

async def _broadcast_message_update(message_data: Dict):
    """Broadcast message updates to connected WebSocket clients."""
    if not _WS_CONNECTIONS:
        return
    
    disconnected = []
    for ws in _WS_CONNECTIONS:
        try:
            await ws.send_json({
                "type": "new_message",
                "data": message_data
            })
        except:
            disconnected.append(ws)
    
    # Remove disconnected clients
    for ws in disconnected:
        _WS_CONNECTIONS.remove(ws)

def _format_time_ago(dt: datetime) -> str:
    """Format datetime to human-readable time ago."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    diff = now - dt
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} min ago"
    else:
        return "just now"

# ───────────────────────────────────────────────────────────── Enhanced Routes ─────────
@router.get("/conversations", response_model=List[ConversationMeta])
async def list_conversations(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: str = Query("", description="Search patient names"),
    unread_only: bool = Query(False),
    priority: str = Query("all", description="all|normal|urgent"),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Enhanced conversation listing with search and filtering."""
    conversations: List[ConversationMeta] = []
    
    for pid, comm_ids in _THREADS.items():
        if not comm_ids:
            continue
        
        # Get patient data
        patient_data = await _resolve_patient_data(pid)
        
        # Apply search filter
        if search and search.lower() not in patient_data["name"].lower():
            continue
        
        # Get last communication
        last_comm = fhir_repo.get(comm_ids[-1])
        if not last_comm:
            continue
        
        last_text = last_comm["payload"][0]["contentString"]
        last_time = datetime.fromisoformat(last_comm["sent"].replace('Z', '+00:00'))
        
        # Count unread messages (messages from patient that haven't been read)
        unread_count = 0
        urgent_count = 0
        
        for comm_id in reversed(comm_ids):  # Check recent messages
            comm = fhir_repo.get(comm_id)
            if not comm:
                continue
            
            sender = comm["sender"]["identifier"]["value"]
            is_read = _MESSAGE_METADATA.get(comm_id, {}).get("read", sender == "reception")
            
            if sender == "patient" and not is_read:
                unread_count += 1
            
            # Check for urgent category
            categories = comm.get("category", [])
            if any(cat.get("coding", [{}])[0].get("code") == "urgent" for cat in categories):
                urgent_count += 1
        
        # Determine priority
        conv_priority = "urgent" if urgent_count > 0 else "normal"
        
        # Apply filters
        if unread_only and unread_count == 0:
            continue
        if priority != "all" and conv_priority != priority:
            continue
        
        conversations.append(
            ConversationMeta(
                patient_id=pid,
                patient_name=patient_data["name"],
                patient_phone=patient_data["phone"],
                patient_email=patient_data["email"],
                lastMessage=_format_time_ago(last_time),
                lastMessageText=last_text[:50] + "..." if len(last_text) > 50 else last_text,
                issue=last_text[:30] + "..." if len(last_text) > 30 else last_text,
                active=unread_count > 0,
                unread_count=unread_count,
                priority=conv_priority
            )
        )
    
    # Sort by last message time (most recent first)
    conversations.sort(key=lambda x: x.lastMessage)
    
    # Apply pagination
    start = (page - 1) * size
    end = start + size
    return conversations[start:end]

@router.get("/{patient_id}", response_model=List[ConversationItem])
async def get_conversation(
    patient_id: str = Path(...),
    mark_as_read: bool = Query(True, description="Mark messages as read"),
    limit: int = Query(100, ge=1, le=500),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get conversation thread with enhanced metadata."""
    comm_ids = _THREADS.get(patient_id, [])
    thread = []
    
    # Get recent messages (limit)
    recent_comm_ids = comm_ids[-limit:] if len(comm_ids) > limit else comm_ids
    
    for cid in recent_comm_ids:
        comm = fhir_repo.get(cid)
        if not comm:
            continue
        
        sender = comm["sender"]["identifier"]["value"]
        is_reception = sender == "reception"
        
        # Get message metadata
        metadata = _MESSAGE_METADATA.get(cid, {})
        is_read = metadata.get("read", is_reception)  # Reception messages are auto-read
        
        # Mark patient messages as read if requested
        if mark_as_read and not is_reception and not is_read:
            _MESSAGE_METADATA[cid] = {**metadata, "read": True}
        
        # Extract message type from category
        categories = comm.get("category", [])
        message_type = "general"
        if categories:
            message_type = categories[0].get("coding", [{}])[0].get("code", "general")
        
        thread.append(
            ConversationItem(
                id=cid,
                sender="reception" if is_reception else "patient",
                text=comm["payload"][0]["contentString"],
                time=comm["sent"],
                read=is_read or is_reception,
                message_type=message_type,
                attachment_url=metadata.get("attachment_url")
            )
        )
    
    return thread

@router.post("", status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: SendMessage,
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Send message with template support and notifications."""
    
    # Process template if provided
    message_text = payload.text
    if payload.template_id and payload.template_id in _MESSAGE_TEMPLATES:
        template = _MESSAGE_TEMPLATES[payload.template_id]
        
        # Get patient data for template variables
        patient_data = await _resolve_patient_data(payload.patient_id)
        
        # Basic variable substitution (in real app, use proper template engine)
        variables = {
            "patient_name": patient_data["name"],
            "clinic_phone": "+1 (555) 123-4567",  # From settings
            "date": "DATE_PLACEHOLDER",
            "time": "TIME_PLACEHOLDER",
            "doctor": "DOCTOR_PLACEHOLDER"
        }
        
        message_text = template.content
        for var, value in variables.items():
            message_text = message_text.replace(f"{{{var}}}", value)
    
    comm_id, comm_res, sent_time = _make_comm(payload.patient_id, "reception", message_text, payload.message_type)

    # Persist to FHIR
    fhir_repo.save(comm_id, comm_res)

    # Update thread index
    _THREADS.setdefault(payload.patient_id, []).append(comm_id)
    
    # Mark as read (sent by reception)
    _MESSAGE_METADATA[comm_id] = {"read": True, "sent_by": user.user_id}

    # Send external notifications based on patient preferences
    patient_data = await _resolve_patient_data(payload.patient_id)
    
    try:
        # Send SMS if patient has phone and message is urgent
        if patient_data["phone"] and payload.message_type in ["urgent", "appointment"]:
            await send_sms_notification(patient_data["phone"], message_text)
        
        # Send email if patient has email
        if patient_data["email"]:
            await send_email_notification(
                patient_data["email"], 
                f"Message from {user.clinic_name or 'FIATTIB Medical Center'}", 
                message_text
            )
    except Exception as e:
        print(f"Failed to send external notifications: {e}")
    
    # Broadcast to WebSocket clients
    await _broadcast_message_update({
        "conversation_id": payload.patient_id,
        "message": {
            "id": comm_id,
            "sender": "reception",
            "text": message_text,
            "time": sent_time.isoformat(),
            "message_type": payload.message_type
        }
    })

    return {"id": comm_id, "sent_at": sent_time.isoformat()}

@router.post("/{patient_id}/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_conversation_read(
    patient_id: str = Path(...),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Mark all messages in conversation as read."""
    comm_ids = _THREADS.get(patient_id, [])
    
    for comm_id in comm_ids:
        comm = fhir_repo.get(comm_id)
        if comm and comm["sender"]["identifier"]["value"] == "patient":
            _MESSAGE_METADATA[comm_id] = {
                **_MESSAGE_METADATA.get(comm_id, {}),
                "read": True,
                "read_by": user.user_id,
                "read_at": datetime.now(timezone.utc).isoformat()
            }

@router.get("/stats", response_model=MessageStats)
async def get_message_stats(
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get message statistics for dashboard."""
    total_conversations = len(_THREADS)
    unread_messages = 0
    urgent_messages = 0
    active_conversations = 0
    
    for pid, comm_ids in _THREADS.items():
        has_unread = False
        has_urgent = False
        
        for comm_id in comm_ids:
            comm = fhir_repo.get(comm_id)
            if not comm:
                continue
            
            sender = comm["sender"]["identifier"]["value"]
            is_read = _MESSAGE_METADATA.get(comm_id, {}).get("read", sender == "reception")
            
            if sender == "patient" and not is_read:
                unread_messages += 1
                has_unread = True
            
            # Check for urgent messages
            categories = comm.get("category", [])
            if any(cat.get("coding", [{}])[0].get("code") == "urgent" for cat in categories):
                urgent_messages += 1
                has_urgent = True
        
        if has_unread or has_urgent:
            active_conversations += 1
    
    return MessageStats(
        total_conversations=total_conversations,
        unread_messages=unread_messages,
        urgent_messages=urgent_messages,
        active_conversations=active_conversations
    )

@router.get("/templates", response_model=List[MessageTemplate])
async def get_message_templates(
    category: str = Query("all", description="Filter by category"),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get available message templates."""
    templates = list(_MESSAGE_TEMPLATES.values())
    
    if category != "all":
        templates = [t for t in templates if t.category == category]
    
    return templates

@router.post("/templates", response_model=MessageTemplate, status_code=status.HTTP_201_CREATED)
async def create_message_template(
    template: MessageTemplate,
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Create new message template."""
    if not template.id:
        template.id = f"template-{uuid4().hex[:8]}"
    
    _MESSAGE_TEMPLATES[template.id] = template
    return template

@router.post("/{patient_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    patient_id: str,
    file: UploadFile = File(...),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Upload file attachment to conversation."""
    # Validate file type and size
    max_size = 10 * 1024 * 1024  # 10MB
    allowed_types = ["image/jpeg", "image/png", "application/pdf", "text/plain"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(400, "File type not allowed")
    
    # Read file content
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(400, "File too large")
    
    # Create Binary resource for file storage
    binary_id = f"bin-{uuid4().hex[:8]}"
    binary_resource = {
        "resourceType": "Binary",
        "id": binary_id,
        "contentType": file.content_type,
        "data": content.hex(),  # Store as hex string for simplicity
        "meta": {
            "lastUpdated": datetime.now(timezone.utc).isoformat()
        }
    }
    
    fhir_repo.save(binary_id, binary_resource)
    
    # Create message with attachment reference
    message_text = f"📎 Attachment: {file.filename}"
    comm_id, comm_res, sent_time = _make_comm(patient_id, "reception", message_text, "attachment")
    
    # Add attachment reference to Communication
    comm_res["payload"].append({
        "contentAttachment": {
            "contentType": file.content_type,
            "url": f"Binary/{binary_id}",
            "title": file.filename,
            "size": len(content)
        }
    })
    
    fhir_repo.save(comm_id, comm_res)
    _THREADS.setdefault(patient_id, []).append(comm_id)
    
    # Store attachment metadata
    _MESSAGE_METADATA[comm_id] = {
        "read": True,
        "attachment_url": f"/api/v1/messages/attachments/{binary_id}",
        "filename": file.filename
    }
    
    return {
        "id": comm_id,
        "attachment_id": binary_id,
        "filename": file.filename,
        "size": len(content)
    }

@router.get("/attachments/{binary_id}")
async def download_attachment(
    binary_id: str,
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Download attachment file."""
    binary_resource = fhir_repo.get("Binary", binary_id)
    if not binary_resource:
        raise HTTPException(404, "Attachment not found")
    
    # Return file content (in real app, would stream from file storage)
    from fastapi.responses import Response
    
    content = bytes.fromhex(binary_resource["data"])
    return Response(
        content=content,
        media_type=binary_resource["contentType"],
        headers={"Content-Disposition": f"attachment; filename=attachment-{binary_id}"}
    )

# ──────────────────────────────────────────────────────── WebSocket Support ─────────
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time message updates."""
    await websocket.accept()
    _WS_CONNECTIONS.append(websocket)
    
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            # Could handle typing indicators, presence, etc.
            
    except WebSocketDisconnect:
        _WS_CONNECTIONS.remove(websocket)

# ──────────────────────────────────────────────────────── Simulation Endpoints ─────────
@router.post("/simulate-patient-message", status_code=status.HTTP_201_CREATED)
async def simulate_patient_message(
    patient_id: str = Body(..., embed=True),
    message: str = Body(..., embed=True),
    user: ReceptionistUser = Depends(get_current_receptionist),
):
    """Simulate receiving a message from a patient (for testing)."""
    comm_id, comm_res, sent_time = _make_comm(patient_id, "patient", message, "general")
    
    fhir_repo.save(comm_id, comm_res)
    _THREADS.setdefault(patient_id, []).append(comm_id)
    
    # Mark as unread
    _MESSAGE_METADATA[comm_id] = {"read": False}
    
    # Broadcast to reception
    await _broadcast_message_update({
        "conversation_id": patient_id,
        "message": {
            "id": comm_id,
            "sender": "patient", 
            "text": message,
            "time": sent_time.isoformat(),
            "read": False
        }
    })
    
    return {"id": comm_id, "received_at": sent_time.isoformat()}