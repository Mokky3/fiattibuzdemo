"""Appointment CRUD operations
Connected to appointment models and database operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.common.models.appointment import (
    Appointment, AppointmentStatus, AppointmentType,
    AppointmentParticipant
)
from app.common.schemas.appointment_enhanced import RecurrenceType
from app.common.models.user import User, UserRole
from app.common.models.patient import Patient
from app.common.models.doctor import Doctor
from app.common.models.nurse import Nurse, NursePatientAssignment
from app.crud.base import CRUDBase
from pydantic import BaseModel

# Simple TimeSlot class for appointment scheduling
class TimeSlot:
    def __init__(self, start_time: datetime, end_time: datetime):
        self.start_time = start_time
        self.end_time = end_time

# ──────────────────────────────────────────────────────────────────────────────
# Appointment CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDAppointment(CRUDBase[Appointment, BaseModel, BaseModel]):
     # ---- Route wrapper methods (clinic) ----
    def get_by_clinic(
        self,
        db: Session,
        *,
        clinic_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> List[Appointment]:
        query = db.query(Appointment).filter(Appointment.hospital_id == clinic_id)
        if status:
            try:
                query = query.filter(Appointment.status == AppointmentStatus(status))
            except Exception:
                pass
        if date_from:
            try:
                if isinstance(date_from, str):
                    date_from_obj = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
                else:
                    date_from_obj = date_from
                query = query.filter(Appointment.appointment_date >= date_from_obj)
            except Exception:
                pass
        if date_to:
            try:
                if isinstance(date_to, str):
                    # Add end of day for date_to
                    date_to_obj = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                else:
                    date_to_obj = date_to
                query = query.filter(Appointment.appointment_date <= date_to_obj)
            except Exception:
                pass
        return query.order_by(asc(Appointment.appointment_date)).offset(skip).limit(limit).all()

    def count_by_clinic(
        self,
        db: Session,
        *,
        clinic_id: str,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> int:
        query = db.query(Appointment).filter(Appointment.hospital_id == clinic_id)
        if status:
            try:
                query = query.filter(Appointment.status == AppointmentStatus(status))
            except Exception:
                pass
        if date_from:
            try:
                if isinstance(date_from, str):
                    date_from_obj = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
                else:
                    date_from_obj = date_from
                query = query.filter(Appointment.appointment_date >= date_from_obj)
            except Exception:
                pass
        if date_to:
            try:
                if isinstance(date_to, str):
                    # Add end of day for date_to
                    date_to_obj = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                else:
                    date_to_obj = date_to
                query = query.filter(Appointment.appointment_date <= date_to_obj)
            except Exception:
                pass
        return query.count()

    def count_today_by_clinic(self, db: Session, *, clinic_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return db.query(Appointment).filter(
            and_(
                Appointment.hospital_id == clinic_id,
                Appointment.appointment_date == today,
            )
        ).count()

    def count_pending_by_clinic(self, db: Session, *, clinic_id: str) -> int:
        return db.query(Appointment).filter(
            and_(
                Appointment.hospital_id == clinic_id,
                Appointment.status == AppointmentStatus.PENDING,
            )
        ).count()

    def count_completed_today_by_clinic(self, db: Session, *, clinic_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return db.query(Appointment).filter(
            and_(
                Appointment.hospital_id == clinic_id,
                Appointment.appointment_date == today,
                Appointment.status == AppointmentStatus.COMPLETED,
            )
        ).count()

    def count_walk_in_today_by_clinic(self, db: Session, *, clinic_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return db.query(Appointment).filter(
            and_(
                Appointment.hospital_id == clinic_id,
                Appointment.appointment_date == today,
                Appointment.is_walk_in == True,
            )
        ).count()

    def get_appointments_by_doctor(
        self,
        db: Session,
        doctor_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[AppointmentStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a specific doctor."""
        query = db.query(Appointment).filter(Appointment.doctor_id == doctor_id)
        
        if start_date:
            query = query.filter(Appointment.start_time >= start_date)
        if end_date:
            query = query.filter(Appointment.start_time <= end_date)
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(asc(Appointment.start_time)).offset(skip).limit(limit).all()
    
    def get_appointments_by_patient(
        self,
        db: Session,
        patient_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[AppointmentStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments for a specific patient."""
        query = db.query(Appointment).filter(Appointment.patient_id == patient_id)
        
        if start_date:
            query = query.filter(Appointment.start_time >= start_date)
        if end_date:
            query = query.filter(Appointment.start_time <= end_date)
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(asc(Appointment.start_time)).offset(skip).limit(limit).all()
    
    def get_appointments_by_date_range(
        self,
        db: Session,
        start_date: datetime,
        end_date: datetime,
        clinic_id: Optional[str] = None,
        doctor_id: Optional[str] = None,
        status: Optional[AppointmentStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appointment]:
        """Get appointments within a date range."""
        query = db.query(Appointment).filter(
            and_(
                Appointment.start_time >= start_date,
                Appointment.start_time <= end_date
            )
        )
        
        if clinic_id:
            query = query.filter(Appointment.hospital_id == clinic_id)
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if status:
            query = query.filter(Appointment.status == status)
        
        return query.order_by(asc(Appointment.start_time)).offset(skip).limit(limit).all()
    
    def get_today_appointments(
        self,
        db: Session,
        doctor_id: Optional[str] = None,
        clinic_id: Optional[str] = None
    ) -> List[Appointment]:
        """Get today's appointments."""
        today = datetime.now(timezone.utc).date()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        query = db.query(Appointment).filter(
            and_(
                Appointment.start_time >= start_of_day,
                Appointment.start_time <= end_of_day
            )
        )
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if clinic_id:
            query = query.filter(Appointment.hospital_id == clinic_id)
        
        return query.order_by(asc(Appointment.start_time)).all()
    
    def get_upcoming_appointments(
        self,
        db: Session,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        days_ahead: int = 7
    ) -> List[Appointment]:
        """Get upcoming appointments."""
        now = datetime.now(timezone.utc)
        future_date = now + timedelta(days=days_ahead)
        
        query = db.query(Appointment).filter(
            and_(
                Appointment.start_time >= now,
                Appointment.start_time <= future_date
            )
        )
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        
        return query.order_by(asc(Appointment.start_time)).all()

    # ---- Route wrapper methods (doctor) ----
    def get_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> List[Appointment]:
        start_dt = None
        end_dt = None
        try:
            start_dt = datetime.fromisoformat(date_from) if date_from else None
        except Exception:
            pass
        try:
            end_dt = datetime.fromisoformat(date_to) if date_to else None
        except Exception:
            pass
        status_enum = None
        if status:
            try:
                status_enum = AppointmentStatus(status)
            except Exception:
                pass
        return self.get_appointments_by_doctor(
            db,
            doctor_id=doctor_id,
            start_date=start_dt,
            end_date=end_dt,
            status=status_enum,
            skip=skip,
            limit=limit,
        )

    def count_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> int:
        query = db.query(Appointment).filter(Appointment.doctor_id == doctor_id)
        if status:
            try:
                query = query.filter(Appointment.status == AppointmentStatus(status))
            except Exception:
                pass
        if date_from:
            try:
                query = query.filter(Appointment.start_time >= datetime.fromisoformat(date_from))
            except Exception:
                pass
        if date_to:
            try:
                query = query.filter(Appointment.start_time <= datetime.fromisoformat(date_to))
            except Exception:
                pass
        return query.count()

    def count_today_by_doctor(self, db: Session, *, doctor_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == today,
            )
        ).count()

    def count_completed_today_by_doctor(self, db: Session, *, doctor_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == today,
                Appointment.status == AppointmentStatus.COMPLETED,
            )
        ).count()

    def count_upcoming_by_doctor(self, db: Session, *, doctor_id: str) -> int:
        now = datetime.now(timezone.utc)
        return db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.start_time >= now,
            )
        ).count()

    

    def count_by_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        status: Optional[str] = None
    ) -> int:
        query = db.query(Appointment).filter(Appointment.patient_id == patient_id)
        if status:
            try:
                query = query.filter(Appointment.status == AppointmentStatus(status))
            except Exception:
                pass
        return query.count()

    # ---- Nurse wrappers (no explicit mapping; return 0) ----
    def _resolve_nurse_id(self, db: Session, *, nurse_identifier: str) -> Optional[str]:
        nurse = db.query(Nurse).filter(Nurse.id == nurse_identifier).first()
        if nurse:
            return str(nurse.id)
        nurse = db.query(Nurse).filter(Nurse.user_id == nurse_identifier).first()
        return str(nurse.id) if nurse else None

    def count_today_by_nurse(self, db: Session, *, nurse_id: str) -> int:
        resolved_nurse_id = self._resolve_nurse_id(db, nurse_identifier=nurse_id)
        if not resolved_nurse_id:
            return 0
        today = datetime.now(timezone.utc).date()
        # Appointments for patients assigned to this nurse and scheduled today
        subq = (
            db.query(NursePatientAssignment.patient_id)
            .filter(
                and_(
                    NursePatientAssignment.nurse_id == resolved_nurse_id,
                    NursePatientAssignment.is_active == True,
                )
            )
            .subquery()
        )
        return (
            db.query(Appointment)
            .filter(
                and_(
                    Appointment.patient_id.in_(subq),
                    Appointment.appointment_date == today,
                )
            )
            .count()
        )

    def count_upcoming_by_nurse(self, db: Session, *, nurse_id: str) -> int:
        resolved_nurse_id = self._resolve_nurse_id(db, nurse_identifier=nurse_id)
        if not resolved_nurse_id:
            return 0
        now = datetime.now(timezone.utc)
        subq = (
            db.query(NursePatientAssignment.patient_id)
            .filter(
                and_(
                    NursePatientAssignment.nurse_id == resolved_nurse_id,
                    NursePatientAssignment.is_active == True,
                )
            )
            .subquery()
        )
        return (
            db.query(Appointment)
            .filter(
                and_(
                    Appointment.patient_id.in_(subq),
                    Appointment.start_time >= now,
                )
            )
            .count()
        )
    
    def check_appointment_conflict(
        self,
        db: Session,
        doctor_id: str,
        appointment_date: datetime,
        duration_minutes: int,
        exclude_appointment_id: Optional[str] = None
    ) -> bool:
        """Check if there's a scheduling conflict."""
        end_time = appointment_date + timedelta(minutes=duration_minutes)
        
        query = db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_([
                    AppointmentStatus.BOOKED,
                    AppointmentStatus.PENDING,
                    AppointmentStatus.IN_PROGRESS,
                    AppointmentStatus.ARRIVED,
                    AppointmentStatus.CHECKED_IN,
                ]),
                or_(
                    and_(
                        Appointment.start_time <= appointment_date,
                        Appointment.start_time + timedelta(minutes=Appointment.minutes_duration) > appointment_date
                    ),
                    and_(
                        Appointment.start_time < end_time,
                        Appointment.start_time + timedelta(minutes=Appointment.minutes_duration) >= end_time
                    ),
                    and_(
                        Appointment.start_time >= appointment_date,
                        Appointment.start_time + timedelta(minutes=Appointment.minutes_duration) <= end_time
                    )
                )
            )
        )
        
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)
        
        return query.first() is not None
    
    def get_available_time_slots(
        self,
        db: Session,
        doctor_id: str,
        date: datetime,
        duration_minutes: int = 30
    ) -> List[TimeSlot]:
        """Get available time slots for a doctor on a specific date."""
        # Get doctor's working hours (this would come from doctor settings)
        start_time = datetime.combine(date.date(), datetime.min.time().replace(hour=9))
        end_time = datetime.combine(date.date(), datetime.min.time().replace(hour=17))
        
        # Get existing appointments for the day
        existing_appointments = db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.start_time >= start_time,
                Appointment.start_time < end_time,
                Appointment.status.in_([
                    AppointmentStatus.BOOKED,
                    AppointmentStatus.PENDING,
                    AppointmentStatus.IN_PROGRESS,
                    AppointmentStatus.ARRIVED,
                    AppointmentStatus.CHECKED_IN,
                ])
            )
        ).order_by(asc(Appointment.start_time)).all()
        
        # Generate available slots
        available_slots = []
        current_time = start_time
        
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Check if this slot conflicts with existing appointments
            conflict = False
            for appointment in existing_appointments:
                appointment_end = appointment.start_time + timedelta(minutes=appointment.minutes_duration)
                if (current_time < appointment_end and slot_end > appointment.start_time):
                    conflict = True
                    break
            
            if not conflict:
                available_slots.append(TimeSlot(
                    start_time=current_time,
                    end_time=slot_end,
                ))
            
            current_time += timedelta(minutes=duration_minutes)
        
        return available_slots
    
    def update_appointment_status(
        self,
        db: Session,
        appointment_id: str,
        status: AppointmentStatus,
        notes: Optional[str] = None
    ) -> Optional[Appointment]:
        """Update appointment status."""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return None
        
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if notes:
            update_data["notes"] = notes
        
        if status == AppointmentStatus.COMPLETED:
            update_data["completed_at"] = datetime.now(timezone.utc)
        elif status == AppointmentStatus.CANCELLED:
            update_data["cancelled_at"] = datetime.now(timezone.utc)
        
        return self.update(db=db, db_obj=appointment, obj_in=update_data)
    
    def get_appointment_statistics(
        self,
        db: Session,
        doctor_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get appointment statistics."""
        query = db.query(Appointment)
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if clinic_id:
            query = query.filter(Appointment.hospital_id == clinic_id)
        if start_date:
            query = query.filter(Appointment.start_time >= start_date)
        if end_date:
            query = query.filter(Appointment.start_time <= end_date)
        
        total_appointments = query.count()
        
        # Count by status
        status_counts = {}
        for status in AppointmentStatus:
            count = query.filter(Appointment.status == status).count()
            status_counts[status.value] = count
        
        # Count by type
        type_counts = {}
        for appointment_type in AppointmentType:
            count = query.filter(Appointment.appointment_type == appointment_type).count()
            type_counts[appointment_type.value] = count
        
        return {
            "total_appointments": total_appointments,
            "status_counts": status_counts,
            "type_counts": type_counts,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
    
    def search_appointments(
        self,
        db: Session,
        search_term: str,
        doctor_id: Optional[str] = None,
        clinic_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Appointment]:
        """Search appointments by patient name or notes."""
        query = db.query(Appointment).join(Patient).filter(
            or_(
                Patient.first_name.ilike(f"%{search_term}%"),
                Patient.last_name.ilike(f"%{search_term}%"),
                Appointment.comment.ilike(f"%{search_term}%"),
                Appointment.internal_notes.ilike(f"%{search_term}%")
            )
        )
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if clinic_id:
            query = query.filter(Appointment.hospital_id == clinic_id)
        
        return query.order_by(desc(Appointment.start_time)).offset(skip).limit(limit).all()

# ──────────────────────────────────────────────────────────────────────────────
# Create CRUD instance
# ──────────────────────────────────────────────────────────────────────────────

appointment = CRUDAppointment(Appointment)
