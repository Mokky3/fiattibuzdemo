"""Notification services for the reception portal
Handles SMS, email, and internal notifications for appointments and messages.
"""
import asyncio
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import aiohttp
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────── Configuration ──
class NotificationConfig:
    # Email settings
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USERNAME = "your-email@gmail.com"  # Change in production
    SMTP_PASSWORD = "your-app-password"     # Change in production
    FROM_EMAIL = "noreply@fiattib.com"
    FROM_NAME = "FIATTIB Medical Center"
    
    # SMS settings (using a mock service for demo)
    SMS_API_URL = "https://api.sms-service.com/send"
    SMS_API_KEY = "your-sms-api-key"       # Change in production
    SMS_FROM_NUMBER = "+998712345678"
    
    # Internal notification settings
    ENABLE_EMAIL = True
    ENABLE_SMS = True
    ENABLE_PUSH = False

config = NotificationConfig()

# ──────────────────────────────────────────────────────── Email Service ──
class EmailService:
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> bool:
        """Send email notification."""
        if not config.ENABLE_EMAIL:
            logger.info(f"Email disabled, would send to {to_email}: {subject}")
            return True
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name or config.FROM_NAME} <{from_email or config.FROM_EMAIL}>"
            msg['To'] = to_email
            
            # Add text part
            text_part = MIMEText(body, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
                server.starttls()
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def generate_appointment_email_html(appointment_data: Dict[str, Any], action: str) -> str:
        """Generate HTML email template for appointments."""
        action_color = {
            "created": "#28a745",
            "confirmed": "#17a2b8", 
            "declined": "#dc3545",
            "cancelled": "#ffc107"
        }.get(action, "#6c757d")
        
        action_text = {
            "created": "New Appointment Scheduled",
            "confirmed": "Appointment Confirmed",
            "declined": "Appointment Declined", 
            "cancelled": "Appointment Cancelled"
        }.get(action, "Appointment Update")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{action_text}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: {action_color}; padding: 30px 40px; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">{action_text}</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                                        Dear {appointment_data.get('patient', 'Patient')},
                                    </p>
                                    
                                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                                        <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="font-weight: bold; color: #666;">Date:</td>
                                                <td style="color: #333;">{appointment_data.get('date', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: bold; color: #666;">Time:</td>
                                                <td style="color: #333;">{appointment_data.get('time', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: bold; color: #666;">Doctor:</td>
                                                <td style="color: #333;">{appointment_data.get('doctor', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: bold; color: #666;">Reason:</td>
                                                <td style="color: #333;">{appointment_data.get('reason', 'N/A')}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
                                        If you have any questions, please contact us at +998 71 234 56 78 or info@fiattib.com
                                    </p>
                                    
                                    <div style="text-align: center;">
                                        <a href="https://fiattib.com/patient/appointments" 
                                           style="background-color: #4DB6B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                            View Appointments
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="color: #666; font-size: 12px; margin: 0;">
                                        FIATTIB Medical Center<br>
                                        123 Healthcare Avenue, Medical City<br>
                                        +998 71 234 56 78 | info@fiattib.com
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

# ──────────────────────────────────────────────────────── SMS Service ──
class SMSService:
    """SMS Service using Eskiz.uz gateway."""
    
    @staticmethod
    async def send_sms(phone_number: str, message: str) -> bool:
        """Send SMS notification via Eskiz.uz gateway."""
        from app.services.sms_notification_service import sms_notification_service
        
        if not config.ENABLE_SMS:
            logger.info(f"SMS disabled, would send to {phone_number}: {message}")
            return True
        
        return await sms_notification_service.send_sms(phone_number, message)

# ──────────────────────────────────────────────────────── Appointment Notifications ──
async def send_appointment_notification(
    appointment_data: Dict[str, Any], 
    action: str, 
    reason: Optional[str] = None
) -> Dict[str, bool]:
    """Send appointment notification via multiple channels."""
    results = {"email": False, "sms": False}
    
    # Prepare messages
    action_text = {
        "created": "scheduled",
        "confirmed": "confirmed", 
        "declined": "declined",
        "cancelled": "cancelled"
    }.get(action, "updated")
    
    # SMS message (short)
    sms_message = f"FIATTIB: Your appointment on {appointment_data.get('date')} at {appointment_data.get('time')} has been {action_text}."
    if reason:
        sms_message += f" Reason: {reason}"
    sms_message += " Contact us: +998712345678"
    
    # Email subject and body
    email_subject = f"Appointment {action_text.title()} - FIATTIB Medical Center"
    email_body = f"""
Dear {appointment_data.get('patient', 'Patient')},

Your appointment has been {action_text}.

Appointment Details:
- Date: {appointment_data.get('date', 'N/A')}
- Time: {appointment_data.get('time', 'N/A')}
- Doctor: {appointment_data.get('doctor', 'N/A')}
- Reason: {appointment_data.get('reason', 'N/A')}
"""
    
    if reason:
        email_body += f"\nAdditional Information: {reason}"
    
    email_body += """

If you have any questions, please contact us:
Phone: +998 71 234 56 78
Email: info@fiattib.com

Best regards,
FIATTIB Medical Center Team
"""
    
    # Send notifications
    if appointment_data.get('email'):
        html_body = EmailService.generate_appointment_email_html(appointment_data, action)
        results["email"] = await EmailService.send_email(
            appointment_data['email'],
            email_subject,
            email_body,
            html_body
        )
    
    if appointment_data.get('phone'):
        results["sms"] = await SMSService.send_sms(
            appointment_data['phone'],
            sms_message
        )
    
    return results

# ──────────────────────────────────────────────────────── Message Notifications ──
async def send_message_notification(
    phone_number: Optional[str],
    email: Optional[str],
    message: str,
    patient_name: str = "Patient"
) -> Dict[str, bool]:
    """Send notification for new message."""
    results = {"email": False, "sms": False}
    
    # SMS notification
    if phone_number:
        sms_text = f"FIATTIB: New message from reception. Please check your patient portal or call +998712345678"
        results["sms"] = await SMSService.send_sms(phone_number, sms_text)
    
    # Email notification
    if email:
        subject = "New Message - FIATTIB Medical Center"
        body = f"""
Dear {patient_name},

You have received a new message from FIATTIB Medical Center reception:

"{message}"

Please log in to your patient portal to view and respond to messages.

If you need immediate assistance, please contact us:
Phone: +998 71 234 56 78
Email: info@fiattib.com

Best regards,
FIATTIB Medical Center Team
"""
        results["email"] = await EmailService.send_email(email, subject, body)
    
    return results

# ──────────────────────────────────────────────────────── Profile Creation Notifications ──
async def send_profile_creation_notification(
    phone_number: Optional[str],
    email: Optional[str],
    patient_name: str = "Patient"
) -> Dict[str, bool]:
    """Send notification to patient when their profile is created."""
    results = {"email": False, "sms": False}
    
    # Validate that at least one contact method is provided
    if not phone_number and not email:
        logger.warning("No contact method provided for profile creation notification")
        return results
    
    # SMS notification
    if phone_number:
        sms_text = f"FIATTIB: Your patient profile has been created successfully. Welcome to FIATTIB Medical Center! Contact: +998712345678"
        results["sms"] = await SMSService.send_sms(phone_number, sms_text)
    
    # Email notification
    if email:
        subject = "Welcome to FIATTIB Medical Center - Your Profile Has Been Created"
        body = f"""
Dear {patient_name},

Welcome to FIATTIB Medical Center!

Your patient profile has been successfully created in our system. You can now:

- Schedule appointments with our doctors
- Access your medical records and test results
- Receive important health updates
- Communicate with our medical staff

If you have any questions or need assistance, please contact us:
Phone: +998 71 234 56 78
Email: info@fiattib.com
Portal: https://fiattib.com/patient

We look forward to providing you with excellent healthcare services.

Best regards,
FIATTIB Medical Center Team
"""
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FIATTIB Medical Center</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #4DB6B0; padding: 30px 40px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to FIATTIB Medical Center</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                                Dear {patient_name},
                            </p>
                            
                            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
                                Welcome to FIATTIB Medical Center!
                            </p>
                            
                            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
                                Your patient profile has been successfully created in our system. You can now:
                            </p>
                            
                            <ul style="font-size: 16px; color: #333; line-height: 1.8; margin-bottom: 30px;">
                                <li>Schedule appointments with our doctors</li>
                                <li>Access your medical records and test results</li>
                                <li>Receive important health updates</li>
                                <li>Communicate with our medical staff</li>
                            </ul>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
                                <p style="font-size: 14px; color: #666; margin: 0;">
                                    <strong>Contact Information:</strong><br>
                                    Phone: +998 71 234 56 78<br>
                                    Email: info@fiattib.com<br>
                                    Portal: <a href="https://fiattib.com/patient" style="color: #4DB6B0;">https://fiattib.com/patient</a>
                                </p>
                            </div>
                            
                            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 30px;">
                                We look forward to providing you with excellent healthcare services.
                            </p>
                            
                            <div style="text-align: center;">
                                <a href="https://fiattib.com/patient" 
                                   style="background-color: #4DB6B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                    Access Patient Portal
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666; font-size: 12px; margin: 0;">
                                FIATTIB Medical Center<br>
                                123 Healthcare Avenue, Medical City<br>
                                +998 71 234 56 78 | info@fiattib.com
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        results["email"] = await EmailService.send_email(email, subject, body, html_body)
    
    return results

# ──────────────────────────────────────────────────────── Invitation Notifications ──
async def send_invitation_sms(phone_number: str, message: str) -> bool:
    """Send invitation SMS."""
    return await SMSService.send_sms(phone_number, message)

async def send_invitation_email(email: str, subject: str, message: str) -> bool:
    """Send invitation email."""
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #4DB6B0; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to FIATTIB Medical Center</h1>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333; line-height: 1.6;">{message}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://fiattib.com/patient/register" 
                       style="background-color: #4DB6B0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Complete Registration
                    </a>
                </div>
                <p style="font-size: 14px; color: #666;">
                    If you have any questions, please contact us at +998 71 234 56 78 or info@fiattib.com
                </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                    FIATTIB Medical Center<br>
                    123 Healthcare Avenue, Medical City<br>
                    +998 71 234 56 78 | info@fiattib.com
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await EmailService.send_email(email, subject, message, html_body)

# ──────────────────────────────────────────────────────── System Notifications ──
async def send_system_alert(
    message: str,
    severity: str = "info",  # info | warning | error
    recipients: Optional[list] = None
) -> bool:
    """Send system alert to administrators."""
    if not recipients:
        recipients = ["admin@fiattib.com"]  # Default admin email
    
    subject = f"[FIATTIB System Alert - {severity.upper()}] {message}"
    body = f"""
System Alert: {severity.upper()}

Message: {message}
Timestamp: {datetime.now().isoformat()}
System: Reception Portal

This is an automated system notification.
"""
    
    success = True
    for recipient in recipients:
        result = await EmailService.send_email(recipient, subject, body)
        success = success and result
    
    return success

# ──────────────────────────────────────────────────────── Notification Templates ──
class NotificationTemplates:
    @staticmethod
    def appointment_reminder(appointment_data: Dict[str, Any], hours_before: int = 24) -> str:
        """Generate appointment reminder message."""
        return f"""
Reminder: You have an appointment tomorrow at {appointment_data.get('time')} with {appointment_data.get('doctor')} at FIATTIB Medical Center.

Please arrive 15 minutes early and bring your ID and insurance card.

Contact us: +998 71 234 56 78
        """.strip()
    
    @staticmethod
    def test_results_ready(patient_name: str) -> str:
        """Generate test results notification."""
        return f"""
Dear {patient_name},

Your test results are now available. Please contact FIATTIB Medical Center to schedule a follow-up appointment to discuss your results.

Phone: +998 71 234 56 78
Portal: https://fiattib.com/patient/results

Best regards,
FIATTIB Medical Center
        """.strip()
    
    @staticmethod
    def payment_reminder(patient_name: str, amount: str) -> str:
        """Generate payment reminder."""
        return f"""
Dear {patient_name},

This is a friendly reminder that you have an outstanding balance of {amount}.

Please contact our billing department to arrange payment:
Phone: +998 71 234 56 78
Email: billing@fiattib.com

Thank you,
FIATTIB Medical Center
        """.strip()

# ──────────────────────────────────────────────────────── Testing Functions ──
async def test_notifications():
    """Test function to verify notification services."""
    test_appointment = {
        "patient": "Test Patient",
        "date": "2025-01-15",
        "time": "10:00",
        "doctor": "Dr. Test",
        "reason": "Test appointment",
        "phone": "+998901234567",
        "email": "test@example.com"
    }
    
    # Test appointment notification
    result = await send_appointment_notification(test_appointment, "created")
    print(f"Appointment notification test: {result}")
    
    # Test message notification
    result = await send_message_notification(
        "+998901234567",
        "test@example.com",
        "This is a test message from reception.",
        "Test Patient"
    )
    print(f"Message notification test: {result}")
    
    # Test system alert
    result = await send_system_alert("Test system alert", "info")
    print(f"System alert test: {result}")

if __name__ == "__main__":
    # Run tests
    asyncio.run(test_notifications())