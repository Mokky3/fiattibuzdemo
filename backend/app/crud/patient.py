from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from app.models.patient import Patient, PatientInvitation
from app.schemas.patient import PatientCreate, PatientBase


# Keep your existing functions and add new ones
def create_patient(db: Session, patient: PatientCreate):
    """Your existing create function - enhanced with validation"""
    # Convert the frontend field names to your database field names
    patient_data = patient.dict()
    
    # Map frontend fields to your database fields
    if 'date_of_birth' in patient_data:
        patient_data['birth_date'] = patient_data.pop('date_of_birth')
    if 'phone_number' in patient_data:
        patient_data['phone'] = patient_data.pop('phone_number')
    
    db_patient = Patient(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def get_patient(db: Session, patient_id: int):
    """Your existing get function"""
    return db.query(Patient).filter(Patient.id == patient_id).first()


def update_patient(db: Session, patient_id: int, patient_data: PatientBase):
    """Your existing update function"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        for field, value in patient_data.dict().items():
            setattr(patient, field, value)
        db.commit()
        db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: int):
    """Your existing delete function"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        db.delete(patient)
        db.commit()
    return patient


# Additional functions for the registration system
def get_patient_by_phone(db: Session, phone: str) -> Optional[Patient]:
    """Get patient by phone number"""
    return db.query(Patient).filter(Patient.phone == phone).first()


def get_patient_by_email(db: Session, email: str) -> Optional[Patient]:
    """Get patient by email"""
    return db.query(Patient).filter(Patient.email == email).first()


def get_patient_by_pinfl(db: Session, pinfl: str) -> Optional[Patient]:
    """Get patient by PINFL"""
    return db.query(Patient).filter(Patient.pinfl == pinfl).first()


def get_patient_by_passport(db: Session, passport_number: str) -> Optional[Patient]:
    """Get patient by passport number"""
    return db.query(Patient).filter(Patient.passport_number == passport_number).first()


def get_all_patients(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None
) -> List[Patient]:
    """Get all patients with optional filtering and pagination"""
    query = db.query(Patient)
    
    # Apply status filter
    if status:
        query = query.filter(Patient.status == status)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(search_term),
                Patient.phone.like(search_term),
                Patient.patient_id.like(search_term) if search_term else False,
                Patient.email.ilike(search_term) if search_term else False
            )
        )
    
    return query.order_by(desc(Patient.created_at)).offset(skip).limit(limit).all()


def count_patients(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None
) -> int:
    """Count total patients with optional filtering"""
    query = db.query(Patient)
    
    if status:
        query = query.filter(Patient.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(search_term),
                Patient.phone.like(search_term),
                Patient.patient_id.like(search_term) if search_term else False,
                Patient.email.ilike(search_term) if search_term else False
            )
        )
    
    return query.count()


def search_patients(
    db: Session,
    full_name: Optional[str] = None,
    birth_date: Optional[date] = None,
    pinfl: Optional[str] = None,
    phone: Optional[str] = None,
    passport_number: Optional[str] = None
) -> List[Patient]:
    """Search patients by multiple criteria"""
    query = db.query(Patient)
    filters = []
    
    if full_name:
        filters.append(Patient.full_name.ilike(f"%{full_name}%"))
    if birth_date:
        filters.append(Patient.birth_date == birth_date)
    if pinfl:
        filters.append(Patient.pinfl == pinfl)
    if phone:
        filters.append(Patient.phone == phone)
    if passport_number:
        filters.append(Patient.passport_number == passport_number)
    
    if filters:
        query = query.filter(and_(*filters))
    
    return query.all()


def patient_exists(
    db: Session,
    pinfl: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    passport_number: Optional[str] = None,
    exclude_id: Optional[int] = None
) -> bool:
    """Check if patient exists with given criteria"""
    query = db.query(Patient)
    
    if exclude_id:
        query = query.filter(Patient.id != exclude_id)
    
    filters = []
    if pinfl:
        filters.append(Patient.pinfl == pinfl)
    if phone:
        filters.append(Patient.phone == phone)
    if email:
        filters.append(Patient.email == email)
    if passport_number:
        filters.append(Patient.passport_number == passport_number)
    
    if filters:
        query = query.filter(or_(*filters))
        return query.first() is not None
    
    return False


def deactivate_patient(db: Session, patient_id: int) -> Optional[Patient]:
    """Soft delete (deactivate) patient"""
    patient = get_patient(db, patient_id)
    if patient:
        patient.status = "inactive"
        db.commit()
        db.refresh(patient)
    return patient


def activate_patient(db: Session, patient_id: int) -> Optional[Patient]:
    """Activate patient"""
    patient = get_patient(db, patient_id)
    if patient:
        patient.status = "active"
        db.commit()
        db.refresh(patient)
    return patient


# Invitation CRUD functions
def create_invitation(db: Session, patient_id: int) -> PatientInvitation:
    """Create a new patient invitation"""
    invitation = PatientInvitation(patient_id=patient_id)
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def get_invitation_by_token(db: Session, token: str) -> Optional[PatientInvitation]:
    """Get invitation by token"""
    return db.query(PatientInvitation).filter(
        PatientInvitation.invitation_token == token
    ).first()


def get_valid_invitation(db: Session, patient_id: int) -> Optional[PatientInvitation]:
    """Get valid (unused and not expired) invitation for patient"""
    return db.query(PatientInvitation).filter(
        and_(
            PatientInvitation.patient_id == patient_id,
            PatientInvitation.used == False,
            PatientInvitation.expires_at > datetime.utcnow()
        )
    ).first()


def mark_invitation_used(db: Session, token: str) -> Optional[PatientInvitation]:
    """Mark invitation as used"""
    invitation = get_invitation_by_token(db, token)
    if invitation and invitation.is_valid():
        invitation.mark_as_used()
        db.commit()
        db.refresh(invitation)
        return invitation
    return None


def get_patient_statistics(db: Session) -> Dict[str, Any]:
    """Get patient statistics"""
    total_patients = db.query(Patient).count()
    active_patients = db.query(Patient).filter(Patient.status == "active").count()
    inactive_patients = db.query(Patient).filter(Patient.status == "inactive").count()
    
    # Patients registered today
    today = datetime.now().date()
    today_patients = (
        db.query(Patient)
        .filter(Patient.created_at >= today)
        .count()
    )
    
    # Gender distribution
    male_count = db.query(Patient).filter(Patient.gender == "Male").count()
    female_count = db.query(Patient).filter(Patient.gender == "Female").count()
    
    return {
        "total_patients": total_patients,
        "active_patients": active_patients,
        "inactive_patients": inactive_patients,
        "today_registrations": today_patients,
        "gender_distribution": {
            "male": male_count,
            "female": female_count
        }
    }