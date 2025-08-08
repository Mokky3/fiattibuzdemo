# portals/doctor/routes/messages.py
from fastapi import APIRouter, Depends, Body, Query, HTTPException, Path
from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import uuid4
from datetime import datetime, timezone
from .auth import get_current_doctor, DoctorUser

router = APIRouter(prefix="/api/doctor", tags=["Doctor · Messages"])

# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────

class SendMessagePayload(BaseModel):
    recipient_id: str
    content: str

class Message(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    content: str
    timestamp: str          # ISO date-time
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    message_type: str = "text"  # text, image, file
    read: bool = False
    conversation_id: Optional[str] = None

class Conversation(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0
    patient_avatar: Optional[str] = None
    patient_issue: Optional[str] = None

class MessageThread(BaseModel):
    conversation_id: str
    patient: Dict[str, str]
    messages: List[Message]
    total_messages: int

# ──────────────────────────────────────────────────────────────────────────────
# Mock Data - Enhanced with realistic conversations
# ──────────────────────────────────────────────────────────────────────────────

# Mock patients data (normally would come from patients table)
_MOCK_PATIENTS = {
    "p1": {"id": "p1", "name": "Jane Doe", "issue": "Follow-up required", "avatar": "JD"},
    "p2": {"id": "p2", "name": "John Smith", "issue": "Back pain treatment", "avatar": "JS"},
    "p3": {"id": "p3", "name": "Mary Wilson", "issue": "Anxiety management", "avatar": "MW"},
    "p4": {"id": "p4", "name": "Robert Brown", "issue": "Chest pain consultation", "avatar": "RB"},
    "p5": {"id": "p5", "name": "Sarah Davis", "issue": "Routine checkup", "avatar": "SD"}
}

# In-memory message store
_MESSAGES: List[Message] = [
    # Conversation with Jane Doe
    Message(
        id="msg1",
        sender_id="p1",
        recipient_id="doc1",
        content="Hi Doctor, I wanted to thank you for the prescription. It's working great!",
        timestamp="2024-07-13T14:30:00Z",
        sender_name="Jane Doe",
        recipient_name="Dr. Khasanov",
        read=False,
        conversation_id="conv_p1_doc1"
    ),
    Message(
        id="msg2", 
        sender_id="doc1",
        recipient_id="p1",
        content="That's wonderful to hear, Jane! How are you feeling overall?",
        timestamp="2024-07-13T14:35:00Z",
        sender_name="Dr. Khasanov",
        recipient_name="Jane Doe",
        read=True,
        conversation_id="conv_p1_doc1"
    ),
    Message(
        id="msg3",
        sender_id="p1", 
        recipient_id="doc1",
        content="Much better, thank you! Should I continue with the same dosage?",
        timestamp="2024-07-13T14:40:00Z",
        sender_name="Jane Doe",
        recipient_name="Dr. Khasanov", 
        read=False,
        conversation_id="conv_p1_doc1"
    ),
    
    # Conversation with John Smith
    Message(
        id="msg4",
        sender_id="p2",
        recipient_id="doc1", 
        content="Doctor, I need a prescription refill for my back pain medication. Running low.",
        timestamp="2024-07-13T10:15:00Z",
        sender_name="John Smith",
        recipient_name="Dr. Khasanov",
        read=False,
        conversation_id="conv_p2_doc1"
    ),
    Message(
        id="msg5",
        sender_id="p2",
        recipient_id="doc1",
        content="Also, the pain has been getting worse lately. Should I be concerned?",
        timestamp="2024-07-13T10:17:00Z", 
        sender_name="John Smith",
        recipient_name="Dr. Khasanov",
        read=False,
        conversation_id="conv_p2_doc1"
    ),
    
    # Conversation with Mary Wilson
    Message(
        id="msg6",
        sender_id="p3",
        recipient_id="doc1",
        content="Hi Dr. Khasanov, our last appointment went really well. I'm feeling much better!",
        timestamp="2024-07-12T16:45:00Z",
        sender_name="Mary Wilson", 
        recipient_name="Dr. Khasanov",
        read=True,
        conversation_id="conv_p3_doc1"
    ),
    Message(
        id="msg7",
        sender_id="doc1",
        recipient_id="p3",
        content="That's fantastic news, Mary! Keep up with the exercises we discussed.",
        timestamp="2024-07-12T17:00:00Z",
        sender_name="Dr. Khasanov",
        recipient_name="Mary Wilson", 
        read=True,
        conversation_id="conv_p3_doc1"
    ),
    
    # Conversation with Robert Brown
    Message(
        id="msg8",
        sender_id="p4",
        recipient_id="doc1",
        content="Dr. Khasanov, can we please reschedule tomorrow's appointment? Something urgent came up at work.",
        timestamp="2024-07-13T09:20:00Z",
        sender_name="Robert Brown",
        recipient_name="Dr. Khasanov",
        read=False,
        conversation_id="conv_p4_doc1"
    )
]

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions 
# ──────────────────────────────────────────────────────────────────────────────

def get_conversation_id(patient_id: str, doctor_id: str) -> str:
    """Generate consistent conversation ID"""
    return f"conv_{patient_id}_{doctor_id}"

def get_conversations_list(doctor_id: str) -> List[Conversation]:
    """Get list of conversations for a doctor"""
    conversations = {}
    
    # Group messages by patient
    for message in _MESSAGES:
        if message.recipient_id == doctor_id or message.sender_id == doctor_id:
            # Determine patient ID
            patient_id = message.sender_id if message.sender_id != doctor_id else message.recipient_id
            
            if patient_id not in conversations:
                patient_info = _MOCK_PATIENTS.get(patient_id, {})
                conversations[patient_id] = {
                    "patient_id": patient_id,
                    "patient_name": patient_info.get("name", "Unknown Patient"),
                    "patient_avatar": patient_info.get("avatar", "??"),
                    "patient_issue": patient_info.get("issue", ""),
                    "messages": [],
                    "unread_count": 0
                }
            
            conversations[patient_id]["messages"].append(message)
            
            # Count unread messages from patient to doctor
            if message.recipient_id == doctor_id and not message.read:
                conversations[patient_id]["unread_count"] += 1
    
    # Convert to Conversation objects
    conv_list = []
    for patient_id, conv_data in conversations.items():
        # Get last message
        messages = sorted(conv_data["messages"], key=lambda x: x.timestamp)
        last_message = messages[-1] if messages else None
        
        conversation = Conversation(
            id=get_conversation_id(patient_id, doctor_id),
            patient_id=patient_id,
            patient_name=conv_data["patient_name"],
            patient_avatar=conv_data["patient_avatar"],
            patient_issue=conv_data["patient_issue"],
            last_message=last_message.content[:50] + "..." if last_message and len(last_message.content) > 50 else last_message.content if last_message else None,
            last_message_time=last_message.timestamp if last_message else None,
            unread_count=conv_data["unread_count"]
        )
        conv_list.append(conversation)
    
    # Sort by last message time (most recent first)
    conv_list.sort(key=lambda x: x.last_message_time or "", reverse=True)
    return conv_list

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/send-message", status_code=201, response_model=Message)
async def send_message(
    payload: SendMessagePayload = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
):
    """Send a message to a patient"""
    # Get patient info for names
    patient_info = _MOCK_PATIENTS.get(payload.recipient_id, {})
    
    message = Message(
        id=f"msg{uuid4().hex[:6]}",
        sender_id=current.id,
        recipient_id=payload.recipient_id,
        content=payload.content,
        timestamp=datetime.now(timezone.utc).isoformat(),
        sender_name=current.full_name,
        recipient_name=patient_info.get("name", "Unknown Patient"),
        read=True,  # Doctor's own messages are marked as read
        conversation_id=get_conversation_id(payload.recipient_id, current.id)
    )
    
    _MESSAGES.append(message)
    return message

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get all conversations for the doctor"""
    return get_conversations_list(current.id)

@router.get("/conversations/{patient_id}/messages", response_model=MessageThread)
async def get_conversation_messages(
    patient_id: str = Path(..., description="Patient ID"),
    limit: Optional[int] = Query(50, description="Number of messages to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination"),
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get messages for a specific conversation"""
    conversation_id = get_conversation_id(patient_id, current.id)
    
    # Get all messages for this conversation
    conversation_messages = [
        msg for msg in _MESSAGES 
        if msg.conversation_id == conversation_id
    ]
    
    # Sort by timestamp
    conversation_messages.sort(key=lambda x: x.timestamp)
    
    # Apply pagination
    total_messages = len(conversation_messages)
    paginated_messages = conversation_messages[offset:offset + limit]
    
    # Get patient info
    patient_info = _MOCK_PATIENTS.get(patient_id, {})
    
    return MessageThread(
        conversation_id=conversation_id,
        patient={
            "id": patient_id,
            "name": patient_info.get("name", "Unknown Patient"),
            "avatar": patient_info.get("avatar", "??"),
            "issue": patient_info.get("issue", "")
        },
        messages=paginated_messages,
        total_messages=total_messages
    )

@router.post("/conversations/{patient_id}/mark-read")
async def mark_conversation_read(
    patient_id: str = Path(..., description="Patient ID"),
    current: DoctorUser = Depends(get_current_doctor)
):
    """Mark all messages in a conversation as read"""
    conversation_id = get_conversation_id(patient_id, current.id)
    
    # Mark all unread messages from patient as read
    for message in _MESSAGES:
        if (message.conversation_id == conversation_id and 
            message.recipient_id == current.id and 
            not message.read):
            message.read = True
    
    return {"message": "Conversation marked as read"}

@router.get("/messages/unread", response_model=List[Message])
async def get_unread_messages(
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get all unread messages for the doctor"""
    unread_messages = [
        msg for msg in _MESSAGES 
        if msg.recipient_id == current.id and not msg.read
    ]
    
    # Sort by timestamp (most recent first)
    unread_messages.sort(key=lambda x: x.timestamp, reverse=True)
    return unread_messages

@router.get("/messages/stats")
async def get_message_stats(
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get message statistics for the doctor"""
    total_conversations = len(get_conversations_list(current.id))
    
    unread_count = len([
        msg for msg in _MESSAGES 
        if msg.recipient_id == current.id and not msg.read
    ])
    
    total_messages_sent = len([
        msg for msg in _MESSAGES 
        if msg.sender_id == current.id
    ])
    
    total_messages_received = len([
        msg for msg in _MESSAGES 
        if msg.recipient_id == current.id
    ])
    
    return {
        "total_conversations": total_conversations,
        "unread_messages": unread_count,
        "messages_sent": total_messages_sent,
        "messages_received": total_messages_received,
        "total_messages": len(_MESSAGES)
    }

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str = Path(..., description="Message ID"),
    current: DoctorUser = Depends(get_current_doctor)
):
    """Delete a message (only if sender)"""
    global _MESSAGES
    
    message_to_delete = None
    for i, msg in enumerate(_MESSAGES):
        if msg.id == message_id:
            if msg.sender_id != current.id:
                raise HTTPException(status_code=403, detail="Can only delete your own messages")
            message_to_delete = i
            break
    
    if message_to_delete is None:
        raise HTTPException(status_code=404, detail="Message not found")
    
    del _MESSAGES[message_to_delete]
    return {"message": "Message deleted successfully"}

# ──────────────────────────────────────────────────────────────────────────────
# Routes for compatibility with existing frontend
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/patients-for-messaging", response_model=List[Dict])
async def get_patients_for_messaging(
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get patients list formatted for the messaging UI (compatible with DoctorMessages.jsx)"""
    conversations = get_conversations_list(current.id)
    
    # Format for the existing frontend component
    patients_list = []
    for conv in conversations:
        patients_list.append({
            "id": conv.patient_id,
            "name": conv.patient_name,
            "issue": conv.patient_issue,
            "avatar": conv.patient_avatar,
            "unread_count": conv.unread_count,
            "last_message": conv.last_message,
            "last_message_time": conv.last_message_time
        })
    
    return patients_list