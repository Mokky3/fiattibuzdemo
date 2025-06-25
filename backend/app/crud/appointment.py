from sqlalchemy.orm import Session
from datetime import datetime, date
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate

def create_appointment(db: Session, appointment: AppointmentCreate):
    """Create a new appointment"""
    db_appointment = Appointment(**appointment.dict())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointments(db: Session, skip: int = 0, limit: int = 100):
    """Get all appointments with patient and doctor info"""
    return db.query(Appointment).join(
        User, Appointment.patient_id == User.id
    ).offset(skip).limit(limit).all()

def get_appointment(db: Session, appointment_id: int):
    """Get a specific appointment by ID"""
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()

def get_appointments_by_status(db: Session, status: str, skip: int = 0, limit: int = 100):
    """Get appointments filtered by status"""
    return db.query(Appointment).filter(
        Appointment.status == status
    ).offset(skip).limit(limit).all()

def get_appointments_by_date(db: Session, appointment_date: date, skip: int = 0, limit: int = 100):
    """Get appointments for a specific date"""
    return db.query(Appointment).filter(
        Appointment.appointment_date == appointment_date
    ).offset(skip).limit(limit).all()

def get_appointments_by_user(db: Session, user_id: int, role: str, skip: int = 0, limit: int = 100):
    """Get appointments for a specific user based on their role"""
    if role == "patient":
        return db.query(Appointment).filter(
            Appointment.patient_id == user_id
        ).offset(skip).limit(limit).all()
    elif role == "doctor":
        return db.query(Appointment).filter(
            Appointment.doctor_id == user_id
        ).offset(skip).limit(limit).all()
    else:
        return []

def get_next_appointment_for_patient(db: Session, user_id: int):
    """Get the next upcoming appointment for a patient"""
    today = date.today()
    return db.query(Appointment).filter(
        Appointment.patient_id == user_id,
        Appointment.appointment_date >= today,
        Appointment.status.in_(["upcoming", "scheduled"])
    ).order_by(Appointment.appointment_date, Appointment.appointment_time).first()

def update_appointment(db: Session, appointment_id: int, data: AppointmentUpdate):
    """Update an appointment"""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt:
        for field, value in data.dict(exclude_unset=True).items():
            if value is not None:
                setattr(appt, field, value)
        appt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(appt)
    return appt

def update_appointment_status(db: Session, appointment_id: int, status: str):
    """Update only the status of an appointment"""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt:
        appt.status = status
        appt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(appt)
    return appt

def delete_appointment(db: Session, appointment_id: int):
    """Delete an appointment"""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt:
        db.delete(appt)
        db.commit()
    return appt

def get_appointment_stats(db: Session):
    """Get appointment statistics for dashboard"""
    today = date.today()
    
    stats = {
        "today_total": db.query(Appointment).filter(
            Appointment.appointment_date == today
        ).count(),
        "today_upcoming": db.query(Appointment).filter(
            Appointment.appointment_date == today,
            Appointment.status == "upcoming"
        ).count(),
        "today_pending": db.query(Appointment).filter(
            Appointment.appointment_date == today,
            Appointment.status == "pending"
        ).count(),
        "today_completed": db.query(Appointment).filter(
            Appointment.appointment_date == today,
            Appointment.status == "completed"
        ).count(),
        "total_appointments": db.query(Appointment).count()
    }
    
    return stats