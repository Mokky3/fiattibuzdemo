"""Patient Notification Routes
API endpoints for sending notifications to patients based on their preferences.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.common.auth.auth_service import AuthenticatedUser, require_patient_access
from app.services.patient_notification_service import (
    PatientNotificationService,
    send_patient_appointment_notification,
    send_patient_reminder_notification,
    send_patient_lab_result_notification,
    send_patient_prescription_notification,
    send_patient_message_notification
)

router = APIRouter()

# Request/Response Models   
class AppointmentNotificationRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID to send notification to")
    appointment_data: Dict[str, Any] = Field(..., description="Appointment details")
    action: str = Field(..., description="Action: created, confirmed, declined, cancelled")
    reason: Optional[str] = Field(None, description="Optional reason for the action")

class ReminderNotificationRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID to send notification to")
    reminder_data: Dict[str, Any] = Field(..., description="Reminder details")
    reminder_type: str = Field("appointment", description="Type of reminder: appointment, prescription, etc.")

class LabResultNotificationRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID to send notification to")
    lab_data: Dict[str, Any] = Field(..., description="Lab result details")

class PrescriptionNotificationRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID to send notification to")
    prescription_data: Dict[str, Any] = Field(..., description="Prescription details")

class MessageNotificationRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID to send notification to")
    message_data: Dict[str, Any] = Field(..., description="Message details")

class NotificationResponse(BaseModel):
    success: bool = Field(..., description="Whether the notification was sent successfully")
    results: Dict[str, bool] = Field(..., description="Results for each channel (email, sms, push)")
    message: str = Field(..., description="Response message")

# Notification Endpoints

@router.post("/notifications/appointment", response_model=NotificationResponse)
async def send_appointment_notification(
    request: AppointmentNotificationRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Send appointment notification to a patient based on their preferences."""
    try:
        results = await send_patient_appointment_notification(
            db=db,
            patient_id=request.patient_id,
            appointment_data=request.appointment_data,
            action=request.action,
            reason=request.reason
        )
        
        success = any(results.values())
        message = f"Appointment notification sent via {', '.join([k for k, v in results.items() if v])}" if success else "No notifications sent (user preferences)"
        
        return NotificationResponse(
            success=success,
            results=results,
            message=message
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send appointment notification: {str(e)}"
        )

@router.post("/notifications/reminder", response_model=NotificationResponse)
async def send_reminder_notification(
    request: ReminderNotificationRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Send reminder notification to a patient based on their preferences."""
    try:
        results = await send_patient_reminder_notification(
            db=db,
            patient_id=request.patient_id,
            reminder_data=request.reminder_data,
            reminder_type=request.reminder_type
        )
        
        success = any(results.values())
        message = f"Reminder notification sent via {', '.join([k for k, v in results.items() if v])}" if success else "No notifications sent (user preferences)"
        
        return NotificationResponse(
            success=success,
            results=results,
            message=message
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reminder notification: {str(e)}"
        )

@router.post("/notifications/lab-result", response_model=NotificationResponse)
async def send_lab_result_notification(
    request: LabResultNotificationRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Send lab result notification to a patient based on their preferences."""
    try:
        results = await send_patient_lab_result_notification(
            db=db,
            patient_id=request.patient_id,
            lab_data=request.lab_data
        )
        
        success = any(results.values())
        message = f"Lab result notification sent via {', '.join([k for k, v in results.items() if v])}" if success else "No notifications sent (user preferences)"
        
        return NotificationResponse(
            success=success,
            results=results,
            message=message
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send lab result notification: {str(e)}"
        )

@router.post("/notifications/prescription", response_model=NotificationResponse)
async def send_prescription_notification(
    request: PrescriptionNotificationRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Send prescription notification to a patient based on their preferences."""
    try:
        results = await send_patient_prescription_notification(
            db=db,
            patient_id=request.patient_id,
            prescription_data=request.prescription_data
        )
        
        success = any(results.values())
        message = f"Prescription notification sent via {', '.join([k for k, v in results.items() if v])}" if success else "No notifications sent (user preferences)"
        
        return NotificationResponse(
            success=success,
            results=results,
            message=message
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send prescription notification: {str(e)}"
        )

@router.post("/notifications/message", response_model=NotificationResponse)
async def send_message_notification(
    request: MessageNotificationRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Send message notification to a patient based on their preferences."""
    try:
        results = await send_patient_message_notification(
            db=db,
            patient_id=request.patient_id,
            message_data=request.message_data
        )
        
        success = any(results.values())
        message = f"Message notification sent via {', '.join([k for k, v in results.items() if v])}" if success else "No notifications sent (user preferences)"
        
        return NotificationResponse(
            success=success,
            results=results,
            message=message
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message notification: {str(e)}"
        )

# Test endpoint for development
@router.post("/notifications/test")
async def test_notification_system(
    patient_id: str,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Test endpoint to verify notification system is working."""
    try:
        service = PatientNotificationService(db)
        
        # Test appointment notification
        test_appointment = {
            "date": "2025-01-15",
            "time": "10:00",
            "doctor": "Dr. Test",
            "reason": "Test appointment"
        }
        
        appointment_results = await service.send_appointment_notification(
            patient_id, test_appointment, "created", "Testing notification system"
        )
        
        # Test reminder notification
        test_reminder = {
            "date": "2025-01-15",
            "time": "10:00",
            "doctor": "Dr. Test",
            "message": "Test reminder"
        }
        
        reminder_results = await service.send_reminder_notification(
            patient_id, test_reminder, "appointment"
        )
        
        return {
            "success": True,
            "message": "Notification system test completed",
            "appointment_results": appointment_results,
            "reminder_results": reminder_results,
            "patient_id": patient_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Notification system test failed: {str(e)}"
        )
