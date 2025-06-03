from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.auth.auth import get_current_user
from app.crud import appointment as appointment_crud
from app.crud import medical_history as history_crud  # if exists

router = APIRouter(prefix="/dashboard", tags=["Patient Dashboard"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/patient")
def get_patient_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Access restricted to patients.")

    next_appt = appointment_crud.get_next_appointment_for_patient(db, current_user.id)
    history_summary = history_crud.get_summary_for_patient(db, current_user.id)

    return {
        "next_appointment": next_appt,
        "medical_history_summary": history_summary
    }
