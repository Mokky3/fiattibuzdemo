"""Patient Notification Service
Handles sending notifications to patients based on their preferences and settings.
Integrates with the patient settings system to respect user preferences.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.patient_portal import patient_portal_crud
from app.common.models.patient import Patient
from app.common.models.user import User
from app.common.services.notification_service import (
    EmailService, 
    SMSService, 
    send_appointment_notification,
    send_message_notification,
    NotificationTemplates
)

logger = logging.getLogger(__name__)

class PatientNotificationService:
    """Service for sending notifications to patients based on their preferences."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_patient_contact_info(self, patient_id: str) -> Dict[str, Any]:
        """Get patient contact information and notification preferences."""
        try:
            # Get patient settings
            settings = patient_portal_crud.get_patient_settings(self.db, patient_id)
            
            # Get patient and user info
            patient = self.db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if not patient:
                return {}
            
            user = self.db.query(User).filter(User.id == patient.user_id).first()
            if not user:
                return {}
            
            return {
                "patient_id": patient_id,
                "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                "email": patient.email or user.email,
                "phone": patient.phone or user.phone,
                "settings": settings or {}
            }
        except Exception as e:
            logger.error(f"Failed to get patient contact info for {patient_id}: {e}")
            return {}
    
    async def should_send_notification(
        self, 
        patient_id: str, 
        notification_type: str,
        channel: str
    ) -> bool:
        """Check if notification should be sent based on patient preferences."""
        try:
            settings = patient_portal_crud.get_patient_settings(self.db, patient_id)
            if not settings:
                # Default to sending if no settings found
                return True
            
            notifications_settings = settings.get("notifications", {})
            
            # Check channel-specific settings
            if channel == "email":
                email_settings = notifications_settings.get("email", {})
                if notification_type == "appointments":
                    return email_settings.get("appointments", True)
                elif notification_type == "reminders":
                    return email_settings.get("reminders", True)
                elif notification_type == "labResults":
                    return email_settings.get("labResults", True)
                elif notification_type == "prescriptions":
                    return email_settings.get("prescriptions", True)
                elif notification_type == "newsletters":
                    return email_settings.get("newsletters", False)
                else:
                    return True  # Default to sending for unknown types
            
            elif channel == "sms":
                sms_settings = notifications_settings.get("sms", {})
                if notification_type == "appointments":
                    return sms_settings.get("appointments", True)
                elif notification_type == "reminders":
                    return sms_settings.get("reminders", True)
                elif notification_type == "emergency":
                    return sms_settings.get("emergencyOnly", False)
                else:
                    return False  # Default to not sending SMS for unknown types
            
            elif channel == "push":
                push_settings = notifications_settings.get("push", {})
                if not push_settings.get("enabled", True):
                    return False
                
                if notification_type == "appointments":
                    return push_settings.get("appointments", True)
                elif notification_type == "messages":
                    return push_settings.get("messages", True)
                elif notification_type == "updates":
                    return push_settings.get("updates", False)
                else:
                    return True  # Default to sending for unknown types
            
            return True  # Default to sending if channel not recognized
            
        except Exception as e:
            logger.error(f"Failed to check notification preferences for {patient_id}: {e}")
            return True  # Default to sending on error
    
    async def send_appointment_notification(
        self,
        patient_id: str,
        appointment_data: Dict[str, Any],
        action: str,
        reason: Optional[str] = None
    ) -> Dict[str, bool]:
        """Send appointment notification respecting patient preferences."""
        try:
            # Get patient contact info
            contact_info = await self.get_patient_contact_info(patient_id)
            if not contact_info:
                logger.error(f"No contact info found for patient {patient_id}")
                return {"email": False, "sms": False, "push": False}
            
            results = {"email": False, "sms": False, "push": False}
            
            # Prepare appointment data with patient info
            full_appointment_data = {
                **appointment_data,
                "patient": contact_info["patient_name"],
                "email": contact_info["email"],
                "phone": contact_info["phone"]
            }
            
            # Send email notification
            if contact_info["email"] and await self.should_send_notification(patient_id, "appointments", "email"):
                try:
                    results["email"] = await self._send_appointment_email(
                        full_appointment_data, action, reason
                    )
                except Exception as e:
                    logger.error(f"Failed to send appointment email to {patient_id}: {e}")
                    results["email"] = False
            
            # Send SMS notification
            if contact_info["phone"] and await self.should_send_notification(patient_id, "appointments", "sms"):
                try:
                    results["sms"] = await self._send_appointment_sms(
                        full_appointment_data, action, reason
                    )
                except Exception as e:
                    logger.error(f"Failed to send appointment SMS to {patient_id}: {e}")
                    results["sms"] = False
            
            # Send push notification (placeholder for future implementation)
            if await self.should_send_notification(patient_id, "appointments", "push"):
                try:
                    results["push"] = await self._send_appointment_push(
                        full_appointment_data, action, reason
                    )
                except Exception as e:
                    logger.error(f"Failed to send appointment push to {patient_id}: {e}")
                    results["push"] = False
            
            logger.info(f"Appointment notification results for {patient_id}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Failed to send appointment notification to {patient_id}: {e}")
            return {"email": False, "sms": False, "push": False}
    
    async def send_reminder_notification(
        self,
        patient_id: str,
        reminder_data: Dict[str, Any],
        reminder_type: str = "appointment"
    ) -> Dict[str, bool]:
        """Send reminder notification respecting patient preferences."""
        try:
            contact_info = await self.get_patient_contact_info(patient_id)
            if not contact_info:
                return {"email": False, "sms": False, "push": False}
            
            results = {"email": False, "sms": False, "push": False}
            
            # Send email reminder
            if contact_info["email"] and await self.should_send_notification(patient_id, "reminders", "email"):
                results["email"] = await self._send_reminder_email(contact_info, reminder_data, reminder_type)
            
            # Send SMS reminder
            if contact_info["phone"] and await self.should_send_notification(patient_id, "reminders", "sms"):
                results["sms"] = await self._send_reminder_sms(contact_info, reminder_data, reminder_type)
            
            # Send push reminder
            if await self.should_send_notification(patient_id, "reminders", "push"):
                results["push"] = await self._send_reminder_push(contact_info, reminder_data, reminder_type)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to send reminder notification to {patient_id}: {e}")
            return {"email": False, "sms": False, "push": False}
    
    async def send_lab_result_notification(
        self,
        patient_id: str,
        lab_data: Dict[str, Any]
    ) -> Dict[str, bool]:
        """Send lab result notification respecting patient preferences."""
        try:
            contact_info = await self.get_patient_contact_info(patient_id)
            if not contact_info:
                return {"email": False, "sms": False, "push": False}
            
            results = {"email": False, "sms": False, "push": False}
            
            # Send email notification
            if contact_info["email"] and await self.should_send_notification(patient_id, "labResults", "email"):
                results["email"] = await self._send_lab_result_email(contact_info, lab_data)
            
            # Send push notification (SMS not typically used for lab results)
            if await self.should_send_notification(patient_id, "labResults", "push"):
                results["push"] = await self._send_lab_result_push(contact_info, lab_data)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to send lab result notification to {patient_id}: {e}")
            return {"email": False, "sms": False, "push": False}
    
    async def send_prescription_notification(
        self,
        patient_id: str,
        prescription_data: Dict[str, Any]
    ) -> Dict[str, bool]:
        """Send prescription notification respecting patient preferences."""
        try:
            contact_info = await self.get_patient_contact_info(patient_id)
            if not contact_info:
                return {"email": False, "sms": False, "push": False}
            
            results = {"email": False, "sms": False, "push": False}
            
            # Send email notification
            if contact_info["email"] and await self.should_send_notification(patient_id, "prescriptions", "email"):
                results["email"] = await self._send_prescription_email(contact_info, prescription_data)
            
            # Send push notification
            if await self.should_send_notification(patient_id, "prescriptions", "push"):
                results["push"] = await self._send_prescription_push(contact_info, prescription_data)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to send prescription notification to {patient_id}: {e}")
            return {"email": False, "sms": False, "push": False}
    
    async def send_message_notification(
        self,
        patient_id: str,
        message_data: Dict[str, Any]
    ) -> Dict[str, bool]:
        """Send message notification respecting patient preferences."""
        try:
            contact_info = await self.get_patient_contact_info(patient_id)
            if not contact_info:
                return {"email": False, "sms": False, "push": False}
            
            results = {"email": False, "sms": False, "push": False}
            
            # Send email notification
            if contact_info["email"] and await self.should_send_notification(patient_id, "messages", "email"):
                results["email"] = await self._send_message_email(contact_info, message_data)
            
            # Send SMS notification
            if contact_info["phone"] and await self.should_send_notification(patient_id, "messages", "sms"):
                results["sms"] = await self._send_message_sms(contact_info, message_data)
            
            # Send push notification
            if await self.should_send_notification(patient_id, "messages", "push"):
                results["push"] = await self._send_message_push(contact_info, message_data)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to send message notification to {patient_id}: {e}")
            return {"email": False, "sms": False, "push": False}
    
    # Private helper methods for sending specific types of notifications
    
    async def _send_appointment_email(self, appointment_data: Dict[str, Any], action: str, reason: Optional[str] = None) -> bool:
        """Send appointment email using the existing notification service."""
        return await send_appointment_notification(appointment_data, action, reason)
    
    async def _send_appointment_sms(self, appointment_data: Dict[str, Any], action: str, reason: Optional[str] = None) -> bool:
        """Send appointment SMS."""
        action_text = {
            "created": "scheduled",
            "confirmed": "confirmed", 
            "declined": "declined",
            "cancelled": "cancelled"
        }.get(action, "updated")
        
        message = f"FIATTIB: Your appointment on {appointment_data.get('date')} at {appointment_data.get('time')} has been {action_text}."
        if reason:
            message += f" Reason: {reason}"
        message += " Contact us: +998712345678"
        
        return await SMSService.send_sms(appointment_data.get('phone', ''), message)
    
    async def _send_appointment_push(self, appointment_data: Dict[str, Any], action: str, reason: Optional[str] = None) -> bool:
        """Send appointment push notification (placeholder for future implementation)."""
        # TODO: Implement push notification service
        logger.info(f"Push notification would be sent for appointment {action}: {appointment_data}")
        return True  # Placeholder - always return success
    
    async def _send_reminder_email(self, contact_info: Dict[str, Any], reminder_data: Dict[str, Any], reminder_type: str) -> bool:
        """Send reminder email."""
        if reminder_type == "appointment":
            message = NotificationTemplates.appointment_reminder(reminder_data)
        else:
            message = f"Reminder: {reminder_data.get('message', 'You have a reminder from FIATTIB Medical Center.')}"
        
        subject = f"Reminder - FIATTIB Medical Center"
        return await EmailService.send_email(contact_info["email"], subject, message)
    
    async def _send_reminder_sms(self, contact_info: Dict[str, Any], reminder_data: Dict[str, Any], reminder_type: str) -> bool:
        """Send reminder SMS."""
        if reminder_type == "appointment":
            message = f"Reminder: You have an appointment tomorrow at {reminder_data.get('time')} with {reminder_data.get('doctor')} at FIATTIB Medical Center. Contact: +998712345678"
        else:
            message = f"FIATTIB Reminder: {reminder_data.get('message', 'You have a reminder from FIATTIB Medical Center.')} Contact: +998712345678"
        
        return await SMSService.send_sms(contact_info["phone"], message)
    
    async def _send_reminder_push(self, contact_info: Dict[str, Any], reminder_data: Dict[str, Any], reminder_type: str) -> bool:
        """Send reminder push notification."""
        logger.info(f"Push reminder would be sent: {reminder_data}")
        return True  # Placeholder
    
    async def _send_lab_result_email(self, contact_info: Dict[str, Any], lab_data: Dict[str, Any]) -> bool:
        """Send lab result email."""
        message = NotificationTemplates.test_results_ready(contact_info["patient_name"])
        subject = "Test Results Available - FIATTIB Medical Center"
        return await EmailService.send_email(contact_info["email"], subject, message)
    
    async def _send_lab_result_push(self, contact_info: Dict[str, Any], lab_data: Dict[str, Any]) -> bool:
        """Send lab result push notification."""
        logger.info(f"Lab result push would be sent: {lab_data}")
        return True  # Placeholder
    
    async def _send_prescription_email(self, contact_info: Dict[str, Any], prescription_data: Dict[str, Any]) -> bool:
        """Send prescription email."""
        subject = "New Prescription Available - FIATTIB Medical Center"
        message = f"""
Dear {contact_info["patient_name"]},

Your new prescription is ready for pickup at FIATTIB Medical Center.

Prescription Details:
- Medication: {prescription_data.get('medication', 'N/A')}
- Dosage: {prescription_data.get('dosage', 'N/A')}
- Instructions: {prescription_data.get('instructions', 'N/A')}

Please bring your ID and insurance card when picking up your prescription.

Contact us: +998 71 234 56 78
Email: info@fiattib.com

Best regards,
FIATTIB Medical Center Team
        """.strip()
        
        return await EmailService.send_email(contact_info["email"], subject, message)
    
    async def _send_prescription_push(self, contact_info: Dict[str, Any], prescription_data: Dict[str, Any]) -> bool:
        """Send prescription push notification."""
        logger.info(f"Prescription push would be sent: {prescription_data}")
        return True  # Placeholder
    
    async def _send_message_email(self, contact_info: Dict[str, Any], message_data: Dict[str, Any]) -> bool:
        """Send message email."""
        return await send_message_notification(
            contact_info["phone"],
            contact_info["email"],
            message_data.get("message", ""),
            contact_info["patient_name"]
        )
    
    async def _send_message_sms(self, contact_info: Dict[str, Any], message_data: Dict[str, Any]) -> bool:
        """Send message SMS."""
        sms_text = f"FIATTIB: New message from reception. Please check your patient portal or call +998712345678"
        return await SMSService.send_sms(contact_info["phone"], sms_text)
    
    async def _send_message_push(self, contact_info: Dict[str, Any], message_data: Dict[str, Any]) -> bool:
        """Send message push notification."""
        logger.info(f"Message push would be sent: {message_data}")
        return True  # Placeholder


# Convenience functions for easy integration
async def send_patient_appointment_notification(
    db: Session,
    patient_id: str,
    appointment_data: Dict[str, Any],
    action: str,
    reason: Optional[str] = None
) -> Dict[str, bool]:
    """Convenience function to send appointment notification to a patient."""
    service = PatientNotificationService(db)
    return await service.send_appointment_notification(patient_id, appointment_data, action, reason)

async def send_patient_reminder_notification(
    db: Session,
    patient_id: str,
    reminder_data: Dict[str, Any],
    reminder_type: str = "appointment"
) -> Dict[str, bool]:
    """Convenience function to send reminder notification to a patient."""
    service = PatientNotificationService(db)
    return await service.send_reminder_notification(patient_id, reminder_data, reminder_type)

async def send_patient_lab_result_notification(
    db: Session,
    patient_id: str,
    lab_data: Dict[str, Any]
) -> Dict[str, bool]:
    """Convenience function to send lab result notification to a patient."""
    service = PatientNotificationService(db)
    return await service.send_lab_result_notification(patient_id, lab_data)

async def send_patient_prescription_notification(
    db: Session,
    patient_id: str,
    prescription_data: Dict[str, Any]
) -> Dict[str, bool]:
    """Convenience function to send prescription notification to a patient."""
    service = PatientNotificationService(db)
    return await service.send_prescription_notification(patient_id, prescription_data)

async def send_patient_message_notification(
    db: Session,
    patient_id: str,
    message_data: Dict[str, Any]
) -> Dict[str, bool]:
    """Convenience function to send message notification to a patient."""
    service = PatientNotificationService(db)
    return await service.send_message_notification(patient_id, message_data)
