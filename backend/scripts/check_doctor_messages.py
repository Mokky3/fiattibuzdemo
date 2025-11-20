"""Check if doctor can see messages from lab technician."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.common.models.messaging import Message, MessageThread, MessageThreadParticipant
from uuid import UUID

db = SessionLocal()

doctor_id = UUID('82219256-9d73-4b48-ad5f-c038e3f8c14d')
lab_tech_id = UUID('421db500-0842-47b4-bc0e-83a124af72b1')
clinic_id = 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'

# Check threads where doctor is a participant
threads = db.query(MessageThread).join(MessageThreadParticipant).filter(
    MessageThreadParticipant.user_id == doctor_id,
    MessageThreadParticipant.is_active == True,
    MessageThread.clinic_id == clinic_id,
    MessageThread.is_active == True
).all()

print(f'Doctor is participant in {len(threads)} threads in clinic {clinic_id}')
for t in threads[:5]:
    print(f'  Thread: {t.id}, type: {t.thread_type}')
    # Check messages in this thread
    msgs = db.query(Message).filter(
        Message.thread_id == t.id,
        Message.deleted_at.is_(None)
    ).order_by(Message.timestamp.desc()).limit(2).all()
    print(f'    Messages: {len(msgs)}')
    for m in msgs:
        print(f'      - From {m.sender_id} to {m.recipient_id}: {m.content[:50]}')

# Check all messages to/from doctor
print(f'\nAll messages where doctor is sender or recipient:')
msgs = db.query(Message).filter(
    (Message.sender_id == doctor_id) | (Message.recipient_id == doctor_id)
).order_by(Message.timestamp.desc()).limit(5).all()
print(f'Found {len(msgs)} messages')
for m in msgs:
    print(f'  - Thread: {m.thread_id}, From {m.sender_id} to {m.recipient_id}, Content: {m.content[:50]}')

# Check specific thread between lab tech and doctor
user_ids = [str(lab_tech_id), str(doctor_id)]
user_ids.sort()
thread_id = f"thread_staff_{user_ids[0]}_{user_ids[1]}"
print(f'\nChecking specific thread: {thread_id}')
thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
if thread:
    print(f'Thread exists: {thread.id}')
    participants = db.query(MessageThreadParticipant).filter(
        MessageThreadParticipant.thread_id == thread_id
    ).all()
    print(f'Participants: {len(participants)}')
    for p in participants:
        print(f'  - {p.user_id} ({p.role}), active: {p.is_active}')
    
    msgs = db.query(Message).filter(
        Message.thread_id == thread_id,
        Message.deleted_at.is_(None)
    ).order_by(Message.timestamp.desc()).all()
    print(f'Messages in thread: {len(msgs)}')
    for m in msgs:
        print(f'  - From {m.sender_id} to {m.recipient_id}: {m.content[:50]}')
else:
    print('Thread does not exist!')

db.close()

