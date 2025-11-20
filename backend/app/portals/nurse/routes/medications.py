"""Nurse medications routes backing the NurseMedicationsModule UI."""
from __future__ import annotations

from datetime import date, datetime, timedelta, time as dt_time
from typing import Dict, List, Optional
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.nurse.schemas.medications import (
    MedicationAdministration,
    MedicationAdministrationCreate,
    MedicationAdministrationUpdate,
    MedicationCollection,
)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, text
from app.db.session import get_db
from app.crud.medication_administration import med_admin
from app.common.models.patient import Patient
from app.common.models.user import User
from app.common.models.nurse import NursePatientAssignment

router = APIRouter(prefix="/medications", tags=["Nurse Medications"])
logger = logging.getLogger(__name__)

_ALLOWED_STATUS = {"pending", "due-soon", "overdue", "given", "skipped"}


@router.get("", response_model=SuccessResponse[MedicationCollection])
async def list_medications(
    search: Optional[str] = Query(None),
    status: str = Query("all"),
    date_filter: Optional[date] = Query(None),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        # Get medications - filter by nurse-patient assignments OR show all if no assignments exist
        # Handle case where medication_administrations table doesn't exist
        try:
            # First, try to get patient IDs assigned to this nurse
            assigned_patient_ids = []
            try:
                from sqlalchemy import text
                # Get nurse profile ID from user_id
                nurse_sql = text("""
                    SELECT id FROM ehr.nurses WHERE user_id = :user_id
                """)
                nurse_result = db.execute(nurse_sql, {"user_id": current_user.user_id}).first()
                if nurse_result:
                    nurse_profile_id = nurse_result[0]
                    # Get assigned patient IDs
                    assignment_sql = text("""
                        SELECT DISTINCT patient_id 
                        FROM ehr.nurse_patient_assignments 
                        WHERE nurse_id = :nurse_id 
                        AND is_active = true
                    """)
                    assignment_results = db.execute(assignment_sql, {"nurse_id": str(nurse_profile_id)}).all()
                    assigned_patient_ids = [str(row[0]) for row in assignment_results]
                    logger.info(f"Found {len(assigned_patient_ids)} patients assigned to nurse {current_user.user_id}")
            except Exception as e:
                logger.warning(f"Could not get nurse-patient assignments: {e}, showing all medications")
                assigned_patient_ids = []
            
            # If nurse has assigned patients, filter by those patients
            # Otherwise, show all medications (for now - can be changed later)
            if assigned_patient_ids:
                # Filter by assigned patients
                records = []
                for patient_id in assigned_patient_ids:
                    patient_records = med_admin.list(
                        db,
                        patient_id=patient_id,
                        on_date=date_filter,
                        status=status if status != "all" else None,
                        search=search,
                        nurse_id=None  # Don't filter by administered_by
                    )
                    records.extend(patient_records)
            else:
                # No assignments - show all medications (nurses can see all medications to administer)
                records = med_admin.list(
                    db, 
                    on_date=date_filter, 
                    status=status if status != "all" else None, 
                    search=search,
                    nurse_id=None  # Don't filter by administered_by - show all medications
                )
        except Exception as e:
            logger.warning(f"Error querying medication administrations (table may not exist): {e}")
            records = []
        
        # Sort records by date and time_to_administer (after combining from multiple patients)
        # Sort by date ascending (today first), then by time_to_administer ascending (earliest first)
        # Handle PRN by putting it at the end of each day
        def sort_key(record):
            date_val = record.date
            time_val = record.time_to_administer or ""
            # Put PRN at the end (after all time-based medications)
            if time_val.upper() == "PRN":
                return (date_val, "ZZZ", time_val)  # ZZZ ensures PRN comes after all times
            return (date_val, time_val, "")
        
        records = sorted(records, key=sort_key)
        
        # Map ORM to schema with patient names and calculate status
        items = []
        for m in records:
            try:
                # Get patient name using raw SQL to avoid UUID type issues
                patient_name = f"Patient {str(m.patient_id)[:8]}"
                try:
                    # Try multiple approaches to get patient name
                    # Approach 1: Join patients with users via user_id
                    try:
                        patient_sql = text("""
                            SELECT u.first_name, u.last_name
                            FROM ehr.patients p
                            JOIN core.users u ON p.user_id = u.id
                            WHERE p.patient_id = :patient_id
                        """)
                        patient_result = db.execute(patient_sql, {"patient_id": m.patient_id}).first()
                        if patient_result and (patient_result[0] or patient_result[1]):
                            first_name = patient_result[0] or ""
                            last_name = patient_result[1] or ""
                            if first_name or last_name:
                                patient_name = f"{first_name} {last_name}".strip()
                                logger.debug(f"Found patient name via user_id join: {patient_name}")
                    except Exception as e1:
                        logger.debug(f"User_id join failed for patient {m.patient_id}: {e1}")
                        try:
                            db.rollback()
                        except Exception:
                            pass
                    
                    # Approach 2: Try matching patient_id directly with user_id (in case patient_id == user_id)
                    if patient_name.startswith("Patient "):
                        try:
                            patient_sql_direct = text("""
                                SELECT first_name, last_name
                                FROM core.users
                                WHERE id = :patient_id
                            """)
                            patient_result = db.execute(patient_sql_direct, {"patient_id": m.patient_id}).first()
                            if patient_result and (patient_result[0] or patient_result[1]):
                                first_name = patient_result[0] or ""
                                last_name = patient_result[1] or ""
                                if first_name or last_name:
                                    patient_name = f"{first_name} {last_name}".strip()
                                    logger.debug(f"Found patient name via direct user_id match: {patient_name}")
                        except Exception as e2:
                            logger.debug(f"Direct user_id match failed for patient {m.patient_id}: {e2}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                    
                    # Approach 3: String comparison fallback
                    if patient_name.startswith("Patient "):
                        try:
                            patient_sql_str = text("""
                                SELECT u.first_name, u.last_name
                                FROM ehr.patients p
                                JOIN core.users u ON p.user_id = u.id
                                WHERE p.patient_id::text = :patient_id
                            """)
                            patient_result = db.execute(patient_sql_str, {"patient_id": str(m.patient_id)}).first()
                            if patient_result and (patient_result[0] or patient_result[1]):
                                first_name = patient_result[0] or ""
                                last_name = patient_result[1] or ""
                                if first_name or last_name:
                                    patient_name = f"{first_name} {last_name}".strip()
                                    logger.debug(f"Found patient name via string comparison: {patient_name}")
                        except Exception as e3:
                            logger.debug(f"String comparison also failed for patient {m.patient_id}: {e3}")
                            try:
                                db.rollback()
                            except Exception:
                                pass
                except Exception as e:
                    logger.warning(f"Error getting patient name for {m.patient_id}: {e}")
                    # Keep default patient_name
                
                # Automatically calculate status based on time to administer
                # Only update if status is not "given" or "skipped" (these are final states)
                calculated_status = m.status
                if calculated_status not in ["given", "skipped"]:
                    now = datetime.now()
                    today = now.date()
                    time_to_administer = m.time_to_administer or ""
                    
                    # Skip PRN medications - they don't have a specific time
                    if time_to_administer.upper() != "PRN":
                        try:
                            # Parse time (format: HH:MM)
                            if ":" in time_to_administer:
                                hour, minute = map(int, time_to_administer.split(":"))
                                admin_time = dt_time(hour, minute)
                                admin_datetime = datetime.combine(m.date, admin_time)
                                
                                if m.date < today:
                                    # Past date - mark as overdue if not given
                                    calculated_status = "overdue"
                                elif m.date == today:
                                    # Today - check time
                                    time_diff = now - admin_datetime
                                    if time_diff.total_seconds() > 3600:  # More than 1 hour past
                                        calculated_status = "overdue"
                                    elif time_diff.total_seconds() > 0:  # Past but within 1 hour - still overdue
                                        calculated_status = "overdue"
                                    elif abs(time_diff.total_seconds()) <= 3600:  # Within 1 hour in future - due soon
                                        calculated_status = "due-soon"
                                    else:  # More than 1 hour in future
                                        calculated_status = "pending"
                                else:
                                    # Future date - pending
                                    calculated_status = "pending"
                        except (ValueError, AttributeError) as e:
                            logger.debug(f"Could not parse time_to_administer '{time_to_administer}' for medication {m.id}: {e}")
                            # Keep existing status if parsing fails
                            pass
                
                items.append(MedicationAdministration(
                    id=str(m.id),
                    patient=patient_name,  # Use patient name instead of ID
                    room=m.room or "",
                    medication=m.medication,
                    dosage=m.dosage,
                    frequency=m.frequency or "",
                    route=m.route or "",
                    timeToAdminister=m.time_to_administer,
                    status=calculated_status,  # Use calculated status
                    statusTime=m.status_time,
                    nextDue=m.next_due if calculated_status in ["pending", "due-soon", "overdue"] else None,
                    date=m.date,
                ))
            except Exception as e:
                logger.warning(f"Error processing medication {m.id}: {e}")
                continue
        
        # Calculate counts based on calculated statuses
        counts = {
            "total": len(items),
            "given": sum(1 for item in items if item.status == "given"),
            "pending": sum(1 for item in items if item.status == "pending"),
            "due-soon": sum(1 for item in items if item.status == "due-soon"),
            "overdue": sum(1 for item in items if item.status == "overdue"),
            "skipped": sum(1 for item in items if item.status == "skipped"),
        }
        
        collection = MedicationCollection(
            items=items,
            total=counts["total"],
            given=counts["given"],
            pending=counts["pending"],
            dueSoon=counts["due-soon"],
            overdue=counts["overdue"],
            skipped=counts["skipped"],
        )
        return SuccessResponse(data=collection, message="Medications retrieved")
    except Exception as e:
        logger.error(f"Error in list_medications: {e}", exc_info=True)
        # Return empty collection instead of crashing
        collection = MedicationCollection(
            items=[],
            total=0,
            given=0,
            pending=0,
            dueSoon=0,
            overdue=0,
            skipped=0,
        )
        return SuccessResponse(data=collection, message="Medications retrieved")


@router.post("", response_model=SuccessResponse[MedicationAdministration], status_code=status.HTTP_201_CREATED)
async def create_medication(
    payload: MedicationAdministrationCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = med_admin.create(
        db,
        values={
            "patient_id": payload.patient,
            "room": payload.room,
            "date": payload.date,
            "medication": payload.medication,
            "dosage": payload.dosage,
            "frequency": payload.frequency,
            "route": payload.route,
            "time_to_administer": payload.timeToAdminister,
            "status": payload.status,
            "status_time": payload.statusTime,
            "next_due": payload.nextDue,
        },
    )
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication created")


@router.get("/{medication_id}", response_model=SuccessResponse[MedicationAdministration])
async def get_medication(
    medication_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = med_admin.get(db, admin_id=medication_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication retrieved")


@router.patch("/{medication_id}", response_model=SuccessResponse[MedicationAdministration])
async def patch_medication(
    medication_id: str,
    payload: MedicationAdministrationUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    values = payload.dict(exclude_none=True)
    # Map field names to ORM
    field_map = {
        "timeToAdminister": "time_to_administer",
        "statusTime": "status_time",
        "nextDue": "next_due",
        "patient": "patient_id",
    }
    values_mapped = {field_map.get(k, k): v for k, v in values.items()}
    obj = med_admin.update(db, admin_id=medication_id, values=values_mapped)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication updated")


@router.post("/{medication_id}/status", response_model=SuccessResponse[MedicationAdministration])
async def update_medication_status(
    medication_id: str,
    payload: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    new_status = payload.get("status")
    status_time = payload.get("statusTime")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing status")
    obj = med_admin.update(db, admin_id=medication_id, values={"status": new_status, "status_time": status_time})
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication status updated")


@router.post("/{medication_id}/administer", response_model=SuccessResponse[MedicationAdministration])
async def administer_medication(
    medication_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    now_hhmm = datetime.utcnow().strftime("%H:%M")
    obj = med_admin.update(db, admin_id=medication_id, values={"status": "given", "status_time": now_hhmm})
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication administered")


@router.post("/{medication_id}/skip", response_model=SuccessResponse[MedicationAdministration])
async def skip_medication(
    medication_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = med_admin.update(db, admin_id=medication_id, values={"status": "skipped"})
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    dto = MedicationAdministration(
        id=str(obj.id),
        patient=str(obj.patient_id),
        room=obj.room or "",
        medication=obj.medication,
        dosage=obj.dosage,
        frequency=obj.frequency or "",
        route=obj.route or "",
        timeToAdminister=obj.time_to_administer,
        status=obj.status,
        statusTime=obj.status_time,
        nextDue=obj.next_due,
        date=obj.date,
    )
    return SuccessResponse(data=dto, message="Medication skipped")


@router.delete("/{medication_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_medication(
    medication_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    ok = med_admin.delete(db, admin_id=medication_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found")
    return SuccessResponse(data={"status": "deleted"}, message="Medication deleted")
