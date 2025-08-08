# backend/app/services/email.py
"""Email service for notifications"""
import httpx
from typing import Optional

async def send_invitation_email(email: str, token: str, role: str, clinic: str):
    """Send invitation email to user"""
    invitation_link = f"https://app.fiattib.com/register?token={token}"
    
    email_body = f"""
    Hello,
    
    You have been invited to join {clinic} as a {role}.
    
    Please click the link below to create your account:
    {invitation_link}
    
    This invitation will expire in 7 days.
    
    Best regards,
    FIATTIB Healthcare System
    """
    
    # In production, integrate with actual email service
    print(f"Sending invitation email to {email}")
    print(email_body)

async def send_password_reset_email(email: str, token: str, name: str):
    """Send password reset email"""
    reset_link = f"https://app.fiattib.com/reset-password?token={token}"
    
    email_body = f"""
    Hello {name},
    
    A password reset has been requested for your account.
    
    Please click the link below to reset your password:
    {reset_link}
    
    If you did not request this reset, please ignore this email.
    
    This link will expire in 24 hours.
    
    Best regards,
    FIATTIB Healthcare System
    """
    
    print(f"Sending password reset email to {email}")
    print(email_body)