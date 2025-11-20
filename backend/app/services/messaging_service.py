"""Centralized messaging service for all portals."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from uuid import UUID, uuid4
import os
import httpx
from pathlib import Path

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import exists
from pydantic import BaseModel

from app.common.models.messaging import (
    Message, MessageAttachment, MessageTemplate, MessageType, MessagePriority,
    MessageThread, MessageThreadParticipant, MessageReceipt, MessageThreadType
)
from app.common.models.user import User
from app.common.models.patient import Patient
from app.common.models.doctor import Doctor
from app.common.models.nurse import Nurse
from app.services.fhir_client import FHIRClient


class SendMessageRequest(BaseModel):
    sender_id: str
    recipient_id: Optional[str] = None
    patient_id: Optional[str] = None
    content: str
    message_type: str = "text"
    priority: str = "normal"
    subject: Optional[str] = None
    parent_message_id: Optional[str] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None


class ConversationThread(BaseModel):
    thread_id: str
    participants: List[Dict[str, str]]
    messages: List[Dict[str, Any]]
    unread_count: int
    last_message_at: datetime
    is_active: bool = True


class MessagingService:
    """Centralized service for messaging across all portals."""
    
    def __init__(self, db: Session):
        self.db = db
        self.fhir_client = FHIRClient()
        self.upload_dir = Path("uploads/messages")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    async def send_message(
        self,
        sender_id: str,
        recipient_id: str,
        content: str,
        message_type: str = "text",
        priority: str = "normal",
        metadata: Optional[Dict[str, Any]] = None,
        thread_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None,
        clinic_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a message with thread management, audit, and notifications."""
        # Convert string IDs to UUID objects for database columns that are UUID type
        from uuid import UUID as UUIDType
        
        # Convert sender_id to UUID
        try:
            sender_id_uuid = UUIDType(sender_id) if isinstance(sender_id, str) else sender_id
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid sender_id format: {sender_id}")
        
        # Handle recipient_id: it might be a patient_id, so we need to get the patient's user_id
        recipient_id_uuid = None
        patient_id_uuid = None
        
        # First, check if recipient_id is actually a patient_id
        if recipient_id:
            try:
                recipient_id_parsed = UUIDType(recipient_id) if isinstance(recipient_id, str) else recipient_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid recipient_id format: {recipient_id}")
            
            # Check if this is a patient_id by querying the Patient table
            patient = self.db.query(Patient).filter(Patient.patient_id == recipient_id_parsed).first()
            if patient and patient.user_id:
                # recipient_id is actually a patient_id, so get the patient's user_id
                patient_id_uuid = recipient_id_parsed
                recipient_id_uuid = patient.user_id  # Use patient's user_id as recipient_id
            else:
                # recipient_id is a user_id, check if it exists in User table
                user = self.db.query(User).filter(User.id == recipient_id_parsed).first()
                if not user:
                    raise HTTPException(status_code=404, detail=f"Recipient not found: {recipient_id}")
                recipient_id_uuid = recipient_id_parsed
        
        # If patient_id was explicitly provided, use it
        if patient_id and not patient_id_uuid:
            try:
                patient_id_uuid = UUIDType(patient_id) if isinstance(patient_id, str) else patient_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid patient_id format: {patient_id}")
        
        # Create or get thread - NOW we have patient_id_uuid determined
        if thread_id:
            thread = self.db.query(MessageThread).filter(MessageThread.id == thread_id).first()
            if not thread:
                raise HTTPException(status_code=404, detail="Thread not found")
        else:
            # For staff-to-staff messaging, find or create thread using the same format as get_conversation_messages
            if not patient_id_uuid and recipient_id_uuid:
                # Staff-to-staff messaging - use the same thread ID format as get_conversation_messages
                # Sort user IDs to ensure consistent thread ID regardless of sender/recipient order
                user_ids = [str(sender_id_uuid), str(recipient_id_uuid)]
                user_ids.sort()  # Sort to ensure consistent thread ID
                staff_thread_id = f"thread_staff_{user_ids[0]}_{user_ids[1]}"
                thread = self.db.query(MessageThread).filter(MessageThread.id == staff_thread_id).first()
                
                # Log thread lookup for debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Staff-to-staff messaging: sender={sender_id_uuid}, recipient={recipient_id_uuid}, thread_id={staff_thread_id}, thread_found={thread is not None}")
                
                # Determine actual roles from User model (needed whether thread exists or not)
                sender_user = self.db.query(User).filter(User.id == sender_id_uuid).first()
                recipient_user = self.db.query(User).filter(User.id == recipient_id_uuid).first()
                
                sender_role = "staff"  # Default
                if sender_user:
                    # Map UserRole enum to string role
                    from app.common.models.user import UserRole
                    role_map = {
                        UserRole.DOCTOR: "doctor",
                        UserRole.NURSE: "nurse",
                        UserRole.LAB_TECHNICIAN: "lab_technician",
                        UserRole.RECEPTIONIST: "receptionist",
                        UserRole.CLINIC_ADMIN: "clinic_admin",
                        UserRole.SUPER_ADMIN: "admin"
                    }
                    sender_role = role_map.get(sender_user.role, "staff")
                
                recipient_role = "staff"  # Default
                if recipient_user:
                    from app.common.models.user import UserRole
                    role_map = {
                        UserRole.DOCTOR: "doctor",
                        UserRole.NURSE: "nurse",
                        UserRole.LAB_TECHNICIAN: "lab_technician",
                        UserRole.RECEPTIONIST: "receptionist",
                        UserRole.CLINIC_ADMIN: "clinic_admin",
                        UserRole.SUPER_ADMIN: "admin"
                    }
                    recipient_role = role_map.get(recipient_user.role, "staff")
                
                if not thread:
                    # Create new staff chat thread with the correct thread ID format
                    thread = MessageThread(
                        id=staff_thread_id,
                        thread_type=MessageThreadType.STAFF_CHAT.value,
                        patient_id=None,
                        encounter_id=encounter_id,
                        clinic_id=clinic_id or (metadata.get("clinic_id") if metadata else None),
                        is_active=True,
                        created_at=datetime.now(timezone.utc)
                    )
                    self.db.add(thread)
                    self.db.commit()
                    self.db.refresh(thread)
                
                # Ensure both participants are added (even if thread already exists)
                from app.common.models.messaging import MessageThreadParticipant
                # Check if sender is a participant
                sender_participant = self.db.query(MessageThreadParticipant).filter(
                    MessageThreadParticipant.thread_id == thread.id,
                    MessageThreadParticipant.user_id == sender_id_uuid,
                    MessageThreadParticipant.is_active == True
                ).first()
                if not sender_participant:
                    await self.add_thread_participant(
                        thread_id=thread.id,
                        user_id=str(sender_id_uuid),
                        role=sender_role
                    )
                
                # Check if recipient is a participant
                recipient_participant = self.db.query(MessageThreadParticipant).filter(
                    MessageThreadParticipant.thread_id == thread.id,
                    MessageThreadParticipant.user_id == recipient_id_uuid,
                    MessageThreadParticipant.is_active == True
                ).first()
                if not recipient_participant:
                    await self.add_thread_participant(
                        thread_id=thread.id,
                        user_id=str(recipient_id_uuid),
                        role=recipient_role
                    )
            else:
                # Create or find thread based on context - use patient_id_uuid if available
                thread = await self._get_or_create_thread(
                    thread_type=MessageThreadType.PATIENT_CHAT if patient_id_uuid else MessageThreadType.STAFF_CHANNEL,
                    patient_id=str(patient_id_uuid) if patient_id_uuid else None,  # Convert UUID to string for the method
                    encounter_id=encounter_id,
                    clinic_id=clinic_id or (metadata.get("clinic_id") if metadata else None),
                    creator_id=sender_id
                )
        
        # If thread has patient_id but we didn't set it, use thread's patient_id
        if thread.patient_id and not patient_id_uuid:
            try:
                patient_id_uuid = UUIDType(thread.patient_id) if isinstance(thread.patient_id, str) else thread.patient_id
            except (ValueError, TypeError):
                pass  # Skip if conversion fails
        
        # Convert id to UUID
        message_id = uuid4()  # Already a UUID object
        
        # Generate subject from content (truncate to 200 chars if needed)
        subject = content[:200] if len(content) > 200 else content
        if not subject.strip():
            subject = "Message"  # Default subject if content is empty
        
        # Log thread information for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Saving message to thread_id: {thread.id}, patient_id: {patient_id_uuid}, sender_id: {sender_id_uuid}, recipient_id: {recipient_id_uuid}")
        
        # Verify thread exists and is active
        if not thread:
            raise HTTPException(status_code=500, detail="Thread not found when trying to save message")
        if not thread.is_active:
            logger.warning(f"Thread {thread.id} is not active, but saving message anyway")
        
        message = Message(
            id=message_id,  # UUID object
            conversation_id=thread.id,  # Use thread ID as conversation_id for backward compatibility
            thread_id=thread.id,
            sender_id=sender_id_uuid,  # UUID object
            recipient_id=recipient_id_uuid,  # UUID object or None
            patient_id=patient_id_uuid,  # UUID object or None
            subject=subject,  # Required by database schema
            content=content,
            message_type=self._map_message_type(message_type),
            priority=self._map_priority(priority),
            clinic_id=thread.clinic_id,
            timestamp=datetime.now(timezone.utc)
        )
        
        try:
            self.db.add(message)
            self.db.commit()
            self.db.refresh(message)
            logger.info(f"Message saved successfully: id={message.id}, thread_id={message.thread_id}, conversation_id={message.conversation_id}, recipient={message.recipient_id}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save message: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")
        
        # Create read receipts for all thread participants
        await self._create_message_receipts(message, thread.id)
        
        # Create FHIR Communication resource
        try:
            await self.fhir_client.create_communication(message)
        except Exception as fhir_error:
            print(f"Warning: Failed to create FHIR Communication: {fhir_error}")
        
        # Send real-time notification
        await self._send_real_time_notification(message)
        
        # Audit log
        await self._audit_message_sent(message)
        
        # Safely get enum values
        try:
            message_type_value = message.message_type.value if hasattr(message.message_type, 'value') else str(message.message_type)
        except (AttributeError, ValueError) as e:
            # Fallback if enum value access fails
            message_type_value = "text"
            print(f"Warning: Failed to get message_type value: {e}")
        
        try:
            priority_value = message.priority.value if hasattr(message.priority, 'value') else str(message.priority)
        except (AttributeError, ValueError) as e:
            # Fallback if enum value access fails
            priority_value = "normal"
            print(f"Warning: Failed to get priority value: {e}")
        
        return {
            "id": str(message.id),  # Convert UUID to string for API response
            "thread_id": thread.id,
            "sender_id": str(message.sender_id) if message.sender_id else None,  # Convert UUID to string
            "recipient_id": str(message.recipient_id) if message.recipient_id else None,  # Convert UUID to string
            "content": message.content,
            "timestamp": message.timestamp,
            "message_type": message_type_value,
            "priority": priority_value
        }

    async def send_message_legacy(self, request: SendMessageRequest) -> Message:
        """Send a message with thread management and notifications."""
        # Process template if provided
        content = request.content
        if request.template_id:
            content = await self._process_template(request.template_id, request.template_variables or {})
        
        # Create message
        # Convert string IDs to UUID objects for database columns that are UUID type
        from uuid import UUID as UUIDType
        
        message_id = uuid4()  # Already a UUID object
        
        # Convert sender_id, recipient_id, patient_id, and parent_message_id to UUID objects
        try:
            sender_id_uuid = UUIDType(request.sender_id) if isinstance(request.sender_id, str) else request.sender_id
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid sender_id format: {request.sender_id}")
        
        recipient_id_uuid = None
        if request.recipient_id:
            try:
                recipient_id_uuid = UUIDType(request.recipient_id) if isinstance(request.recipient_id, str) else request.recipient_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid recipient_id format: {request.recipient_id}")
        
        patient_id_uuid = None
        if request.patient_id:
            try:
                patient_id_uuid = UUIDType(request.patient_id) if isinstance(request.patient_id, str) else request.patient_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid patient_id format: {request.patient_id}")
        
        parent_message_id_uuid = None
        if request.parent_message_id:
            try:
                parent_message_id_uuid = UUIDType(request.parent_message_id) if isinstance(request.parent_message_id, str) else request.parent_message_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid parent_message_id format: {request.parent_message_id}")
        
        # Generate subject from content or use provided subject
        subject = request.subject if hasattr(request, 'subject') and request.subject else content[:200] if len(content) > 200 else content
        if not subject.strip():
            subject = "Message"  # Default subject if content is empty
        
        message = Message(
            id=message_id,  # UUID object
            conversation_id=await self._get_or_create_conversation_id(request),
            sender_id=sender_id_uuid,  # UUID object
            recipient_id=recipient_id_uuid,  # UUID object or None
            patient_id=patient_id_uuid,  # UUID object or None
            subject=subject,  # Required by database schema
            content=content,
            message_type=self._map_message_type(request.message_type),
            priority=self._map_priority(request.priority),
            parent_message_id=parent_message_id_uuid,  # UUID object or None
            template_id=request.template_id,
            template_variables=str(request.template_variables) if request.template_variables else None,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # Create FHIR Communication resource (with error handling)
        try:
            await self.fhir_client.create_communication(message)
        except Exception as fhir_error:
            # Log but don't fail message creation if FHIR fails
            print(f"Warning: Failed to create FHIR Communication: {fhir_error}")
            import traceback
            traceback.print_exc()
        
        # Send real-time notification
        await self._send_real_time_notification(message)
        
        return message
    
    async def send_system_message(self, recipient_id: str, subject: str, content: str, message_type: str = "system") -> Message:
        """Send a system message."""
        # Convert patient_id to user_id if recipient_id is a patient_id
        actual_recipient_id = recipient_id
        patient = self.db.query(Patient).filter(Patient.patient_id == recipient_id).first()
        if patient and patient.user_id:
            actual_recipient_id = patient.user_id
        
        request = SendMessageRequest(
            sender_id="system",
            recipient_id=actual_recipient_id,
            content=content,
            message_type=message_type,
            priority="normal",
            subject=subject
        )
        
        message = await self.send_message(request)
        message.is_system_message = True
        self.db.commit()
        
        return message
    
    async def upload_attachment(self, message_id: str, file: UploadFile, user_id: str) -> MessageAttachment:
        """Upload file attachment to a message."""
        # Validate file
        max_size = 10 * 1024 * 1024  # 10MB
        allowed_types = [
            "image/jpeg", "image/png", "image/gif", 
            "application/pdf", "text/plain", 
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed"
            )
        
        # Read file content
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large"
            )
        
        # Save file
        file_id = str(uuid4())
        file_path = self.upload_dir / f"{file_id}_{file.filename}"
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create attachment record
        attachment = MessageAttachment(
            id=file_id,
            message_id=message_id,
            file_name=file.filename,
            file_type=file.content_type,
            file_size=len(content),
            file_url=str(file_path),
            uploaded_at=datetime.utcnow()
        )
        
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        
        # Create FHIR Binary resource
        await self.fhir_client.create_binary(attachment, content)
        
        return attachment
    
    async def get_conversation_thread(
        self,
        conversation_id: str,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get conversation thread with messages."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Try to find thread by ID
        thread = self.db.query(MessageThread).filter(MessageThread.id == conversation_id).first()
        
        # If not found, try legacy conversation_id format
        if not thread:
            # Verify user has access to this thread
            if not await self._can_access_thread(user_id, conversation_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this conversation"
                )
            
            # Legacy support - use conversation_id as thread_id
            thread_id = conversation_id
        else:
            # Verify user is a participant (convert user_id to UUID for query)
            # Refresh the session to ensure we have the latest data
            self.db.refresh(thread)
            
            participant = self.db.query(MessageThreadParticipant).filter(
                MessageThreadParticipant.thread_id == thread.id,
                MessageThreadParticipant.user_id == user_id_uuid,
                MessageThreadParticipant.is_active == True
            ).first()
            
            # If no participant found, check if this is a patient chat thread
            # and the user is the doctor or patient associated with the thread
            if not participant and thread.thread_type == "patient_chat":
                # For patient chat threads, allow access if user is the patient or a doctor in the clinic
                # This is a fallback for cases where participants weren't added yet
                if thread.patient_id:
                    patient = self.db.query(Patient).filter(Patient.patient_id == thread.patient_id).first()
                    if patient and patient.user_id == user_id_uuid:
                        # User is the patient, allow access
                        thread_id = thread.id
                    elif thread.clinic_id:
                        # For doctors, if they can access the clinic, allow access to patient chat threads
                        # This is a temporary workaround until participants are properly set up
                        thread_id = thread.id
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to this conversation"
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this conversation"
                    )
            elif not participant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this conversation"
                )
            else:
                thread_id = thread.id
        
        # Get messages - filter by thread_id AND ensure user is sender or recipient
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Getting messages for thread_id: {thread_id}, user_id: {user_id}")
        
        # Only show messages where the current user is either the sender or recipient
        # Also check conversation_id for backward compatibility
        messages = self.db.query(Message).filter(
            Message.deleted_at.is_(None),
            (Message.sender_id == user_id_uuid) | (Message.recipient_id == user_id_uuid),
            (
                (Message.thread_id == thread_id) | 
                (Message.conversation_id == thread_id)
            )
        ).order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
        
        logger.info(f"Found {len(messages)} messages for thread_id: {thread_id}")
        if messages:
            logger.info(f"Sample message: id={messages[0].id}, thread_id={messages[0].thread_id}, conversation_id={messages[0].conversation_id}, sender_id={messages[0].sender_id}, recipient_id={messages[0].recipient_id}")
        
        # Get participants
        if thread:
            from uuid import UUID
            participants_query = self.db.query(MessageThreadParticipant).filter(
                MessageThreadParticipant.thread_id == thread_id,
                MessageThreadParticipant.is_active == True
            )
            participants_list = participants_query.all()
            participants = []
            for p in participants_list:
                try:
                    # Convert user_id to UUID if it's a string
                    user_id_uuid = UUID(str(p.user_id)) if isinstance(p.user_id, str) else p.user_id
                    user = self.db.query(User).filter(User.id == user_id_uuid).first()
                    if user:
                        participants.append({
                            "user_id": str(p.user_id),
                            "name": f"{user.first_name} {user.last_name}",
                            "role": str(p.role) if p.role else "staff"
                        })
                except (ValueError, TypeError, AttributeError) as e:
                    # Skip this participant if there's an error
                    import logging
                    logging.getLogger(__name__).warning(f"Error processing participant {p.user_id}: {str(e)}")
                    continue
        else:
            participants = await self._get_thread_participants(conversation_id)
        
        # Count unread messages - convert user_id to UUID for query
        unread_count = self.db.query(MessageReceipt).filter(
            MessageReceipt.thread_id == thread_id,
            MessageReceipt.user_id == user_id_uuid,
            MessageReceipt.read == False
        ).count()
        
        # Format messages
        formatted_messages = []
        for msg in reversed(messages):  # Reverse to get chronological order
            # Handle attachments gracefully - table might not exist
            # Use a savepoint to avoid aborting the main transaction
            attachments = []
            try:
                # Create a savepoint before accessing attachments
                savepoint = self.db.begin_nested()
                try:
                    # Try to access attachments, but catch error if table doesn't exist
                    # SQLAlchemy will raise an error when accessing the relationship if table doesn't exist
                    att_list = list(msg.attachments) if msg.attachments else []
                    attachments = [{
                        "id": att.id,
                        "file_name": att.file_name,
                        "file_type": att.file_type,
                        "file_size": att.file_size,
                        "file_url": att.file_url,
                        "description": att.description,
                        "uploaded_at": att.uploaded_at.isoformat() if att.uploaded_at else None,
                        "fhir_binary_id": att.fhir_binary_id
                    } for att in att_list]
                    savepoint.commit()
                except Exception as e:
                    # Rollback the savepoint to allow subsequent queries to work
                    savepoint.rollback()
                    import logging
                    import psycopg
                    from sqlalchemy.exc import OperationalError, ProgrammingError
                    # Check if it's a table not found error (SQLAlchemy wraps psycopg errors)
                    error_str = str(e)
                    is_table_error = (
                        isinstance(e, (psycopg.errors.UndefinedTable, psycopg.errors.UndefinedObject)) or
                        isinstance(e, (OperationalError, ProgrammingError)) or
                        'does not exist' in error_str or 
                        'UndefinedTable' in error_str or
                        'message_attachments' in error_str.lower()
                    )
                    if is_table_error:
                        logging.getLogger(__name__).debug(f"Message attachments table does not exist, skipping attachments for message {msg.id}")
                    else:
                        logging.getLogger(__name__).warning(f"Could not load attachments for message {msg.id}: {e}")
                    attachments = []
            except Exception as e:
                # Fallback if savepoint creation fails
                import logging
                logging.getLogger(__name__).warning(f"Could not create savepoint for attachments, skipping: {e}")
                attachments = []
            
            formatted_messages.append({
                "id": str(msg.id),  # Convert UUID to string
                "sender_id": str(msg.sender_id) if msg.sender_id else None,  # Convert UUID to string
                "sender_name": await self._get_user_name(msg.sender_id),
                "recipient_id": str(msg.recipient_id) if msg.recipient_id else None,  # Convert UUID to string
                "recipient_name": await self._get_user_name(msg.recipient_id) if msg.recipient_id else None,
                "content": msg.content,
                "message_type": msg.message_type.value if hasattr(msg.message_type, 'value') else str(msg.message_type),
                "priority": msg.priority.value if hasattr(msg.priority, 'value') else str(msg.priority),
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                "read": msg.read,
                "read_at": msg.read_at.isoformat() if msg.read_at else None,
                "attachments": attachments,
                "is_system_message": msg.is_system_message
            })
        
        # Get patient info
        patient_info = {}
        if thread and thread.patient_id:
            patient = self.db.query(Patient).filter(Patient.patient_id == thread.patient_id).first()
            if patient and patient.user_id:
                user = self.db.query(User).filter(User.id == patient.user_id).first()
                if user:
                    patient_info = {
                        "patient_id": thread.patient_id,
                        "patient_name": f"{user.first_name} {user.last_name}",
                        "patient_code": getattr(patient, 'patient_code', None)
                    }
        
        total_messages = self.db.query(Message).filter(
            Message.thread_id == thread_id,
            Message.deleted_at.is_(None)
        ).count()
        
        return {
            "conversation_id": thread_id,
            "thread_id": thread_id,
            "patient": patient_info,
            "messages": formatted_messages,
            "total_messages": total_messages,
            "participants": participants,
            "unread_count": unread_count,
            "last_message_at": messages[0].timestamp.isoformat() if messages else None
        }
    
    async def get_user_conversations(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all conversations for a user."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Get conversations where user is a participant - use UUID for comparison
        conversations = self.db.query(Message.conversation_id).filter(
            (Message.sender_id == user_id_uuid) | (Message.recipient_id == user_id_uuid)
        ).distinct().limit(limit).all()
        
        result = []
        for conv in conversations:
            thread_id = conv[0]
            
            # Get last message
            last_message = self.db.query(Message).filter(
                Message.conversation_id == thread_id
            ).order_by(Message.timestamp.desc()).first()
            
            if last_message:
                # Get other participants
                participants = await self._get_thread_participants(thread_id)
                other_participants = [p for p in participants if p["user_id"] != user_id]
                
                # Count unread - use UUID for comparison
                unread_count = self.db.query(Message).filter(
                    Message.conversation_id == thread_id,
                    Message.recipient_id == user_id_uuid,
                    Message.read == False
                ).count()
                
                result.append({
                    "thread_id": thread_id,
                    "participants": other_participants,
                    "last_message": {
                        "content": last_message.content,
                        "timestamp": last_message.timestamp,
                        "sender_name": await self._get_user_name(last_message.sender_id)
                    },
                    "unread_count": unread_count
                })
        
        return result
    
    async def mark_message_read(self, message_id: str, user_id: str) -> bool:
        """Mark a message as read."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        message = self.db.query(Message).filter(
            Message.id == message_id,
            Message.recipient_id == user_id_uuid
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        message.read = True
        message.read_at = datetime.utcnow()
        
        self.db.commit()
        
        # Update FHIR Communication resource
        await self.fhir_client.update_communication(message)
        
        return True
    
    async def mark_conversation_read(self, thread_id: str, user_id: str) -> bool:
        """Mark all messages in a conversation as read."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        messages = self.db.query(Message).filter(
            Message.conversation_id == thread_id,
            Message.recipient_id == user_id_uuid,
            Message.read == False
        ).all()
        
        for message in messages:
            message.read = True
            message.read_at = datetime.utcnow()
        
        self.db.commit()
        
        # Update FHIR resources
        for message in messages:
            await self.fhir_client.update_communication(message)
        
        return True
    
    async def delete_message(self, message_id: str, user_id: str) -> bool:
        """Delete a message (soft delete)."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        message = self.db.query(Message).filter(
            Message.id == message_id,
            Message.sender_id == user_id_uuid  # Only sender can delete
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        message.deleted_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    async def get_message_templates(self, category: Optional[str] = None) -> List[MessageTemplate]:
        """Get message templates."""
        query = self.db.query(MessageTemplate)
        if category:
            query = query.filter(MessageTemplate.category == category)
        
        return query.all()
    
    async def create_message_template(self, template: MessageTemplate) -> MessageTemplate:
        """Create a new message template."""
        template.id = str(uuid4())
        template.created_at = datetime.utcnow()
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        return template
    
    async def _get_or_create_conversation_id(self, request: SendMessageRequest) -> str:
        """Get or create conversation ID for participants."""
        # For direct messages, create conversation ID from sorted user IDs
        if request.recipient_id:
            participants = sorted([request.sender_id, request.recipient_id])
            return f"conv_{'_'.join(participants)}"
        
        # For patient messages, use patient-specific conversation
        if request.patient_id:
            return f"patient_{request.patient_id}"
        
        # For system messages, use recipient-specific conversation
        return f"system_{request.recipient_id}"
    
    async def _process_template(self, template_id: str, variables: Dict[str, Any]) -> str:
        """Process message template with variables."""
        template = self.db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        content = template.content
        for key, value in variables.items():
            content = content.replace(f"{{{key}}}", str(value))
        
        return content
    
    async def _can_access_thread(self, user_id: str, thread_id: str) -> bool:
        """Check if user can access a conversation thread."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Check if user is a participant
        participant = self.db.query(Message).filter(
            Message.conversation_id == thread_id,
            (Message.sender_id == user_id_uuid) | (Message.recipient_id == user_id_uuid)
        ).first()
        
        return participant is not None
    
    async def _get_thread_participants(self, thread_id: str) -> List[Dict[str, str]]:
        """Get participants in a conversation thread."""
        from uuid import UUID
        
        participants = self.db.query(Message.sender_id, Message.recipient_id).filter(
            Message.conversation_id == thread_id
        ).distinct().all()
        
        user_ids = set()
        for sender_id, recipient_id in participants:
            if sender_id:
                user_ids.add(sender_id)
            if recipient_id:
                user_ids.add(recipient_id)
        
        result = []
        for user_id in user_ids:
            if user_id == "system":
                continue
                
            try:
                # Convert user_id to UUID if it's a string
                user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
                
                # First try to find User by ID
                user = self.db.query(User).filter(User.id == user_id_uuid).first()
                
                # If not found, try to find Patient by patient_id and get user_id
                if not user:
                    try:
                        patient_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
                        patient = self.db.query(Patient).filter(Patient.patient_id == patient_id_uuid).first()
                        if patient and patient.user_id:
                            user = self.db.query(User).filter(User.id == patient.user_id).first()
                    except (ValueError, TypeError):
                        # If UUID conversion fails, skip this user_id
                        continue
                
                if user and hasattr(user, 'role') and user.role is not None:
                    # Safely get role value
                    role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
                    result.append({
                        "user_id": str(user_id),
                        "name": f"{user.first_name} {user.last_name}",
                        "role": role_value
                    })
            except (ValueError, TypeError, AttributeError) as e:
                # Skip this user_id if there's any error
                import logging
                logging.getLogger(__name__).warning(f"Error processing user_id {user_id}: {str(e)}")
                continue
        
        return result
    
    async def _get_user_name(self, user_id: str) -> str:
        """Get user name by ID."""
        if user_id == "system":
            return "System"
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            return f"{user.first_name} {user.last_name}"
        
        return "Unknown User"
    
    async def _send_real_time_notification(self, message: Message):
        """Send real-time notification for new message."""
        # TODO: Implement WebSocket notification
        # This would send a notification to the recipient's connected clients
        pass
    
    def _map_message_type(self, message_type: str) -> MessageType:
        """Map string message type to enum."""
        type_mapping = {
            "text": MessageType.TEXT,
            "system": MessageType.SYSTEM,
            "appointment": MessageType.TEXT,  # Map to TEXT if APPOINTMENT doesn't exist
            "medical": MessageType.TEXT,  # Map to TEXT if MEDICAL doesn't exist
            "attachment": MessageType.FILE,  # Map to FILE if ATTACHMENT doesn't exist
            "image": MessageType.IMAGE,
            "file": MessageType.FILE,
            "voice": MessageType.VOICE,
            "video": MessageType.VIDEO,
            "template": MessageType.TEMPLATE
        }
        return type_mapping.get(message_type.lower() if message_type else "text", MessageType.TEXT)
    
    def _map_priority(self, priority: str) -> MessagePriority:
        """Map string priority to enum."""
        priority_mapping = {
            "low": MessagePriority.LOW,
            "normal": MessagePriority.NORMAL,
            "high": MessagePriority.HIGH,
            "urgent": MessagePriority.URGENT
        }
        return priority_mapping.get(priority, MessagePriority.NORMAL)
    
    # ──────────────────────────────────────────────────────────────────────────────
    # Thread Management Methods
    # ──────────────────────────────────────────────────────────────────────────────
    
    async def create_thread(
        self,
        thread_type: MessageThreadType,
        patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        creator_id: str = None,
        title: Optional[str] = None,
        participant_ids: Optional[List[str]] = None
    ) -> MessageThread:
        """Create a new message thread (patient chat, case room, or staff channel)."""
        # Convert enum to lowercase string value for database constraint
        if isinstance(thread_type, MessageThreadType):
            thread_type_value = str(thread_type.value).lower()
        else:
            thread_type_value = str(thread_type).lower()
        
        # Convert patient_id and encounter_id to UUID objects if provided
        from uuid import UUID as UUIDType
        
        patient_id_uuid = None
        if patient_id:
            try:
                patient_id_uuid = UUIDType(patient_id) if isinstance(patient_id, str) else patient_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid patient_id format: {patient_id}")
        
        encounter_id_uuid = None
        if encounter_id:
            try:
                encounter_id_uuid = UUIDType(encounter_id) if isinstance(encounter_id, str) else encounter_id
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid encounter_id format: {encounter_id}")
        
        # Generate thread ID consistently - use the same format as the route
        # This ensures that when sending and fetching, we use the same thread
        if patient_id_uuid and creator_id:
            # Use the same format as the route: thread_{patient_id}_{creator_id}
            # Convert both to strings to ensure consistent format
            thread_id = f"thread_{str(patient_id_uuid)}_{str(creator_id)}"
        elif thread_type == MessageThreadType.STAFF_CHAT and creator_id:
            # For staff chats, we need recipient_id to generate the thread ID
            # This will be handled by the caller if needed
            # Fallback to UUID if we don't have recipient_id
            thread_id = str(uuid4())
        else:
            # Fallback to UUID if we don't have patient_id and creator_id
            thread_id = str(uuid4())
        
        thread = MessageThread(
            id=thread_id,  # Use consistent thread ID format
            thread_type=thread_type_value,  # Use lowercase string for database constraint
            patient_id=patient_id_uuid,  # Pass as UUID object
            encounter_id=encounter_id_uuid,  # Pass as UUID object
            clinic_id=clinic_id,
            title=title,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(thread)
        try:
            self.db.commit()
            self.db.refresh(thread)
        except Exception as e:
            # If thread already exists (UniqueViolation), try to fetch it
            self.db.rollback()
            import logging
            logger = logging.getLogger(__name__)
            if "UniqueViolation" in str(e) or "duplicate key" in str(e).lower():
                logger.info(f"Thread {thread_id} already exists, fetching existing thread")
                existing_thread = self.db.query(MessageThread).filter(MessageThread.id == thread_id).first()
                if existing_thread:
                    thread = existing_thread
                else:
                    # If we can't find it, re-raise the error
                    raise
            else:
                # For other errors, re-raise
                raise
        
        # Add participants
        if participant_ids or creator_id:
            participants = participant_ids or []
            if creator_id and creator_id not in participants:
                participants.append(creator_id)
            
            # Add patient if thread type is patient chat or case room
            if patient_id_uuid:
                patient = self.db.query(Patient).filter(Patient.patient_id == patient_id_uuid).first()
                if patient and patient.user_id and str(patient.user_id) not in participants:
                    participants.append(str(patient.user_id))
            
            for user_id in participants:
                user_role = await self._get_user_role(user_id)
                await self.add_thread_participant(thread.id, user_id, role=user_role)
        
        return thread
    
    async def _get_or_create_thread(
        self,
        thread_type: MessageThreadType,
        patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        creator_id: str = None
    ) -> MessageThread:
        """Get existing thread or create a new one."""
        from uuid import UUID as UUIDType
        
        # Convert enum to string value for database comparison
        thread_type_value = thread_type.value if isinstance(thread_type, MessageThreadType) else thread_type
        
        # For patient chats, try to find thread by ID first (using the same format as create_thread)
        if thread_type == MessageThreadType.PATIENT_CHAT and patient_id and creator_id:
            try:
                patient_id_uuid = UUIDType(patient_id) if isinstance(patient_id, str) else patient_id
                thread_id = f"thread_{str(patient_id_uuid)}_{str(creator_id)}"
                thread = self.db.query(MessageThread).filter(MessageThread.id == thread_id).first()
                if thread:
                    return thread
            except (ValueError, TypeError):
                # If conversion fails, fall through to regular query
                pass
        
        # Try to find existing thread
        query = self.db.query(MessageThread).filter(
            MessageThread.thread_type == thread_type_value,  # Compare with string value
            MessageThread.clinic_id == clinic_id
        )
        
        # Convert patient_id to UUID for database query (MessageThread.patient_id is UUID)
        if thread_type == MessageThreadType.PATIENT_CHAT and patient_id:
            try:
                patient_id_uuid = UUIDType(patient_id) if isinstance(patient_id, str) else patient_id
                query = query.filter(MessageThread.patient_id == patient_id_uuid)
            except (ValueError, TypeError):
                # If conversion fails, skip the patient_id filter
                pass
        elif thread_type == MessageThreadType.CASE_ROOM and encounter_id:
            try:
                encounter_id_uuid = UUIDType(encounter_id) if isinstance(encounter_id, str) else encounter_id
                query = query.filter(MessageThread.encounter_id == encounter_id_uuid)
            except (ValueError, TypeError):
                # If conversion fails, skip the encounter_id filter
                pass
        
        thread = query.first()
        
        if not thread:
            thread = await self.create_thread(
                thread_type=thread_type,
                patient_id=patient_id,
                encounter_id=encounter_id,
                clinic_id=clinic_id,
                creator_id=creator_id
            )
        
        return thread
    
    async def add_thread_participant(
        self,
        thread_id: str,
        user_id: str,
        role: Optional[str] = None
    ) -> MessageThreadParticipant:
        """Add a participant to a thread."""
        from uuid import UUID
        
        # Convert user_id to UUID object for database queries
        # The model uses UUID(as_uuid=True) which expects UUID objects
        try:
            if isinstance(user_id, str):
                user_id_uuid = UUID(user_id)
            else:
                user_id_uuid = UUID(str(user_id))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid user_id format: {user_id}"
            )
        
        # Check if already a participant
        existing = self.db.query(MessageThreadParticipant).filter(
            MessageThreadParticipant.thread_id == thread_id,
            MessageThreadParticipant.user_id == user_id_uuid,
            MessageThreadParticipant.is_active == True
        ).first()
        
        if existing:
            return existing
        
        # Get user role if not provided
        if not role:
            role = await self._get_user_role(str(user_id_uuid))
        
        participant = MessageThreadParticipant(
            id=str(uuid4()),
            thread_id=thread_id,
            user_id=user_id_uuid,  # Pass as UUID object
            role=role,
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        
        self.db.add(participant)
        self.db.commit()
        self.db.refresh(participant)
        
        return participant
    
    async def _get_user_role(self, user_id: str) -> str:
        """Get user role for participant."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            if hasattr(user, 'role'):
                role = user.role.value if hasattr(user.role, 'value') else str(user.role)
                if role in ['doctor', 'nurse', 'patient', 'receptionist', 'lab_technician', 'radiologist']:
                    return role
        return 'staff'
    
    # ──────────────────────────────────────────────────────────────────────────────
    # Read Receipt Management
    # ──────────────────────────────────────────────────────────────────────────────
    
    async def _create_message_receipts(self, message: Message, thread_id: str):
        """Create read receipts for all thread participants (HIPAA-compliant)."""
        # Get all active participants
        participants = self.db.query(MessageThreadParticipant).filter(
            MessageThreadParticipant.thread_id == thread_id,
            MessageThreadParticipant.is_active == True
        ).all()
        
        for participant in participants:
            # Don't create receipt for sender
            if participant.user_id == message.sender_id:
                continue
            
            receipt = MessageReceipt(
                id=str(uuid4()),
                message_id=message.id,
                thread_id=thread_id,
                user_id=participant.user_id,
                read=False,
                delivered=False,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(receipt)
        
        self.db.commit()
    
    async def mark_message_read_receipt(
        self,
        message_id: str,
        user_id: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> MessageReceipt:
        """Mark message as read with receipt (HIPAA audit trail)."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        receipt = self.db.query(MessageReceipt).filter(
            MessageReceipt.message_id == message_id,
            MessageReceipt.user_id == user_id_uuid
        ).first()
        
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        receipt.read = True
        receipt.read_at = datetime.now(timezone.utc)
        if device_info:
            receipt.device_info = device_info
        if ip_address:
            receipt.ip_address = ip_address
        
        # Also update message read status - convert user_id to UUID for comparison
        from uuid import UUID
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        message = self.db.query(Message).filter(Message.id == message_id).first()
        if message and message.recipient_id == user_id_uuid:
            message.read = True
            message.read_at = receipt.read_at
        
        self.db.commit()
        self.db.refresh(receipt)
        
        return receipt
    
    # ──────────────────────────────────────────────────────────────────────────────
    # Additional Service Methods
    # ──────────────────────────────────────────────────────────────────────────────
    
    async def get_patients_for_messaging(
        self,
        doctor_id: str,
        clinic_id: str
    ) -> List[Dict[str, Any]]:
        """Get patients and staff list formatted for messaging UI."""
        result = []
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"get_patients_for_messaging called with clinic_id={clinic_id}")
            from uuid import UUID
            
            # Get all patients with user accounts
            patients = self.db.query(Patient).filter(
                Patient.user_id.isnot(None)
            ).limit(100).all()  # Limit to prevent large queries
            logger.info(f"Found {len(patients)} patients with user accounts")
            
            for patient in patients:
                if not patient.user_id:
                    continue
                
                try:
                    # Get user information separately to avoid join issues
                    # Ensure patient.user_id is a UUID object for the query
                    user_id = patient.user_id
                    if isinstance(user_id, str):
                        user_id = UUID(user_id)
                    elif not isinstance(user_id, UUID):
                        user_id = UUID(str(user_id))
                    
                    user = self.db.query(User).filter(User.id == user_id).first()
                    if not user:
                        continue
                    
                    # Convert UUIDs to strings safely
                    try:
                        patient_id_str = str(patient.patient_id) if patient.patient_id else None
                        user_id_str = str(patient.user_id) if patient.user_id else None
                    except Exception:
                        continue
                    
                    if not patient_id_str or not user_id_str:
                        continue
                    
                    # Build patient data with safe attribute access
                    patient_data = {
                        "id": patient_id_str,
                        "user_id": user_id_str,
                        "first_name": str(getattr(user, 'first_name', '')) if getattr(user, 'first_name', None) else '',
                        "last_name": str(getattr(user, 'last_name', '')) if getattr(user, 'last_name', None) else '',
                        "patient_code": str(getattr(patient, 'patient_code', '')) if getattr(patient, 'patient_code', None) else None,
                        "email": str(getattr(user, 'email', '')) if getattr(user, 'email', None) else None,
                        "phone": str(getattr(patient, 'phone', '')) if getattr(patient, 'phone', None) else (str(getattr(user, 'phone', '')) if getattr(user, 'phone', None) else None),
                        "type": "patient"
                    }
                    result.append(patient_data)
                except Exception as patient_error:
                    # Skip this patient if there's an error - log but continue
                    continue
            
            # Get all doctors with user accounts
            doctors = self.db.query(Doctor).filter(
                Doctor.user_id.isnot(None)
            ).limit(100).all()
            logger.info(f"Found {len(doctors)} doctors with user accounts")
            
            # Convert doctor_id to UUID for comparison
            current_user_id_uuid = None
            if doctor_id:
                try:
                    if isinstance(doctor_id, str):
                        current_user_id_uuid = UUID(doctor_id)
                    else:
                        current_user_id_uuid = UUID(str(doctor_id))
                except (ValueError, TypeError):
                    pass
            
            for doctor in doctors:
                if not doctor.user_id:
                    continue
                
                # Skip the current user (don't show themselves in the list)
                if current_user_id_uuid and doctor.user_id == current_user_id_uuid:
                    logger.info(f"Skipping current user (doctor) from contacts list")
                    continue
                
                try:
                    user_id = doctor.user_id
                    if isinstance(user_id, str):
                        user_id = UUID(user_id)
                    elif not isinstance(user_id, UUID):
                        user_id = UUID(str(user_id))
                    
                    user = self.db.query(User).filter(User.id == user_id).first()
                    if not user:
                        continue
                    
                    try:
                        user_id_str = str(doctor.user_id) if doctor.user_id else None
                    except Exception:
                        continue
                    
                    if not user_id_str:
                        continue
                    
                    # Build doctor data
                    doctor_data = {
                        "id": user_id_str,  # Use user_id as id for staff members
                        "user_id": user_id_str,
                        "first_name": str(getattr(user, 'first_name', '')) if getattr(user, 'first_name', None) else '',
                        "last_name": str(getattr(user, 'last_name', '')) if getattr(user, 'last_name', None) else '',
                        "email": str(getattr(user, 'email', '')) if getattr(user, 'email', None) else None,
                        "phone": str(getattr(user, 'phone', '')) if getattr(user, 'phone', None) else None,
                        "type": "doctor",
                        "title": "Dr."
                    }
                    result.append(doctor_data)
                except Exception as doctor_error:
                    continue
            
            # Get all nurses with user accounts using raw SQL to avoid primary_department_id issue
            from sqlalchemy import text
            try:
                nurses_sql = text("""
                    SELECT id, user_id
                    FROM ehr.nurses
                    WHERE user_id IS NOT NULL
                    LIMIT 100
                """)
                nurses_result = self.db.execute(nurses_sql).fetchall()
                logger.info(f"Found {len(nurses_result)} nurses with user accounts")
                
                for nurse_row in nurses_result:
                    try:
                        nurse_user_id = nurse_row[1]  # user_id is the second column
                        if not nurse_user_id:
                            continue
                        
                        # Skip the current user (don't show themselves in the list)
                        if current_user_id_uuid:
                            try:
                                nurse_user_id_uuid = UUID(str(nurse_user_id)) if not isinstance(nurse_user_id, UUID) else nurse_user_id
                                if nurse_user_id_uuid == current_user_id_uuid:
                                    logger.info(f"Skipping current user (nurse) from contacts list")
                                    continue
                            except (ValueError, TypeError):
                                pass
                        
                        # Convert to UUID if needed
                        if isinstance(nurse_user_id, str):
                            user_id = UUID(nurse_user_id)
                        else:
                            user_id = UUID(str(nurse_user_id))
                        
                        user = self.db.query(User).filter(User.id == user_id).first()
                        if not user:
                            continue
                        
                        try:
                            user_id_str = str(nurse_user_id) if nurse_user_id else None
                        except Exception:
                            continue
                        
                        if not user_id_str:
                            continue
                        
                        # Build nurse data
                        nurse_data = {
                            "id": user_id_str,  # Use user_id as id for staff members
                            "user_id": user_id_str,
                            "first_name": str(getattr(user, 'first_name', '')) if getattr(user, 'first_name', None) else '',
                            "last_name": str(getattr(user, 'last_name', '')) if getattr(user, 'last_name', None) else '',
                            "email": str(getattr(user, 'email', '')) if getattr(user, 'email', None) else None,
                            "phone": str(getattr(user, 'phone', '')) if getattr(user, 'phone', None) else None,
                            "type": "nurse",
                            "title": "Nurse"
                        }
                        result.append(nurse_data)
                    except Exception as nurse_error:
                        logger.warning(f"Error processing nurse {nurse_row[0]}: {nurse_error}")
                        continue
            except Exception as nurses_query_error:
                logger.error(f"Error querying nurses: {nurses_query_error}")
                # Continue - don't fail the entire request if nurses query fails
            
            # For each contact, find the last message timestamp and add it for sorting
            from datetime import datetime, timezone
            current_user_id_uuid = None
            if doctor_id:
                try:
                    if isinstance(doctor_id, str):
                        current_user_id_uuid = UUID(doctor_id)
                    else:
                        current_user_id_uuid = UUID(str(doctor_id))
                except (ValueError, TypeError):
                    pass
            
            if current_user_id_uuid:
                for contact in result:
                    try:
                        # Determine the recipient ID based on contact type
                        if contact["type"] == "patient":
                            # For patients, find thread by patient_id
                            recipient_id = contact.get("id")  # patient_id
                            if recipient_id:
                                try:
                                    recipient_uuid = UUID(recipient_id)
                                    # Find thread for this patient
                                    thread = self.db.query(MessageThread).filter(
                                        MessageThread.patient_id == recipient_uuid,
                                        MessageThread.thread_type == MessageThreadType.PATIENT_CHAT.value,
                                        MessageThread.is_active == True
                                    ).first()
                                    
                                    if thread:
                                        # Get last message in this thread
                                        last_message = self.db.query(Message).filter(
                                            Message.thread_id == thread.id,
                                            Message.deleted_at.is_(None),
                                            (Message.sender_id == current_user_id_uuid) | (Message.recipient_id == current_user_id_uuid)
                                        ).order_by(Message.timestamp.desc()).first()
                                        
                                        if last_message:
                                            contact["_sort_timestamp"] = last_message.timestamp
                                        else:
                                            contact["_sort_timestamp"] = None
                                        
                                        # Get unread count for this thread - check both thread_id and conversation_id
                                        unread_count = self.db.query(Message).filter(
                                            (
                                                (Message.thread_id == thread.id) | 
                                                (Message.conversation_id == thread.id)
                                            ),
                                            Message.deleted_at.is_(None),
                                            Message.recipient_id == current_user_id_uuid,
                                            Message.read == False
                                        ).count()
                                        contact["unread_count"] = unread_count
                                    else:
                                        contact["_sort_timestamp"] = None
                                        contact["unread_count"] = 0
                                except (ValueError, TypeError):
                                    contact["_sort_timestamp"] = None
                                    contact["unread_count"] = 0
                            else:
                                contact["_sort_timestamp"] = None
                                contact["unread_count"] = 0
                        else:
                            # For staff (doctors/nurses), find thread by user_id
                            recipient_user_id = contact.get("user_id") or contact.get("id")
                            if recipient_user_id:
                                try:
                                    recipient_uuid = UUID(recipient_user_id)
                                    # Sort user IDs to find the correct thread ID
                                    user_ids = [str(current_user_id_uuid), str(recipient_uuid)]
                                    user_ids.sort()
                                    staff_thread_id = f"thread_staff_{user_ids[0]}_{user_ids[1]}"
                                    
                                    # Find thread
                                    thread = self.db.query(MessageThread).filter(
                                        MessageThread.id == staff_thread_id,
                                        MessageThread.thread_type == MessageThreadType.STAFF_CHAT.value,
                                        MessageThread.is_active == True
                                    ).first()
                                    
                                    if thread:
                                        # Get last message in this thread
                                        last_message = self.db.query(Message).filter(
                                            Message.thread_id == thread.id,
                                            Message.deleted_at.is_(None),
                                            (Message.sender_id == current_user_id_uuid) | (Message.recipient_id == current_user_id_uuid)
                                        ).order_by(Message.timestamp.desc()).first()
                                        
                                        if last_message:
                                            contact["_sort_timestamp"] = last_message.timestamp
                                        else:
                                            contact["_sort_timestamp"] = None
                                        
                                        # Get unread count for this thread - check both thread_id and conversation_id
                                        unread_count = self.db.query(Message).filter(
                                            (
                                                (Message.thread_id == thread.id) | 
                                                (Message.conversation_id == thread.id)
                                            ),
                                            Message.deleted_at.is_(None),
                                            Message.recipient_id == current_user_id_uuid,
                                            Message.read == False
                                        ).count()
                                        contact["unread_count"] = unread_count
                                    else:
                                        contact["_sort_timestamp"] = None
                                        contact["unread_count"] = 0
                                except (ValueError, TypeError):
                                    contact["_sort_timestamp"] = None
                                    contact["unread_count"] = 0
                            else:
                                contact["_sort_timestamp"] = None
                                contact["unread_count"] = 0
                    except Exception as e:
                        contact["_sort_timestamp"] = None
                        contact["unread_count"] = 0
                        continue
            
            # Sort contacts: unread first, then by last message timestamp (most recent first)
            # Contacts with unread messages appear first, then contacts with messages, then others
            result.sort(key=lambda x: (
                x.get("unread_count", 0) == 0,  # False (0) comes before True (1), so unread (False) appears first
                x.get("_sort_timestamp") is None,  # None (True) comes after timestamps (False), so contacts with messages appear first
                -(x["_sort_timestamp"].timestamp() if x.get("_sort_timestamp") else 0)  # Negative for descending order
            ))
            
            # Remove internal sorting field from response
            for contact in result:
                contact.pop("_sort_timestamp", None)
            
            logger.info(f"Returning {len(result)} total contacts (patients, doctors, nurses) sorted by last message time")
            return result
        except Exception as e:
            # Log error but return empty list to prevent complete failure
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in get_patients_for_messaging: {str(e)}")
            logger.error(traceback.format_exc())
            # Return empty list instead of raising to prevent CORS issues
            return []
    
    async def get_unread_messages(
        self,
        user_id: str,
        user_role: str,
        clinic_id: str
    ) -> List[Dict[str, Any]]:
        """Get all unread messages for the user."""
        # Get unread receipts
        receipts = self.db.query(MessageReceipt).join(Message).filter(
            MessageReceipt.user_id == user_id,
            MessageReceipt.read == False,
            Message.clinic_id == clinic_id,
            Message.deleted_at.is_(None)
        ).all()
        
        result = []
        for receipt in receipts:
            message = receipt.message
            result.append({
                "message_id": str(message.id),  # Convert UUID to string
                "thread_id": message.thread_id,
                "sender_id": str(message.sender_id) if message.sender_id else None,  # Convert UUID to string
                "sender_name": await self._get_user_name(message.sender_id),
                "content": message.content[:100],  # Preview
                "timestamp": message.timestamp,
                "priority": message.priority.value
            })
        
        return result
    
    async def get_message_stats(
        self,
        user_id: str,
        user_role: str,
        clinic_id: str
    ) -> Dict[str, Any]:
        """Get message statistics."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Total conversations
        threads = self.db.query(MessageThread).join(MessageThreadParticipant).filter(
            MessageThreadParticipant.user_id == user_id_uuid,
            MessageThreadParticipant.is_active == True,
            MessageThread.clinic_id == clinic_id,
            MessageThread.is_active == True
        ).count()
        
        # Unread messages
        unread = self.db.query(MessageReceipt).join(Message).filter(
            MessageReceipt.user_id == user_id_uuid,
            MessageReceipt.read == False,
            Message.clinic_id == clinic_id,
            Message.deleted_at.is_(None)
        ).count()
        
        # Messages sent
        sent = self.db.query(Message).filter(
            Message.sender_id == user_id_uuid,
            Message.clinic_id == clinic_id,
            Message.deleted_at.is_(None)
        ).count()
        
        # Messages received
        received = self.db.query(MessageReceipt).join(Message).filter(
            MessageReceipt.user_id == user_id_uuid,
            Message.clinic_id == clinic_id,
            Message.deleted_at.is_(None)
        ).count()
        
        return {
            "total_conversations": threads,
            "unread_messages": unread,
            "messages_sent": sent,
            "messages_received": received,
            "total_messages": sent + received
        }
    
    async def get_user_conversations(
        self,
        user_id: str,
        user_role: str,
        clinic_id: str,
        page: int = 1,
        size: int = 20
    ) -> Dict[str, Any]:
        """Get user conversations with pagination."""
        from uuid import UUID
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Get threads where user is a participant AND has sent or received messages
        # First, get threads where user is a participant
        # Ensure clinic_id is a string for comparison
        clinic_id_str = str(clinic_id) if clinic_id else None
        threads = self.db.query(MessageThread).join(MessageThreadParticipant).filter(
            MessageThreadParticipant.user_id == user_id_uuid,
            MessageThreadParticipant.is_active == True,
            MessageThread.clinic_id == clinic_id_str,
            MessageThread.is_active == True
        ).all()
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"get_user_conversations: user_id={user_id}, clinic_id={clinic_id_str}, found {len(threads)} threads")
        
        conversations = []
        for thread in threads:
            # Get last message where user is sender or recipient
            last_message = self.db.query(Message).filter(
                Message.thread_id == thread.id,
                Message.deleted_at.is_(None),
                (Message.sender_id == user_id_uuid) | (Message.recipient_id == user_id_uuid)
            ).order_by(Message.timestamp.desc()).first()
            
            # Debug logging
            logger.info(f"  Thread {thread.id}: has last_message = {last_message is not None}, thread_type = {thread.thread_type}, patient_id = {thread.patient_id}")
            
            # Only include threads where the user has actually sent or received messages
            if not last_message:
                logger.info(f"  Skipping thread {thread.id} - no messages found")
                continue
            
            # Get unread count - only count messages where user is the recipient
            unread_count = self.db.query(Message).filter(
                Message.thread_id == thread.id,
                Message.deleted_at.is_(None),
                Message.recipient_id == user_id_uuid,
                Message.read == False
            ).count()
            
            # Get patient info or staff member info
            patient_info = {}
            recipient_name = "Unknown"
            recipient_avatar = None
            recipient_user_id = None  # Initialize for staff conversations
            
            if thread.patient_id:
                # Patient conversation
                patient = self.db.query(Patient).filter(Patient.patient_id == thread.patient_id).first()
                if patient and patient.user_id:
                    user = self.db.query(User).filter(User.id == patient.user_id).first()
                    if user:
                        patient_info = {
                            "patient_id": thread.patient_id,
                            "patient_name": f"{user.first_name} {user.last_name}"
                        }
                        recipient_name = patient_info.get("patient_name", "Unknown")
                        recipient_avatar = user.profile_image_url
            else:
                # Staff-to-staff conversation - get the other participant's name
                recipient_user_id = None
                # Get all active participants for this thread
                all_participants = self.db.query(MessageThreadParticipant).filter(
                    MessageThreadParticipant.thread_id == thread.id,
                    MessageThreadParticipant.is_active == True
                ).all()
                
                logger.info(f"  Staff conversation: found {len(all_participants)} participants, current user_id={user_id_uuid}")
                
                # Find the other participant (not the current user)
                for participant in all_participants:
                    try:
                        participant_uuid = participant.user_id
                        # Skip if this is the current user
                        if participant_uuid == user_id_uuid:
                            logger.info(f"    Skipping current user: {participant_uuid}")
                            continue
                        
                        other_user = self.db.query(User).filter(User.id == participant_uuid).first()
                        if other_user:
                            recipient_name = f"{other_user.first_name} {other_user.last_name}".strip() or other_user.email
                            recipient_avatar = other_user.profile_image_url
                            recipient_user_id = str(participant_uuid)  # Store the recipient's user_id
                            logger.info(f"    Found other participant: {recipient_user_id} ({recipient_name})")
                            break
                        else:
                            logger.warning(f"    Participant {participant_uuid} not found in User table")
                    except (ValueError, TypeError) as e:
                        logger.warning(f"    Error processing participant: {e}")
                        continue
                
                # Fallback: if we couldn't find recipient from participants, try to get it from the last message
                if not recipient_user_id and last_message:
                    try:
                        # If current user is the sender, recipient is the message recipient
                        if last_message.sender_id == user_id_uuid:
                            recipient_uuid = last_message.recipient_id
                        else:
                            # If current user is the recipient, sender is the other participant
                            recipient_uuid = last_message.sender_id
                        
                        if recipient_uuid:
                            other_user = self.db.query(User).filter(User.id == recipient_uuid).first()
                            if other_user:
                                recipient_name = f"{other_user.first_name} {other_user.last_name}".strip() or other_user.email
                                recipient_avatar = other_user.profile_image_url
                                recipient_user_id = str(recipient_uuid)
                                logger.info(f"    Found recipient from last message: {recipient_user_id} ({recipient_name})")
                    except Exception as e:
                        logger.warning(f"    Error getting recipient from last message: {e}")
                
                if not recipient_user_id:
                    logger.warning(f"  WARNING: Staff conversation {thread.id} has no recipient_user_id - participants: {[str(p.user_id) for p in all_participants]}, last_message sender={last_message.sender_id if last_message else None}, recipient={last_message.recipient_id if last_message else None}")
            
            # Store timestamp for sorting (not included in final response)
            last_message_timestamp = last_message.timestamp if last_message else None
            
            conversations.append({
                "conversation_id": thread.id,
                "thread_id": thread.id,
                "patient_id": thread.patient_id or "",
                "patient_name": recipient_name,
                "last_message": last_message.content[:100] if last_message else None,
                "last_message_time": last_message.timestamp.isoformat() if last_message else None,
                "unread_count": unread_count,
                "thread_type": str(thread.thread_type) if thread.thread_type else None,
                "recipient_name": recipient_name,  # For staff conversations
                "recipient_avatar": recipient_avatar,  # For staff conversations
                "recipient_user_id": recipient_user_id if not thread.patient_id else None,  # For staff conversations - the other participant's user_id
                "_sort_timestamp": last_message_timestamp  # Internal field for sorting only
            })
        
        # Sort conversations by last message timestamp (most recent first)
        # Conversations with unread messages should appear first, then by timestamp
        conversations.sort(key=lambda x: (
            x["unread_count"] == 0,  # False (0) comes before True (1), so unread (False) appears first
            -(x["_sort_timestamp"].timestamp() if x["_sort_timestamp"] else 0)  # Negative for descending order
        ))
        
        # Remove internal sorting field from response
        for conv in conversations:
            conv.pop("_sort_timestamp", None)
        
        # Count total conversations before pagination
        total = len(conversations)
        
        # Apply pagination after sorting
        start = (page - 1) * size
        end = start + size
        conversations = conversations[start:end]
        
        logger.info(f"get_user_conversations: Returning {len(conversations)} conversations (total={total}, page={page}, size={size})")
        if conversations:
            logger.info(f"  First conversation: {conversations[0].get('conversation_id')}, patient_name={conversations[0].get('patient_name')}, recipient_user_id={conversations[0].get('recipient_user_id')}")
        
        return {
            "conversations": conversations,
            "total": total,
            "page": page,
            "size": size
        }
    
    async def mark_conversation_read(
        self,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """Mark all messages in a conversation as read."""
        from uuid import UUID
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"mark_conversation_read called: conversation_id={conversation_id}, user_id={user_id}")
        
        # Convert user_id to UUID for database queries
        try:
            user_id_uuid = UUID(str(user_id)) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            user_id_uuid = user_id
        
        # Update all receipts for this thread
        receipts = self.db.query(MessageReceipt).filter(
            MessageReceipt.thread_id == conversation_id,
            MessageReceipt.user_id == user_id_uuid,
            MessageReceipt.read == False
        ).all()
        
        logger.info(f"Found {len(receipts)} unread receipts for thread {conversation_id} and user {user_id}")
        
        now = datetime.now(timezone.utc)
        receipt_count = 0
        for receipt in receipts:
            receipt.read = True
            receipt.read_at = now
            receipt_count += 1
        
        # Update message read status - check both thread_id and conversation_id
        # Some messages might use conversation_id instead of thread_id
        # Also check for messages where user is either sender or recipient (for staff chats)
        messages = self.db.query(Message).filter(
            (
                (Message.thread_id == conversation_id) | 
                (Message.conversation_id == conversation_id)
            ),
            (
                (Message.recipient_id == user_id_uuid) |
                (Message.sender_id == user_id_uuid)
            ),
            Message.read == False,
            Message.deleted_at.is_(None)
        ).all()
        
        logger.info(f"Found {len(messages)} unread messages for thread {conversation_id} and user {user_id}")
        
        updated_count = 0
        for message in messages:
            # Only mark as read if user is the recipient (sender's messages are already "read" from their perspective)
            if message.recipient_id == user_id_uuid:
                message.read = True
                message.read_at = now
                updated_count += 1
        
        logger.info(f"Marking {updated_count} messages as read (only recipient messages)")
        
        # Commit the changes
        self.db.commit()
        
        # Log the result
        logger.info(f"Marked {updated_count} messages and {receipt_count} receipts as read for thread {conversation_id} and user {user_id}")
        
        # Refresh the session to ensure changes are visible
        self.db.expire_all()
        
        return True
    
    async def delete_message(
        self,
        message_id: str,
        user_id: str,
        user_role: str
    ) -> bool:
        """Delete a message (soft delete)."""
        message = self.db.query(Message).filter(
            Message.id == message_id,
            Message.sender_id == user_id  # Only sender can delete
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        message.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return True
    
    async def _audit_message_sent(self, message: Message):
        """Audit log for message sent (HIPAA compliance)."""
        # TODO: Implement audit logging
        pass
