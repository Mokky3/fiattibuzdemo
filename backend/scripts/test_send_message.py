"""Test sending a message from lab tech to doctor."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
from app.db.session import SessionLocal
from app.services.messaging_service import MessagingService
from uuid import UUID

async def test_send():
    db = SessionLocal()
    messaging_service = MessagingService(db)
    
    lab_tech_id = "421db500-0842-47b4-bc0e-83a124af72b1"
    doctor_id = "82219256-9d73-4b48-ad5f-c038e3f8c14d"
    clinic_id = "bc5719be-aa1c-42fd-9b34-f3a6c841770a"
    
    print(f"Sending test message from lab tech {lab_tech_id} to doctor {doctor_id}")
    
    try:
        result = await messaging_service.send_message(
            sender_id=lab_tech_id,
            recipient_id=doctor_id,
            content="Test message from lab tech to doctor",
            message_type="text",
            priority="normal",
            patient_id=None,
            clinic_id=clinic_id
        )
        print(f"Message sent successfully: {result.get('id')}")
        print(f"Thread ID: {result.get('thread_id')}")
    except Exception as e:
        print(f"Error sending message: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_send())

