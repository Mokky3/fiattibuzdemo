"""Patient Privacy Routes
API endpoints for privacy controls, data export, and data deletion based on user preferences.
"""
import json
import zipfile
import io
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.common.auth.auth_service import AuthenticatedUser, require_patient_access
from app.crud.patient_portal import patient_portal_crud
from app.common.models.patient import Patient
from app.common.models.user import User
from app.services.patient_notification_service import PatientNotificationService

router = APIRouter()

# Request/Response Models
class DataExportRequest(BaseModel):
    export_type: str = Field(..., description="Type of data to export: all, profile, medical, appointments, prescriptions, lab_results")
    format: str = Field("json", description="Export format: json, csv, pdf")
    include_sensitive: bool = Field(False, description="Include sensitive data (requires explicit consent)")
    email_delivery: bool = Field(True, description="Send export via email")
    date_range: Optional[Dict[str, str]] = Field(None, description="Date range filter: {start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'}")

class DataDeletionRequest(BaseModel):
    deletion_type: str = Field(..., description="Type of deletion: account, medical_data, appointments, messages")
    confirmation_phrase: str = Field(..., description="Confirmation phrase: 'DELETE MY DATA'")
    reason: Optional[str] = Field(None, description="Reason for deletion")
    backup_before_delete: bool = Field(True, description="Create backup before deletion")

class PrivacyUpdateRequest(BaseModel):
    profile_visibility: Optional[str] = Field(None, description="Profile visibility: public, doctors-only, private")
    share_health_data: Optional[bool] = Field(None, description="Allow sharing health data for research")
    allow_research: Optional[bool] = Field(None, description="Allow data to be used for research")
    data_retention: Optional[str] = Field(None, description="Data retention period: 1year, 3years, 5years, 10years, forever")
    activity_tracking: Optional[bool] = Field(None, description="Allow activity tracking")

class PrivacyResponse(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")

# Privacy Control Endpoints

@router.get("/privacy/settings", response_model=PrivacyResponse)
async def get_privacy_settings(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Get current privacy settings for the patient."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get privacy settings
        settings = patient_portal_crud.get_patient_settings(db, str(patient.id))
        privacy_settings = settings.get("privacy", {}) if settings else {}
        
        return PrivacyResponse(
            success=True,
            message="Privacy settings retrieved successfully",
            data={
                "profile_visibility": privacy_settings.get("profileVisibility", "doctors-only"),
                "share_health_data": privacy_settings.get("shareHealthData", True),
                "allow_research": privacy_settings.get("allowResearch", False),
                "data_retention": privacy_settings.get("dataRetention", "5years"),
                "activity_tracking": privacy_settings.get("activityTracking", True),
                "last_updated": settings.get("_last_updated") if settings else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve privacy settings: {str(e)}"
        )

@router.patch("/privacy/settings", response_model=PrivacyResponse)
async def update_privacy_settings(
    request: PrivacyUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Update privacy settings for the patient."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get current settings
        current_settings = patient_portal_crud.get_patient_settings(db, str(patient.id))
        if not current_settings:
            current_settings = {}
        
        # Update privacy settings
        privacy_updates = {}
        if request.profile_visibility is not None:
            privacy_updates["profileVisibility"] = request.profile_visibility
        if request.share_health_data is not None:
            privacy_updates["shareHealthData"] = request.share_health_data
        if request.allow_research is not None:
            privacy_updates["allowResearch"] = request.allow_research
        if request.data_retention is not None:
            privacy_updates["dataRetention"] = request.data_retention
        if request.activity_tracking is not None:
            privacy_updates["activityTracking"] = request.activity_tracking
        
        if privacy_updates:
            # Update settings
            updated_settings = current_settings.copy()
            if "privacy" not in updated_settings:
                updated_settings["privacy"] = {}
            updated_settings["privacy"].update(privacy_updates)
            
            # Save updated settings
            success = patient_portal_crud.update_patient_settings(db, str(patient.id), updated_settings)
            
            if success:
                # Send notification about privacy settings change
                notification_service = PatientNotificationService(db)
                await notification_service.send_message_notification(
                    str(patient.id),
                    {
                        "message": f"Your privacy settings have been updated. Changes: {', '.join(privacy_updates.keys())}",
                        "sender": "System",
                        "type": "privacy_update"
                    }
                )
                
                return PrivacyResponse(
                    success=True,
                    message="Privacy settings updated successfully",
                    data=privacy_updates
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update privacy settings"
                )
        else:
            return PrivacyResponse(
                success=True,
                message="No changes to privacy settings",
                data={}
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update privacy settings: {str(e)}"
        )

# Data Export Endpoints

@router.post("/privacy/export", response_model=PrivacyResponse)
async def request_data_export(
    request: DataExportRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Request data export based on user preferences."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Check privacy settings
        settings = patient_portal_crud.get_patient_settings(db, str(patient.id))
        privacy_settings = settings.get("privacy", {}) if settings else {}
        
        # Check if user allows data sharing
        if request.include_sensitive and not privacy_settings.get("shareHealthData", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sensitive data export not allowed based on privacy settings"
            )
        
        # Generate export job ID
        export_job_id = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.user_id[:8]}"
        
        # Create export data based on type
        export_data = await _generate_export_data(
            db, patient, request.export_type, request.include_sensitive, request.date_range
        )
        
        # Send notification about export request
        notification_service = PatientNotificationService(db)
        await notification_service.send_message_notification(
            str(patient.id),
            {
                "message": f"Data export requested: {request.export_type} in {request.format} format",
                "sender": "System",
                "type": "data_export_request",
                "export_job_id": export_job_id
            }
        )
        
        return PrivacyResponse(
            success=True,
            message="Data export request submitted successfully",
            data={
                "export_job_id": export_job_id,
                "export_type": request.export_type,
                "format": request.format,
                "estimated_size": len(json.dumps(export_data)),
                "status": "processing"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request data export: {str(e)}"
        )

@router.get("/privacy/export/{export_job_id}")
async def download_data_export(
    export_job_id: str,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Download exported data."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # For demo purposes, generate export data on-the-fly
        # In production, this would retrieve from a job queue or file storage
        export_data = await _generate_export_data(db, patient, "all", True, None)
        
        # Create ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add JSON export
            zip_file.writestr(
                f"patient_data_{export_job_id}.json",
                json.dumps(export_data, indent=2, default=str)
            )
            
            # Add privacy notice
            privacy_notice = f"""
PRIVACY NOTICE
==============

This export contains your personal health data from FIATTIB Medical Center.
Generated on: {datetime.now().isoformat()}
Export Job ID: {export_job_id}

Data included:
- Personal information
- Medical records
- Appointments
- Prescriptions
- Lab results

Please keep this data secure and do not share it with unauthorized parties.

For questions about this export, contact: privacy@fiattib.com
            """.strip()
            zip_file.writestr("PRIVACY_NOTICE.txt", privacy_notice)
        
        zip_buffer.seek(0)
        
        # Return ZIP file as download
        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=patient_data_export_{export_job_id}.zip"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download data export: {str(e)}"
        )

# Data Deletion Endpoints

@router.post("/privacy/delete", response_model=PrivacyResponse)
async def request_data_deletion(
    request: DataDeletionRequest,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Request data deletion based on user preferences."""
    try:
        # Validate confirmation phrase
        if request.confirmation_phrase != "DELETE MY DATA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid confirmation phrase. Please type 'DELETE MY DATA' exactly."
            )
        
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Check privacy settings for data retention
        settings = patient_portal_crud.get_patient_settings(db, str(patient.id))
        privacy_settings = settings.get("privacy", {}) if settings else {}
        data_retention = privacy_settings.get("dataRetention", "5years")
        
        # Generate deletion job ID
        deletion_job_id = f"delete_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.user_id[:8]}"
        
        # Create backup if requested
        if request.backup_before_delete:
            backup_data = await _generate_export_data(db, patient, "all", True, None)
            # In production, save backup to secure storage
        
        # Send notification about deletion request
        notification_service = PatientNotificationService(db)
        await notification_service.send_message_notification(
            str(patient.id),
            {
                "message": f"Data deletion requested: {request.deletion_type}. Reason: {request.reason or 'Not specified'}",
                "sender": "System",
                "type": "data_deletion_request",
                "deletion_job_id": deletion_job_id
            }
        )
        
        return PrivacyResponse(
            success=True,
            message="Data deletion request submitted successfully. You will receive confirmation within 24 hours.",
            data={
                "deletion_job_id": deletion_job_id,
                "deletion_type": request.deletion_type,
                "backup_created": request.backup_before_delete,
                "data_retention_policy": data_retention,
                "status": "pending_review"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request data deletion: {str(e)}"
        )

# Privacy Dashboard

@router.get("/privacy/dashboard", response_model=PrivacyResponse)
async def get_privacy_dashboard(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    """Get privacy dashboard with data summary and controls."""
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get privacy settings
        settings = patient_portal_crud.get_patient_settings(db, str(patient.id))
        privacy_settings = settings.get("privacy", {}) if settings else {}
        
        # Get data summary
        data_summary = await _get_data_summary(db, patient)
        
        return PrivacyResponse(
            success=True,
            message="Privacy dashboard retrieved successfully",
            data={
                "privacy_settings": {
                    "profile_visibility": privacy_settings.get("profileVisibility", "doctors-only"),
                    "share_health_data": privacy_settings.get("shareHealthData", True),
                    "allow_research": privacy_settings.get("allowResearch", False),
                    "data_retention": privacy_settings.get("dataRetention", "5years"),
                    "activity_tracking": privacy_settings.get("activityTracking", True)
                },
                "data_summary": data_summary,
                "last_updated": settings.get("_last_updated") if settings else None,
                "account_created": patient.created_at.isoformat() if patient.created_at else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve privacy dashboard: {str(e)}"
        )

# Helper Functions

async def _generate_export_data(
    db: Session, 
    patient: Patient, 
    export_type: str, 
    include_sensitive: bool, 
    date_range: Optional[Dict[str, str]]
) -> Dict[str, Any]:
    """Generate export data based on type and preferences."""
    export_data = {
        "export_info": {
            "patient_id": str(patient.id),
            "export_type": export_type,
            "include_sensitive": include_sensitive,
            "date_range": date_range,
            "generated_at": datetime.now().isoformat()
        }
    }
    
    # Basic profile data (always included)
    if export_type in ["all", "profile"]:
        export_data["profile"] = {
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "email": patient.email,
            "phone": patient.phone,
            "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            "gender": patient.gender.value if patient.gender else None,
            "address": patient.address,
            "created_at": patient.created_at.isoformat() if patient.created_at else None
        }
    
    # Medical data (requires sensitive data permission)
    if export_type in ["all", "medical"] and include_sensitive:
        export_data["medical"] = {
            "height": patient.height,
            "weight": patient.weight,
            "blood_group": patient.blood_group.value if patient.blood_group else None,
            "blood_pressure_systolic": patient.blood_pressure_systolic,
            "blood_pressure_diastolic": patient.blood_pressure_diastolic,
            "allergies": patient.allergies,
            "chronic_conditions": patient.chronic_conditions,
            "immunizations": patient.immunizations
        }
    
    # Insurance data (requires sensitive data permission)
    if export_type in ["all", "insurance"] and include_sensitive:
        export_data["insurance"] = {
            "provider": patient.insurance_provider,
            "policy_number": patient.insurance_policy_number,
            "group_number": patient.insurance_group_number,
            "coverage_type": patient.insurance_coverage_type,
            "valid_until": patient.insurance_valid_until.isoformat() if patient.insurance_valid_until else None
        }
    
    # Add mock data for other types (in production, this would query actual data)
    if export_type in ["all", "appointments"]:
        export_data["appointments"] = [
            {
                "id": "appt_1",
                "date": "2025-01-15",
                "time": "10:00",
                "doctor": "Dr. Smith",
                "reason": "Checkup",
                "status": "completed"
            }
        ]
    
    if export_type in ["all", "prescriptions"]:
        export_data["prescriptions"] = [
            {
                "id": "rx_1",
                "medication": "Sample Medication",
                "dosage": "10mg",
                "instructions": "Take once daily",
                "prescribed_date": "2025-01-01",
                "status": "active"
            }
        ]
    
    if export_type in ["all", "lab_results"]:
        export_data["lab_results"] = [
            {
                "id": "lab_1",
                "test_name": "Blood Test",
                "result": "Normal",
                "date": "2025-01-10",
                "lab": "FIATTIB Lab"
            }
        ]
    
    return export_data

async def _get_data_summary(db: Session, patient: Patient) -> Dict[str, Any]:
    """Get summary of patient data for privacy dashboard."""
    return {
        "profile_data": {
            "has_basic_info": bool(patient.first_name and patient.last_name),
            "has_contact_info": bool(patient.email or patient.phone),
            "has_address": bool(patient.address)
        },
        "medical_data": {
            "has_vitals": bool(patient.height or patient.weight),
            "has_blood_info": bool(patient.blood_group),
            "has_allergies": bool(patient.allergies),
            "has_conditions": bool(patient.chronic_conditions)
        },
        "insurance_data": {
            "has_provider": bool(patient.insurance_provider),
            "has_policy": bool(patient.insurance_policy_number)
        },
        "activity_data": {
            "account_age_days": (datetime.now() - patient.created_at).days if patient.created_at else 0,
            "last_updated": patient.updated_at.isoformat() if patient.updated_at else None
        }
    }
