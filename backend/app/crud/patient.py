# app/crud/patient.py
"""CRUD operations for Patient-related models."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, date, timedelta
import uuid

from app.crud.base import CRUDBase
from app.crud.user import user as user_crud
from app.common.models.admin import User, UserRole


class PatientInfo:
    """Patient information model (would be a proper SQLAlchemy model in real implementation)."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id')
        self.patient_code = kwargs.get('patient_code')
        self.date_of_birth = kwargs.get('date_of_birth')
        self.gender = kwargs.get('gender')
        self.blood_group = kwargs.get('blood_group')
        self.rh_factor = kwargs.get('rh_factor')
        self.height = kwargs.get('height')
        self.weight = kwargs.get('weight')
        self.bmi = kwargs.get('bmi')
        self.temperature = kwargs.get('temperature')
        self.blood_pressure = kwargs.get('blood_pressure')
        self.address = kwargs.get('address')
        self.temporary_address = kwargs.get('temporary_address')
        self.work_place = kwargs.get('work_place')
        self.occupation = kwargs.get('occupation')
        self.emergency_contact = kwargs.get('emergency_contact')
        self.insurance_info = kwargs.get('insurance_info')
        self.allergies = kwargs.get('allergies', [])
        self.chronic_conditions = kwargs.get('chronic_conditions', [])
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at')


class CRUDPatient:
    """CRUD operations for patients."""
    
    def __init__(self):
        self.user_crud = user_crud
    
    def get_patient_by_id(
        self, db: Session, *, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get patient by ID."""
        # In real implementation, would join User and PatientInfo tables
        user = db.query(User).filter(
            and_(
                User.id == patient_id,
                User.role == UserRole.PATIENT
            )
        ).first()
        
        if not user:
            return None
        
        # Mock patient info (would come from PatientInfo table)
        age = self._calculate_age("1990-01-01")  # Mock DOB
        
        return {
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "patient_code": f"PT-{str(user.id)[:8].upper()}",
            "gender": "male",  # Would come from PatientInfo
            "date_of_birth": "1990-01-01",
            "age": age,
            "height": "175 cm",
            "weight": "70 kg",
            "bmi": "22.9",
            "temperature": "36.6 °C",
            "blood_pressure": "120/80",
            "blood_group": "O",
            "rh_factor": "+",
            "phone_number": user.phone,
            "email": user.email,
            "address": "Demo Address",
            "temporary_address": None,
            "work_place": "Demo Company",
            "occupation": "Software Engineer"
        }
    
    def get_patient_by_code(
        self, db: Session, *, patient_code: str
    ) -> Optional[Dict[str, Any]]:
        """Get patient by patient code."""
        # In real implementation, would query PatientInfo table
        # For now, extract ID from code and use that
        if patient_code.startswith("PT-"):
            patient_id_part = patient_code[3:11].lower()
            # Search for user with matching ID prefix
            users = db.query(User).filter(
                and_(
                    User.role == UserRole.PATIENT,
                    func.cast(User.id, String).like(f"{patient_id_part}%")
                )
            ).all()
            
            if users:
                return self.get_patient_by_id(db, patient_id=str(users[0].id))
        
        return None
    
    def get_all_patients(
        self,
        db: Session,
        *,
        organization_id: Optional[uuid.UUID] = None,
        doctor_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all patients with optional filtering."""
        query = db.query(User).filter(User.role == UserRole.PATIENT)
        
        if organization_id:
            query = query.filter(User.organization_id == organization_id)
        
        # In real implementation, would filter by doctor assignments
        
        users = query.offset(skip).limit(limit).all()
        
        patients = []
        for user in users:
            patient_data = self.get_patient_by_id(db, patient_id=str(user.id))
            if patient_data:
                patients.append(patient_data)
        
        return patients
    
    def create_patient(
        self,
        db: Session,
        *,
        patient_data: Dict[str, Any],
        created_by: uuid.UUID
    ) -> Dict[str, Any]:
        """Create a new patient."""
        # Create user account
        user_create = {
            "email": patient_data.get("email"),
            "password": patient_data.get("password", "temporary123"),  # Would be properly handled
            "confirm_password": patient_data.get("password", "temporary123"),
            "first_name": patient_data.get("first_name"),
            "last_name": patient_data.get("last_name"),
            "role": UserRole.PATIENT,
            "phone": patient_data.get("phone_number")
        }
        
        user = self.user_crud.create(db, obj_in=user_create)
        
        # In real implementation, would also create PatientInfo record
        
        return self.get_patient_by_id(db, patient_id=str(user.id))
    
    def update_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        patient_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update patient information."""
        user = db.query(User).filter(
            and_(
                User.id == patient_id,
                User.role == UserRole.PATIENT
            )
        ).first()
        
        if not user:
            return None
        
        # Update user fields
        if "first_name" in patient_data:
            user.first_name = patient_data["first_name"]
        if "last_name" in patient_data:
            user.last_name = patient_data["last_name"]
        if "email" in patient_data:
            user.email = patient_data["email"]
        if "phone_number" in patient_data:
            user.phone = patient_data["phone_number"]
        
        user.updated_at = datetime.utcnow()
        db.commit()
        
        # In real implementation, would also update PatientInfo
        
        return self.get_patient_by_id(db, patient_id=patient_id)
    
    def search_patients(
        self,
        db: Session,
        *,
        search_term: str,
        organization_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search patients by name, code, phone, or email."""
        filters = {'role': UserRole.PATIENT}
        
        if organization_id:
            filters['organization_id'] = organization_id
        
        users = self.user_crud.search_users(
            db,
            search_term=search_term,
            skip=skip,
            limit=limit,
            filters=filters
        )
        
        patients = []
        for user in users:
            patient_data = self.get_patient_by_id(db, patient_id=str(user.id))
            if patient_data:
                patients.append(patient_data)
        
        return patients
    
    def get_patient_vitals(
        self,
        db: Session,
        *,
        patient_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Get patient vital signs history."""
        # In real implementation, would fetch from vitals table
        return [
            {
                "id": str(uuid.uuid4()),
                "patient_id": patient_id,
                "date": datetime.utcnow().isoformat(),
                "temperature": "36.6 °C",
                "blood_pressure": "120/80",
                "heart_rate": "72 bpm",
                "weight": "70 kg",
                "height": "175 cm",
                "bmi": "22.9",
                "oxygen_saturation": "98%"
            }
        ]
    
    def update_patient_vitals(
        self,
        db: Session,
        *,
        patient_id: str,
        vitals_data: Dict[str, Any],
        recorded_by: uuid.UUID
    ) -> Dict[str, Any]:
        """Update patient vital signs."""
        # In real implementation, would create new vitals record
        vitals_data["id"] = str(uuid.uuid4())
        vitals_data["patient_id"] = patient_id
        vitals_data["recorded_by"] = str(recorded_by)
        vitals_data["recorded_at"] = datetime.utcnow().isoformat()
        
        return vitals_data
    
    def get_patient_allergies(
        self, db: Session, *, patient_id: str
    ) -> List[Dict[str, Any]]:
        """Get patient allergies."""
        # In real implementation, would fetch from allergies table
        return [
            {
                "id": str(uuid.uuid4()),
                "patient_id": patient_id,
                "allergen": "Penicillin",
                "reaction": "Rash",
                "severity": "Moderate",
                "noted_date": "2020-01-15"
            }
        ]
    
    def add_patient_allergy(
        self,
        db: Session,
        *,
        patient_id: str,
        allergy_data: Dict[str, Any],
        added_by: uuid.UUID
    ) -> Dict[str, Any]:
        """Add patient allergy."""
        # In real implementation, would create allergy record
        allergy_data["id"] = str(uuid.uuid4())
        allergy_data["patient_id"] = patient_id
        allergy_data["added_by"] = str(added_by)
        allergy_data["added_at"] = datetime.utcnow().isoformat()
        
        return allergy_data
    
    def get_patient_medical_history(
        self,
        db: Session,
        *,
        patient_id: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get patient medical history."""
        # In real implementation, would fetch from medical history table
        history = [
            {
                "id": str(uuid.uuid4()),
                "patient_id": patient_id,
                "date": "2023-06-15",
                "category": "diagnosis",
                "title": "Hypertension",
                "description": "Diagnosed with mild hypertension",
                "doctor_name": "Dr. Smith"
            },
            {
                "id": str(uuid.uuid4()),
                "patient_id": patient_id,
                "date": "2023-03-10",
                "category": "surgery",
                "title": "Appendectomy",
                "description": "Laparoscopic appendectomy performed",
                "doctor_name": "Dr. Johnson"
            }
        ]
        
        if category:
            history = [h for h in history if h["category"] == category]
        
        return history
    
    def get_patient_appointments(
        self,
        db: Session,
        *,
        patient_id: str,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Get patient appointments."""
        # In real implementation, would fetch from appointments table
        return []
    
    def get_patient_prescriptions(
        self,
        db: Session,
        *,
        patient_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get patient prescriptions."""
        # In real implementation, would fetch from prescriptions table
        return []
    
    def get_patient_lab_results(
        self,
        db: Session,
        *,
        patient_id: str,
        test_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Get patient lab results."""
        # In real implementation, would fetch from lab results table
        return []
    
    def get_patient_documents(
        self,
        db: Session,
        *,
        patient_id: str,
        document_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get patient documents."""
        # In real implementation, would fetch from documents table
        return []
    
    def _calculate_age(self, date_of_birth: str) -> int:
        """Calculate age from date of birth."""
        dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    
    def get_patient_summary(
        self, db: Session, *, patient_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive patient summary."""
        patient = self.get_patient_by_id(db, patient_id=patient_id)
        if not patient:
            return None
        
        # In real implementation, would aggregate data from multiple tables
        return {
            "patient": patient,
            "summary": {
                "total_appointments": 24,
                "upcoming_appointments": 2,
                "total_prescriptions": 18,
                "active_prescriptions": 3,
                "total_lab_results": 12,
                "recent_vitals": self.get_patient_vitals(db, patient_id=patient_id),
                "allergies_count": len(self.get_patient_allergies(db, patient_id=patient_id)),
                "last_visit": "2024-12-15",
                "next_visit": "2025-01-20"
            }
        }


# Create instance
patient = CRUDPatient()