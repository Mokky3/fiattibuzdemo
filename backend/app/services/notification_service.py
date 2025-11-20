"""
Notification service for sending emails and SMS invitations
"""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.common.models.user_invitation import UserInvitation, ContactType

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending notifications via email and SMS"""
    
    def __init__(self):
        self.email_config = {
            "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_username": os.getenv("SMTP_USERNAME"),
            "smtp_password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("FROM_EMAIL", "noreply@fiattib.uz"),
            "from_name": os.getenv("FROM_NAME", "Fiattib Medical System")
        }
        
        self.sms_config = {
            "provider": os.getenv("SMS_PROVIDER", "twilio"),  # twilio, sms_ru, etc.
            "api_key": os.getenv("SMS_API_KEY"),
            "api_secret": os.getenv("SMS_API_SECRET"),
            "from_number": os.getenv("SMS_FROM_NUMBER")
        }
        
        self.base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    async def send_invitation(
        self,
        invitation: UserInvitation,
        invitation_link: str
    ) -> Dict[str, Any]:
        """Send invitation via email or SMS"""
        try:
            if invitation.contact_type == ContactType.EMAIL:
                return await self._send_email_invitation(invitation, invitation_link)
            elif invitation.contact_type == ContactType.PHONE:
                return await self._send_sms_invitation(invitation, invitation_link)
            else:
                raise ValueError(f"Unsupported contact type: {invitation.contact_type}")
        
        except Exception as e:
            logger.error(f"Failed to send invitation {invitation.id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "notification_type": invitation.contact_type.value,
                "notification_provider": None,
                "notification_id": None
            }
    
    async def _send_email_invitation(
        self,
        invitation: UserInvitation,
        invitation_link: str
    ) -> Dict[str, Any]:
        """Send email invitation"""
        try:
            # Create email content
            subject = "Invitation to join Fiattib Medical System"
            
            # HTML email template
            html_content = self._generate_email_template(invitation, invitation_link)
            
            # Plain text version
            text_content = self._generate_text_template(invitation, invitation_link)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_config['from_name']} <{self.email_config['from_email']}>"
            msg['To'] = invitation.contact
            
            # Add both plain text and HTML versions
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            # Send email
            with smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port']) as server:
                server.starttls()
                server.login(self.email_config['smtp_username'], self.email_config['smtp_password'])
                server.send_message(msg)
            
            logger.info(f"Email invitation sent successfully to {invitation.contact}")
            
            return {
                "success": True,
                "notification_type": "EMAIL",
                "notification_provider": "SMTP",
                "notification_id": f"email_{invitation.id}_{datetime.now().timestamp()}",
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
        
        except Exception as e:
            logger.error(f"Failed to send email to {invitation.contact}: {str(e)}")
            raise
    
    async def _send_sms_invitation(
        self,
        invitation: UserInvitation,
        invitation_link: str
    ) -> Dict[str, Any]:
        """Send SMS invitation"""
        try:
            # Generate SMS content
            sms_content = self._generate_sms_template(invitation, invitation_link)
            
            if self.sms_config['provider'] == 'twilio':
                return await self._send_twilio_sms(invitation.contact, sms_content)
            elif self.sms_config['provider'] == 'sms_ru':
                return await self._send_sms_ru_sms(invitation.contact, sms_content)
            else:
                raise ValueError(f"Unsupported SMS provider: {self.sms_config['provider']}")
        
        except Exception as e:
            logger.error(f"Failed to send SMS to {invitation.contact}: {str(e)}")
            raise
    
    async def _send_twilio_sms(self, phone: str, content: str) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        try:
            from twilio.rest import Client
            
            client = Client(self.sms_config['api_key'], self.sms_config['api_secret'])
            
            message = client.messages.create(
                body=content,
                from_=self.sms_config['from_number'],
                to=phone
            )
            
            return {
                "success": True,
                "notification_type": "SMS",
                "notification_provider": "TWILIO",
                "notification_id": message.sid,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
        
        except Exception as e:
            logger.error(f"Twilio SMS failed: {str(e)}")
            raise
    
    async def _send_sms_ru_sms(self, phone: str, content: str) -> Dict[str, Any]:
        """Send SMS via SMS.RU"""
        try:
            url = "https://sms.ru/sms/send"
            data = {
                "api_id": self.sms_config['api_key'],
                "to": phone,
                "msg": content,
                "json": 1
            }
            
            response = requests.post(url, data=data)
            result = response.json()
            
            if result.get("status") == "OK":
                return {
                    "success": True,
                    "notification_type": "SMS",
                    "notification_provider": "SMS_RU",
                    "notification_id": result.get("sms_id"),
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                raise Exception(f"SMS.RU error: {result.get('status_text')}")
        
        except Exception as e:
            logger.error(f"SMS.RU failed: {str(e)}")
            raise
    
    def _generate_email_template(self, invitation: UserInvitation, invitation_link: str) -> str:
        """Generate HTML email template"""
        name = f"{invitation.first_name} {invitation.last_name}".strip() or "User"
        organization = invitation.organization.name if invitation.organization else "the organization"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invitation to Fiattib Medical System</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4DB6B0; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .button {{ display: inline-block; background-color: #4DB6B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Fiattib Medical System</h1>
                </div>
                <div class="content">
                    <h2>Hello {name}!</h2>
                    <p>You have been invited to join <strong>{organization}</strong> as a <strong>{invitation.role}</strong> in the Fiattib Medical System.</p>
                    <p>To complete your registration, please click the button below:</p>
                    <a href="{invitation_link}" class="button">Accept Invitation</a>
                    <p>This invitation will expire on <strong>{invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}</strong>.</p>
                    <p>If you have any questions, please contact your administrator.</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>© 2024 Fiattib Medical System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _generate_text_template(self, invitation: UserInvitation, invitation_link: str) -> str:
        """Generate plain text email template"""
        name = f"{invitation.first_name} {invitation.last_name}".strip() or "User"
        organization = invitation.organization.name if invitation.organization else "the organization"
        
        return f"""
        Welcome to Fiattib Medical System
        
        Hello {name}!
        
        You have been invited to join {organization} as a {invitation.role} in the Fiattib Medical System.
        
        To complete your registration, please visit the following link:
        {invitation_link}
        
        This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.
        
        If you have any questions, please contact your administrator.
        
        This is an automated message. Please do not reply to this email.
        
        © 2024 Fiattib Medical System. All rights reserved.
        """
    
    def _generate_sms_template(self, invitation: UserInvitation, invitation_link: str) -> str:
        """Generate SMS template"""
        name = f"{invitation.first_name} {invitation.last_name}".strip() or "User"
        organization = invitation.organization.name if invitation.organization else "the organization"
        
        return f"Hi {name}! You're invited to join {organization} as {invitation.role}. Complete registration: {invitation_link} (expires {invitation.expires_at.strftime('%m/%d/%Y')})"


# Create service instance
notification_service = NotificationService()
