"""Enhanced Patient portal prescription router with FHIR Task for refills and messaging notifications."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth_enhanced import get_current_patient, PatientUser, validate_patient_ownership
from app.portals.patient.schemas.prescription_enhanced import (
    PrescriptionSummary as _SchemaPrescriptionSummary,
    RefillRequest as _SchemaRefillRequest,
    RefillTaskStatus as _SchemaRefillTaskStatus,
    PrescriptionDetail as _SchemaPrescriptionDetail,
)
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.messaging_service import MessagingService
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.crud.prescription import prescription as prescription_crud

router = APIRouter(tags=["Patient · Prescriptions"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

PrescriptionSummary = _SchemaPrescriptionSummary

RefillRequest = _SchemaRefillRequest

RefillTaskStatus = _SchemaRefillTaskStatus

PrescriptionDetail = _SchemaPrescriptionDetail

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    """Get messaging service."""
    return MessagingService()

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[PrescriptionSummary])
@audit_pii_access("read", "medication_request", "prescriptions_list")
async def list_prescriptions(
    request: Request,
    scope: str = Query("active", pattern="^(active|expired|all)$", description="Filter scope"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """List patient prescriptions with DB-first and FHIR fallback."""
    try:
        items: List[PrescriptionSummary] = []
        total = 0
        # Try DB-first
        try:
            from sqlalchemy.orm import joinedload
            from app.common.models.prescription import Prescription
            from app.common.models.doctor import Doctor
            from app.common.models.hospital import Hospital
            from app.common.models.user import User
            from uuid import UUID
            from datetime import date
            
            # Query with eager loading
            patient_uuid = UUID(str(current_patient.patient_id))
            query = db.query(Prescription).options(
                joinedload(Prescription.doctor).joinedload(Doctor.user),
                joinedload(Prescription.hospital)
            ).filter(Prescription.patient_id == patient_uuid)
            
            # Apply scope filtering
            from app.common.models.prescription import PrescriptionStatus
            today = date.today()
            if scope == "active":
                # For active scope: status must be ACTIVE
                # We'll filter out expired ones after status mapping
                query = query.filter(Prescription.status == PrescriptionStatus.ACTIVE)
            elif scope == "expired":
                # For expired scope: status is not ACTIVE OR end_date is in the past
                query = query.filter(
                    (Prescription.status != PrescriptionStatus.ACTIVE) | 
                    ((Prescription.end_date.isnot(None)) & (Prescription.end_date < today))
                )
            # "all" doesn't need additional filtering - return everything
            
            # Get total count before pagination (for "all" scope)
            if scope == "all":
                total = query.count()
            else:
                # For active/expired, we'll count after filtering
                total = 0
            
            # Apply pagination and ordering
            rows = query.order_by(Prescription.prescribed_date.desc()).offset((page - 1) * size).limit(size * 2 if scope == "active" else size).all()
            
            filtered_items = []
            for p in rows:
                # Get doctor name
                doctor_name = "Doctor"
                if p.doctor and p.doctor.user:
                    if p.doctor.user.first_name and p.doctor.user.last_name:
                        doctor_name = f"{p.doctor.user.first_name} {p.doctor.user.last_name}"
                    elif p.doctor.user.full_name:
                        doctor_name = p.doctor.user.full_name
                
                # Get hospital name
                hospital_name = ""
                if p.hospital:
                    hospital_name = p.hospital.name
                
                # Format price
                price_str = None
                if p.estimated_price:
                    currency = p.currency or "UZS"
                    price_str = f"{p.estimated_price:,.0f} {currency}"
                
                # Determine status - convert to PrescriptionStatusEnum
                # IMPORTANT: Check end_date first to override status if expired
                from app.portals.patient.schemas.prescription_enhanced import PrescriptionStatusEnum
                status_enum = PrescriptionStatusEnum.ACTIVE
                
                # First check if expired based on end_date (this overrides status)
                if p.end_date and p.end_date < today:
                    status_enum = PrescriptionStatusEnum.EXPIRED
                elif p.status:
                    status_str = p.status.value if hasattr(p.status, 'value') else str(p.status)
                    # Map database status to schema enum
                    if status_str.lower() == "expired":
                        status_enum = PrescriptionStatusEnum.EXPIRED
                    elif status_str.lower() == "completed":
                        status_enum = PrescriptionStatusEnum.COMPLETED
                    elif status_str.lower() == "cancelled":
                        status_enum = PrescriptionStatusEnum.CANCELLED
                    elif status_str.lower() in ["on_hold", "suspended"]:
                        status_enum = PrescriptionStatusEnum.SUSPENDED
                    elif status_str.lower() == "active":
                        # Only set to ACTIVE if not expired by date
                        if not (p.end_date and p.end_date < today):
                            status_enum = PrescriptionStatusEnum.ACTIVE
                        else:
                            status_enum = PrescriptionStatusEnum.EXPIRED
                    else:
                        status_enum = PrescriptionStatusEnum.ACTIVE
                
                prescription_summary = PrescriptionSummary(
                    id=str(p.id),
                    medicine_name=p.medicine_name or "Unknown",
                    known_as=p.generic_name,
                    description=p.description or p.purpose or "",
                    prescribed_date=(p.prescribed_date.date().strftime("%d.%m.%Y") if p.prescribed_date else ""),
                    end_date=(p.end_date.strftime("%d.%m.%Y") if p.end_date else None),
                    prescribed_by=doctor_name,
                    hospital=hospital_name,
                    dosage=p.dosage or "",
                    frequency=p.frequency or "",
                    status=status_enum,
                    remaining_refills=p.remaining_refills or 0,
                    total_refills=p.total_refills or 0,
                    price=price_str,
                    fhir_medication_request_id=str(p.fhir_medication_request_id) if p.fhir_medication_request_id else None,
                    clinic_id=str(p.hospital_id) if p.hospital_id else "00000000-0000-0000-0000-000000000000",
                    patient_id=str(current_patient.patient_id)
                )
                
                # For "active" scope, only include if status is ACTIVE (not expired)
                if scope == "active":
                    if status_enum == PrescriptionStatusEnum.ACTIVE:
                        filtered_items.append(prescription_summary)
                else:
                    filtered_items.append(prescription_summary)
            
            items = filtered_items
            if scope != "all":
                total = len(items)
            else:
                total = query.count() if total == 0 else total
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching prescriptions from database: {e}")
            items = []
            total = 0
        # Only fallback to FHIR if we have no items from database
        # The database query already handles scope filtering
        if not items:
            search_params = {
                "subject": f"Patient/{current_patient.fhir_patient_id}",
                "_count": size,
                "_offset": (page - 1) * size,
                "_sort": "-authoredOn"
            }
            result = await fhir_client._make_request("GET", "MedicationRequest", params=search_params)
            today = datetime.now(timezone.utc).date()
            items = []
            for entry in result.get("entry", []):
                mr = entry["resource"]
                if not validate_patient_ownership(mr.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                    continue
                pres = await _convert_medication_request_to_summary(mr, current_patient)
                if scope == "active":
                    valid_end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
                    still_valid = valid_end is None or datetime.fromisoformat(valid_end).date() >= today
                    if mr["status"] != "active" or not still_valid:
                        continue
                elif scope == "expired":
                    valid_end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
                    ended = valid_end and datetime.fromisoformat(valid_end).date() < today
                    if not ended and mr["status"] == "active":
                        continue
                items.append(pres)
            total = result.get("total", len(items))
        return create_paginated_response(items=items, page=page, size=size, total=total)
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Prescriptions Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve prescriptions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/{prescription_id}", response_model=SuccessResponse[PrescriptionDetail])
@audit_pii_access("read", "medication_request", "prescription_detail")
async def get_prescription_detail(
    request: Request,
    prescription_id: str = Path(..., description="MedicationRequest or Prescription ID"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get detailed prescription information with DB-first and FHIR fallback."""
    try:
        # Try DB-first
        db_p = prescription_crud.get_by_id(db, prescription_id=prescription_id)
        if db_p and str(getattr(db_p, "patient_id", "")) == current_patient.patient_id:
            summary = PrescriptionSummary(
                id=str(db_p.id),
                medicine_name=db_p.medicine_name,
                known_as=db_p.generic_name,
                description=db_p.description,
                prescribed_date=(db_p.prescribed_date.date().strftime("%d.%m.%Y") if db_p.prescribed_date else ""),
                end_date=(db_p.end_date.strftime("%d.%m.%Y") if db_p.end_date else None),
                prescribed_by="Doctor",
                hospital=str(getattr(db_p, "hospital_id", "")),
                dosage=db_p.dosage,
                frequency=db_p.frequency,
                status=db_p.status.value if db_p.status else "",
                remaining_refills=db_p.remaining_refills or 0,
                total_refills=db_p.total_refills or 0,
                price=db_p.estimated_price,
                fhir_medication_request_id=str(getattr(db_p, "fhir_medication_request_id", "")) or None
            )
            return SuccessResponse(
                data=PrescriptionDetail(
                    prescription=summary,
                    refill_tasks=[],
                    can_request_refill=(summary.status == "active" and (summary.remaining_refills or 0) > 0),
                    refill_history=[]
                ),
                message="Prescription details retrieved successfully"
            )
        # Fallback to FHIR if not found in DB
        mr = await fhir_client._make_request("GET", f"MedicationRequest/{prescription_id}")
        if not validate_patient_ownership(mr.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Access Denied",
                status=403,
                detail="Cannot access other patient's prescription",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        prescription = await _convert_medication_request_to_summary(mr, current_patient)
        # Refill tasks as before
        refill_tasks = []
        try:
            tasks_result = await fhir_client._make_request("GET", "Task", params={
                "focus": f"MedicationRequest/{prescription_id}",
                "_sort": "-authoredOn"
            })
            for entry in tasks_result.get("entry", []):
                task = entry["resource"]
                if not validate_patient_ownership(task.get("for", {}).get("reference", "").replace("Patient/", ""), current_patient):
                    continue
                refill_tasks.append(RefillTaskStatus(
                    task_id=task["id"],
                    status=task["status"],
                    created_date=task.get("authoredOn", ""),
                    last_updated=task.get("meta", {}).get("lastUpdated", ""),
                    assigned_to=task.get("owner", {}).get("display"),
                    notes=task.get("description"),
                    fhir_task_id=task["id"]
                ))
        except:
            refill_tasks = []
        can_request_refill = (
            mr["status"] == "active" and mr.get("dispenseRequest", {}).get("numberOfRepeatsAllowed", 0) > 0
        )
        refill_history = [{"date": t.created_date, "status": t.status, "notes": t.notes} for t in refill_tasks]
        return SuccessResponse(
            data=PrescriptionDetail(
                prescription=prescription,
                refill_tasks=refill_tasks,
                can_request_refill=can_request_refill,
                refill_history=refill_history
            ),
            message="Prescription details retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Prescription Detail Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve prescription details: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/{prescription_id}/refill", response_model=SuccessResponse[RefillTaskStatus], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "task", "refill_request")
async def request_refill(
    request: Request,
    prescription_id: str = Path(..., description="MedicationRequest ID"),
    payload: RefillRequest = Body(...),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Create FHIR Task for refill request and notify doctor via messaging service."""
    try:
        # Validate prescription ownership
        mr = await fhir_client._make_request("GET", f"MedicationRequest/{prescription_id}")
        
        if not validate_patient_ownership(mr.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Access Denied",
                status=403,
                detail="Cannot request refill for other patient's prescription",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Check if refill is allowed
        remaining_refills = mr.get("dispenseRequest", {}).get("numberOfRepeatsAllowed", 0)
        if remaining_refills <= 0:
            problem = create_problem_detail(
                error_type=ErrorType.CONFLICT_ERROR,
                title="No Refills Remaining",
                status=409,
                detail="This prescription has no remaining refills",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=409, detail=problem.dict())
        
        # Create FHIR Task for refill request
        task_id = f"task-{uuid4().hex[:8]}"
        
        task_resource = {
            "resourceType": "Task",
            "id": task_id,
            "status": "requested",
            "intent": "order",
            "priority": "urgent" if payload.urgent else "routine",
            "for": {"reference": f"Patient/{current_patient.fhir_patient_id}"},
            "focus": {"reference": f"MedicationRequest/{prescription_id}"},
            "description": f"Patient requested refill via portal. Reason: {payload.reason or 'No reason provided'}",
            "authoredOn": datetime.now(timezone.utc).isoformat(),
            "requester": {
                "reference": f"Patient/{current_patient.fhir_patient_id}",
                "display": current_patient.full_name or "Patient"
            },
            "extension": [
                {
                    "url": "https://fiattib.uz/fhir/StructureDefinition/refill-request",
                    "extension": [
                        {
                            "url": "reason",
                            "valueString": payload.reason or "Refill requested"
                        },
                        {
                            "url": "urgent",
                            "valueBoolean": payload.urgent
                        },
                        {
                            "url": "pharmacy-id",
                            "valueString": payload.pharmacy_id or ""
                        }
                    ]
                }
            ]
        }
        
        if payload.pharmacy_id:
            task_resource["owner"] = {"reference": f"Organization/{payload.pharmacy_id}"}
        
        # Create the Task
        created_task = await fhir_client._make_request("POST", "Task", data=task_resource)
        
        # Notify doctor via messaging service
        try:
            # Get the prescribing doctor from MedicationRequest
            requester_ref = mr.get("requester", {}).get("reference", "")
            if requester_ref.startswith("Practitioner/"):
                doctor_id = requester_ref.replace("Practitioner/", "")
                
                # Send notification message
                await messaging_service.send_system_message(
                    recipient_id=doctor_id,
                    message_type="refill_request",
                    content=f"Patient {current_patient.full_name or 'Unknown'} has requested a refill for prescription {prescription_id}",
                    metadata={
                        "prescription_id": prescription_id,
                        "patient_id": current_patient.patient_id,
                        "patient_name": current_patient.full_name,
                        "task_id": created_task["id"],
                        "urgent": payload.urgent,
                        "reason": payload.reason
                    }
                )
        except Exception as e:
            # Log error but don't fail the refill request
            pass
        
        return SuccessResponse(
            data=RefillTaskStatus(
                task_id=created_task["id"],
                status=created_task["status"],
                created_date=created_task.get("authoredOn", ""),
                last_updated=created_task.get("meta", {}).get("lastUpdated", ""),
                assigned_to=created_task.get("owner", {}).get("display"),
                notes=created_task.get("description"),
                fhir_task_id=created_task["id"]
            ),
            message="Refill request created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Refill Request Failed",
            status=500,
            detail=f"Failed to create refill request: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/{prescription_id}/refills", response_model=SuccessResponse[List[RefillTaskStatus]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "task", "refill_tasks")
async def get_refill_tasks(
    request: Request,
    prescription_id: str = Path(..., description="MedicationRequest ID"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get refill task status for a prescription."""
    try:
        # Validate prescription ownership
        mr = await fhir_client._make_request("GET", f"MedicationRequest/{prescription_id}")
        
        if not validate_patient_ownership(mr.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Access Denied",
                status=403,
                detail="Cannot access refill tasks for other patient's prescription",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Get refill tasks
        tasks_result = await fhir_client._make_request("GET", "Task", params={
            "focus": f"MedicationRequest/{prescription_id}",
            "_sort": "-authoredOn"
        })
        
        refill_tasks = []
        for entry in tasks_result.get("entry", []):
            task = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(task.get("for", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            refill_tasks.append(RefillTaskStatus(
                task_id=task["id"],
                status=task["status"],
                created_date=task.get("authoredOn", ""),
                last_updated=task.get("meta", {}).get("lastUpdated", ""),
                assigned_to=task.get("owner", {}).get("display"),
                notes=task.get("description"),
                fhir_task_id=task["id"]
            ))
        
        return SuccessResponse(
            data=refill_tasks,
            message=f"Retrieved {len(refill_tasks)} refill tasks"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Refill Tasks Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve refill tasks: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _convert_medication_request_to_summary(mr: Dict[str, Any], current_patient: PatientUser = None) -> PrescriptionSummary:
    """Convert FHIR MedicationRequest to PrescriptionSummary."""
    try:
        from app.portals.patient.schemas.prescription_enhanced import PrescriptionStatusEnum
        
        authored = datetime.fromisoformat(mr["authoredOn"].replace("Z", "+00:00"))
        end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
        
        dosage = None
        if mr.get("dosageInstruction"):
            dosage = mr["dosageInstruction"][0].get("text")
        
        frequency = None
        if mr.get("dosageInstruction") and len(mr["dosageInstruction"]) > 0:
            timing = mr["dosageInstruction"][0].get("timing", {})
            if timing:
                frequency = timing.get("repeat", {}).get("frequency", None)
                if frequency:
                    period = timing.get("repeat", {}).get("period", None)
                    period_unit = timing.get("repeat", {}).get("periodUnit", None)
                    if period and period_unit:
                        frequency = f"{frequency} times per {period} {period_unit}"
        
        repeats = mr.get("dispenseRequest", {}).get("numberOfRepeatsAllowed", 0)
        
        # Map FHIR status to PrescriptionStatusEnum
        fhir_status = mr.get("status", "unknown").lower()
        if fhir_status == "active":
            status_enum = PrescriptionStatusEnum.ACTIVE
        elif fhir_status == "completed":
            status_enum = PrescriptionStatusEnum.COMPLETED
        elif fhir_status == "cancelled":
            status_enum = PrescriptionStatusEnum.CANCELLED
        elif fhir_status == "stopped" or fhir_status == "on-hold":
            status_enum = PrescriptionStatusEnum.SUSPENDED
        else:
            status_enum = PrescriptionStatusEnum.EXPIRED
        
        # Check if expired based on end date
        if end:
            end_date = datetime.fromisoformat(end.replace("Z", "+00:00")).date()
            if end_date < datetime.now(timezone.utc).date():
                status_enum = PrescriptionStatusEnum.EXPIRED
        
        return PrescriptionSummary(
            id=mr["id"],
            medicine_name=mr.get("medicationCodeableConcept", {}).get("text", "Unknown"),
            known_as=mr.get("medicationCodeableConcept", {}).get("coding", [{}])[0].get("display"),
            description=mr.get("note", [{}])[0].get("text") if mr.get("note") else None,
            prescribed_date=authored.strftime("%d.%m.%Y"),
            end_date=datetime.fromisoformat(end.replace("Z", "+00:00")).strftime("%d.%m.%Y") if end else None,
            prescribed_by=mr.get("requester", {}).get("display", "Unknown"),
            hospital=mr.get("encounter", {}).get("display"),
            dosage=dosage,
            frequency=frequency,
            status=status_enum,
            remaining_refills=repeats,
            total_refills=repeats,
            price=None,
            fhir_medication_request_id=mr["id"],
            clinic_id="00000000-0000-0000-0000-000000000000",  # Default if not available from FHIR
            patient_id=str(current_patient.patient_id) if current_patient else "00000000-0000-0000-0000-000000000000"
        )
    except Exception as e:
        # Return minimal prescription if conversion fails
        from app.portals.patient.schemas.prescription_enhanced import PrescriptionStatusEnum
        return PrescriptionSummary(
            id=mr.get("id", "unknown"),
            medicine_name="Unknown",
            known_as=None,
            description=None,
            prescribed_date="Unknown",
            end_date=None,
            prescribed_by="Unknown",
            hospital=None,
            dosage=None,
            frequency=None,
            status=PrescriptionStatusEnum.ACTIVE,
            remaining_refills=0,
            total_refills=0,
            price=None,
            fhir_medication_request_id=mr.get("id"),
            clinic_id="00000000-0000-0000-0000-000000000000",
            patient_id=str(current_patient.patient_id) if current_patient else "00000000-0000-0000-0000-000000000000"
        )
