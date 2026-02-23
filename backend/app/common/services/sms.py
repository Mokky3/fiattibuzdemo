# backend/app/common/services/sms.py
"""SMS service for notifications - uses Eskiz.uz gateway"""
from app.services.sms_notification_service import sms_notification_service

async def send_invitation_sms(phone: str, token: str, role: str, clinic: str):
    """Send invitation SMS to user via Eskiz.uz gateway"""
    return await sms_notification_service.send_invitation_sms(phone, token, role, clinic)
