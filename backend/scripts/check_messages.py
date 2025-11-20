"""Check if messages are being created correctly."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.common.models.messaging import MessageThread, MessageThreadParticipant, Message
from uuid import UUID

db = SessionLocal()

lab_tech_id = UUID('421db500-0842-47b4-bc0e-83a124af72b1')
doctor_id = UUID('82219256-9d73-4b48-ad5f-c038e3f8c14d')

# Check both possible thread IDs (sorted and unsorted)
thread_id1 = 'thread_staff_421db500-0842-47b4-bc0e-83a124af72b1_82219256-9d73-4b48-ad5f-c038e3f8c14d'
thread_id2 = 'thread_staff_82219256-9d73-4b48-ad5f-c038e3f8c14d_421db500-0842-47b4-bc0e-83a124af72b1'

for thread_id in [thread_id1, thread_id2]:
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if thread:
        print(f'\nThread found: {thread_id}')
        participants = db.query(MessageThreadParticipant).filter(MessageThreadParticipant.thread_id == thread_id).all()
        print(f'Participants: {len(participants)}')
        for p in participants:
            print(f'  - {p.user_id} ({p.role})')
        
        messages = db.query(Message).filter(Message.thread_id == thread_id).all()
        print(f'Messages in thread: {len(messages)}')
        for m in messages[:5]:
            print(f'  - From {m.sender_id} to {m.recipient_id}: {m.content[:50]}')
        
        # Also check by conversation_id
        messages_by_conv = db.query(Message).filter(Message.conversation_id == thread_id).all()
        print(f'Messages by conversation_id: {len(messages_by_conv)}')
        
        # Check all recent messages from lab tech
        all_lab_messages = db.query(Message).filter(
            Message.sender_id == lab_tech_id
        ).order_by(Message.timestamp.desc()).limit(5).all()
        print(f'\nRecent messages from lab tech: {len(all_lab_messages)}')
        for m in all_lab_messages:
            print(f'  - Thread: {m.thread_id}, To: {m.recipient_id}, Content: {m.content[:50]}')

db.close()

