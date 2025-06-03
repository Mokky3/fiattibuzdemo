from sqlalchemy.orm import Session
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentBase

def create_appointment(db: Session, appointment: AppointmentCreate):
    db_appointment = Appointment(**appointment.dict())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Appointment).offset(skip).limit(limit).all()

def get_appointment(db: Session, appointment_id: int):
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()

def get_next_appointment_for_patient(db: Session, user_id: int):
    return db.query(Appointment).filter(
        Appointment.patient_id == user_id,
        Appointment.date > datetime.utcnow()
    ).order_by(Appointment.date).first()


def update_appointment(db: Session, appointment_id: int, data: AppointmentBase):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt:
        for field, value in data.dict().items():
            setattr(appt, field, value)
        db.commit()
        db.refresh(appt)
    return appt

def delete_appointment(db: Session, appointment_id: int):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt:
        db.delete(appt)
        db.commit()
    return appt
