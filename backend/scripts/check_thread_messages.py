import sys
import os
from uuid import UUID

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.common.models.messaging import Message, MessageThread

db = SessionLocal()
try:
    doctor_id = UUID('87fe91be-50dc-4793-bb58-ff3a9f50f432')
    thread_ids = [
        'thread_staff_421db500-0842-47b4-bc0e-83a124af72b1_87fe91be-50dc-4793-bb58-ff3a9f50f432',
        'thread_staff_87fe91be-50dc-4793-bb58-ff3a9f50f432_82219256-9d73-4b48-ad5f-c038e3f8c14d'
    ]
    
    for tid in thread_ids:
        messages = db.query(Message).filter(
            Message.thread_id == tid,
            Message.deleted_at.is_(None),
            ((Message.sender_id == doctor_id) | (Message.recipient_id == doctor_id))
        ).order_by(Message.timestamp.desc()).first()
        print(f'Thread {tid}: has message = {messages is not None}')
        if messages:
            print(f'  Last message: sender={messages.sender_id}, recipient={messages.recipient_id}, content={messages.content[:50] if messages.content else None}')
        
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
finally:
    db.close()

