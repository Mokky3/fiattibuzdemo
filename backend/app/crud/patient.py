# app/crud/patient.py
"""CRUD operations for Patient-related models."""
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, String
from datetime import datetime, date, timedelta, timezone
import uuid

from app.crud.base import CRUDBase
from app.crud.user import user as user_crud
from app.common.models.user import User, UserRole
from app.common.models.patient import Patient
from app.common.models.appointment import Appointment
from app.common.models.prescription import Prescription
from app.common.models.nurse import Nurse, NursePatientAssignment


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
    
    def _resolve_nurse_id(self, db: Session, *, nurse_identifier: str) -> Optional[str]:
        """Resolve a nurse identifier that may be a nurse.id or users.id to a Nurse.id."""
        # Try by Nurse.id
        nurse = db.query(Nurse).filter(Nurse.id == nurse_identifier).first()
        if nurse:
            return str(nurse.id)
        # Try by linked User.id
        nurse = db.query(Nurse).filter(Nurse.user_id == nurse_identifier).first()
        return str(nurse.id) if nurse else None
    
    def get_patient_by_id(
        self, db: Session, *, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get patient by ID."""
        # In real implementation, would join User and PatientInfo tables
        # Prefer Patient table, fallback to User if not present
        patient_row: Optional[Patient] = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if patient_row:
            user = db.query(User).filter(User.id == patient_row.user_id).first() if patient_row.user_id else None
        else:
            user = db.query(User).filter(
                and_(
                    User.id == patient_id,
                    User.role == UserRole.PATIENT
                )
            ).first()
        
        if not user:
            return None
        
        # Return real DB-backed fields only (no fabricated demo values)
        return {
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "patient_code": f"PT-{str(user.id)[:8].upper()}",
            "gender": getattr(patient_row, 'gender', None) if patient_row else None,
            "date_of_birth": getattr(patient_row, 'date_of_birth', None) if patient_row else None,
            "age": None,
            "height": getattr(patient_row, 'height', None) if patient_row else None,
            "weight": getattr(patient_row, 'weight', None) if patient_row else None,
            "bmi": getattr(patient_row, 'bmi', None) if patient_row else None,
            "temperature": None,
            "blood_pressure": None,
            "blood_group": getattr(patient_row, 'blood_group', None) if patient_row and hasattr(patient_row, 'blood_group') else None,
            "rh_factor": getattr(patient_row, 'rh_factor', None) if patient_row and hasattr(patient_row, 'rh_factor') else None,
            "phone_number": user.phone,
            "email": user.email,
            "address": getattr(patient_row, 'address', None) if patient_row else None,
            "temporary_address": getattr(patient_row, 'temporary_address', None) if patient_row and hasattr(patient_row, 'temporary_address') else None,
            "work_place": getattr(patient_row, 'work_place', None) if patient_row and hasattr(patient_row, 'work_place') else None,
            "occupation": getattr(patient_row, 'occupation', None) if patient_row else None
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
    ) -> List[Patient]:
        """Get all patients with optional filtering."""
        query = db.query(Patient)
        if organization_id:
            query = query.join(User, Patient.user_id == User.id).filter(User.organization_id == organization_id)
        if doctor_id:
            query = query.join(Appointment, Appointment.patient_id == Patient.patient_id).filter(Appointment.doctor_id == str(doctor_id))
        return query.offset(skip).limit(limit).all()
    
    def create_patient(
        self,
        db: Session,
        *,
        patient_data: Dict[str, Any],
        created_by: uuid.UUID
    ) -> Dict[str, Any]:
        """Create a new patient."""
        # Create user account
        # Generate placeholder email if not provided (email is required in users table)
        email = patient_data.get("email")
        if not email or (isinstance(email, str) and not email.strip()):
            # Generate a unique placeholder email using phone number + UUID to ensure uniqueness
            phone = patient_data.get("phone_number") or patient_data.get("phone") or ""
            unique_id = uuid.uuid4().hex[:8]
            if phone:
                # Use phone-based email with UUID suffix (sanitize phone number)
                phone_clean = str(phone).replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
                email = f"patient_{phone_clean}_{unique_id}@temp.local"
            else:
                # Fallback to UUID-based email
                email = f"patient_{unique_id}@temp.local"
        
        # Generate full_name from first_name and last_name (required in users table)
        first_name = patient_data.get("first_name") or ""
        last_name = patient_data.get("last_name") or ""
        full_name = patient_data.get("full_name")
        if not full_name:
            # Generate full_name from first_name and last_name
            name_parts = [part for part in [first_name, last_name] if part]
            full_name = " ".join(name_parts) if name_parts else "Patient"
        
        # Get organization_id (clinic_id) from patient_data if provided
        # This ensures the patient appears in the clinic's patient list
        organization_id = patient_data.get("organization_id") or patient_data.get("clinic_id")
        if organization_id and isinstance(organization_id, str):
            # Convert string UUID to UUID object if needed
            try:
                organization_id = uuid.UUID(organization_id)
            except (ValueError, AttributeError):
                # If conversion fails, try to use it as-is (user_crud.create might handle it)
                pass
        
        user_create = {
            "email": email,
            "password": patient_data.get("password", "temporary123"),  # Would be properly handled
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "role": UserRole.PATIENT,
            "phone": patient_data.get("phone_number") or patient_data.get("phone"),
        }
        # Only add organization_id if it's provided
        if organization_id:
            user_create["organization_id"] = organization_id
        # Remove confirm_password if present (not a User model field)
        if "confirm_password" in user_create:
            del user_create["confirm_password"]
        
        user = self.user_crud.create(db, obj_in=user_create)
        
        # Normalize gender value to lowercase string (database expects lowercase)
        # Valid values: "male", "female", "other" (from Gender enum)
        gender_raw = patient_data.get("gender")
        gender_value = None
        
        if gender_raw:
            # Convert to string if it's not already
            if hasattr(gender_raw, 'value'):
                # It's an enum, get its value
                gender_str = str(gender_raw.value)
            else:
                gender_str = str(gender_raw)
            
            # Normalize to lowercase and strip whitespace
            gender_str = gender_str.lower().strip()
            
            # Map common variations to valid database values
            gender_map = {
                "m": "male",
                "f": "female",
                "male": "male",
                "female": "female",
                "other": "other",
            }
            gender_value = gender_map.get(gender_str, None)  # Return None if not a valid value
        
        # Also create Patient row with minimal required fields
        # Note: patient_id is auto-generated, don't set it manually
        # Ensure gender_value is a valid lowercase string or None
        sex_value = gender_value if gender_value in ["male", "female", "other"] else None
        
        new_patient = Patient(
            user_id=user.id,  # Use UUID directly, not str
            date_of_birth=patient_data.get("date_of_birth") or date(1990, 1, 1),
            sex=sex_value,  # Use normalized lowercase string or None
            phone=patient_data.get("phone_number") or patient_data.get("phone"),
            address=patient_data.get("address") or None,
        )
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        
        # Create organization_patients entry if organization_id is provided
        # This links the patient to the clinic so they appear in the clinic's patient list
        organization_id = patient_data.get("organization_id") or patient_data.get("clinic_id")
        if organization_id:
            from app.common.models.patient import OrganizationPatient
            from uuid import UUID as UUIDType
            
            # Convert to UUID if string
            if isinstance(organization_id, str):
                try:
                    organization_id = UUIDType(organization_id)
                except ValueError:
                    print(f"Warning: Invalid organization_id format: {organization_id}")
                    organization_id = None
            
            if organization_id:
                # Check if entry already exists
                existing = db.query(OrganizationPatient).filter(
                    OrganizationPatient.organization_id == organization_id,
                    OrganizationPatient.patient_id == new_patient.patient_id
                ).first()
                
                if not existing:
                    org_patient = OrganizationPatient(
                        organization_id=organization_id,
                        patient_id=new_patient.patient_id,
                        status="active",
                        first_seen_at=datetime.now(timezone.utc)
                    )
                    db.add(org_patient)
                    db.commit()
                    print(f"Created organization_patients entry: org={organization_id}, patient={new_patient.patient_id}")
        
        return self.get_patient_by_id(db, patient_id=str(new_patient.id))
    
    def update_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        patient_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update patient information."""
        # Update both Patient and linked User if present
        patient_row: Optional[Patient] = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        user = db.query(User).filter(User.id == (patient_row.user_id if patient_row else patient_id)).first()
        
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
        
        if user:
            user.updated_at = datetime.utcnow()
        # Update Patient row
        if patient_row:
            if "first_name" in patient_data:
                patient_row.first_name = patient_data["first_name"]
            if "last_name" in patient_data:
                patient_row.last_name = patient_data["last_name"]
            if "email" in patient_data:
                patient_row.email = patient_data["email"]
            if "phone_number" in patient_data:
                patient_row.phone = patient_data["phone_number"]
            patient_row.updated_at = datetime.utcnow()
        db.commit()
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
        
        # Search Patient table by name/email/phone
        query = db.query(Patient)
        if organization_id:
            query = query.join(User, Patient.user_id == User.id).filter(User.organization_id == organization_id)
        if search_term:
            like = f"%{search_term.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Patient.first_name).like(like),
                    func.lower(Patient.last_name).like(like),
                    func.lower(Patient.email).like(like),
                    Patient.phone.ilike(f"%{search_term}%")
                )
            )
        rows = query.offset(skip).limit(limit).all()
        return rows
    
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
        # Fetch appointments for patient
        rows = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
        return [
            {
                "id": str(a.id),
                "date": a.appointment_date.isoformat() if a.appointment_date else None,
                "start_time": a.start_time.isoformat() if a.start_time else None,
                "status": a.status.value if a.status else None,
                "type": a.appointment_type.value if a.appointment_type else None,
            }
            for a in rows
        ]
    
    def get_patient_prescriptions(
        self,
        db: Session,
        *,
        patient_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get patient prescriptions from DB and map to DTO-like dicts."""
        query = db.query(Prescription).filter(Prescription.patient_id == patient_id)
        if status:
            try:
                from app.common.models.prescription import PrescriptionStatus
                query = query.filter(Prescription.status == PrescriptionStatus(status))
            except Exception:
                pass
        rows = query.order_by(desc(Prescription.prescribed_date)).offset(skip).limit(limit).all()
        return [
            {
                "id": str(p.id),
                "patient_id": str(p.patient_id),
                "medication_name": p.medicine_name,
                "dosage": p.dosage,
                "frequency": p.frequency,
                "duration": p.duration,
                "instructions": (p.dosage_instructions or {}).get("text") if isinstance(p.dosage_instructions, dict) else None,
                "status": p.status.value if p.status else None,
                "prescribed_date": p.prescribed_date.isoformat() if p.prescribed_date else None,
                "doctor_id": str(p.doctor_id),
            }
            for p in rows
        ]
    
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
        # Placeholder – model linkage not provided
        return []
    
    def get_patient_documents(
        self,
        db: Session,
        *,
        patient_id: str,
        document_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get patient documents."""
        # Placeholder – model linkage not provided
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

    # ---- Additional helpers used by routes ----
    def get(self, db: Session, id: str) -> Optional[Patient]:
        return db.query(Patient).filter(Patient.patient_id == id).first()

    def get_by_user_id(self, db: Session, user_id: str) -> Optional[Patient]:
        return db.query(Patient).filter(Patient.user_id == user_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[Patient]:
        # Match Patient.email or linked User.email
        patient_row = db.query(Patient).filter(func.lower(Patient.email) == func.lower(email)).first()
        if patient_row:
            return patient_row
        user_row = db.query(User).filter(func.lower(User.email) == func.lower(email)).first()
        if user_row:
            return db.query(Patient).filter(Patient.user_id == user_row.id).first()
        return None

    def get_by_clinic(
        self,
        db: Session,
        *,
        clinic_id: str,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[Patient]:
        """Get patients for a clinic using organization_patients junction table."""
        from uuid import UUID
        from app.common.models.patient import OrganizationPatient
        
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        
        # Query patients through organization_patients
        query = db.query(Patient).join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        )
        
        if search:
            # Join with User to search by name/email
            query = query.join(User, Patient.user_id == User.id)
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(User.first_name).like(like),
                    func.lower(User.last_name).like(like),
                    func.lower(User.email).like(like),
                    Patient.phone.ilike(f"%{search}%")
                )
            )
        
        return query.options(joinedload(Patient.user)).distinct().offset(skip).limit(limit).all()

    def count_by_clinic(self, db: Session, *, clinic_id: str, search: Optional[str] = None) -> int:
        """Count patients for a clinic using organization_patients junction table."""
        from uuid import UUID
        from app.common.models.patient import OrganizationPatient
        
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        
        # Query patients through organization_patients
        query = db.query(Patient).join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        )
        
        if search:
            # Join with User to search by name/email
            query = query.join(User, Patient.user_id == User.id)
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(User.first_name).like(like),
                    func.lower(User.last_name).like(like),
                    func.lower(User.email).like(like),
                    Patient.phone.ilike(f"%{search}%")
                )
            )
        
        return query.distinct().count()

    def count_new_today_by_clinic(self, db: Session, *, clinic_id: str) -> int:
        """Count new patients today for a clinic using organization_patients."""
        from uuid import UUID
        from app.common.models.patient import OrganizationPatient
        
        clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        today = datetime.now(timezone.utc).date()
        
        return db.query(Patient).join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            and_(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active",
                func.date(OrganizationPatient.first_seen_at) == today,
            )
        ).distinct().count()

    def get_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        skip: int = 0,
        limit: int = 100,
        clinic_id: Optional[str] = None
    ) -> List[Patient]:
        """Get patients for a doctor, optionally filtered by clinic via organization_patients."""
        from uuid import UUID
        from app.common.models.patient import OrganizationPatient
        
        query = db.query(Patient).join(
            Appointment, Patient.patient_id == Appointment.patient_id
        ).filter(
            Appointment.doctor_id == doctor_id
        )
        
        # If clinic_id is provided, filter by organization_patients
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.join(
                OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
            ).filter(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"
            )
        
        return query.options(joinedload(Patient.user)).distinct().offset(skip).limit(limit).all()

    def count_by_doctor(self, db: Session, *, doctor_id: str, clinic_id: Optional[str] = None) -> int:
        """Count patients for a doctor, optionally filtered by clinic via organization_patients."""
        from uuid import UUID
        from app.common.models.patient import OrganizationPatient
        
        query = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.doctor_id == doctor_id
        )
        
        # If clinic_id is provided, filter by organization_patients
        if clinic_id:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            # Need to join with organization_patients for filtering
            query = db.query(func.count(func.distinct(Patient.patient_id))).join(
                Appointment, Patient.patient_id == Appointment.patient_id
            ).join(
                OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
            ).filter(
                Appointment.doctor_id == doctor_id,
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"
            )
        
        return query.scalar() or 0

    def get_by_nurse(
        self,
        db: Session,
        *,
        nurse_id: str,
        skip: int = 0,
        limit: int = 100,
        clinic_id: Optional[str] = None
    ) -> List[Patient]:
        """Get patients assigned to a nurse, optionally filtered by clinic via organization_patients."""
        # Resolve nurse.id from provided identifier (nurse.id or users.id)
        resolved_nurse_id = self._resolve_nurse_id(db, nurse_identifier=nurse_id)
        if not resolved_nurse_id:
            return []
        subq = (
            db.query(NursePatientAssignment.patient_id)
            .filter(
                and_(
                    NursePatientAssignment.nurse_id == resolved_nurse_id,
                    NursePatientAssignment.is_active.is_(True),
                )
            )
            .subquery()
        )
        
        query = db.query(Patient).filter(Patient.patient_id.in_(subq))
        
        # If clinic_id is provided, filter by organization_patients
        if clinic_id:
            from uuid import UUID
            from app.common.models.patient import OrganizationPatient
            
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.join(
                OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
            ).filter(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"
            )
        
        return (
            query.options(joinedload(Patient.user))
            .distinct()
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_nurse(self, db: Session, *, nurse_id: str, clinic_id: Optional[str] = None) -> int:
        """Count patients assigned to a nurse, optionally filtered by clinic via organization_patients."""
        # Resolve nurse.id from provided identifier (nurse.id or users.id)
        resolved_nurse_id = self._resolve_nurse_id(db, nurse_identifier=nurse_id)
        if not resolved_nurse_id:
            return 0
        
        subq = (
            db.query(NursePatientAssignment.patient_id)
            .filter(
                and_(
                    NursePatientAssignment.nurse_id == resolved_nurse_id,
                    NursePatientAssignment.is_active.is_(True),
                )
            )
            .subquery()
        )
        
        query = db.query(func.count(func.distinct(Patient.patient_id))).filter(
            Patient.patient_id.in_(subq)
        )
        
        # If clinic_id is provided, filter by organization_patients
        if clinic_id:
            from uuid import UUID
            from app.common.models.patient import OrganizationPatient
            
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            query = query.join(
                OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
            ).filter(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"
            )
        
        return query.scalar() or 0

    def is_assigned_to_nurse(self, db: Session, *, patient_id: str, nurse_id: str) -> bool:
        # Resolve nurse.id from provided identifier (nurse.id or users.id)
        resolved_nurse_id = self._resolve_nurse_id(db, nurse_identifier=nurse_id)
        if not resolved_nurse_id:
            return False
        exists = (
            db.query(NursePatientAssignment)
            .filter(
                and_(
                    NursePatientAssignment.nurse_id == resolved_nurse_id,
                    NursePatientAssignment.patient_id == patient_id,
                    NursePatientAssignment.is_active.is_(True),
                )
            )
            .first()
        )
        return exists is not None


# Create instance
patient = CRUDPatient()