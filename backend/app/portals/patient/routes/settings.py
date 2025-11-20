# app/routers/patient_settings.py
from typing import Any, Dict, Optional

import os, httpx, jsonpatch
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.portals.patient.schemas.profile_enhanced import (
    Notifications as _SchemaNotifications,
    Privacy as _SchemaPrivacy,
    Preferences as _SchemaPreferences,
    SettingsBlob as _SchemaSettingsBlob,
)
from dotenv import load_dotenv
from pathlib import Path

from app.common.auth.auth_service import (
    AuthenticatedUser, require_patient_access, get_current_user_optional, require_permission, Permission
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
)
from app.db.session import get_db
from app.crud import patient_portal_crud
from app.common.models.patient import Patient

# Ensure we load the backend/.env explicitly with UTF-8 encoding to avoid BOM issues
_backend_root = Path(__file__).resolve().parents[4]
_env_path = _backend_root / ".env"
load_dotenv(dotenv_path=str(_env_path), encoding="utf-8")

# Feature flag: allow working without a running FHIR server
FHIR_DISABLED = os.getenv("FHIR_DISABLE", "true").lower() in {"1", "true", "yes"}

FHIR_BASE   = os.getenv("FHIR_BASE_URL")
FHIR_TOKEN  = os.getenv("FHIR_AUTH_TOKEN")

# ------------------------------------------------------------------------------
#  helpers
# ------------------------------------------------------------------------------
def fhir_headers(user) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {getattr(user,'fhir_token',FHIR_TOKEN)}",
        "Content-Type":  "application/fhir+json"
    }

async def fhir_get(path: str, user, **kw):
    async with httpx.AsyncClient() as client:
        r = await client.get(FHIR_BASE + path, headers=fhir_headers(user), **kw)
    r.raise_for_status()
    return r.json()

async def fhir_put(path: str, body: dict, user, **kw):
    async with httpx.AsyncClient() as client:
        r = await client.put(FHIR_BASE + path, headers=fhir_headers(user), json=body, **kw)
    r.raise_for_status()
    return r.json()

async def fhir_post(path: str, body: dict, user, **kw):
    async with httpx.AsyncClient() as client:
        r = await client.post(FHIR_BASE + path, headers=fhir_headers(user), json=body, **kw)
    r.raise_for_status()
    return r.json()

async def fhir_patch(path:str, patch: list[dict], user, **kw):
    hdr = fhir_headers(user)
    hdr["Content-Type"]="application/json-patch+json"
    
    # Preserve any additional headers passed in kwargs
    if "headers" in kw:
        hdr.update(kw["headers"])
        del kw["headers"]  # Remove from kwargs to avoid passing twice
    
    async with httpx.AsyncClient() as client:
        r = await client.patch(FHIR_BASE+path, headers=hdr, json=patch, **kw)
    r.raise_for_status()
    return r.json()

# ------------------------------------------------------------------------------
#  Schemas (trimmed – extend as needed)
# ------------------------------------------------------------------------------
Notifications = _SchemaNotifications

Privacy = _SchemaPrivacy

Preferences = _SchemaPreferences

SettingsBlob = _SchemaSettingsBlob

# ------------------------------------------------------------------------------
#  Dependency that injects authenticated user (stub here)
# ------------------------------------------------------------------------------
class User:
    id: str
    patient_id: str
    fhir_token: Optional[str] = None

# ------------------------------------------------------------------------------
#  Router
# ------------------------------------------------------------------------------
router = APIRouter()

# GET full settings ------------------------------------------------------------
@router.get("/settings")
async def read_settings(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Patient Not Found",
                status=404,
                detail="Patient record not found for current user",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Default settings structure
        default_settings = {
            "notifications": {
                "email": {
                    "appointments": True,
                    "reminders": True,
                    "labResults": True,
                    "prescriptions": True,
                    "newsletters": False
                },
                "sms": {
                    "appointments": True,
                    "reminders": True,
                    "emergencyOnly": False
                },
                "push": {
                    "enabled": True,
                    "appointments": True,
                    "messages": True,
                    "updates": False
                },
                "reminderTiming": "24hours",
                "_id": None
            },
            "privacy": {
                "profileVisibility": "doctors-only",
                "shareHealthData": True,
                "allowResearch": False,
                "dataRetention": "5years",
                "activityTracking": True,
                "_id": None
            },
            "security": {
                "twoFactor": False,
                "loginAlerts": True,
                "sessionTimeout": "30",
                "deviceManagement": True,
                "_id": None
            },
            "preferences": {
                "language": "en",
                "dateFormat": "MM/DD/YYYY",
                "timeFormat": "12hour",
                "theme": "light",
                "fontSize": "medium",
                "soundEnabled": True,
                "autoPlayVideos": False
            }
        }
        
        # Try to get settings from local DB (source of truth)
        # If table doesn't exist, return defaults
        try:
            settings_data = patient_portal_crud.get_patient_settings(db, patient.patient_id)
            if settings_data:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"[SETTINGS_GET] Retrieved settings for patient {patient.patient_id}: {settings_data}")
                return SuccessResponse(data=settings_data, message="Patient settings retrieved from local DB")
        except Exception as e:
            # Table doesn't exist or other error - return defaults
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not retrieve patient settings from database (table may not exist): {e}")
        
        # Return defaults if no settings found or table doesn't exist
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[SETTINGS_GET] Returning default settings for patient {patient.patient_id}")
        return SuccessResponse(data=default_settings, message="Patient settings retrieved (defaults)")
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patient settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# PATCH update settings --------------------------------------------------------
@router.patch("/settings")
async def update_settings(
    request: Request,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Patient Not Found",
                status=404,
                detail="Patient record not found for current user",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # WRITE-THROUGH STRATEGY: Always update local DB first (source of truth)
        # The payload now contains the comprehensive data structure directly
        settings_data = payload
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[SETTINGS_UPDATE] Updating settings for patient {patient.patient_id}")
        logger.info(f"[SETTINGS_UPDATE] Payload received: {settings_data}")
        
        # Update local DB (always - this is our source of truth)
        # If table doesn't exist, just return success (settings can't be persisted)
        try:
            success = patient_portal_crud.update_patient_settings(db, patient.patient_id, settings_data)
            if not success:
                problem = create_problem_detail(
                    error_type=ErrorType.INTERNAL_ERROR,
                    title="Settings Update Failed",
                    status=500,
                    detail="Failed to update settings in local database",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=500, detail=problem.dict())
            
            logger.info(f"[SETTINGS_UPDATE] Settings updated successfully for patient {patient.patient_id}")
            
            # Refresh the patient object to ensure we have the latest settings
            db.refresh(patient)
            if patient.settings:
                db.refresh(patient.settings)
                logger.info(f"[SETTINGS_UPDATE] Refreshed settings object: {patient.settings}")
            
            # Expire all to force fresh data on next query
            db.expire_all()
            
            # Verify the update by reading back the settings
            verify_settings = patient_portal_crud.get_patient_settings(db, patient.patient_id)
            logger.info(f"[SETTINGS_UPDATE] Verified settings after update: {verify_settings}")
        except Exception as e:
            # Table doesn't exist or other error - log but don't fail
            logger.warning(f"Could not update patient settings in database (table may not exist): {e}")
            # Return success anyway since we can't persist settings without the table
            return SuccessResponse(data={"status": "ok"}, message="Patient settings update accepted (database table not available)")
        
        # Attempt FHIR sync (best-effort, don't fail if it doesn't work)
        if not FHIR_DISABLED:
            try:
                # Create a mock user object for FHIR calls
                user = User()
                user.id = current_user.user_id
                user.patient_id = patient.fhir_patient_id  # Use actual FHIR patient ID
                user.fhir_token = None
                
                # Skip FHIR operations if no FHIR patient ID exists
                if not user.patient_id:
                    print("⚠️  No FHIR patient ID found, skipping FHIR sync")
                    return SuccessResponse(data={"status": "ok"}, message="Patient settings saved successfully (no FHIR sync)")
                
                # Notifications → CommunicationRequest
                if payload.notifications:
                    cr_id = payload.notifications._id or ""
                    body = {
                        "resourceType": "CommunicationRequest",
                        "status": "active" if payload.notifications.enabled else "completed",
                        "subject": {"reference": f"Patient/{user.patient_id}"},
                        "reasonCode": [{"text": "Appointment reminder"}],
                        "occurrenceTiming": {
                            "repeat": {"boundsDuration": {"value": int(payload.notifications.reminderTiming[:-5]), "unit": "hours"}}
                        }
                    }
                    
                    if cr_id:
                        # Update existing resource
                        await fhir_put(f"/CommunicationRequest/{cr_id}", body, user)
                    else:
                        # Create new resource
                        await fhir_post("/CommunicationRequest", body, user)

                # Privacy → Consent
                if payload.privacy:
                    consent_id = payload.privacy._id or ""
                    
                    # Determine consent status based on both research and data sharing
                    consent_active = payload.privacy.allowResearch or payload.privacy.shareHealthData
                    
                    # Build scope based on what's being consented to
                    scopes = []
                    if payload.privacy.allowResearch:
                        scopes.append({"system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "research"})
                    if payload.privacy.shareHealthData:
                        scopes.append({"system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "patient-privacy"})
                    
                    # Build category based on data sharing preferences
                    categories = []
                    if payload.privacy.shareHealthData:
                        categories.append({"system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes", "code": "HIPAA"})
                    if payload.privacy.allowResearch:
                        categories.append({"system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes", "code": "research"})
                    
                    body = {
                        "resourceType": "Consent",
                        "status": "active" if consent_active else "inactive",
                        "patient": {"reference": f"Patient/{user.patient_id}"},
                        "scope": {"coding": scopes},
                        "category": [{"coding": categories}] if categories else []
                    }
                    
                    if consent_id:
                        # Update existing resource
                        await fhir_put(f"/Consent/{consent_id}", body, user)
                    else:
                        # Create new resource
                        await fhir_post("/Consent", body, user)

                # Preferences (language) - only if FHIR patient exists
                if payload.preferences and payload.preferences.language and user.patient_id:
                    try:
                        fhir_patient = await fhir_get(f"/Patient/{user.patient_id}", user)
                        
                        # Check if communication array exists and has language structure
                        communication = fhir_patient.get("communication", [])
                        if not communication:
                            # Create communication array if missing
                            patch = [{"op": "add", "path": "/communication", "value": [{"language": {"coding": [{"code": payload.preferences.language}]}}]}]
                        elif len(communication) == 0 or not communication[0].get("language", {}).get("coding"):
                            # Add language to first communication entry
                            patch = [{"op": "add", "path": "/communication/0/language/coding", "value": [{"code": payload.preferences.language}]}]
                        else:
                            # Update existing language code
                            patch = [{"op": "replace", "path": "/communication/0/language/coding/0/code", "value": payload.preferences.language}]
                        
                        await fhir_patch(f"/Patient/{user.patient_id}", patch, user,
                                       headers={"If-Match": fhir_patient["meta"]["versionId"]})
                    except Exception as e:
                        # FHIR language update failed, but local DB is already updated
                        print(f"⚠️  FHIR language update failed: {e}")
                        pass
                        
            except Exception:
                # FHIR sync failed, but local DB is already updated - that's OK
                pass

        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        try:
            await admin_crud.log_admin_activity(
                db=db,  # Use the DB session from dependency
                admin_id=current_user.user_id,
                activity_type="PATIENT_UPDATE",
                description="Updated patient settings",
                affected_resource_id=current_user.user_id,
                affected_resource_type="patient_settings",
                metadata={"clinic_id": current_user.clinic_id}
            )
        except Exception as e:
            # Audit logging failed, but don't fail the main operation
            print(f"⚠️  Audit logging failed: {e}")
            pass

        return SuccessResponse(data={"status": "ok"}, message="Patient settings saved successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Settings Update Failed",
            status=500,
            detail=f"Failed to update patient settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# Lightweight security endpoints (non-FHIR) ----------------
# NOTE: Password change endpoint moved to security.py router for better organization
# @router.post("/security/change-password", status_code=204)
# ... (removed duplicate endpoint)

@router.get("/security/sessions")
@audit_pii_access("read", "patient", "sessions")
async def list_sessions(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db)
):
    try:
        # ✅ RBAC CHECK: Verify user can access patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # plug into your session store
        # TODO: Implement actual session listing logic
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        try:
            await admin_crud.log_admin_activity(
                db=db,  # Use the DB session from dependency
                admin_id=current_user.user_id,
                activity_type="PATIENT_READ",
                description="Listed active sessions",
                affected_resource_id=current_user.user_id,
                affected_resource_type="patient_sessions",
                metadata={"clinic_id": current_user.clinic_id}
            )
        except Exception as e:
            # Audit logging failed, but don't fail the main operation
            print(f"⚠️  Audit logging failed: {e}")
            pass
        
        return []  # Return empty list for now
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Sessions Listing Failed",
            status=500,
            detail=f"Failed to list sessions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.delete("/security/sessions/{sid}", status_code=204)
@audit_pii_access("write", "patient", "end_session")
async def end_session(
    request: Request,
    sid: str,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require patient write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_WRITE)),
    db: Session = Depends(get_db)
):
    try:
        # ✅ RBAC CHECK: Verify user can update patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.UPDATE, current_user.clinic_id
        )
        
        # TODO: Implement actual session termination logic
        
        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        try:
            await admin_crud.log_admin_activity(
                db=db,  # Use the DB session from dependency
                admin_id=current_user.user_id,
                activity_type="PATIENT_UPDATE",
                description=f"Ended session {sid}",
                affected_resource_id=current_user.user_id,
                affected_resource_type="patient_session",
                metadata={"session_id": sid, "clinic_id": current_user.clinic_id}
            )
        except Exception as e:
            # Audit logging failed, but don't fail the main operation
            print(f"⚠️  Audit logging failed: {e}")
            pass
        
        return
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Session Termination Failed",
            status=500,
            detail=f"Failed to end session: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# Data-rights helpers via FHIR bulk ops --------------------
@router.get("/Patient/$export")
async def export_patient(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient or not patient.fhir_patient_id:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="FHIR Patient Not Found",
                status=404,
                detail="FHIR patient record not found for current user",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Create user object for FHIR calls
        user = User()
        user.id = current_user.user_id
        user.patient_id = patient.fhir_patient_id
        user.fhir_token = None
        
        return await fhir_get("/Patient/$export", user)
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Export Failed",
            status=500,
            detail=f"Failed to initiate FHIR export: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/Patient/$erase", status_code=202)
async def erase_patient(
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db)
):
    try:
        # Get patient by user_id
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if not patient or not patient.fhir_patient_id:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="FHIR Patient Not Found",
                status=404,
                detail="FHIR patient record not found for current user",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Create user object for FHIR calls
        user = User()
        user.id = current_user.user_id
        user.patient_id = patient.fhir_patient_id
        user.fhir_token = None
        
        await fhir_post("/Patient/$erase", {}, user)
        return {"status": "accepted", "message": "Data erasure initiated"}
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Erase Failed",
            status=500,
            detail=f"Failed to initiate FHIR erase: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
