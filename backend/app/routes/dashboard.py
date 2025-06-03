from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import SessionLocal
from app.auth.auth import get_current_user
from app.models.user import User
from app.models.appointment import Appointment
from app.models.prescription import Prescription

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/doctor", response_model=dict)
def doctor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Access denied")

    # Get doctor's upcoming appointments (limit 5)
    upcoming = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == current_user.id)
        .filter(Appointment.date >= datetime.utcnow())
        .order_by(Appointment.date.asc())
        .limit(5)
        .all()
    )

    # Count unique patients assigned to doctor
    patient_count = (
        db.query(Appointment.patient_id)
        .filter(Appointment.doctor_id == current_user.id)
        .distinct()
        .count()
    )

    # Get prescriptions written by doctor
    prescriptions = Prescription.get_prescriptions_by_doctor(db, current_user.id)

    return {
        "upcoming_appointments": upcoming,
        "total_patients": patient_count,
        "prescriptions_written": prescriptions
    }


@router.get("/admin")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    # Fetch data
    total_appointments = db.query(Appointment).count()
    upcoming_appointments = db.query(Appointment).filter(Appointment.date > datetime.utcnow()).count()

    from app.models.user import User
    total_users = db.query(User).count()
    total_doctors = db.query(User).filter(User.role == "doctor").count()
    total_patients = db.query(User).filter(User.role == "patient").count()

    return {
        "stats": {
            "total_appointments": total_appointments,
            "upcoming_appointments": upcoming_appointments,
            "total_users": total_users,
            "total_doctors": total_doctors,
            "total_patients": total_patients,
        }
    }

@router.get("/patient", response_model=dict)
def patient_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Access denied")

    # Get next appointment
    next_appt = (
        db.query(Appointment)
        .filter(Appointment.patient_id == current_user.id)
        .filter(Appointment.date >= datetime.utcnow())
        .order_by(Appointment.date.asc())
        .first()
    )

    # Get prescription reminders (limit 3)
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == current_user.id)
        .order_by(Prescription.created_at.desc())
        .limit(3)
        .all()
    )

    # 🚧 TODO: Integrate body info from observations (future implementation)
    # Example logic to use later:
    # latest_obs = db.query(Observation).filter_by(patient_id=current_user.id).order_by(Observation.date.desc()).first()

    body_info = {
        "height": "180 cm",        # ➡ placeholder
        "weight": "70 kg",
        "bmi": "21.6 (normal)",
        "fat_percent": "17 % (normal)",
        "blood_pressure": "120/80",
        "reach": "180 cm",
        "blood_group": "A",
        "blood_rh": "-",
        "allergies": "none",
        "visual_acuity": "0.9/1",
        "mental_health": "good"
    }

    return {
        "next_appointment": next_appt,
        "prescriptions": prescriptions,
        "body_info": body_info
    }