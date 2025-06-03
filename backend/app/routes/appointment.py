from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentBase
from app.crud import appointment as crud
from app.auth.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/appointments", tags=["Appointments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=AppointmentRead)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ secured
):
    return crud.create_appointment(db, appointment)

@router.get("/", response_model=list[AppointmentRead])
def list_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "admin":
        return crud.get_appointments(db)
    elif current_user.role == "doctor":
        return db.query(Appointment).filter(Appointment.doctor_id == current_user.id).all()
    elif current_user.role == "patient":
        return db.query(Appointment).filter(Appointment.patient_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.get("/{appointment_id}", response_model=AppointmentRead)
def read_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ secured
):
    if current_user.role == "admin":
        return crud.get_appointments(db)
    elif current_user.role == "doctor":
        return db.query(Appointment).filter(Appointment.doctor_id == current_user.id).all()
    elif current_user.role == "patient":
        return db.query(Appointment).filter(Appointment.patient_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.put("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    appt: AppointmentBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ secured
):
    return crud.update_appointment(db, appointment_id, appt)

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ secured
):
    if current_user.role == "admin":
        return crud.get_appointments(db)
    elif current_user.role == "doctor":
        return db.query(Appointment).filter(Appointment.doctor_id == current_user.id).all()
    elif current_user.role == "patient":
        return db.query(Appointment).filter(Appointment.patient_id == current_user.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return {"message": f"Appointment {appointment_id} deleted"}
