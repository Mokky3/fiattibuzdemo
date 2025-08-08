# backend/app/services/sms.py
"""SMS service for notifications"""
async def send_invitation_sms(phone: str, token: str, role: str, clinic: str):
    """Send invitation SMS to user"""
    message = f"You've been invited to join {clinic} as a {role}. Complete registration at: https://app.fiattib.com/register?token={token}"
    
    print(f"Sending SMS to {phone}")
    print(message)
