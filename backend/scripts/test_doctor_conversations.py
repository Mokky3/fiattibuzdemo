import sys
import os
from uuid import UUID

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.services.messaging_service import MessagingService

db = SessionLocal()
try:
    service = MessagingService(db)
    
    doctor_id = '87fe91be-50dc-4793-bb58-ff3a9f50f432'
    clinic_id = 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'
    
    import asyncio
    result = asyncio.run(service.get_user_conversations(
        user_id=doctor_id,
        user_role='doctor',
        clinic_id=clinic_id,
        page=1,
        size=100
    ))
    
    print(f'Total conversations: {result["total"]}')
    print(f'Conversations returned: {len(result["conversations"])}')
    
    for c in result['conversations'][:10]:
        print(f'  - {c["conversation_id"]}: {c["patient_name"]} (patient_id={c["patient_id"]}, recipient_user_id={c.get("recipient_user_id")})')
        
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
finally:
    db.close()

