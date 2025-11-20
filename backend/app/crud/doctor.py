# app/crud/doctor_portal.py
"""CRUD operations for Doctor Portal functionality."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from datetime import datetime, date, timedelta
import uuid

from app.crud.base import CRUDBase
from app.crud.user import user as user_crud
from app.crud.appointment import appointment as appointment_crud
from app.crud.prescription import prescription as prescription_crud
from app.common.models.user import User, UserRole
from app.common.models.doctor import Doctor, DoctorScheduleTemplate, DoctorScheduleException, ClinicalNote
from app.common.models.patient import Patient
from app.common.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.common.models.prescription import Prescription, PrescriptionStatus
from datetime import timezone


class CRUDPatients:
    """CRUD operations for patient management in doctor portal."""
    
    def get_all_patients(
        self,
        db: Session,
        *,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100,
        search_term: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all patients seen by a doctor (by appointments/prescriptions)."""
        # Base query: patients with appointment or prescription with this doctor
        query = db.query(Patient).join(
            Doctor, isouter=True
        )
        # Patients linked via appointments
        query = db.query(Patient).join(Appointment, Appointment.patient_id == Patient.patient_id).filter(
            Appointment.doctor_id == doctor_id
        )
        if search_term:
            like = f"%{search_term}%"
            query = query.filter(
                or_(
                    func.lower(Patient.first_name).like(func.lower(like)),
                    func.lower(Patient.last_name).like(func.lower(like)),
                    func.lower(Patient.phone).like(func.lower(like)),
                )
            )
        patients = query.distinct().order_by(desc(Patient.created_at)).offset(skip).limit(limit).all()
        return [
            {
                "id": str(p.id),
                "full_name": f"{p.first_name} {p.last_name}".strip(),
                "phone": p.phone,
                "email": p.email,
                "date_of_birth": p.date_of_birth.isoformat() if getattr(p, "date_of_birth", None) else None,
                "gender": getattr(p, "gender", None).value if getattr(p, "gender", None) else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in patients
        ]
    
    def get_patient_by_id(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get patient details by ID if accessible by doctor."""
        # Ensure the doctor has at least one appointment or prescription with this patient
        has_rel = db.query(Appointment).filter(
            and_(Appointment.patient_id == patient_id, Appointment.doctor_id == doctor_id)
        ).first()
        if not has_rel:
            return None
        p: Optional[Patient] = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not p:
            return None
        return {
            "id": str(p.id),
            "first_name": p.first_name,
            "last_name": p.last_name,
            "full_name": f"{p.first_name} {p.last_name}".strip(),
            "email": p.email,
            "phone": p.phone,
            "gender": getattr(p, "gender", None).value if getattr(p, "gender", None) else None,
            "date_of_birth": p.date_of_birth.isoformat() if getattr(p, "date_of_birth", None) else None,
            "address": getattr(p, "address", None),
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
    
    def get_patient_reports(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get clinical notes for a patient by this doctor."""
        rows = db.query(ClinicalNote).filter(
            and_(ClinicalNote.patient_id == patient_id, ClinicalNote.doctor_id == doctor_id)
        ).order_by(desc(ClinicalNote.note_date)).offset(skip).limit(limit).all()
        return [
            {
                "id": str(n.id),
                "note_type": n.note_type,
                "note_date": n.note_date.isoformat() if n.note_date else None,
                "subjective": n.subjective,
                "objective": n.objective,
                "assessment": n.assessment,
                "plan": n.plan,
            }
            for n in rows
        ]
    
    def get_patient_prescriptions(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get prescriptions for a patient written by this doctor."""
        rows = prescription_crud.list_by_patient(db, patient_id=patient_id, skip=skip, limit=limit)
        return [
            {
                "id": str(p.id),
                "patient_id": str(p.patient_id),
                "medication_name": p.medicine_name,
                "dosage": p.dosage,
                "frequency": p.frequency,
                "duration": p.duration,
                "status": p.status.value if p.status else None,
                "prescribed_date": p.prescribed_date.isoformat() if p.prescribed_date else None,
            }
            for p in rows if str(p.doctor_id) == doctor_id
        ]


class CRUDAppointments:
    """CRUD operations for appointment management."""
    
    def get_all_appointments(
        self,
        db: Session,
        *,
        doctor_id: str,
        status: Optional[str] = None,
        date: Optional[str] = None,
        patient_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        start = None
        if date:
            try:
                start = datetime.fromisoformat(date)
            except Exception:
                start = None
        appts = appointment_crud.get_by_doctor(
            db,
            doctor_id=doctor_id,
            skip=skip,
            limit=limit,
            status=status,
            date_from=start.isoformat() if start else None,
            date_to=None,
        )
        return [
            {
                "id": str(a.id),
                "patient_id": str(a.patient_id),
                "appointment_date": a.appointment_date.isoformat() if a.appointment_date else None,
                "start_time": a.start_time.isoformat() if a.start_time else None,
                "status": a.status.value if a.status else None,
                "minutes_duration": a.minutes_duration,
            }
            for a in appts
        ]
    
    def get_appointment_by_id(
        self,
        db: Session,
        *,
        appointment_id: str,
        doctor_id: str
    ) -> Optional[Dict[str, Any]]:
        a = db.query(Appointment).filter(
            and_(Appointment.id == appointment_id, Appointment.doctor_id == doctor_id)
        ).first()
        if not a:
            return None
        return {
            "id": str(a.id),
            "patient_id": str(a.patient_id),
            "appointment_date": a.appointment_date.isoformat() if a.appointment_date else None,
            "start_time": a.start_time.isoformat() if a.start_time else None,
            "status": a.status.value if a.status else None,
            "minutes_duration": a.minutes_duration,
        }
    
    def create_appointment(
        self,
        db: Session,
        *,
        doctor_id: str,
        appointment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Map incoming data to Appointment fields
        a = Appointment(
            patient_id=appointment_data.get("patient_id"),
            doctor_id=doctor_id,
            hospital_id=appointment_data.get("clinic_id"),
            appointment_date=datetime.fromisoformat(appointment_data["appointment_date"]).date() if appointment_data.get("appointment_date") else None,
            start_time=datetime.fromisoformat(appointment_data["appointment_time"]) if appointment_data.get("appointment_time") else None,
            appointment_type=AppointmentType(appointment_data["appointment_type"]) if appointment_data.get("appointment_type") else AppointmentType.GENERAL_CONSULTATION,
            status=AppointmentStatus.PENDING,
            minutes_duration=appointment_data.get("minutes_duration") or 30,
            description=appointment_data.get("notes"),
            created_by=doctor_id,
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        return {
            "id": str(a.id),
            "patient_id": str(a.patient_id),
            "date": a.appointment_date.isoformat() if a.appointment_date else None,
            "time": a.start_time.isoformat() if a.start_time else None,
            "status": a.status.value if a.status else None,
        }
    
    def update_appointment(
        self,
        db: Session,
        *,
        appointment_id: str,
        doctor_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        a = db.query(Appointment).filter(
            and_(Appointment.id == appointment_id, Appointment.doctor_id == doctor_id)
        ).first()
        if not a:
            return None
        data: Dict[str, Any] = {}
        if update_data.get("appointment_date"):
            data["appointment_date"] = datetime.fromisoformat(update_data["appointment_date"]).date()
        if update_data.get("appointment_time"):
            data["start_time"] = datetime.fromisoformat(update_data["appointment_time"])
        if update_data.get("appointment_type"):
            try:
                data["appointment_type"] = AppointmentType(update_data["appointment_type"]) 
            except Exception:
                pass
        if update_data.get("status"):
            try:
                data["status"] = AppointmentStatus(update_data["status"])
            except Exception:
                pass
        if update_data.get("notes") is not None:
            data["description"] = update_data.get("notes")
        updated = appointment_crud.update(db=db, db_obj=a, obj_in=data)
        return {
            "id": str(updated.id),
            "patient_id": str(updated.patient_id),
            "appointment_date": updated.appointment_date.isoformat() if updated.appointment_date else None,
            "start_time": updated.start_time.isoformat() if updated.start_time else None,
            "status": updated.status.value if updated.status else None,
            "minutes_duration": updated.minutes_duration,
        }
    
    def update_appointment_status(
        self,
        db: Session,
        *,
        appointment_id: str,
        doctor_id: str,
        status: str,
        notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        status_enum = None
        try:
            status_enum = AppointmentStatus(status)
        except Exception:
            return None
        updated = appointment_crud.update_appointment_status(
            db,
            appointment_id=appointment_id,
            status=status_enum,
            notes=notes,
        )
        if not updated:
            return None
        return {
            "id": str(updated.id),
            "status": updated.status.value if updated.status else None,
            "completed_at": updated.completed_at.isoformat() if getattr(updated, "completed_at", None) else None,
            "cancelled_at": updated.cancelled_at.isoformat() if getattr(updated, "cancelled_at", None) else None,
        }
    
    def delete_appointment(
        self,
        db: Session,
        *,
        appointment_id: str,
        doctor_id: str
    ) -> bool:
        a = db.query(Appointment).filter(
            and_(Appointment.id == appointment_id, Appointment.doctor_id == doctor_id)
        ).first()
        if not a:
            return False
        db.delete(a)
        db.commit()
        return True
    
    def get_appointments_by_date(
        self,
        db: Session,
        *,
        doctor_id: str,
        appointment_date: str
    ) -> List[Dict[str, Any]]:
        """Get all appointments for a specific date."""
        start = datetime.fromisoformat(appointment_date)
        appts = appointment_crud.get_by_doctor(
            db,
            doctor_id=doctor_id,
            date_from=start.isoformat(),
            date_to=start.isoformat(),
        )
        return [
            {
                "id": str(a.id),
                "patient_id": str(a.patient_id),
                "appointment_date": a.appointment_date.isoformat() if a.appointment_date else None,
                "start_time": a.start_time.isoformat() if a.start_time else None,
                "status": a.status.value if a.status else None,
                "minutes_duration": a.minutes_duration,
            }
            for a in appts
        ]
    
    def get_appointment_stats(
        self,
        db: Session,
        *,
        doctor_id: str
    ) -> Dict[str, Any]:
        """Get appointment statistics for dashboard."""
        from app.common.models.appointment import Appointment
        total_appointments = appointment_crud.count_by_doctor(db, doctor_id=doctor_id)
        pending_appointments = appointment_crud.count_by_doctor(db, doctor_id=doctor_id, status=AppointmentStatus.PENDING)
        upcoming_appointments = appointment_crud.count_upcoming_by_doctor(db, doctor_id=doctor_id)
        completed_appointments = appointment_crud.count_completed_by_doctor(db, doctor_id=doctor_id)
        today_appointments = appointment_crud.count_today_by_doctor(db, doctor_id=doctor_id)
        return {
            "total_appointments": total_appointments,
            "pending_appointments": pending_appointments,
            "upcoming_appointments": upcoming_appointments,
            "completed_appointments": completed_appointments,
            "today_appointments": today_appointments,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }


class CRUDReports:
    """CRUD operations for clinical notes as doctor reports."""
    
    def create_report(
        self,
        db: Session,
        *,
        doctor_id: str,
        report_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        n = ClinicalNote(
            patient_id=report_data.get("patient_id"),
            doctor_id=doctor_id,
            note_type=report_data.get("note_type", "consultation"),
            note_date=datetime.now(timezone.utc),
            subjective=report_data.get("subjective"),
            objective=report_data.get("objective"),
            assessment=report_data.get("assessment"),
            plan=report_data.get("plan"),
            content=report_data.get("content"),
            is_draft=bool(report_data.get("is_draft", True)),
            created_by=report_data.get("created_by") or doctor_id,
        )
        db.add(n)
        db.commit()
        db.refresh(n)
        return {"id": str(n.id), "note_type": n.note_type, "note_date": n.note_date.isoformat()}
    
    def get_report_by_id(
        self,
        db: Session,
        *,
        report_id: str,
        doctor_id: str
    ) -> Optional[Dict[str, Any]]:
        n = db.query(ClinicalNote).filter(and_(ClinicalNote.id == report_id, ClinicalNote.doctor_id == doctor_id)).first()
        if not n:
            return None
        return {
            "id": str(n.id),
            "note_type": n.note_type,
            "note_date": n.note_date.isoformat() if n.note_date else None,
            "subjective": n.subjective,
            "objective": n.objective,
            "assessment": n.assessment,
            "plan": n.plan,
            "content": n.content,
        }
    
    def delete_report(
        self,
        db: Session,
        *,
        report_id: str,
        doctor_id: str
    ) -> bool:
        n = db.query(ClinicalNote).filter(and_(ClinicalNote.id == report_id, ClinicalNote.doctor_id == doctor_id)).first()
        if not n:
            return False
        db.delete(n)
        db.commit()
        return True
    
    def list_reports(
        self,
        db: Session,
        *,
        doctor_id: str,
        patient_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        q = db.query(ClinicalNote).filter(ClinicalNote.doctor_id == doctor_id)
        if patient_id:
            q = q.filter(ClinicalNote.patient_id == patient_id)
        rows = q.order_by(desc(ClinicalNote.note_date)).offset(skip).limit(limit).all()
        return [
            {"id": str(n.id), "note_type": n.note_type, "note_date": n.note_date.isoformat() if n.note_date else None}
            for n in rows
        ]


class CRUDPrescriptions:
    """CRUD operations for prescriptions."""
    
    def create_prescription(
        self,
        db: Session,
        *,
        doctor_id: str,
        patient_id: str,
        hospital_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        p = prescription_crud.create_prescription(
            db,
            patient_id=patient_id,
            doctor_id=doctor_id,
            hospital_id=hospital_id,
            medicine_name=data.get("medicine_name"),
            dosage=data.get("dosage"),
            frequency=data.get("frequency"),
            duration=data.get("duration"),
            notes=data.get("notes"),
            intent=data.get("intent"),
            priority=data.get("priority"),
        )
        return {
            "id": str(p.id),
            "patient_id": str(p.patient_id),
            "medicine_name": p.medicine_name,
            "dosage": p.dosage,
            "frequency": p.frequency,
            "status": p.status.value if p.status else None,
            "prescribed_date": p.prescribed_date.isoformat() if p.prescribed_date else None,
        }
    
    def update_prescription_status(
        self,
        db: Session,
        *,
        prescription_id: str,
        doctor_id: str,
        status: str,
        reason: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            status_enum = PrescriptionStatus(status)
        except Exception:
            return None
        updated = prescription_crud.update_status(
            db,
            prescription_id=prescription_id,
            status=status_enum,
            status_reason=reason,
            cancelled_by=doctor_id if status_enum == PrescriptionStatus.CANCELLED else None,
        )
        if not updated:
            return None
        return {
            "id": str(updated.id),
            "status": updated.status.value if updated.status else None,
            "cancelled_at": updated.cancelled_at.isoformat() if getattr(updated, "cancelled_at", None) else None,
        }
    
    def delete_prescription(
        self,
        db: Session,
        *,
        prescription_id: str,
        doctor_id: str
    ) -> bool:
        return prescription_crud.delete_prescription(db, prescription_id=prescription_id)
    
    def get_prescriptions_by_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        rows = prescription_crud.list_by_patient(db, patient_id=patient_id, skip=skip, limit=limit)
        return [
            {
                "id": str(p.id),
                "patient_id": str(p.patient_id),
                "medicine_name": p.medicine_name,
                "dosage": p.dosage,
                "frequency": p.frequency,
                "status": p.status.value if p.status else None,
                "prescribed_date": p.prescribed_date.isoformat() if p.prescribed_date else None,
            }
            for p in rows if str(p.doctor_id) == doctor_id
        ]


class CRUDDoctorPortal:
    """Main CRUD class for doctor portal operations."""
    
    def __init__(self):
        self.patients = CRUDPatients()
        self.appointments = CRUDAppointments()
        self.reports = CRUDReports()
        self.prescriptions = CRUDPrescriptions()
        self.user = user_crud
    
    def get_doctor_stats(
        self,
        db: Session,
        *,
        doctor_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive doctor statistics (DB-backed)."""
        from app.common.models.appointment import Appointment
        from app.common.models.prescription import Prescription
        today = datetime.now(timezone.utc).date()
        appt_today = appointment_crud.count_today_by_doctor(db, doctor_id=doctor_id)
        upcoming = appointment_crud.count_upcoming_by_doctor(db, doctor_id=doctor_id)
        completed_today = appointment_crud.count_completed_today_by_doctor(db, doctor_id=doctor_id)
        total_prescriptions = db.query(Prescription).filter(Prescription.doctor_id == doctor_id).count()
        total_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(Appointment.doctor_id == doctor_id).scalar() or 0
        return {
            "appointments_today": appt_today,
            "upcoming_appointments": upcoming,
            "completed_appointments": completed_today,
            "prescriptions_written": total_prescriptions,
            "patients_seen": total_patients,
            "tasks_pending": 0,
            "unread_messages": 0,
        }
    
    def get_doctor_dashboard_summary(
        self,
        db: Session,
        *,
        doctor_id: str
    ) -> Dict[str, Any]:
        stats = self.get_doctor_stats(db, doctor_id=doctor_id)
        summary = {
            "overview": {
                "patients_seen": stats["patients_seen"],
                "appointments_today": stats["appointments_today"],
                "prescriptions_written": stats["prescriptions_written"],
                "tasks_pending": stats["tasks_pending"],
                "unread_messages": stats["unread_messages"],
            },
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        return summary
    
    def search_patients(
        self,
        db: Session,
        *,
        doctor_id: str,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search patients by name, ID, or phone."""
        # Would implement actual search logic
        return []
    
    def get_schedule(
        self,
        db: Session,
        *,
        doctor_id: str,
        date_from: date,
        date_to: date
    ) -> List[Dict[str, Any]]:
        """Get doctor's schedule for date range."""
        # Would fetch from schedule tables
        return []
    
    def update_schedule(
        self,
        db: Session,
        *,
        doctor_id: str,
        schedule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update doctor's schedule."""
        # Would update schedule templates
        return schedule_data
    
    def add_schedule_exception(
        self,
        db: Session,
        *,
        doctor_id: str,
        exception_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add schedule exception (leave, holiday, etc)."""
        # Would create DoctorScheduleException
        return exception_data


# Create singleton instance
doctor_portal = CRUDDoctorPortal()