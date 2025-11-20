from __future__ import annotations

from typing import Dict, List, Optional
from datetime import date, datetime, timedelta, time, timezone
import logging

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, cast, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db.session import get_db
from app.crud.patient import patient as patient_crud
from app.crud.medication_administration import med_admin
from app.crud.nurse_tasks import nurse_tasks
from app.crud.vitals import vitals as vitals_crud
from app.crud.message import message as message_crud
from app.common.models.nurse import NursePatientAssignment
from app.common.models.medical import MedicationAdministration, VitalSign
from app.common.models.messaging import Todo, Message
from app.common.models.user import User
from app.common.models.appointment import Appointment
from app.common.models.patient import Patient
from sqlalchemy import text

logger = logging.getLogger(__name__)


class MedicationDashboardItem(BaseModel):
    id: str
    patient: str
    medication: str
    time: str
    status: str
    dosage: str
    route: str


class MedicationDashboardResponse(BaseModel):
    items: List[MedicationDashboardItem]
    total: int

router = APIRouter(prefix="/dashboard", tags=["Nurse Dashboard"])


@router.get("/summary", response_model=SuccessResponse[Dict[str, int]])
async def dashboard_summary(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    try:
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        # Count patients assigned to the current nurse using raw SQL
        patients_total = 0
        try:
            # Get nurse profile ID first
            nurse_sql = text("""
                SELECT id FROM ehr.nurses WHERE user_id = :user_id
            """)
            nurse_result = db.execute(nurse_sql, {"user_id": str(current_user.user_id)}).first()
            if nurse_result:
                nurse_id = str(nurse_result[0])
                # Count patients assigned to this nurse
                patients_sql = text("""
                    SELECT COUNT(DISTINCT patient_id)
                    FROM ehr.nurse_patient_assignments
                    WHERE nurse_id = :nurse_id
                """)
                patients_result = db.execute(patients_sql, {"nurse_id": nurse_id}).first()
                patients_total = patients_result[0] if patients_result else 0
        except Exception as e:
            logger.warning(f"Error counting patients by nurse: {e}")
            patients_total = 0
        
        # Count medications due today using raw SQL
        meds_due = 0
        try:
            meds_sql = text("""
                SELECT COUNT(*)
                FROM ehr.medication_administrations
                WHERE date = :today
                AND status IN ('pending', 'due-soon', 'overdue')
            """)
            meds_result = db.execute(meds_sql, {"today": today}).first()
            meds_due = meds_result[0] if meds_result else 0
        except Exception as e:
            logger.warning(f"Error counting medications: {e}")
            meds_due = 0
        
        # Count vitals pending (vitals recorded in the last 24 hours) using raw SQL
        vitals_pending = 0
        try:
            vitals_sql = text("""
                SELECT COUNT(*)
                FROM ehr.vital_signs
                WHERE recorded_at >= :yesterday_start
                AND recorded_at <= :today_end
            """)
            yesterday_start = datetime.combine(yesterday, time.min)
            today_end = datetime.combine(today, time.max)
            vitals_result = db.execute(vitals_sql, {
                "yesterday_start": yesterday_start,
                "today_end": today_end
            }).first()
            vitals_pending = vitals_result[0] if vitals_result else 0
        except Exception as e:
            logger.warning(f"Error counting vitals: {e}")
            vitals_pending = 0
        
        # Count completed tasks today using raw SQL
        tasks_completed_count = 0
        try:
            tasks_sql = text("""
                SELECT COUNT(*)
                FROM ops.todos
                WHERE assigned_to = :user_id
                AND completed = true
                AND date = :today
            """)
            tasks_result = db.execute(tasks_sql, {
                "user_id": str(current_user.user_id),
                "today": today.strftime('%Y-%m-%d')
            }).first()
            tasks_completed_count = tasks_result[0] if tasks_result else 0
        except Exception as e:
            logger.warning(f"Error counting tasks: {e}")
            tasks_completed_count = 0
        
        data = {
            "patients_total": patients_total,
            "medications_due": meds_due,
            "vitals_pending": vitals_pending,
            "tasks_completed": tasks_completed_count,
        }
        return SuccessResponse(data=data, message="Dashboard summary")
    except Exception as e:
        logger.error(f"Error in dashboard_summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard summary: {str(e)}")


@router.get("/patients", response_model=SuccessResponse[List[Dict]])
async def dashboard_patients(
    target_date: Optional[date] = Query(None, description="Date to get patient assignments for (defaults to today)"),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get patients marked as arrived by reception for dashboard display."""
    try:
        # Use target_date or default to today
        query_date = target_date or date.today()
        
        # Get patients from appointments where status is "arrived" or "checked_in"
        try:
            # Query appointments with arrived/checked_in status for the target date
            appointments = db.query(Appointment).filter(
                and_(
                    func.date(Appointment.appointment_date) == query_date,
                    Appointment.status.in_(["arrived", "checked_in"])
                )
            ).all()
        except Exception as e:
            logger.warning(f"Error querying appointments: {e}")
            appointments = []
        
        patients_data = []
        seen_patient_ids = set()
        
        for appointment in appointments:
            try:
                patient = appointment.patient
                if not patient or str(patient.patient_id) in seen_patient_ids:
                    continue
                
                seen_patient_ids.add(str(patient.patient_id))
                
                # Get patient name from user
                patient_name = "Unknown Patient"
                try:
                    if patient.user:
                        patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip()
                    if not patient_name or patient_name == " ":
                        # Fallback: try to get from patient directly
                        patient_name = f"Patient {str(patient.patient_id)[:8]}"
                except Exception as e:
                    logger.warning(f"Error getting patient name: {e}")
                    patient_name = f"Patient {str(patient.patient_id)[:8]}"
                
                # Calculate age
                age = 0
                if patient.date_of_birth:
                    today = date.today()
                    age = today.year - patient.date_of_birth.year - (
                        (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
                    )
                
                # Get appointment time
                appointment_time = appointment.appointment_date.strftime("%H:%M") if appointment.appointment_date else "00:00"
                
                # Get doctor/provider name
                provider_name = "Unknown Provider"
                try:
                    if appointment.doctor:
                        try:
                            if appointment.doctor.user:
                                provider_name = f"Dr. {appointment.doctor.user.first_name or ''} {appointment.doctor.user.last_name or ''}".strip()
                        except Exception:
                            # Fallback: try to get doctor name directly
                            try:
                                doctor_sql = text("""
                                    SELECT u.first_name, u.last_name
                                    FROM ehr.doctors d
                                    JOIN core.users u ON d.user_id = u.id
                                    WHERE d.id = :doctor_id
                                """)
                                doctor_result = db.execute(doctor_sql, {"doctor_id": appointment.doctor_id}).first()
                                if doctor_result and (doctor_result[0] or doctor_result[1]):
                                    first_name = doctor_result[0] or ""
                                    last_name = doctor_result[1] or ""
                                    if first_name or last_name:
                                        provider_name = f"Dr. {first_name} {last_name}".strip()
                            except Exception as e2:
                                logger.debug(f"Error getting doctor name: {e2}")
                except Exception as e:
                    logger.warning(f"Error getting provider name: {e}")
                
                # Get latest vitals status
                status = "completed"
                try:
                    latest_vital = db.query(VitalSign).filter(
                        VitalSign.patient_id == str(patient.patient_id)
                    ).order_by(desc(VitalSign.measured_at)).first()
                    
                    if not latest_vital or (latest_vital.measured_at and latest_vital.measured_at.date() < date.today()):
                        status = "vitals-due"
                except Exception as e:
                    logger.warning(f"Error getting vitals for patient {patient.patient_id}: {e}")
                
                # Check for pending medications
                try:
                    pending_meds = db.query(MedicationAdministration).filter(
                        and_(
                            MedicationAdministration.patient_id == str(patient.patient_id),
                            MedicationAdministration.date == date.today(),
                            MedicationAdministration.status.in_(["pending", "due-soon", "overdue"])
                        )
                    ).count()
                    
                    if pending_meds > 0:
                        status = "medication-due"
                except Exception as e:
                    logger.warning(f"Error getting medications for patient {patient.patient_id}: {e}")
                
                patients_data.append({
                    "id": str(patient.patient_id),
                    "name": patient_name,
                    "room": appointment.reason or "General Care",  # Using reason as room placeholder
                    "condition": appointment.appointment_type or "General Care",
                    "time": appointment_time,
                    "provider": provider_name,
                    "status": status,
                    "age": age,
                    "gender": patient.sex.value if hasattr(patient.sex, 'value') else (patient.sex if patient.sex else "unknown")
                })
            except Exception as e:
                logger.warning(f"Error processing appointment {appointment.id}: {e}")
                continue
        
        return SuccessResponse(data=patients_data, message="Patient assignments retrieved")
    except Exception as e:
        logger.error(f"Error in dashboard_patients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")


@router.get("/medications", response_model=SuccessResponse[MedicationDashboardResponse])
async def dashboard_medications(
    target_date: Optional[date] = Query(None, description="Date to get medications for (defaults to today)"),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get medication schedule for dashboard display."""
    try:
        # Use target_date or default to today
        query_date = target_date or date.today()
        
        # Get total count of pending medications first
        total_pending = 0
        try:
            count_sql = text("""
                SELECT COUNT(*)
                FROM ehr.medication_administrations
                WHERE date = :query_date
                AND status IN ('pending', 'due-soon', 'overdue')
            """)
            count_result = db.execute(count_sql, {"query_date": query_date}).first()
            total_pending = count_result[0] if count_result else 0
        except Exception as e:
            logger.warning(f"Error counting pending medications: {e}")
            total_pending = 0
        
        # Get only pending medications for the specified date using raw SQL to avoid relationship issues
        # Limit to 5 for dashboard display
        try:
            medications_sql = text("""
                SELECT 
                    id, patient_id, medication, dosage, route, time_to_administer, status
                FROM ehr.medication_administrations
                WHERE date = :query_date
                AND status IN ('pending', 'due-soon', 'overdue')
                ORDER BY time_to_administer ASC
                LIMIT 5
            """)
            medications_rows = db.execute(medications_sql, {"query_date": query_date}).all()
        except Exception as e:
            logger.warning(f"Error querying medication administrations: {e}")
            medications_rows = []
        
        medications_data = []
        for row in medications_rows:
            try:
                med_id = str(row[0])
                patient_id = str(row[1]) if row[1] else None
                medication = row[2] or "Unknown"
                dosage = row[3] or "Unknown"
                route = row[4] or "oral"
                time_to_administer = row[5] or "00:00"
                status = row[6] or "pending"
                
                # Get patient name
                patient_name = f"Patient {patient_id[:8]}" if patient_id else "Unknown"
                try:
                    patient_sql = text("""
                        SELECT u.first_name, u.last_name
                        FROM ehr.patients p
                        JOIN core.users u ON p.user_id = u.id
                        WHERE p.patient_id = :patient_id
                    """)
                    patient_result = db.execute(patient_sql, {"patient_id": patient_id}).first()
                    if patient_result and (patient_result[0] or patient_result[1]):
                        first_name = patient_result[0] or ""
                        last_name = patient_result[1] or ""
                        if first_name or last_name:
                            patient_name = f"{first_name} {last_name}".strip()
                except Exception as e:
                    logger.debug(f"Error getting patient name for {patient_id}: {e}")
                
                medications_data.append({
                    "id": med_id,
                    "patient": patient_name,
                    "medication": medication,
                    "time": time_to_administer,
                    "status": status,
                    "dosage": dosage,
                    "route": route
                })
            except Exception as e:
                logger.warning(f"Error processing medication row: {e}")
                continue
        
        # Return both the limited list and total count
        response_data = MedicationDashboardResponse(
            items=[MedicationDashboardItem(**med) for med in medications_data],
            total=total_pending
        )
        
        return SuccessResponse(data=response_data, message="Medication schedule retrieved")
    except Exception as e:
        logger.error(f"Error in dashboard_medications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving medications: {str(e)}")


@router.get("/tasks", response_model=SuccessResponse[List[Dict]])
async def dashboard_tasks(
    target_date: Optional[date] = Query(None, description="Date to get tasks for (defaults to today)"),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get tasks for dashboard display."""
    try:
        # Use target_date or default to today
        query_date = target_date or date.today()
        
        # Get tasks for the specified date
        tasks = nurse_tasks.list_tasks(
            db,
            nurse_id=current_user.user_id,
            on_date=query_date
        )
        
        tasks_data = []
        for task in tasks:
            try:
                patient_name = "General"
                if task.patient_id:
                    # Get patient name
                    try:
                        patient = patient_crud.get(db, id=task.patient_id)
                        if patient:
                            patient_name = f"{patient.first_name} {patient.last_name}"
                    except Exception as e:
                        logger.warning(f"Error getting patient {task.patient_id}: {e}")
                
                # Handle missing category column gracefully
                category = "general"
                try:
                    category = task.category or "general"
                except (AttributeError, KeyError):
                    # Column doesn't exist in database
                    pass
                
                tasks_data.append({
                    "id": str(task.id),
                    "patient": patient_name,
                    "task": task.description,
                    "priority": task.priority,
                    "status": "completed" if task.completed else "pending",
                    "category": category,
                    "notes": task.notes
                })
            except Exception as e:
                logger.warning(f"Error processing task {task.id}: {e}")
                continue
        
        return SuccessResponse(data=tasks_data, message="Tasks retrieved")
    except Exception as e:
        logger.error(f"Error in dashboard_tasks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving tasks: {str(e)}")


@router.get("/messages", response_model=SuccessResponse[List[Dict]])
async def dashboard_messages(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get recent messages for dashboard display."""
    # Get recent messages for the nurse (both sent and received)
    messages = message_crud.get_messages_by_user(
        db,
        user_id=current_user.user_id,
        skip=0,
        limit=10  # Show last 10 messages
    )
    
    messages_data = []
    for message in messages:
        # Get sender info
        sender = db.query(User).filter(User.id == message.sender_id).first()
        sender_name = "Unknown"
        if sender:
            sender_name = f"{sender.first_name} {sender.last_name}"
        
        # Calculate time ago
        now = datetime.now(timezone.utc)
        time_diff = now - message.timestamp
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        elif time_diff.seconds > 3600:
            hours = time_diff.seconds // 3600
            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds > 60:
            minutes = time_diff.seconds // 60
            time_ago = f"{minutes} min ago"
        else:
            time_ago = "Just now"
        
        # Determine if sender is online (simplified - could be enhanced with real presence)
        is_online = message.timestamp > (now - timedelta(minutes=5))
        
        messages_data.append({
            "id": str(message.id),
            "name": sender_name,
            "message": message.content[:100] + "..." if len(message.content) > 100 else message.content,
            "time": time_ago,
            "online": is_online,
            "read": message.read,
            "priority": message.priority.value if message.priority else "normal"
        })
    
    # Sort by timestamp (most recent first)
    messages_data.sort(key=lambda x: x["time"], reverse=True)
    
    return SuccessResponse(data=messages_data, message="Messages retrieved")





