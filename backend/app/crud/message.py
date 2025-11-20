"""Message CRUD operations
Connected to message models and database operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.common.models.messaging import (
    Message, MessagePriority
)
from app.common.models.patient import Patient
from app.common.schemas.user_enhanced import MessageTypeEnhanced as MessageType
from app.common.models.user import User, UserRole
from app.crud.base import CRUDBase
from pydantic import BaseModel

# Simple Conversation class for messaging
class Conversation:
    def __init__(self, id: str, participants: list, last_message: str = None):
        self.id = id
        self.participants = participants
        self.last_message = last_message

# Simple MessageThread class for messaging
class MessageThread:
    def __init__(self, id: str, messages: list):
        self.id = id
        self.messages = messages

# ──────────────────────────────────────────────────────────────────────────────
# Message CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDMessage(CRUDBase[Message, BaseModel, BaseModel]):
    def get_messages_by_user(
        self,
        db: Session,
        user_id: str,
        conversation_id: Optional[str] = None,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[Message]:
        """Get messages for a specific user."""
        query = db.query(Message).filter(
            or_(
                Message.sender_id == user_id,
                Message.recipient_id == user_id
            )
        )
        
        if conversation_id:
            query = query.filter(Message.conversation_id == conversation_id)
        if unread_only:
            query = query.filter(
                and_(
                    Message.recipient_id == user_id,
                    Message.read == False
                )
            )
        
        return query.order_by(desc(Message.timestamp)).offset(skip).limit(limit).all()
    
    def get_conversations(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Conversation]:
        """Get conversations for a user."""
        # This would typically involve a more complex query to get conversation summaries
        # For now, we'll return a simplified version
        conversations = []
        
        # Get unique conversation partners
        partners_query = db.query(Message).filter(
            or_(
                Message.sender_id == user_id,
                Message.recipient_id == user_id
            )
        )
        
        if clinic_id:
            partners_query = partners_query.filter(Message.clinic_id == clinic_id)
        
        # Group by conversation partner
        partner_messages = {}
        for message in partners_query.all():
            partner_id = message.sender_id if message.recipient_id == user_id else message.recipient_id
            if partner_id not in partner_messages:
                partner_messages[partner_id] = []
            partner_messages[partner_id].append(message)
        
        # Create conversation summaries (linking patient info if exists)
        for partner_id, messages in partner_messages.items():
            if not messages:
                continue
                
            latest_message = max(messages, key=lambda m: m.timestamp)
            unread_count = sum(1 for m in messages if m.recipient_id == user_id and not m.read)
            
            # Get partner info (prefer Patient, fallback to User)
            patient = db.query(Patient).filter(Patient.patient_id == partner_id).first()
            partner = db.query(User).filter(User.id == partner_id).first()
            display_name = None
            avatar = None
            if patient:
                display_name = f"{patient.first_name} {patient.last_name}"
            elif partner:
                display_name = f"{partner.first_name} {partner.last_name}"
                avatar = partner.profile_image_url
            else:
                continue
            
            conversation = Conversation(
                id=f"{user_id}_{partner_id}",
                patient_id=partner_id,
                patient_name=display_name,
                last_message=latest_message.content,
                last_message_time=latest_message.timestamp.isoformat(),
                unread_count=unread_count,
                patient_avatar=avatar,
                clinic_id=latest_message.clinic_id,
                conversation_type="patient_doctor",
                priority=latest_message.priority,
                has_attachments=bool(latest_message.attachments)
            )
            conversations.append(conversation)
        
        # Sort by last message time
        conversations.sort(key=lambda c: c.last_message_time, reverse=True)
        
        return conversations[skip:skip + limit]
    
    def get_message_thread(
        self,
        db: Session,
        conversation_id: str,
        user_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> Optional[MessageThread]:
        """Get full message thread for a conversation."""
        # Parse conversation ID to get participants
        parts = conversation_id.split('_')
        if len(parts) != 2:
            return None
        
        user1_id, user2_id = parts
        
        # Get all messages in this conversation
        messages = db.query(Message).filter(
            and_(
                or_(
                    and_(Message.sender_id == user1_id, Message.recipient_id == user2_id),
                    and_(Message.sender_id == user2_id, Message.recipient_id == user1_id)
                ),
                Message.clinic_id.isnot(None)  # Ensure clinic scoping
            )
        ).order_by(asc(Message.timestamp)).offset(skip).limit(limit).all()
        
        if not messages:
            return None
        
        # Get patient info
        patient_id = user2_id if user_id == user1_id else user1_id
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient:
            return None
        
        # Mark messages as read for the requesting user
        for message in messages:
            if message.recipient_id == user_id and not message.read:
                self.update(db=db, db_obj=message, obj_in={
                    "read": True,
                    "read_at": datetime.now(timezone.utc)
                })
        
        return MessageThread(
            id=conversation_id,
            messages=messages
        )
    
    def send_message(
        self,
        db: Session,
        sender_id: str,
        recipient_id: str,
        content: str,
        clinic_id: str,
        message_type: MessageType = MessageType.TEXT,
        priority: MessagePriority = MessagePriority.NORMAL,
        parent_message_id: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> Message:
        """Send a new message."""
        message_data = {
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "content": content,
            "clinic_id": clinic_id,
            "message_type": message_type,
            "priority": priority,
            "parent_message_id": parent_message_id,
            "attachments": attachments or [],
            "status": MessageStatus.SENT,
            "read": False
        }
        
        message = self.create(db=db, obj_in=message_data)
        
        # Update conversation ID
        conversation_id = f"{sender_id}_{recipient_id}"
        self.update(db=db, db_obj=message, obj_in={"conversation_id": conversation_id})
        
        return message
    
    def mark_as_read(
        self,
        db: Session,
        message_id: str,
        user_id: str
    ) -> Optional[Message]:
        """Mark a message as read."""
        message = db.query(Message).filter(
            and_(
                Message.id == message_id,
                Message.recipient_id == user_id
            )
        ).first()
        
        if not message:
            return None
        
        return self.update(db=db, db_obj=message, obj_in={
            "read": True,
            "read_at": datetime.now(timezone.utc)
        })
    
    def mark_conversation_as_read(
        self,
        db: Session,
        conversation_id: str,
        user_id: str
    ) -> int:
        """Mark all messages in a conversation as read."""
        parts = conversation_id.split('_')
        if len(parts) != 2:
            return 0
        
        user1_id, user2_id = parts
        
        messages = db.query(Message).filter(
            and_(
                or_(
                    and_(Message.sender_id == user1_id, Message.recipient_id == user2_id),
                    and_(Message.sender_id == user2_id, Message.recipient_id == user1_id)
                ),
                Message.recipient_id == user_id,
                Message.read == False
            )
        ).all()
        
        updated_count = 0
        for message in messages:
            self.update(db=db, db_obj=message, obj_in={
                "read": True,
                "read_at": datetime.now(timezone.utc)
            })
            updated_count += 1
        
        return updated_count
    
    def get_unread_count(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None
    ) -> int:
        """Get unread message count for a user."""
        query = db.query(Message).filter(
            and_(
                Message.recipient_id == user_id,
                Message.read == False
            )
        )
        
        if clinic_id:
            query = query.filter(Message.clinic_id == clinic_id)
        
        return query.count()
    
    def get_message_statistics(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get message statistics for a user."""
        query = db.query(Message).filter(
            or_(
                Message.sender_id == user_id,
                Message.recipient_id == user_id
            )
        )
        
        if clinic_id:
            query = query.filter(Message.clinic_id == clinic_id)
        if start_date:
            query = query.filter(Message.timestamp >= start_date)
        if end_date:
            query = query.filter(Message.timestamp <= end_date)
        
        total_messages = query.count()
        sent_messages = query.filter(Message.sender_id == user_id).count()
        received_messages = query.filter(Message.recipient_id == user_id).count()
        unread_messages = query.filter(
            and_(
                Message.recipient_id == user_id,
                Message.read == False
            )
        ).count()
        
        # Count by type
        type_counts = {}
        for message_type in MessageType:
            count = query.filter(Message.message_type == message_type).count()
            type_counts[message_type.value] = count
        
        # Count by priority
        priority_counts = {}
        for priority in MessagePriority:
            count = query.filter(Message.priority == priority).count()
            priority_counts[priority.value] = count
        
        return {
            "total_messages": total_messages,
            "sent_messages": sent_messages,
            "received_messages": received_messages,
            "unread_messages": unread_messages,
            "type_counts": type_counts,
            "priority_counts": priority_counts,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
    
    def search_messages(
        self,
        db: Session,
        user_id: str,
        search_term: str,
        clinic_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Message]:
        """Search messages by content."""
        query = db.query(Message).filter(
            and_(
                or_(
                    Message.sender_id == user_id,
                    Message.recipient_id == user_id
                ),
                Message.content.ilike(f"%{search_term}%")
            )
        )
        
        if clinic_id:
            query = query.filter(Message.clinic_id == clinic_id)
        
        return query.order_by(desc(Message.timestamp)).offset(skip).limit(limit).all()
    
    def delete_message(
        self,
        db: Session,
        message_id: str,
        user_id: str
    ) -> bool:
        """Delete a message (soft delete for sender)."""
        message = db.query(Message).filter(
            and_(
                Message.id == message_id,
                Message.sender_id == user_id
            )
        ).first()
        
        if not message:
            return False
        
        # Soft delete by updating status
        self.update(db=db, db_obj=message, obj_in={
            "status": MessageStatus.DELETED,
            "deleted_at": datetime.now(timezone.utc)
        })
        
        return True

# ──────────────────────────────────────────────────────────────────────────────
# Create CRUD instance
# ──────────────────────────────────────────────────────────────────────────────

message = CRUDMessage(Message)
