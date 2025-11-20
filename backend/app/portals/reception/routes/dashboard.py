"""Reception portal – dashboard router
Provides aggregated data for the ReceptionDashboard.jsx component.
Includes real-time stats, upcoming appointments, tasks, and notifications.
"""
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, status
from sqlalchemy.orm import Session
from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.db.session import get_db
from pydantic import BaseModel, Field
from app.portals.reception.schemas.dashboard import (
    DashboardStats as SchemaDashboardStats,
    UpcomingAppointment as SchemaUpcomingAppointment,
    Task as SchemaTask,
    Notification as SchemaNotification,
    QuickOverview as SchemaQuickOverview,
    DashboardData as SchemaDashboardData,
)

# Use real auth dependency
from app.services.fhir_repository import fhir_repo
from app.crud.todo import todo as todo_crud, TodoPriority
from app.common.models.messaging import Todo as TodoModel

router = APIRouter(tags=["Reception · Dashboard"])

# ─────────────────────────────────────────────────────────────── Dashboard DTOs ──
DashboardStats = SchemaDashboardStats
UpcomingAppointment = SchemaUpcomingAppointment
Task = SchemaTask
Notification = SchemaNotification
QuickOverview = SchemaQuickOverview
DashboardData = SchemaDashboardData

# ──────────────────────────────────────────────────────── In-Memory Storage ───
_NOTIFICATIONS: Dict[str, Notification] = {}

# ──────────────────────────────────────────────────────── Helper Functions ───
def _reverse_appointment_status(fhir_status: str) -> str:
    """Convert FHIR status to frontend status."""
    status_map = {
        "proposed": "pending",
        "booked": "confirmed", 
        "arrived": "checked-in",
        "fulfilled": "completed",
        "cancelled": "cancelled"
    }
    return status_map.get(fhir_status, "pending")

async def _resolve_patient_name(patient_ref: str) -> str:
    """Resolve patient reference to name."""
    if not patient_ref.startswith("Patient/"):
        return "Unknown Patient"
    
    patient_id = patient_ref.split("/")[1]
    patient = fhir_repo.get("Patient", patient_id)
    
    if not patient:
        return "Unknown Patient"
    
    name_obj = patient.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    return f"{' '.join(given)} {family}".strip() or "Unknown Patient"

async def _resolve_doctor_name(practitioner_ref: str) -> str:
    """Resolve practitioner reference to doctor name."""
    if not practitioner_ref.startswith("Practitioner/"):
        return "Unknown Doctor"
    
    doctor_id = practitioner_ref.split("/")[1]
    practitioner = fhir_repo.get("Practitioner", doctor_id)
    
    if not practitioner:
        return "Unknown Doctor"
    
    name_obj = practitioner.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    return f"Dr. {' '.join(given)} {family}".strip() or "Unknown Doctor"

def _generate_system_notifications(db: Session = None, user_id: str = None) -> List[Notification]:
    """Generate system notifications based on current state."""
    notifications = []
    
    # Check for overdue tasks (if db and user_id provided)
    if db and user_id:
        try:
            overdue_todos = todo_crud.get_overdue_todos(db=db, user_id=user_id)
            if overdue_todos:
                notifications.append(Notification(
                    id=f"notif-overdue-{datetime.now().timestamp()}",
                    message=f"{len(overdue_todos)} overdue task(s) require attention",
                    time=datetime.now().isoformat(),
                    type="warning",
                    action_required=True
                ))
            
            # Check for high priority incomplete tasks
            high_priority_todos = todo_crud.get_todos_by_user(
                db=db,
                user_id=user_id,
                completed=False,
                priority=TodoPriority.HIGH,
                limit=100
            )
            if high_priority_todos:
                notifications.append(Notification(
                    id=f"notif-urgent-{datetime.now().timestamp()}",
                    message=f"{len(high_priority_todos)} high priority task(s) pending",
                    time=datetime.now().isoformat(),
                    type="urgent",
                    action_required=True
                ))
        except Exception as e:
            # If database query fails, just skip task-based notifications
            print(f"Warning: Could not generate task-based notifications: {e}")
    
    # Add some example notifications
    base_notifications = [
        Notification(
            id="notif-1",
            message="New walk-in patient registered",
            time=(datetime.now() - timedelta(minutes=5)).isoformat(),
            type="info"
        ),
        Notification(
            id="notif-2", 
            message="Dr. Smith running 15 minutes late",
            time=(datetime.now() - timedelta(minutes=10)).isoformat(),
            type="warning"
        ),
        Notification(
            id="notif-3",
            message="Insurance verification needed for next patient",
            time=(datetime.now() - timedelta(minutes=20)).isoformat(),
            type="urgent",
            action_required=True
        )
    ]
    
    return notifications + base_notifications

# ───────────────────────────────────────────────────────────── Dashboard Routes ─────────
@router.get("", response_model=DashboardData)
async def get_dashboard_data(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
):
    """Get complete dashboard data in a single request."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    # Get appointment statistics
    stats = await get_appointment_stats(target_date, current_user)
    
    # Get upcoming appointments
    upcoming = await get_upcoming_appointments(limit=4, current_user=current_user)
    
    # Get tasks from database
    from app.db.session import get_db
    db = next(get_db())
    try:
        todos = todo_crud.get_todos_by_user(
            db=db,
            user_id=str(current_user.user_id),
            limit=20
        )
        tasks = []
        for todo in todos:
            tasks.append(Task(
                id=str(todo.id),
                task=todo.description,
                completed=todo.completed,
                priority=todo.priority.lower() if todo.priority else "medium",
                due_date=todo.due_date.isoformat() if todo.due_date else None,
                created_at=todo.created_at.isoformat() if todo.created_at else datetime.now().isoformat()
            ))
        tasks.sort(key=lambda x: (x.completed, x.priority != "high", x.created_at), reverse=True)
    except Exception as e:
        print(f"Warning: Could not load tasks: {e}")
        tasks = []
    finally:
        db.close()
    
    # Get notifications
    db_notif = next(get_db())
    try:
        notifications = _generate_system_notifications(db=db_notif, user_id=str(current_user.user_id))
    except Exception:
        notifications = _generate_system_notifications()
    finally:
        db_notif.close()
    notifications.extend(_NOTIFICATIONS.values())
    notifications.sort(key=lambda x: x.time, reverse=True)
    
    # Calculate quick overview
    today_appointments = stats.totalAppointments
    completed_appointments = stats.checkedIn
    pending_appointments = today_appointments - completed_appointments
    completion_rate = (completed_appointments / today_appointments * 100) if today_appointments > 0 else 0
    
    quick_overview = QuickOverview(
        total_today=today_appointments,
        completed=completed_appointments,
        pending=pending_appointments,
        completion_rate=round(completion_rate, 1)
    )
    
    return DashboardData(
        stats=stats,
        upcoming_appointments=upcoming[:4],  # Limit to 4 for dashboard
        tasks=tasks[:6],  # Limit to 6 for dashboard
        notifications=notifications[:5],  # Limit to 5 for dashboard
        quick_overview=quick_overview
    )

@router.get("/stats", response_model=DashboardStats)
async def get_appointment_stats(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
):
    """Get appointment statistics for specified date."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    # Get all appointments for the date
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    
    total_appointments = 0
    checked_in = 0
    completed = 0
    walk_ins = 0
    
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res or apt_res["start"][:10] != target_date:
            continue
        
        total_appointments += 1
        status = _reverse_appointment_status(apt_res["status"])
        
        if status == "checked-in":
            checked_in += 1
        elif status == "completed":
            completed += 1
        
        # Check if it's a walk-in (created same day as appointment)
        created_date = bundle.get("timestamp", "")[:10]
        if created_date == target_date:
            walk_ins += 1
    
    waiting = checked_in  # Simplified: checked-in patients are waiting
    
    return DashboardStats(
        totalAppointments=total_appointments,
        checkedIn=checked_in + completed,
        walkIns=walk_ins,
        waiting=waiting
    )

@router.get("/upcoming", response_model=List[UpcomingAppointment])
async def get_upcoming_appointments(
    limit: int = Query(10, ge=1, le=50),
    hours_ahead: int = Query(24, ge=1, le=168),  # Max 1 week
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
):
    """Get upcoming appointments for the next specified hours, sorted by closest time."""
    from app.crud.appointment import appointment as appointment_crud
    from app.common.models.appointment import Appointment, AppointmentStatus
    from app.common.models.patient import Patient
    from app.common.models.doctor import Doctor
    from app.common.models.user import User
    from sqlalchemy.orm import joinedload
    from uuid import UUID
    
    now = datetime.now()
    end_time = now + timedelta(hours=hours_ahead)
    upcoming = []
    
    # Get clinic ID
    clinic_id = current_user.clinic_id
    if not clinic_id:
        return []
    
    try:
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        
        # Query upcoming appointments from database
        db_appointments = db.query(Appointment).filter(
            Appointment.hospital_id == clinic_uuid,
            Appointment.appointment_date >= now,
            Appointment.appointment_date <= end_time
        ).options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).order_by(Appointment.appointment_date).limit(limit * 2).all()  # Get more to filter
        
        for apt in db_appointments:
            # Skip cancelled or completed appointments
            if apt.status in [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]:
                continue
            
            # Get patient name
            patient_name = "Unknown Patient"
            if apt.patient and apt.patient.user:
                patient_name = f"{apt.patient.user.first_name or ''} {apt.patient.user.last_name or ''}".strip() or apt.patient.user.email or "Unknown Patient"
            
            # Get doctor name
            doctor_name = "Unknown Doctor"
            if apt.doctor and apt.doctor.user:
                doctor_name = f"Dr. {apt.doctor.user.first_name or ''} {apt.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
            
            # Format time
            time_str = apt.appointment_date.strftime("%H:%M") if apt.appointment_date else ""
            
            # Get appointment type
            apt_type = apt.appointment_type if hasattr(apt, 'appointment_type') and apt.appointment_type else "General Consultation"
            if isinstance(apt_type, str):
                # Map string to display name
                type_map = {
                    "general_consultation": "General Consultation",
                    "follow_up": "Follow-up Visit",
                    "routine_checkup": "Check-up",
                    "emergency": "Emergency Visit",
                    "specialist_consultation": "Specialist Consultation",
                    "procedure": "Procedure"
                }
                apt_type = type_map.get(apt_type.lower(), apt_type.replace("_", " ").title())
            
            # Get status
            status = apt.status.value if hasattr(apt.status, 'value') else str(apt.status) if apt.status else "pending"
            # Map status to frontend format
            status_map = {
                "booked": "confirmed",
                "pending": "pending",
                "confirmed": "confirmed",
                "arrived": "arrived",
                "checked-in": "checked-in",
                "fulfilled": "completed",
                "completed": "completed",
                "cancelled": "cancelled"
            }
            status = status_map.get(status.lower(), status.lower())
            
            upcoming.append({
                "id": str(apt.id),
                "time": time_str,
                "patient": patient_name,
                "doctor": doctor_name,
                "type": apt_type,
                "status": status,
                "patient_id": str(apt.patient_id),
                "appointment_id": str(apt.id),
                "datetime": apt.appointment_date  # For sorting
            })
    except Exception as e:
        print(f"Error fetching upcoming appointments from database: {e}")
        import traceback
        traceback.print_exc()
    
    # Also get from FHIR (for backwards compatibility) - but only if they belong to this clinic
    # Note: FHIR appointments are now secondary to database appointments
    # We check if the patient belongs to this clinic before including FHIR appointments
    try:
        bundles = fhir_repo.list_bundles(resource_type="Appointment")
        fhir_appointment_ids = {apt["appointment_id"] for apt in upcoming}
        
        # Get all patients in this clinic to filter FHIR appointments
        clinic_patient_ids = set()
        try:
            clinic_patients = db.query(Patient).join(
                User, Patient.user_id == User.id
            ).filter(
                User.organization_id == clinic_uuid
            ).all()
            clinic_patient_ids = {str(p.patient_id) for p in clinic_patients}
        except Exception as e:
            print(f"Error getting clinic patients for FHIR filtering: {e}")
        
        for bundle in bundles:
            apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
            if not apt_res:
                continue
            
            # Skip if already in database results
            if apt_res["id"] in fhir_appointment_ids:
                continue
            
            # Parse appointment datetime
            try:
                apt_start_str = apt_res["start"].replace('+05:00', '+00:00')
                apt_start = datetime.fromisoformat(apt_start_str)
            except (ValueError, KeyError):
                continue
            
            # Filter for upcoming appointments
            if apt_start < now or apt_start > end_time:
                continue
            
            status = _reverse_appointment_status(apt_res["status"])
            if status in ["cancelled", "completed"]:
                continue
            
            # Resolve patient and doctor names
            participants = apt_res.get("participant", [])
            patient_ref = next((p["actor"]["reference"] for p in participants 
                              if p["actor"]["reference"].startswith("Patient/")), "Patient/unknown")
            doctor_ref = next((p["actor"]["reference"] for p in participants 
                             if p["actor"]["reference"].startswith("Practitioner/")), "Practitioner/unknown")
            
            # Extract patient ID from reference
            patient_id = patient_ref.split("/")[-1] if "/" in patient_ref else None
            if patient_id:
                try:
                    patient_id = UUID(patient_id)
                except ValueError:
                    patient_id = None
            
            # IMPORTANT: Only include FHIR appointments if the patient belongs to this clinic
            if patient_id and clinic_patient_ids and str(patient_id) not in clinic_patient_ids:
                continue  # Skip appointments from other clinics
            
            patient_name = await _resolve_patient_name(patient_ref)
            doctor_name = await _resolve_doctor_name(doctor_ref)
            
            # Determine appointment type from reason or description
            apt_type = "General Consultation"
            if apt_res.get("reasonCode"):
                apt_type = apt_res["reasonCode"][0].get("coding", [{}])[0].get("display", apt_type)
            elif apt_res.get("description"):
                desc = apt_res["description"].lower()
                if "follow" in desc:
                    apt_type = "Follow-up Visit"
                elif "check" in desc:
                    apt_type = "Check-up"
                elif "procedure" in desc:
                    apt_type = "Procedure"
            
            upcoming.append({
                "id": apt_res["id"],
                "time": apt_res["start"][11:16],  # HH:MM format
                "patient": patient_name,
                "doctor": doctor_name,
                "type": apt_type,
                "status": status,
                "patient_id": str(patient_id) if patient_id else None,
                "appointment_id": apt_res["id"],
                "datetime": apt_start  # For sorting
            })
    except Exception as e:
        print(f"Error fetching upcoming appointments from FHIR: {e}")
        import traceback
        traceback.print_exc()
    
    # Sort by appointment datetime (closest first)
    upcoming.sort(key=lambda x: x["datetime"])
    
    # Convert to UpcomingAppointment models (without datetime field)
    result = []
    for apt in upcoming[:limit]:
        result.append(UpcomingAppointment(
            id=apt["appointment_id"],
            time=apt["time"],
            patient=apt["patient"],
            doctor=apt["doctor"],
            type=apt["type"],
            status=apt["status"],
            patient_id=apt.get("patient_id"),
            appointment_id=apt["appointment_id"]
        ))
    
    return result

@router.get("/pending", response_model=List[UpcomingAppointment])
async def get_pending_appointments(
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
):
    """Get pending appointments that need to be accepted/assigned (appointments without doctor/department selected)."""
    from app.crud.appointment import appointment as appointment_crud
    from app.common.models.appointment import Appointment, AppointmentStatus
    from app.common.models.patient import Patient
    from app.common.models.doctor import Doctor
    from sqlalchemy.orm import joinedload
    from uuid import UUID
    
    now = datetime.now()
    pending_list = []
    
    # Get clinic ID
    clinic_id = current_user.clinic_id
    if not clinic_id:
        return []
    
    try:
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        
        # Query pending appointments from database
        # Only show patient-requested appointments (marked with [AUTO-ASSIGNED] in notes/reason)
        # These are appointments that were created by patients without a specific doctor selection
        # Appointments created by doctors or receptionists won't have this marker and should not appear here
        from sqlalchemy import or_
        db_appointments = db.query(Appointment).filter(
            Appointment.hospital_id == clinic_uuid,
            Appointment.appointment_date >= now,  # Only future appointments
            Appointment.status.in_([AppointmentStatus.PENDING.value, AppointmentStatus.PROPOSED.value, "pending", "proposed"]),
            # Only include appointments with [AUTO-ASSIGNED] marker (patient-requested appointments)
            or_(
                Appointment.notes.like("%[AUTO-ASSIGNED%"),
                Appointment.reason.like("%[AUTO-ASSIGNED%")
            )
        ).options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).order_by(Appointment.appointment_date).limit(limit).all()
        
        for apt in db_appointments:
            # All appointments here need doctor assignment (they have [AUTO-ASSIGNED] marker)
            needs_assignment = True
            
            # Get patient name
            patient_name = "Unknown Patient"
            if apt.patient and apt.patient.user:
                patient_name = f"{apt.patient.user.first_name or ''} {apt.patient.user.last_name or ''}".strip() or apt.patient.user.email or "Unknown Patient"
            
            # Get doctor name - for pending appointments that need assignment, show as "Unassigned"
            doctor_name = "Unassigned"
            if needs_assignment:
                # This appointment was auto-assigned and needs proper doctor assignment
                doctor_name = "Unassigned - Needs Assignment"
            elif apt.doctor and apt.doctor.user:
                doctor_name = f"Dr. {apt.doctor.user.first_name or ''} {apt.doctor.user.last_name or ''}".strip() or "Unassigned"
            
            # Format time
            time_str = apt.appointment_date.strftime("%H:%M") if apt.appointment_date else ""
            
            # Get appointment type
            apt_type = apt.appointment_type if hasattr(apt, 'appointment_type') and apt.appointment_type else "General Consultation"
            if isinstance(apt_type, str):
                # Map string to display name
                type_map = {
                    "general_consultation": "General Consultation",
                    "follow_up": "Follow-up Visit",
                    "routine_checkup": "Check-up",
                    "emergency": "Emergency Visit",
                    "specialist_consultation": "Specialist Consultation",
                    "procedure": "Procedure"
                }
                apt_type = type_map.get(apt_type.lower(), apt_type.replace("_", " ").title())
            
            # Status is pending
            status = "pending"
            
            pending_list.append({
                "id": str(apt.id),
                "time": time_str,
                "patient": patient_name,
                "doctor": doctor_name,
                "type": apt_type,
                "status": status,
                "patient_id": str(apt.patient_id),
                "appointment_id": str(apt.id),
                "datetime": apt.appointment_date  # For sorting
            })
    except Exception as e:
        print(f"Error fetching pending appointments from database: {e}")
        import traceback
        traceback.print_exc()
    
    # Sort by appointment datetime (closest first)
    pending_list.sort(key=lambda x: x["datetime"])
    
    # Convert to UpcomingAppointment models
    result = []
    for apt in pending_list[:limit]:
        result.append(UpcomingAppointment(
            id=apt["appointment_id"],
            time=apt["time"],
            patient=apt["patient"],
            doctor=apt["doctor"],
            type=apt["type"],
            status=apt["status"],
            patient_id=apt.get("patient_id"),
            appointment_id=apt["appointment_id"]
        ))
    
    return result

@router.get("/past", response_model=List[UpcomingAppointment])
async def get_past_appointments(
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
):
    """Get past appointments that have reports created on them."""
    from app.crud.appointment import appointment as appointment_crud
    from app.common.models.appointment import Appointment, AppointmentStatus
    from app.common.models.patient import Patient
    from app.common.models.doctor import Doctor, GeneralReport
    from app.common.models.lab_insurance import LabOrder, LabReport
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_, exists
    from uuid import UUID
    
    now = datetime.now(timezone.utc)  # Use UTC timezone-aware datetime
    past_list = []
    
    # Get clinic ID
    clinic_id = current_user.clinic_id
    if not clinic_id:
        print(f"[PAST APPOINTMENTS] No clinic_id found for user {current_user.user_id}")
        return []
    
    try:
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        
        print(f"[PAST APPOINTMENTS] Clinic ID: {clinic_id}, Clinic UUID: {clinic_uuid}")
        print(f"[PAST APPOINTMENTS] Current time: {now}")
        
        # Query appointments that have reports:
        # 1. Appointments with GeneralReport (via encounter_id)
        # 2. Appointments with LabOrder that has LabReport (via encounter_id -> order_id)
        # 3. Reports WITHOUT appointments (encounter_id is NULL) - NEW
        # 4. All must be in the past
        
        # Get all appointment IDs that have reports
        appointment_ids_with_reports = set()
        
        # 1. Get appointments with GeneralReport
        general_reports_with_appt = db.query(GeneralReport).filter(
            GeneralReport.clinic_id == clinic_uuid,
            GeneralReport.encounter_id.isnot(None)
        ).all()
        for report in general_reports_with_appt:
            if report.encounter_id:
                appointment_ids_with_reports.add(report.encounter_id)
        
        # 2. Get appointments with LabOrder that has LabReport
        # LabOrder.id is String(36), LabReport.order_id is UUID, so we need to convert
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import UUID as PG_UUID
        
        # Get all lab orders with reports and encounter_id
        lab_orders_with_appt = db.query(LabOrder).filter(
            LabOrder.encounter_id.isnot(None)
        ).all()
        
        for lab_order in lab_orders_with_appt:
            if lab_order.encounter_id:
                try:
                    # Convert LabOrder.id (String) to UUID for comparison with LabReport.order_id
                    lab_order_uuid = UUID(lab_order.id) if isinstance(lab_order.id, str) else lab_order.id
                    
                    # Check if this lab order has a report
                    has_report = db.query(LabReport).filter(
                        LabReport.order_id == lab_order_uuid
                    ).first()
                    
                    if has_report:
                        # Convert encounter_id (String) to UUID for comparison with Appointment.id
                        apt_id = UUID(lab_order.encounter_id) if isinstance(lab_order.encounter_id, str) else lab_order.encounter_id
                        
                        # Verify appointment belongs to clinic
                        apt = db.query(Appointment).filter(
                            Appointment.id == apt_id,
                            Appointment.hospital_id == clinic_uuid
                        ).first()
                        if apt:
                            appointment_ids_with_reports.add(apt_id)
                except Exception as e:
                    print(f"Error processing lab order {lab_order.id}: {e}")
                    pass
        
        # Query appointments that have reports and are in the past
        if appointment_ids_with_reports:
            db_appointments = db.query(Appointment).filter(
                Appointment.hospital_id == clinic_uuid,
                Appointment.id.in_(list(appointment_ids_with_reports)),
                Appointment.appointment_date < now  # Only past appointments
            ).options(
                joinedload(Appointment.patient).joinedload(Patient.user),
                joinedload(Appointment.doctor).joinedload(Doctor.user)
            ).order_by(Appointment.appointment_date.desc()).limit(limit * 2).all()
            
            for apt in db_appointments:
                # Get patient name
                patient_name = "Unknown Patient"
                if apt.patient and apt.patient.user:
                    patient_name = f"{apt.patient.user.first_name or ''} {apt.patient.user.last_name or ''}".strip() or apt.patient.user.email or "Unknown Patient"
                
                # Get doctor name
                doctor_name = "Unknown Doctor"
                if apt.doctor and apt.doctor.user:
                    doctor_name = f"Dr. {apt.doctor.user.first_name or ''} {apt.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                
                # Format time and date
                time_str = apt.appointment_date.strftime("%H:%M") if apt.appointment_date else ""
                date_str = apt.appointment_date.strftime("%d %b %Y") if apt.appointment_date else ""
                
                # Get appointment type
                apt_type = apt.appointment_type if hasattr(apt, 'appointment_type') and apt.appointment_type else "General Consultation"
                if isinstance(apt_type, str):
                    # Map string to display name
                    type_map = {
                        "general_consultation": "General Consultation",
                        "follow_up": "Follow-up Visit",
                        "routine_checkup": "Check-up",
                        "emergency": "Emergency Visit",
                        "specialist_consultation": "Specialist Consultation",
                        "procedure": "Procedure"
                    }
                    apt_type = type_map.get(apt_type.lower(), apt_type.replace("_", " ").title())
                
                # Get status
                status = apt.status.value if hasattr(apt.status, 'value') else str(apt.status) if apt.status else "completed"
                # Map status to frontend format
                status_map = {
                    "fulfilled": "completed",
                    "completed": "completed",
                    "cancelled": "cancelled"
                }
                status = status_map.get(status.lower(), "completed")
                
                past_list.append({
                    "id": str(apt.id),
                    "time": time_str,
                    "date": date_str,
                    "patient": patient_name,
                    "doctor": doctor_name,
                    "type": apt_type,
                    "status": status,
                    "patient_id": str(apt.patient_id),
                    "appointment_id": str(apt.id),
                    "datetime": apt.appointment_date  # For sorting
                })
        
        # 3. Get GeneralReports WITHOUT appointments (encounter_id is NULL) for this clinic
        general_reports_no_appt = db.query(GeneralReport).options(
            joinedload(GeneralReport.patient).joinedload(Patient.user),
            joinedload(GeneralReport.doctor).joinedload(Doctor.user)
        ).filter(
            GeneralReport.clinic_id == clinic_uuid,
            GeneralReport.encounter_id.is_(None)
        ).order_by(GeneralReport.created_at.desc()).limit(limit * 2).all()
        
        # Filter by date in Python to handle timezone issues
        general_reports_no_appt = [r for r in general_reports_no_appt if r.created_at and r.created_at < now]
        
        print(f"[PAST APPOINTMENTS] Found {len(general_reports_no_appt)} GeneralReports without appointments for clinic {clinic_uuid}")
        
        for report in general_reports_no_appt:
            # Get patient name
            patient_name = "Unknown Patient"
            if report.patient and report.patient.user:
                patient_name = f"{report.patient.user.first_name or ''} {report.patient.user.last_name or ''}".strip() or report.patient.user.email or "Unknown Patient"
            
            # Get doctor name
            doctor_name = "Unknown Doctor"
            if report.doctor and report.doctor.user:
                doctor_name = f"Dr. {report.doctor.user.first_name or ''} {report.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
            
            # Use report created_at as the appointment datetime (this is when the report was made)
            report_datetime = report.created_at if report.created_at else datetime.now(timezone.utc)
            time_str = report_datetime.strftime("%H:%M") if report_datetime else ""
            date_str = report_datetime.strftime("%d %b %Y") if report_datetime else ""
            
            # Use report type as appointment type
            apt_type = report.report_type.replace("_", " ").title() if report.report_type else "General Consultation"
            
            past_list.append({
                "id": f"report_{report.id}",  # Use report ID as identifier
                "time": time_str,
                "date": date_str,  # Date when report was made
                "patient": patient_name,
                "doctor": doctor_name,
                "type": apt_type,
                "status": "completed",
                "patient_id": str(report.patient_id),
                "appointment_id": f"report_{report.id}",  # No actual appointment ID
                "datetime": report_datetime  # For sorting
            })
        
        # 3b. Get ClinicalNotes WITHOUT appointments (encounter_id is NULL) created by doctors in this clinic
        from app.common.models.doctor import ClinicalNote
        from app.common.models.user import User
        
        # Get all doctors in this clinic
        clinic_doctors = db.query(Doctor).join(User, Doctor.user_id == User.id).filter(
            User.organization_id == clinic_uuid
        ).all()
        doctor_ids = [d.id for d in clinic_doctors]
        
        if doctor_ids:
            clinical_notes_no_appt = db.query(ClinicalNote).options(
                joinedload(ClinicalNote.patient).joinedload(Patient.user),
                joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
            ).filter(
                ClinicalNote.doctor_id.in_(doctor_ids),
                ClinicalNote.encounter_id.is_(None)
            ).order_by(ClinicalNote.note_date.desc()).limit(limit * 2).all()
            
            # Filter by date in Python to handle timezone issues
            # Ensure note_date is timezone-aware for comparison
            filtered_notes = []
            for n in clinical_notes_no_appt:
                if n.note_date:
                    note_date = n.note_date
                    if note_date.tzinfo is None:
                        note_date = note_date.replace(tzinfo=timezone.utc)
                    if note_date < now:
                        filtered_notes.append(n)
                        print(f"[PAST APPOINTMENTS] ClinicalNote {n.id} passed date filter: {note_date} < {now}")
                    else:
                        print(f"[PAST APPOINTMENTS] ClinicalNote {n.id} failed date filter: {note_date} >= {now}")
                else:
                    print(f"[PAST APPOINTMENTS] ClinicalNote {n.id} has no note_date")
            clinical_notes_no_appt = filtered_notes
            
            print(f"[PAST APPOINTMENTS] Found {len(clinical_notes_no_appt)} ClinicalNotes without appointments for clinic {clinic_uuid}")
            
            for note in clinical_notes_no_appt:
                # Get patient name
                patient_name = "Unknown Patient"
                if note.patient and note.patient.user:
                    patient_name = f"{note.patient.user.first_name or ''} {note.patient.user.last_name or ''}".strip() or note.patient.user.email or "Unknown Patient"
                elif note.patient:
                    # Patient has no user account
                    patient_name = f"Patient {str(note.patient.patient_id)[:8]}"
                
                # Get doctor name
                doctor_name = "Unknown Doctor"
                if note.doctor and note.doctor.user:
                    doctor_name = f"Dr. {note.doctor.user.first_name or ''} {note.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                
                # Use note date as the appointment datetime (this is when the note was made)
                note_datetime = note.note_date if note.note_date else (note.created_at if hasattr(note, 'created_at') and note.created_at else datetime.now(timezone.utc))
                # Ensure timezone-aware datetime for comparison
                if note_datetime and note_datetime.tzinfo is None:
                    note_datetime = note_datetime.replace(tzinfo=timezone.utc)
                time_str = note_datetime.strftime("%H:%M") if note_datetime else ""
                date_str = note_datetime.strftime("%d %b %Y") if note_datetime else ""
                print(f"[PAST APPOINTMENTS] ClinicalNote {note.id}: date_str={date_str}, time_str={time_str}, note_datetime={note_datetime}")
                
                # Use note type as appointment type
                apt_type = note.note_type.replace("_", " ").title() if note.note_type else "Clinical Note"
                
                past_list.append({
                    "id": f"note_{note.id}",  # Use note ID as identifier
                    "time": time_str,
                    "date": date_str,  # Date when note was made
                    "patient": patient_name,
                    "doctor": doctor_name,
                    "type": apt_type,
                    "status": "completed",
                    "patient_id": str(note.patient_id) if note.patient_id else "",
                    "appointment_id": f"note_{note.id}",  # No actual appointment ID
                    "datetime": note_datetime  # For sorting
                })
        else:
            print(f"[PAST APPOINTMENTS] No doctors found in clinic {clinic_uuid}, skipping ClinicalNotes")
        
        # 4. Get LabOrders WITHOUT appointments (encounter_id is NULL) that have LabReports
        lab_orders_no_appt = db.query(LabOrder).filter(
            LabOrder.encounter_id.is_(None)
        ).all()
        
        print(f"[PAST APPOINTMENTS] Found {len(lab_orders_no_appt)} LabOrders without appointments (checking for reports and clinic match)...")
        
        lab_reports_added = 0
        for lab_order in lab_orders_no_appt:
            try:
                # Convert LabOrder.id (String) to UUID for comparison with LabReport.order_id
                lab_order_uuid = UUID(lab_order.id) if isinstance(lab_order.id, str) else lab_order.id
                
                # Check if this lab order has a report
                lab_report = db.query(LabReport).filter(
                    LabReport.order_id == lab_order_uuid
                ).first()
                
                if lab_report:
                    # Convert patient_id from String to UUID if needed
                    patient_id_uuid = UUID(lab_order.patient_id) if isinstance(lab_order.patient_id, str) else lab_order.patient_id
                    
                    # Get patient
                    patient = db.query(Patient).options(
                        joinedload(Patient.user)
                    ).filter(Patient.patient_id == patient_id_uuid).first()
                    
                    # Convert ordered_by from String to UUID if needed
                    doctor_id_uuid = UUID(lab_order.ordered_by) if isinstance(lab_order.ordered_by, str) else lab_order.ordered_by
                    
                    # Get doctor
                    doctor = db.query(Doctor).options(
                        joinedload(Doctor.user)
                    ).filter(Doctor.id == doctor_id_uuid).first()
                    
                    # Verify patient belongs to clinic (check patient's organization_id)
                    if patient and patient.user:
                        patient_org_id = patient.user.organization_id
                        if patient_org_id == clinic_uuid:
                            # Get patient name
                            patient_name = "Unknown Patient"
                            if patient.user:
                                patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or patient.user.email or "Unknown Patient"
                            
                            # Get doctor name
                            doctor_name = "Unknown Doctor"
                            if doctor and doctor.user:
                                doctor_name = f"Dr. {doctor.user.first_name or ''} {doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                            
                            # Use lab report date as the appointment datetime
                            report_datetime = lab_report.report_date if lab_report.report_date else lab_report.created_at
                            if not report_datetime:
                                report_datetime = datetime.now(timezone.utc)
                            
                            # Only include if in the past
                            if report_datetime < now:
                                time_str = report_datetime.strftime("%H:%M") if report_datetime else ""
                                date_str = report_datetime.strftime("%d %b %Y") if report_datetime else ""
                                
                                past_list.append({
                                    "id": f"lab_report_{lab_report.id}",
                                    "time": time_str,
                                    "date": date_str,  # Date when report was made
                                    "patient": patient_name,
                                    "doctor": doctor_name,
                                    "type": "Lab Report",
                                    "status": "completed",
                                    "patient_id": str(lab_order.patient_id),
                                    "appointment_id": f"lab_report_{lab_report.id}",
                                    "datetime": report_datetime  # For sorting
                                })
                                lab_reports_added += 1
            except Exception as e:
                print(f"[PAST APPOINTMENTS] Error processing lab order without appointment {lab_order.id}: {e}")
                import traceback
                traceback.print_exc()
                pass
        
        # 5. Get LabReports directly (without LabOrder link) that belong to patients in this clinic
        # Some LabReports have order_id = None, so we need to check them directly
        all_lab_reports = db.query(LabReport).filter(
            LabReport.order_id.is_(None),  # Reports without LabOrder link
            LabReport.patient_id.isnot(None)  # Must have a patient
        ).limit(limit * 2).all()
        
        print(f"[PAST APPOINTMENTS] Found {len(all_lab_reports)} LabReports without LabOrder link (checking clinic match)...")
        
        for lab_report in all_lab_reports:
            try:
                # Get patient
                patient = db.query(Patient).options(
                    joinedload(Patient.user)
                ).filter(Patient.patient_id == lab_report.patient_id).first()
                
                # Include report if:
                # 1. Patient exists AND (patient has no user OR patient's organization matches clinic OR patient's organization is None)
                # Since reports were created by doctors in the clinic, we include all reports for existing patients
                should_include = False
                if patient:
                    if not patient.user:
                        # Patient has no user account - likely registered by clinic, include it
                        should_include = True
                    elif patient.user.organization_id == clinic_uuid:
                        # Patient belongs to this clinic
                        should_include = True
                    elif patient.user.organization_id is None:
                        # Patient has no organization set - likely registered by clinic, include it
                        should_include = True
                
                if should_include:
                    # Get patient name
                    patient_name = "Unknown Patient"
                    if patient.user:
                        patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or patient.user.email or "Unknown Patient"
                    else:
                        # Patient has no user account, try to get name from patient record if available
                        patient_name = f"Patient {str(patient.patient_id)[:8]}"
                    
                    # Try to get doctor from report metadata or use default
                    doctor_name = "Unknown Doctor"
                    # LabReport doesn't have direct doctor link, so we'll use a default
                    # Could potentially check if there's a LabOrder linked, but for now use default
                    
                    # Use lab report date as the appointment datetime
                    report_datetime = lab_report.report_date if lab_report.report_date else lab_report.created_at
                    if not report_datetime:
                        report_datetime = datetime.now(timezone.utc)
                    
                    # Only include if in the past
                    if report_datetime < now:
                        time_str = report_datetime.strftime("%H:%M") if report_datetime else ""
                        date_str = report_datetime.strftime("%d %b %Y") if report_datetime else ""
                        
                        past_list.append({
                            "id": f"lab_report_{lab_report.id}",
                            "time": time_str,
                            "date": date_str,  # Date when report was made
                            "patient": patient_name,
                            "doctor": doctor_name,
                            "type": "Lab Report",
                            "status": "completed",
                            "patient_id": str(lab_report.patient_id),
                            "appointment_id": f"lab_report_{lab_report.id}",
                            "datetime": report_datetime  # For sorting
                        })
                        lab_reports_added += 1
            except Exception as e:
                print(f"[PAST APPOINTMENTS] Error processing LabReport {lab_report.id}: {e}")
                import traceback
                traceback.print_exc()
                pass
        
        print(f"[PAST APPOINTMENTS] Added {lab_reports_added} LabReports (total from both LabOrders and direct LabReports)")
        print(f"[PAST APPOINTMENTS] Total items in past_list before sorting: {len(past_list)}")
        
    except Exception as e:
        print(f"[PAST APPOINTMENTS] Error fetching past appointments with reports from database: {e}")
        import traceback
        traceback.print_exc()
    
    # Sort by appointment datetime (most recent first)
    past_list.sort(key=lambda x: x["datetime"], reverse=True)
    
    print(f"[PAST APPOINTMENTS] Total items after sorting: {len(past_list)}")
    print(f"[PAST APPOINTMENTS] Returning {min(len(past_list), limit)} items")
    
    # Convert to UpcomingAppointment models
    result = []
    for apt in past_list[:limit]:
        appointment_item = UpcomingAppointment(
            id=apt["appointment_id"],
            time=apt["time"],
            date=apt.get("date"),  # Include date field
            patient=apt["patient"],
            doctor=apt["doctor"],
            type=apt["type"],
            status=apt["status"],
            patient_id=apt.get("patient_id"),
            appointment_id=apt["appointment_id"]
        )
        result.append(appointment_item)
        print(f"[PAST APPOINTMENTS] Added item: {appointment_item.id} - {appointment_item.patient} - {appointment_item.date}")
    
    print(f"[PAST APPOINTMENTS] Final result count: {len(result)}")
    return result

@router.get("/appointments/{appointment_id}", response_model=Dict[str, Any])
async def get_appointment_details(
    appointment_id: str = Path(..., description="Appointment ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
):
    """Get detailed appointment information for printing. Handles both appointments and reports/notes."""
    from app.common.models.appointment import Appointment, AppointmentStatus
    from app.common.models.patient import Patient
    from app.common.models.doctor import Doctor
    from app.common.models.user import User
    from app.common.models.doctor import GeneralReport, ClinicalNote
    from app.common.models.lab_insurance import LabReport
    from sqlalchemy.orm import joinedload
    from uuid import UUID
    
    # Get clinic ID
    clinic_id = current_user.clinic_id
    if not clinic_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No clinic associated with user"
        )
    
    try:
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        from app.common.models.hospital import Hospital
        
        # Check if this is a prefixed ID (report, note, lab_report)
        if appointment_id.startswith("report_"):
            # GeneralReport without appointment
            report_id_str = appointment_id.replace("report_", "")
            try:
                report_id = UUID(report_id_str)
                report = db.query(GeneralReport).options(
                    joinedload(GeneralReport.patient).joinedload(Patient.user),
                    joinedload(GeneralReport.doctor).joinedload(Doctor.user)
                ).filter(
                    GeneralReport.id == report_id,
                    GeneralReport.clinic_id == clinic_uuid
                ).first()
                
                if not report:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
                
                # Get patient information
                patient_name = "Unknown Patient"
                patient_email = None
                patient_phone = None
                if report.patient and report.patient.user:
                    patient_name = f"{report.patient.user.first_name or ''} {report.patient.user.last_name or ''}".strip() or report.patient.user.email or "Unknown Patient"
                    patient_email = report.patient.user.email
                    patient_phone = report.patient.user.phone if hasattr(report.patient.user, 'phone') else None
                
                # Get doctor information
                doctor_name = "Unknown Doctor"
                doctor_specialty = None
                if report.doctor and report.doctor.user:
                    doctor_name = f"Dr. {report.doctor.user.first_name or ''} {report.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                    doctor_specialty = report.doctor.specialty if hasattr(report.doctor, 'specialty') else None
                
                # Get clinic information
                clinic_name = None
                clinic_address = None
                clinic_phone = None
                try:
                    hospital = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
                    if hospital:
                        clinic_name = hospital.name if hasattr(hospital, 'name') else None
                        clinic_address = hospital.address if hasattr(hospital, 'address') else None
                        clinic_phone = hospital.phone if hasattr(hospital, 'phone') else None
                except Exception as e:
                    print(f"Error fetching hospital info: {e}")
                
                # Format date and time from report creation
                report_datetime = report.created_at if report.created_at else datetime.now(timezone.utc)
                appointment_date_str = report_datetime.strftime("%d %B %Y") if report_datetime else ""
                appointment_time_str = report_datetime.strftime("%I:%M %p") if report_datetime else ""
                
                apt_type = report.report_type.replace("_", " ").title() if report.report_type else "Medical Report"
                
                # Build report content
                report_content = {
                    "chief_complaint": report.chief_complaint if hasattr(report, 'chief_complaint') and report.chief_complaint else None,
                    "onset_time": report.onset_time.isoformat() if hasattr(report, 'onset_time') and report.onset_time else None,
                    "info_source": report.info_source if hasattr(report, 'info_source') and report.info_source else None,
                    "hpi": {
                        "onset": report.hpi_onset if hasattr(report, 'hpi_onset') and report.hpi_onset else None,
                        "duration": report.hpi_duration if hasattr(report, 'hpi_duration') and report.hpi_duration else None,
                        "course": report.hpi_course if hasattr(report, 'hpi_course') and report.hpi_course else None,
                        "modifiers": report.hpi_modifiers if hasattr(report, 'hpi_modifiers') and report.hpi_modifiers else None,
                        "associated_symptoms": report.hpi_associated_symptoms if hasattr(report, 'hpi_associated_symptoms') and report.hpi_associated_symptoms else None,
                        "free_text": report.hpi_free_text if hasattr(report, 'hpi_free_text') and report.hpi_free_text else None,
                    },
                    "pmh_fh_sh": {
                        "pmh_conditions": report.pmh_conditions if hasattr(report, 'pmh_conditions') and report.pmh_conditions else None,
                        "pmh_surgeries": report.pmh_surgeries if hasattr(report, 'pmh_surgeries') and report.pmh_surgeries else None,
                        "fh_cardio": report.fh_cardio if hasattr(report, 'fh_cardio') and report.fh_cardio else None,
                        "fh_diabetes": report.fh_diabetes if hasattr(report, 'fh_diabetes') and report.fh_diabetes else None,
                        "fh_cancer": report.fh_cancer if hasattr(report, 'fh_cancer') and report.fh_cancer else None,
                        "fh_notes": report.fh_notes if hasattr(report, 'fh_notes') and report.fh_notes else None,
                        "social_smoking": report.social_smoking if hasattr(report, 'social_smoking') and report.social_smoking else None,
                        "social_audit_c": report.social_audit_c if hasattr(report, 'social_audit_c') and report.social_audit_c else None,
                        "social_exercise": report.social_exercise if hasattr(report, 'social_exercise') and report.social_exercise else None,
                    },
                    "ros": {
                        "respiratory": report.ros_respiratory if hasattr(report, 'ros_respiratory') and report.ros_respiratory else None,
                        "cardio": report.ros_cardio if hasattr(report, 'ros_cardio') and report.ros_cardio else None,
                        "gi": report.ros_gi if hasattr(report, 'ros_gi') and report.ros_gi else None,
                        "neuro": report.ros_neuro if hasattr(report, 'ros_neuro') and report.ros_neuro else None,
                        "gu": report.ros_gu if hasattr(report, 'ros_gu') and report.ros_gu else None,
                        "derm": report.ros_derm if hasattr(report, 'ros_derm') and report.ros_derm else None,
                        "ent": report.ros_ent if hasattr(report, 'ros_ent') and report.ros_ent else None,
                        "msk": report.ros_msk if hasattr(report, 'ros_msk') and report.ros_msk else None,
                        "notes": report.ros_notes if hasattr(report, 'ros_notes') and report.ros_notes else None,
                    },
                    "pe": {
                        "general": report.pe_general if hasattr(report, 'pe_general') and report.pe_general else None,
                        "lungs": report.pe_lungs if hasattr(report, 'pe_lungs') and report.pe_lungs else None,
                        "heart": report.pe_heart if hasattr(report, 'pe_heart') and report.pe_heart else None,
                        "abdomen": report.pe_abdomen if hasattr(report, 'pe_abdomen') and report.pe_abdomen else None,
                        "neuro": report.pe_neuro if hasattr(report, 'pe_neuro') and report.pe_neuro else None,
                        "extremities": report.pe_extremities if hasattr(report, 'pe_extremities') and report.pe_extremities else None,
                        "notes": report.pe_notes if hasattr(report, 'pe_notes') and report.pe_notes else None,
                    },
                    "assessment": {
                        "working_diagnoses": report.working_diagnoses if hasattr(report, 'working_diagnoses') and report.working_diagnoses else None,
                        "differential_diagnoses": report.differential_diagnoses if hasattr(report, 'differential_diagnoses') and report.differential_diagnoses else None,
                    },
                    "plan": {
                        "tests": report.plan_tests if hasattr(report, 'plan_tests') and report.plan_tests else None,
                        "referrals": report.plan_referrals if hasattr(report, 'plan_referrals') and report.plan_referrals else None,
                        "med_changes": report.plan_med_changes if hasattr(report, 'plan_med_changes') and report.plan_med_changes else None,
                        "lifestyle": report.plan_lifestyle if hasattr(report, 'plan_lifestyle') and report.plan_lifestyle else None,
                        "follow_up": report.plan_follow_up if hasattr(report, 'plan_follow_up') and report.plan_follow_up else None,
                    },
                    "visit_summary": report.visit_summary if hasattr(report, 'visit_summary') and report.visit_summary else None,
                }
                
                return {
                    "id": appointment_id,
                    "appointment_id": appointment_id,
                    "patient_id": str(report.patient_id) if report.patient_id else None,
                    "patient_name": patient_name,
                    "patient_email": patient_email,
                    "patient_phone": patient_phone,
                    "doctor_id": str(report.doctor_id) if report.doctor_id else None,
                    "doctor_name": doctor_name,
                    "doctor_specialty": doctor_specialty,
                    "appointment_date": appointment_date_str,
                    "appointment_time": appointment_time_str,
                    "appointment_datetime": report_datetime.isoformat() if report_datetime else None,
                    "appointment_type": apt_type,
                    "status": "completed",
                    "duration_minutes": 30,
                    "reason": None,
                    "notes": f"Medical report created on {appointment_date_str}",
                    "clinic_name": clinic_name,
                    "clinic_address": clinic_address,
                    "clinic_phone": clinic_phone,
                    "report_content": report_content
                }
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format")
        
        elif appointment_id.startswith("note_"):
            # ClinicalNote without appointment
            note_id_str = appointment_id.replace("note_", "")
            try:
                note_id = UUID(note_id_str)
                note = db.query(ClinicalNote).options(
                    joinedload(ClinicalNote.patient).joinedload(Patient.user),
                    joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
                ).filter(ClinicalNote.id == note_id).first()
                
                if not note:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical note not found")
                
                # Verify doctor is in clinic
                if note.doctor and note.doctor.user:
                    if note.doctor.user.organization_id != clinic_uuid:
                        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Note not accessible")
                
                # Get patient information
                patient_name = "Unknown Patient"
                patient_email = None
                patient_phone = None
                if note.patient and note.patient.user:
                    patient_name = f"{note.patient.user.first_name or ''} {note.patient.user.last_name or ''}".strip() or note.patient.user.email or "Unknown Patient"
                    patient_email = note.patient.user.email
                    patient_phone = note.patient.user.phone if hasattr(note.patient.user, 'phone') else None
                
                # Get doctor information
                doctor_name = "Unknown Doctor"
                doctor_specialty = None
                if note.doctor and note.doctor.user:
                    doctor_name = f"Dr. {note.doctor.user.first_name or ''} {note.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                    doctor_specialty = note.doctor.specialty if hasattr(note.doctor, 'specialty') else None
                
                # Get clinic information
                clinic_name = None
                clinic_address = None
                clinic_phone = None
                try:
                    hospital = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
                    if hospital:
                        clinic_name = hospital.name if hasattr(hospital, 'name') else None
                        clinic_address = hospital.address if hasattr(hospital, 'address') else None
                        clinic_phone = hospital.phone if hasattr(hospital, 'phone') else None
                except Exception as e:
                    print(f"Error fetching hospital info: {e}")
                
                # Format date and time from note date
                note_datetime = note.note_date if note.note_date else (note.created_at if hasattr(note, 'created_at') and note.created_at else datetime.now(timezone.utc))
                appointment_date_str = note_datetime.strftime("%d %B %Y") if note_datetime else ""
                appointment_time_str = note_datetime.strftime("%I:%M %p") if note_datetime else ""
                
                apt_type = note.note_type.replace("_", " ").title() if note.note_type else "Clinical Note"
                
                # Build report content for clinical note
                import json
                report_content = {
                    "note_type": note.note_type if note.note_type else None,
                    "subjective": note.subjective if hasattr(note, 'subjective') and note.subjective else None,
                    "objective": note.objective if hasattr(note, 'objective') and note.objective else None,
                    "assessment": note.assessment if hasattr(note, 'assessment') and note.assessment else None,
                    "plan": note.plan if hasattr(note, 'plan') and note.plan else None,
                    "content": note.content if hasattr(note, 'content') and note.content else None,
                }
                
                # Try to parse template_data if available
                if hasattr(note, 'template_data') and note.template_data:
                    try:
                        if isinstance(note.template_data, str):
                            report_content["template_data"] = json.loads(note.template_data)
                        else:
                            report_content["template_data"] = note.template_data
                    except:
                        report_content["template_data"] = None
                else:
                    report_content["template_data"] = None
                
                return {
                    "id": appointment_id,
                    "appointment_id": appointment_id,
                    "patient_id": str(note.patient_id) if note.patient_id else None,
                    "patient_name": patient_name,
                    "patient_email": patient_email,
                    "patient_phone": patient_phone,
                    "doctor_id": str(note.doctor_id) if note.doctor_id else None,
                    "doctor_name": doctor_name,
                    "doctor_specialty": doctor_specialty,
                    "appointment_date": appointment_date_str,
                    "appointment_time": appointment_time_str,
                    "appointment_datetime": note_datetime.isoformat() if note_datetime else None,
                    "appointment_type": apt_type,
                    "status": "completed",
                    "duration_minutes": 30,
                    "reason": None,
                    "notes": f"Clinical note created on {appointment_date_str}",
                    "clinic_name": clinic_name,
                    "clinic_address": clinic_address,
                    "clinic_phone": clinic_phone,
                    "report_content": report_content
                }
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid note ID format")
        
        elif appointment_id.startswith("lab_report_"):
            # LabReport without appointment
            lab_report_id_str = appointment_id.replace("lab_report_", "")
            try:
                lab_report_id = UUID(lab_report_id_str)
                lab_report = db.query(LabReport).filter(LabReport.id == lab_report_id).first()
                
                if not lab_report:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab report not found")
                
                # Get patient
                patient = None
                if lab_report.patient_id:
                    patient = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == lab_report.patient_id).first()
                
                # Get doctor (from ordered_by if available)
                doctor = None
                if hasattr(lab_report, 'ordered_by') and lab_report.ordered_by:
                    try:
                        doctor_id = UUID(lab_report.ordered_by) if isinstance(lab_report.ordered_by, str) else lab_report.ordered_by
                        doctor = db.query(Doctor).options(joinedload(Doctor.user)).filter(Doctor.id == doctor_id).first()
                    except:
                        pass
                
                # Verify patient belongs to clinic
                # Include report if:
                # 1. Patient exists AND (patient has no user OR patient's organization matches clinic OR patient's organization is None)
                # Since reports were created by doctors in the clinic, we include all reports for existing patients
                if not patient:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
                
                should_include = False
                if not patient.user:
                    # Patient has no user account - likely registered by clinic, include it
                    should_include = True
                elif patient.user.organization_id == clinic_uuid:
                    # Patient belongs to this clinic
                    should_include = True
                elif patient.user.organization_id is None:
                    # Patient has no organization set - likely registered by clinic, include it
                    should_include = True
                
                if not should_include:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Lab report not accessible")
                
                # Get patient information
                patient_name = "Unknown Patient"
                patient_email = None
                patient_phone = None
                if patient and patient.user:
                    patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or patient.user.email or "Unknown Patient"
                    patient_email = patient.user.email
                    patient_phone = patient.user.phone if hasattr(patient.user, 'phone') else None
                elif patient:
                    patient_name = f"Patient {str(patient.patient_id)[:8]}"
                
                # Get doctor information
                doctor_name = "Unknown Doctor"
                doctor_specialty = None
                if doctor and doctor.user:
                    doctor_name = f"Dr. {doctor.user.first_name or ''} {doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                    doctor_specialty = doctor.specialty if hasattr(doctor, 'specialty') else None
                
                # Get clinic information
                clinic_name = None
                clinic_address = None
                clinic_phone = None
                try:
                    hospital = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
                    if hospital:
                        clinic_name = hospital.name if hasattr(hospital, 'name') else None
                        clinic_address = hospital.address if hasattr(hospital, 'address') else None
                        clinic_phone = hospital.phone if hasattr(hospital, 'phone') else None
                except Exception as e:
                    print(f"Error fetching hospital info: {e}")
                
                # Format date and time from lab report date
                report_datetime = lab_report.report_date if lab_report.report_date else (lab_report.created_at if hasattr(lab_report, 'created_at') and lab_report.created_at else datetime.now(timezone.utc))
                appointment_date_str = report_datetime.strftime("%d %B %Y") if report_datetime else ""
                appointment_time_str = report_datetime.strftime("%I:%M %p") if report_datetime else ""
                
                # Build report content for lab report
                report_content = {
                    "title": lab_report.title if hasattr(lab_report, 'title') and lab_report.title else None,
                    "summary": lab_report.summary if hasattr(lab_report, 'summary') and lab_report.summary else None,
                    "metrics": lab_report.metrics if hasattr(lab_report, 'metrics') and lab_report.metrics else None,
                    "attachments": lab_report.attachments if hasattr(lab_report, 'attachments') and lab_report.attachments else None,
                }
                
                # Try to get lab results if available (from LabOrder)
                if lab_report.order_id:
                    from app.common.models.lab_insurance import LabOrder, LabResult
                    lab_order = db.query(LabOrder).filter(LabOrder.id == lab_report.order_id).first()
                    if lab_order:
                        lab_results = db.query(LabResult).filter(LabResult.order_id == lab_order.id).all()
                        if lab_results:
                            report_content["lab_results"] = [
                                {
                                    "test_name": result.test_name if hasattr(result, 'test_name') and result.test_name else None,
                                    "value": result.value if hasattr(result, 'value') and result.value else None,
                                    "unit": result.unit if hasattr(result, 'unit') and result.unit else None,
                                    "reference_range": result.reference_range if hasattr(result, 'reference_range') and result.reference_range else None,
                                    "abnormality": result.abnormality.value if hasattr(result, 'abnormality') and result.abnormality else None,
                                    "interpretation": result.interpretation if hasattr(result, 'interpretation') and result.interpretation else None,
                                    "comments": result.comments if hasattr(result, 'comments') and result.comments else None,
                                }
                                for result in lab_results
                            ]
                
                return {
                    "id": appointment_id,
                    "appointment_id": appointment_id,
                    "patient_id": str(lab_report.patient_id) if lab_report.patient_id else None,
                    "patient_name": patient_name,
                    "patient_email": patient_email,
                    "patient_phone": patient_phone,
                    "doctor_id": str(doctor.id) if doctor else None,
                    "doctor_name": doctor_name,
                    "doctor_specialty": doctor_specialty,
                    "appointment_date": appointment_date_str,
                    "appointment_time": appointment_time_str,
                    "appointment_datetime": report_datetime.isoformat() if report_datetime else None,
                    "appointment_type": "Lab Report",
                    "status": "completed",
                    "duration_minutes": 30,
                    "reason": None,
                    "notes": f"Lab report created on {appointment_date_str}",
                    "clinic_name": clinic_name,
                    "clinic_address": clinic_address,
                    "clinic_phone": clinic_phone,
                    "report_content": report_content
                }
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid lab report ID format")
        
        else:
            # Regular appointment ID (UUID)
            try:
                appointment_uuid = UUID(appointment_id) if isinstance(appointment_id, str) else appointment_id
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid appointment ID format"
                )
            
            # Query appointment from database
            appointment = db.query(Appointment).options(
                joinedload(Appointment.patient).joinedload(Patient.user),
                joinedload(Appointment.doctor).joinedload(Doctor.user)
            ).filter(
                Appointment.id == appointment_uuid,
                Appointment.hospital_id == clinic_uuid
            ).first()
            
            if not appointment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Appointment not found"
                )
            
            # Get patient information
            patient_name = "Unknown Patient"
            patient_email = None
            patient_phone = None
            if appointment.patient and appointment.patient.user:
                patient_name = f"{appointment.patient.user.first_name or ''} {appointment.patient.user.last_name or ''}".strip() or appointment.patient.user.email or "Unknown Patient"
                patient_email = appointment.patient.user.email
                patient_phone = appointment.patient.user.phone if hasattr(appointment.patient.user, 'phone') else None
            
            # Get doctor information
            doctor_name = "Unknown Doctor"
            doctor_specialty = None
            if appointment.doctor and appointment.doctor.user:
                doctor_name = f"Dr. {appointment.doctor.user.first_name or ''} {appointment.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
                doctor_specialty = appointment.doctor.specialty if hasattr(appointment.doctor, 'specialty') else None
            
            # Get clinic information
            clinic_name = None
            clinic_address = None
            clinic_phone = None
            try:
                hospital = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
                if hospital:
                    clinic_name = hospital.name if hasattr(hospital, 'name') else None
                    clinic_address = hospital.address if hasattr(hospital, 'address') else None
                    clinic_phone = hospital.phone if hasattr(hospital, 'phone') else None
            except Exception as e:
                print(f"Error fetching hospital info: {e}")
            
            # Format date and time
            appointment_date_str = appointment.appointment_date.strftime("%d %B %Y") if appointment.appointment_date else ""
            appointment_time_str = appointment.appointment_date.strftime("%I:%M %p") if appointment.appointment_date else ""
            
            # Get appointment type
            apt_type = appointment.appointment_type if hasattr(appointment, 'appointment_type') and appointment.appointment_type else "General Consultation"
            if isinstance(apt_type, str):
                type_map = {
                    "general_consultation": "General Consultation",
                    "follow_up": "Follow-up Visit",
                    "routine_checkup": "Check-up",
                    "emergency": "Emergency Visit",
                    "specialist_consultation": "Specialist Consultation",
                    "procedure": "Procedure"
                }
                apt_type = type_map.get(apt_type.lower(), apt_type.replace("_", " ").title())
            
            return {
                "id": str(appointment.id),
                "appointment_id": str(appointment.id),
                "patient_id": str(appointment.patient_id) if appointment.patient_id else None,
                "patient_name": patient_name,
                "patient_email": patient_email,
                "patient_phone": patient_phone,
                "doctor_id": str(appointment.doctor_id) if appointment.doctor_id else None,
                "doctor_name": doctor_name,
                "doctor_specialty": doctor_specialty,
                "appointment_date": appointment_date_str,
                "appointment_time": appointment_time_str,
                "appointment_datetime": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                "appointment_type": apt_type,
                "status": appointment.status if appointment.status else "pending",
                "duration_minutes": appointment.duration_minutes if hasattr(appointment, 'duration_minutes') else 30,
                "reason": appointment.reason if hasattr(appointment, 'reason') else None,
                "notes": appointment.notes if hasattr(appointment, 'notes') else None,
                "clinic_name": clinic_name,
                "clinic_address": clinic_address,
                "clinic_phone": clinic_phone
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching appointment details: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve appointment details: {str(e)}"
        )

@router.post("/appointments/{appointment_id}/mark-arrived", status_code=status.HTTP_200_OK)
async def mark_patient_arrived(
    appointment_id: str = Path(..., description="Appointment ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
):
    """Mark a patient as arrived for their appointment."""
    try:
        from uuid import UUID
        from app.common.models.appointment import Appointment
        from app.common.models.hospital import Hospital
        from sqlalchemy.orm import joinedload
        
        # Get clinic ID from current user
        clinic_uuid = None
        try:
            if current_user.clinic_id:
                clinic_uuid = UUID(str(current_user.clinic_id)) if isinstance(current_user.clinic_id, str) else current_user.clinic_id
        except (ValueError, TypeError):
            # Fallback to user's organization_id if clinic_id is invalid
            from app.common.models.user import User
            user = db.query(User).filter(User.id == current_user.user_id).first()
            if user and user.organization_id:
                try:
                    clinic_uuid = UUID(str(user.organization_id)) if isinstance(user.organization_id, str) else user.organization_id
                except (ValueError, TypeError):
                    pass
        
        if not clinic_uuid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid clinic ID format"
            )
        
        # Convert appointment_id to UUID if needed
        try:
            appointment_uuid = UUID(appointment_id) if isinstance(appointment_id, str) else appointment_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format"
            )
        
        # Get appointment from database and verify it belongs to the clinic
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_uuid,
            Appointment.hospital_id == clinic_uuid
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or does not belong to this clinic"
            )
        
        # Check current status
        current_status = appointment.status or ""
        if current_status.lower() == "arrived":
            return {
                "message": "Patient already marked as arrived",
                "appointment_id": appointment_id,
                "status": "arrived"
            }
        
        if current_status.lower() in ["cancelled", "noshow", "entered-in-error"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark patient as arrived. Appointment is {current_status}"
            )
        
        # Update appointment status to "arrived"
        appointment.status = "arrived"
        appointment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(appointment)
        
        return {
            "message": "Patient marked as arrived successfully",
            "appointment_id": appointment_id,
            "status": "arrived"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark patient as arrived: {str(e)}"
        )

@router.get("/tasks", response_model=List[Task])
async def get_tasks(
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[str] = Query(None, description="Filter by priority: low|medium|high"),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Get reception tasks with filtering from database."""
    from app.crud.todo import TodoPriority
    
    # Convert string priority to enum if provided
    priority_enum = None
    if priority:
        try:
            priority_enum = TodoPriority(priority.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority: {priority}. Must be one of: low, medium, high, urgent"
            )
    
    # Get todos from database
    todos = todo_crud.get_todos_by_user(
        db=db,
        user_id=str(current_user.user_id),
        completed=completed,
        priority=priority_enum,
        limit=limit
    )
    
    # Convert Todo model to Task schema
    tasks = []
    for todo in todos:
        tasks.append(Task(
            id=str(todo.id),
            task=todo.description,
            completed=todo.completed,
            priority=todo.priority.lower() if todo.priority else "medium",
            due_date=todo.due_date.isoformat() if todo.due_date else None,
            created_at=todo.created_at.isoformat() if todo.created_at else datetime.now().isoformat()
        ))
    
    # Sort by priority and creation time
    priority_order = {"high": 0, "medium": 1, "low": 2, "urgent": -1}
    tasks.sort(key=lambda x: (x.completed, priority_order.get(x.priority, 3), x.created_at), reverse=True)
    
    return tasks[:limit]

class TaskCreate(BaseModel):
    task: str = Field(..., min_length=5, max_length=200)
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    due_date: Optional[str] = None

@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Create a new reception task in database."""
    # Parse due_date if provided
    due_date_dt = None
    if task_data.due_date:
        try:
            due_date_dt = datetime.fromisoformat(task_data.due_date.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            try:
                due_date_dt = datetime.strptime(task_data.due_date, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid due_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
    
    # Generate task ID
    task_id = f"task-{uuid4().hex[:8]}"
    
    # Create todo in database (category is optional, may not exist in DB)
    todo_data = {
        "id": task_id,
        "description": task_data.task,
        "created_by": str(current_user.user_id),
        "assigned_to": str(current_user.user_id),
        "priority": task_data.priority,
        "due_date": due_date_dt,
        "completed": False,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    # Only add category if the column exists (it's optional in the model)
    # We'll skip it for now since the DB schema doesn't have it
    
    todo = todo_crud.create(db=db, obj_in=todo_data)
    
    # Convert to Task schema
    return Task(
        id=str(todo.id),
        task=todo.description,
        completed=todo.completed,
        priority=todo.priority.lower() if todo.priority else "medium",
        due_date=todo.due_date.isoformat() if todo.due_date else None,
        created_at=todo.created_at.isoformat() if todo.created_at else datetime.now().isoformat()
    )

class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    due_date: Optional[str] = None

@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Update a task in database."""
    # Get the todo from database
    todo = db.query(TodoModel).filter(
        TodoModel.id == task_id
    ).first()
    
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Check if user has permission (created by or assigned to)
    if str(todo.created_by) != str(current_user.user_id) and str(todo.assigned_to) != str(current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this task"
        )
    
    # Update completion status if provided
    if updates.completed is not None:
        todo = todo_crud.toggle_todo(
            db=db,
            todo_id=task_id,
            user_id=str(current_user.user_id),
            completed=updates.completed
        )
    
    # Update priority if provided
    if updates.priority is not None:
        from app.crud.todo import TodoPriority
        try:
            priority_enum = TodoPriority(updates.priority.lower())
            todo.priority = priority_enum.value
            db.commit()
            db.refresh(todo)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority: {updates.priority}"
            )
    
    # Update due_date if provided
    if updates.due_date is not None:
        try:
            due_date_dt = datetime.fromisoformat(updates.due_date.replace('Z', '+00:00'))
            todo.due_date = due_date_dt
            db.commit()
            db.refresh(todo)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid due_date format"
            )
    
    # Convert to Task schema
    return Task(
        id=str(todo.id),
        task=todo.description,
        completed=todo.completed,
        priority=todo.priority.lower() if todo.priority else "medium",
        due_date=todo.due_date.isoformat() if todo.due_date else None,
        created_at=todo.created_at.isoformat() if todo.created_at else datetime.now().isoformat()
    )

@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Delete a task from database."""
    success = todo_crud.delete_todo(
        db=db,
        todo_id=task_id,
        user_id=str(current_user.user_id)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you don't have permission to delete it"
        )

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    unread_only: bool = Query(False),
    type_filter: Optional[str] = Query(None, description="Filter by type: info|warning|urgent|success"),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Get notifications with filtering."""
    notifications = _generate_system_notifications(db=db, user_id=str(current_user.user_id))
    notifications.extend(_NOTIFICATIONS.values())
    
    # Apply filters
    if unread_only:
        notifications = [n for n in notifications if not n.read]
    
    if type_filter:
        notifications = [n for n in notifications if n.type == type_filter]
    
    # Sort by time (newest first)
    notifications.sort(key=lambda x: x.time, reverse=True)
    
    return notifications[:limit]

@router.post("/notifications/{notification_id}/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: str,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Mark a notification as read."""
    if notification_id in _NOTIFICATIONS:
        _NOTIFICATIONS[notification_id].read = True

@router.post("/notifications/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Mark all notifications as read."""
    for notification in _NOTIFICATIONS.values():
        notification.read = True

class NotificationCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=200)
    type: str = Field("info", pattern="^(info|warning|urgent|success)$")
    action_required: bool = False

@router.post("/notifications", response_model=Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Create a new notification."""
    notification_id = f"notif-{uuid4().hex[:8]}"
    
    notification = Notification(
        id=notification_id,
        message=notification_data.message,
        time=datetime.now().isoformat(),
        type=notification_data.type,
        action_required=notification_data.action_required
    )
    
    _NOTIFICATIONS[notification_id] = notification
    return notification

@router.get("/quick-actions", response_model=Dict[str, Any])
async def get_quick_actions_data(
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db),
):
    """Get data needed for quick action buttons."""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Count pending tasks from database
    try:
        pending_todos = todo_crud.get_pending_todos(db=db, user_id=str(current_user.user_id))
        pending_tasks = len(pending_todos)
    except Exception as e:
        print(f"Warning: Could not count pending tasks: {e}")
        pending_tasks = 0
    
    # Count unread notifications
    try:
        notifications = _generate_system_notifications(db=db, user_id=str(current_user.user_id))
    except Exception:
        notifications = _generate_system_notifications()
    notifications.extend(_NOTIFICATIONS.values())
    unread_notifications = len([n for n in notifications if not n.read])
    
    # Count today's appointments
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    today_appointments = len([b for b in bundles 
                            if b["entry"] and b["entry"][0]["resource"]["start"][:10] == today])
    
    # Get recent walk-ins
    recent_walk_ins = len([b for b in bundles 
                         if b["entry"] and 
                         b["entry"][0]["resource"]["start"][:10] == today and
                         b.get("timestamp", "")[:10] == today])
    
    return {
        "pending_tasks": pending_tasks,
        "unread_notifications": unread_notifications,
        "today_appointments": today_appointments,
        "recent_walk_ins": recent_walk_ins,
        "actions": [
            {
                "id": "call_patient",
                "label": "Call Patient",
                "icon": "phone",
                "enabled": today_appointments > 0
            },
            {
                "id": "register_walkin",
                "label": "Register Walk-In",
                "icon": "user-plus",
                "enabled": True
            },
            {
                "id": "print_reports",
                "label": "Print Reports",
                "icon": "printer",
                "enabled": True
            },
            {
                "id": "schedule_appointment",
                "label": "Schedule Appointment",
                "icon": "calendar",
                "enabled": True
            }
        ]
    }

@router.get("/overview", response_model=QuickOverview)
async def get_quick_overview(
    date_filter: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Get quick overview statistics."""
    target_date = date_filter or datetime.now().strftime("%Y-%m-%d")
    
    bundles = fhir_repo.list_bundles(resource_type="Appointment")
    total_today = 0
    completed = 0
    
    for bundle in bundles:
        apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
        if not apt_res or apt_res["start"][:10] != target_date:
            continue
        
        total_today += 1
        status = _reverse_appointment_status(apt_res["status"])
        
        if status in ["completed", "checked-in"]:
            completed += 1
    
    pending = total_today - completed
    completion_rate = (completed / total_today * 100) if total_today > 0 else 0
    
    return QuickOverview(
        total_today=total_today,
        completed=completed,
        pending=pending,
        completion_rate=round(completion_rate, 1)
    )

@router.get("/activity-feed", response_model=List[Dict[str, Any]])
async def get_activity_feed(
    limit: int = Query(10, ge=1, le=50),
    hours_back: int = Query(24, ge=1, le=168),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    db: Session = Depends(get_db)
):
    """Get recent activity feed for dashboard from real user activity logs."""
    cutoff_time = datetime.now() - timedelta(hours=hours_back)
    activities = []
    
    # Get real user activity logs from AdminActivity table
    from app.crud.admin import admin as admin_crud
    
    try:
        # Get activities for this specific user
        user_activities = admin_crud.get_activity_logs(
            db=db,
            admin_id=str(current_user.user_id),
            date_from=cutoff_time,
            limit=limit
        )
        
        for activity in user_activities:
            # Format the activity for display
            activity_type = activity.activity_type.value if activity.activity_type else "unknown"
            action = activity.action or "Activity performed"
            
            # Skip activities that show 0 results or are not reception-relevant
            if ("Retrieved 0" in action or "0 " in action or 
                activity_type in ["LOGIN", "LOGOUT"] or
                "dashboard" in action.lower()):
                continue
            
            # Create user-friendly messages for reception activities
            message = _format_reception_activity_message(activity_type, action, activity.resource_type)
            
            # Determine activity icon and type
            icon, activity_display_type = _get_activity_icon_and_type(activity_type, action)
            
            activities.append({
                "id": f"activity-{activity.id}",
                "type": activity_display_type,
                "icon": icon,
                "message": message,
                "time": activity.performed_at.isoformat() if activity.performed_at else datetime.now().isoformat(),
                "details": {
                    "activity_type": activity_type,
                    "resource_type": activity.resource_type,
                    "ip_address": activity.ip_address,
                    "status": activity.status
                }
            })
            
            # Stop if we have enough activities
            if len(activities) >= limit:
                break
        
        # If no real activities, show helpful reception activities
        if not activities:
            activities = _get_default_reception_activities()
            # Get recent appointments
            bundles = fhir_repo.list_bundles(resource_type="Appointment")
            for bundle in bundles:
                apt_res = bundle["entry"][0]["resource"] if bundle["entry"] else None
                if not apt_res:
                    continue
                
                created_time = datetime.fromisoformat(bundle.get("timestamp", "").replace('Z', '+00:00'))
                if created_time < cutoff_time:
                    continue
                
                # Resolve patient name
                participants = apt_res.get("participant", [])
                patient_ref = next((p["actor"]["reference"] for p in participants 
                                  if p["actor"]["reference"].startswith("Patient/")), "Patient/unknown")
                patient_name = await _resolve_patient_name(patient_ref)
                
                activities.append({
                    "id": f"apt-{apt_res['id']}",
                    "type": "appointment_created",
                    "message": f"New appointment scheduled for {patient_name}",
                    "time": created_time.isoformat(),
                    "details": {
                        "patient": patient_name,
                        "date": apt_res["start"][:10],
                        "time": apt_res["start"][11:16]
                    }
                })
        
        # Sort by time (newest first)
        activities.sort(key=lambda x: x["time"], reverse=True)
        
        return activities[:limit]
        
    except Exception as e:
        # Fallback to default activities if there's an error
        return _get_default_reception_activities()

def _format_reception_activity_message(activity_type: str, action: str, resource_type: str = None) -> str:
    """Format activity messages for reception context."""
    if "PATIENT" in activity_type:
        if "READ" in activity_type:
            return f"Viewed patient information"
        elif "WRITE" in activity_type or "CREATE" in activity_type:
            return f"Registered new patient"
        elif "UPDATE" in activity_type:
            return f"Updated patient information"
    elif "APPOINTMENT" in activity_type:
        if "READ" in activity_type:
            return f"Viewed appointment schedule"
        elif "WRITE" in activity_type or "CREATE" in activity_type:
            return f"Scheduled new appointment"
        elif "UPDATE" in activity_type:
            return f"Updated appointment details"
    elif "RECEPTION" in activity_type:
        return f"Accessed reception dashboard"
    elif "MESSAGE" in activity_type:
        return f"Sent message to patient"
    
    # Fallback to original action
    return action

def _get_activity_icon_and_type(activity_type: str, action: str) -> tuple:
    """Get appropriate icon and display type for activity."""
    if "PATIENT" in activity_type:
        if "CREATE" in activity_type or "WRITE" in activity_type:
            return "user-plus", "success"
        elif "READ" in activity_type:
            return "user", "info"
        elif "UPDATE" in activity_type:
            return "user-edit", "warning"
    elif "APPOINTMENT" in activity_type:
        if "CREATE" in activity_type or "WRITE" in activity_type:
            return "calendar-plus", "success"
        elif "READ" in activity_type:
            return "calendar", "info"
        elif "UPDATE" in activity_type:
            return "calendar-edit", "warning"
    elif "MESSAGE" in activity_type:
        return "message-circle", "info"
    elif "RECEPTION" in activity_type:
        return "monitor", "info"
    
    return "activity", "info"

def _get_default_reception_activities() -> List[Dict[str, Any]]:
    """Get default activities when no real activities are found."""
    return [
        {
            "id": "welcome-1",
            "type": "info",
            "icon": "user-plus",
            "message": "Welcome to the reception portal! Start by registering new patients.",
            "time": datetime.now().isoformat(),
            "details": {
                "activity_type": "welcome",
                "resource_type": "system",
                "status": "info"
            }
        },
        {
            "id": "welcome-2", 
            "type": "info",
            "icon": "calendar",
            "message": "Schedule appointments and manage the daily calendar.",
            "time": (datetime.now() - timedelta(minutes=5)).isoformat(),
            "details": {
                "activity_type": "welcome",
                "resource_type": "system", 
                "status": "info"
            }
        },
        {
            "id": "welcome-3",
            "type": "info", 
            "icon": "message-circle",
            "message": "Send messages and notifications to patients.",
            "time": (datetime.now() - timedelta(minutes=10)).isoformat(),
            "details": {
                "activity_type": "welcome",
                "resource_type": "system",
                "status": "info"
            }
        }
    ]