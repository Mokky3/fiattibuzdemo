"""
SMS Notification Service
Integrates with Eskiz.uz SMS gateway for sending SMS notifications.
"""
import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import httpx

logger = logging.getLogger(__name__)


class EskizSMSGateway:
    """Eskiz.uz SMS Gateway integration."""
    
    BASE_URL = "https://notify.eskiz.uz/api"
    AUTH_ENDPOINT = f"{BASE_URL}/auth/login"
    SEND_SMS_ENDPOINT = f"{BASE_URL}/message/sms/send"
    REFRESH_TOKEN_ENDPOINT = f"{BASE_URL}/auth/refresh"
    
    def __init__(self):
        self.email = os.getenv("ESKIZ_EMAIL")
        self.password = os.getenv("ESKIZ_PASSWORD")
        self.sender_id = os.getenv("ESKIZ_SENDER_ID", "4546")
        self.token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        
        if not self.email or not self.password:
            logger.warning("Eskiz.uz credentials not configured. SMS sending will be disabled.")
    
    async def authenticate(self) -> bool:
        """Authenticate with Eskiz.uz API and get access token."""
        if not self.email or not self.password:
            logger.error("Eskiz.uz credentials not configured")
            return False
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.AUTH_ENDPOINT,
                    data={
                        "email": self.email,
                        "password": self.password
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("message") == "token_generated":
                        self.token = data.get("data", {}).get("token")
                        # Tokens typically expire after some time, refresh after 23 hours
                        self.token_expires_at = datetime.now() + timedelta(hours=23)
                        logger.info("Successfully authenticated with Eskiz.uz")
                        return True
                    else:
                        logger.error(f"Authentication failed: {data.get('message')}")
                        return False
                else:
                    logger.error(f"Authentication failed with status {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error during Eskiz.uz authentication: {str(e)}")
            return False
    
    async def refresh_token(self) -> bool:
        """Refresh the access token."""
        if not self.token:
            return await self.authenticate()
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    self.REFRESH_TOKEN_ENDPOINT,
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("message") == "token_generated":
                        self.token = data.get("data", {}).get("token")
                        self.token_expires_at = datetime.now() + timedelta(hours=23)
                        logger.info("Successfully refreshed Eskiz.uz token")
                        return True
                    else:
                        # If refresh fails, try re-authenticating
                        return await self.authenticate()
                else:
                    # If refresh fails, try re-authenticating
                    return await self.authenticate()
                    
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            return await self.authenticate()
    
    async def ensure_authenticated(self) -> bool:
        """Ensure we have a valid token."""
        if not self.token:
            return await self.authenticate()
        
        # Check if token is about to expire (within 1 hour)
        if self.token_expires_at and datetime.now() >= (self.token_expires_at - timedelta(hours=1)):
            return await self.refresh_token()
        
        return True
    
    def format_phone_number(self, phone: str) -> str:
        """Format phone number for Eskiz.uz (should be in format 998901234567)."""
        # Remove all non-digit characters
        phone = ''.join(filter(str.isdigit, phone))
        
        # If starts with +, remove it
        if phone.startswith('+'):
            phone = phone[1:]
        
        # If starts with 998, use as is
        if phone.startswith('998'):
            return phone
        
        # If starts with 8, replace with 998
        if phone.startswith('8'):
            return '998' + phone[1:]
        
        # If starts with 9, add 998 prefix
        if phone.startswith('9'):
            return '998' + phone
        
        # Default: assume it's already in correct format or add 998
        return phone if len(phone) >= 9 else f"998{phone}"
    
    async def send_sms(
        self,
        mobile_phone: str,
        message: str,
        from_sender: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS via Eskiz.uz gateway.
        
        Args:
            mobile_phone: Phone number (will be formatted automatically)
            message: SMS message text
            from_sender: Sender ID (defaults to configured sender_id)
        
        Returns:
            Dict with success status and response data
        """
        if not self.email or not self.password:
            logger.warning("Eskiz.uz not configured, SMS not sent")
            return {
                "success": False,
                "error": "Eskiz.uz credentials not configured",
                "message_id": None
            }
        
        # Ensure we're authenticated
        if not await self.ensure_authenticated():
            logger.error("Failed to authenticate with Eskiz.uz")
            return {
                "success": False,
                "error": "Authentication failed",
                "message_id": None
            }
        
        # Format phone number
        formatted_phone = self.format_phone_number(mobile_phone)
        sender_id = from_sender or self.sender_id
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.SEND_SMS_ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={
                        "mobile_phone": formatted_phone,
                        "message": message,
                        "from": sender_id
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("status") == "ok" or data.get("message") == "SMS sent":
                        message_id = data.get("id") or data.get("message_id")
                        logger.info(f"SMS sent successfully to {formatted_phone}, message_id: {message_id}")
                        return {
                            "success": True,
                            "message_id": message_id,
                            "phone": formatted_phone,
                            "response": data
                        }
                    else:
                        error_msg = data.get("message") or data.get("error") or "Unknown error"
                        logger.error(f"Eskiz.uz API error: {error_msg}")
                        return {
                            "success": False,
                            "error": error_msg,
                            "message_id": None,
                            "response": data
                        }
                else:
                    error_text = response.text
                    logger.error(f"Eskiz.uz API returned status {response.status_code}: {error_text}")
                    
                    # If unauthorized, try to re-authenticate
                    if response.status_code == 401:
                        logger.info("Token expired, attempting to re-authenticate...")
                        if await self.authenticate():
                            # Retry sending
                            return await self.send_sms(mobile_phone, message, from_sender)
                    
                    return {
                        "success": False,
                        "error": f"API returned status {response.status_code}",
                        "message_id": None,
                        "response": error_text
                    }
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout while sending SMS to {formatted_phone}")
            return {
                "success": False,
                "error": "Request timeout",
                "message_id": None
            }
        except Exception as e:
            logger.error(f"Error sending SMS to {formatted_phone}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message_id": None
            }
    
    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        from_sender: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS to multiple recipients.
        
        Args:
            recipients: List of dicts with 'phone' key
            message: SMS message text
            from_sender: Sender ID
        
        Returns:
            Dict with success count and results
        """
        results = {
            "success_count": 0,
            "failure_count": 0,
            "results": []
        }
        
        for recipient in recipients:
            phone = recipient.get("phone")
            if not phone:
                continue
            
            result = await self.send_sms(phone, message, from_sender)
            results["results"].append({
                "phone": phone,
                "result": result
            })
            
            if result.get("success"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
        
        logger.info(f"Bulk SMS completed: {results['success_count']} success, {results['failure_count']} failures")
        return results


class SMSNotificationService:
    """SMS Notification Service for the application."""
    
    def __init__(self):
        self.gateway = EskizSMSGateway()
        self.enabled = os.getenv("SMS_ENABLED", "true").lower() == "true"
    
    async def send_sms(
        self,
        phone: str,
        message: str,
        sender_id: Optional[str] = None
    ) -> bool:
        """
        Send SMS notification.
        
        Args:
            phone: Recipient phone number
            message: SMS message text
            sender_id: Optional sender ID override
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info(f"SMS disabled, would send to {phone}: {message[:50]}...")
            return True
        
        result = await self.gateway.send_sms(phone, message, sender_id)
        return result.get("success", False)
    
    async def send_appointment_sms(
        self,
        phone: str,
        appointment_data: Dict[str, Any],
        action: str = "created",
        reason: Optional[str] = None
    ) -> bool:
        """Send appointment notification SMS."""
        action_text = {
            "created": "scheduled",
            "confirmed": "confirmed",
            "cancelled": "cancelled",
            "declined": "declined",
            "rescheduled": "rescheduled"
        }.get(action, "updated")
        
        date = appointment_data.get("date", "N/A")
        time = appointment_data.get("time", "N/A")
        doctor = appointment_data.get("doctor", "Doctor")
        
        message = f"FIATTIB: Appointment on {date} at {time} with {doctor} has been {action_text}."
        
        if reason:
            message += f" Reason: {reason}"
        
        message += " Contact: +998712345678"
        
        return await self.send_sms(phone, message)
    
    async def send_reminder_sms(
        self,
        phone: str,
        reminder_data: Dict[str, Any],
        reminder_type: str = "appointment"
    ) -> bool:
        """Send reminder SMS."""
        if reminder_type == "appointment":
            date = reminder_data.get("date", "N/A")
            time = reminder_data.get("time", "N/A")
            doctor = reminder_data.get("doctor", "Doctor")
            message = f"FIATTIB Reminder: Appointment tomorrow at {time} with {doctor}. Date: {date}. Please arrive 15 min early. Contact: +998712345678"
        else:
            message = f"FIATTIB Reminder: {reminder_data.get('message', 'You have a reminder from FIATTIB Medical Center.')} Contact: +998712345678"
        
        return await self.send_sms(phone, message)
    
    async def send_invitation_sms(
        self,
        phone: str,
        token: str,
        role: str,
        clinic: str,
        registration_url: Optional[str] = None
    ) -> bool:
        """Send invitation SMS."""
        url = registration_url or f"https://app.fiattib.com/register?token={token}"
        message = f"FIATTIB: You've been invited to join {clinic} as {role}. Register: {url}"
        
        return await self.send_sms(phone, message)
    
    async def send_verification_code_sms(
        self,
        phone: str,
        code: str
    ) -> bool:
        """Send verification code SMS."""
        message = f"FIATTIB: Your verification code is {code}. Valid for 10 minutes. Do not share this code."
        
        return await self.send_sms(phone, message)
    
    async def send_lab_result_sms(
        self,
        phone: str,
        patient_name: str
    ) -> bool:
        """Send lab result notification SMS."""
        message = f"FIATTIB: Your test results are ready. Please check your patient portal or contact us: +998712345678"
        
        return await self.send_sms(phone, message)
    
    async def send_prescription_sms(
        self,
        phone: str,
        prescription_data: Dict[str, Any]
    ) -> bool:
        """Send prescription notification SMS."""
        medication = prescription_data.get("medication", "prescription")
        message = f"FIATTIB: Your prescription for {medication} is ready for pickup. Contact: +998712345678"
        
        return await self.send_sms(phone, message)
    
    async def send_message_notification_sms(
        self,
        phone: str,
        sender: str = "reception"
    ) -> bool:
        """Send message notification SMS."""
        message = f"FIATTIB: New message from {sender}. Please check your patient portal or call +998712345678"
        
        return await self.send_sms(phone, message)
    
    async def send_bulk_sms(
        self,
        recipients: List[Dict[str, str]],
        message: str,
        sender_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send SMS to multiple recipients."""
        if not self.enabled:
            logger.info(f"SMS disabled, would send bulk SMS to {len(recipients)} recipients")
            return {
                "success_count": len(recipients),
                "failure_count": 0,
                "results": []
            }
        
        return await self.gateway.send_bulk_sms(recipients, message, sender_id)


# Create singleton instance
sms_notification_service = SMSNotificationService()

