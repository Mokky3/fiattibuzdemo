from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from app.db.database import get_db  # Use centralized get_db
from app.schemas.appointment import (
    AppointmentCreate, 
    AppointmentRead, 
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AppointmentResponse
)
from app.crud import appointment as crud
from app.auth.auth import get_current_user
from app.models.user import User
from app.models.appointment import Appointment

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/", response_model=AppointmentRead)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new appointment"""
    return crud.create_appointment(db, appointment)

@router.get("/", response_model=List[AppointmentResponse])
def list_appointments(
    status: Optional[str] = Query(None, description="Filter by status"),
    date_filter: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appointments with optional filters"""
    
    try:
        # Apply filters based on user role and query parameters
        if current_user.role == "admin":
            if status:
                appointments = crud.get_appointments_by_status(db, status)
            elif date_filter:
                filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                appointments = crud.get_appointments_by_date(db, filter_date)
            else:
                appointments = crud.get_appointments(db)
        elif current_user.role == "doctor":
            base_query = db.query(Appointment).filter(Appointment.doctor_id == current_user.id)
            if status:
                base_query = base_query.filter(Appointment.status == status)
            if date_filter:
                filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                base_query = base_query.filter(Appointment.appointment_date == filter_date)
            appointments = base_query.all()
        elif current_user.role == "patient":
            base_query = db.query(Appointment).filter(Appointment.patient_id == current_user.id)
            if status:
                base_query = base_query.filter(Appointment.status == status)
            if date_filter:
                filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                base_query = base_query.filter(Appointment.appointment_date == filter_date)
            appointments = base_query.all()
        else:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Transform to frontend format
        result = []
        for apt in appointments:
            # Get patient and doctor names
            patient_name = "Unknown Patient"
            doctor_name = "Unknown Doctor"
            
            if apt.patient:
                patient_name = getattr(apt.patient, 'name', None) or getattr(apt.patient, 'username', 'Unknown Patient')
            
            if apt.doctor:
                doctor_name = getattr(apt.doctor, 'name', None) or getattr(apt.doctor, 'username', 'Unknown Doctor')
            
            result.append({
                "id": apt.id,
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "appointment_date": apt.appointment_date.isoformat(),
                "appointment_time": apt.appointment_time.strftime("%H:%M"),
                "reason": apt.reason,
                "notes": apt.notes,
                "status": apt.status,
                "created_at": apt.created_at
            })
        
        return result
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving appointments: {str(e)}")

@router.get("/{appointment_id}", response_model=AppointmentRead)
def read_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific appointment by ID"""
    
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role == "admin":
        return appointment
    elif current_user.role == "doctor" and appointment.doctor_id == current_user.id:
        return appointment
    elif current_user.role == "patient" and appointment.patient_id == current_user.id:
        return appointment
    else:
        raise HTTPException(status_code=403, detail="Unauthorized to view this appointment")

@router.put("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    appt_update: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an appointment"""
    
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Only admins and doctors can update appointments")
    
    if current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own appointments")
    
    return crud.update_appointment(db, appointment_id, appt_update)

@router.patch("/{appointment_id}/status", response_model=AppointmentRead)
def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update appointment status (for accept/decline functionality)"""
    
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Only admins and doctors can update appointment status")
    
    if current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own appointments")
    
    # Validate status
    valid_statuses = ["pending", "upcoming", "completed", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    return crud.update_appointment_status(db, appointment_id, status_update.status)

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an appointment"""
    
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Only admins and doctors can delete appointments")
    
    if current_user.role == "doctor" and appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own appointments")
    
    crud.delete_appointment(db, appointment_id)
    return {"message": f"Appointment {appointment_id} deleted successfully"}

# Additional endpoints for dashboard integration
@router.get("/stats/summary")
def get_appointment_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appointment statistics"""
    
    if current_user.role not in ["admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return crud.get_appointment_stats(db)

@router.get("/next/patient/{patient_id}")
def get_next_patient_appointment(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get next appointment for a specific patient"""
    
    # Check permissions
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="You can only view your own appointments")
    
    appointment = crud.get_next_appointment_for_patient(db, patient_id)
    if not appointment:
        return {"message": "No upcoming appointments found"}
    
    return appointment