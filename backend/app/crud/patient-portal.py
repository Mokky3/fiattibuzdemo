# app/crud/patient_portal.py
"""CRUD operations for patient portal functionality."""
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import and_, or_, func, desc, asc
from uuid import UUID, uuid4

from app.crud.base import CRUDBase
from app.crud.clinical import condition as condition_crud, observation as observation_crud
from app.crud.clinical import allergy_intolerance as allergy_crud, immunization as immunization_crud
from app.crud.financial import patient_account as account_crud
from app.common.models.patient import Patient, PatientSettings, EmergencyContact, InsurancePolicy
from app.common.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.common.models.prescription import Prescription, PrescriptionStatus
from app.common.models.medical import MedicalRecord, VitalSign
from app.common.models.clinical import Condition, Observation, AllergyIntolerance, Immunization, ClinicalStatus
from app.common.models.user import User, UserRole
from app.common.models.doctor import Doctor
from app.common.models.hospital import Hospital
from app.common.models.messaging import Notification, Message, Todo
from app.common.models.practitioner import Practitioner, PractitionerRole


class CRUDPatientPortal:
    """CRUD operations for patient portal."""
    
    # ==================== Profile Management ====================
    
    def get_patient_profile(
        self, 
        db: Session, 
        patient_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get comprehensive patient profile with related data."""
        patient = db.query(Patient).options(
            joinedload(Patient.emergency_contacts),
            joinedload(Patient.insurance_policies),
            joinedload(Patient.user)
        ).filter(
            Patient.id == patient_id,
            Patient.status == "active"
        ).first()
        
        if not patient:
            return None
            
        # Get latest vital signs
        latest_vitals = db.query(VitalSign).filter(
            VitalSign.patient_id == patient_id
        ).order_by(desc(VitalSign.measured_at)).limit(5).all()
        
        # Get allergies using clinical CRUD
        allergies = allergy_crud.get_patient_allergies(
            db,
            patient_id=patient_id,
            include_inactive=False
        )
        
        # Get chronic conditions using clinical CRUD
        conditions = condition_crud.get_patient_conditions(
            db,
            patient_id=patient_id,
            clinical_status=ClinicalStatus.ACTIVE
        )
        
        # Get immunizations using clinical CRUD
        immunizations = immunization_crud.get_patient_immunizations(
            db,
            patient_id=patient_id,
            limit=20
        )
        
        # Get active insurance
        active_insurance = None
        for policy in patient.insurance_policies:
            if policy.is_active and (not policy.valid_to or policy.valid_to >= date.today()):
                active_insurance = policy
                break
        
        return {
            "patient": patient,
            "vitals": latest_vitals,
            "allergies": allergies,
            "conditions": conditions,
            "immunizations": immunizations,
            "insurance": active_insurance
        }
    
    def update_patient_demographics(
        self,
        db: Session,
        patient_id: UUID,
        demographics_data: Dict[str, Any]
    ) -> Optional[Patient]:
        """Update patient demographic information."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return None
            
        # Update name if provided
        if "fullName" in demographics_data:
            names = demographics_data["fullName"].split(" ", 1)
            patient.first_name = names[0]
            patient.last_name = names[1] if len(names) > 1 else ""
            
        # Update other fields
        update_mapping = {
            "email": "email",
            "phone": "phone",
            "address": "address"
        }
        
        for key, field in update_mapping.items():
            if key in demographics_data:
                setattr(patient, field, demographics_data[key])
        
        # Update emergency contact
        if "emergencyContact" in demographics_data or "emergencyPhone" in demographics_data:
            emergency_contact = db.query(EmergencyContact).filter(
                EmergencyContact.patient_id == patient_id,
                EmergencyContact.is_primary == True
            ).first()
            
            if not emergency_contact:
                emergency_contact = EmergencyContact(
                    id=uuid4(),
                    patient_id=patient_id,
                    is_primary=True,
                    name=demographics_data.get("emergencyContact", ""),
                    phone_primary=demographics_data.get("emergencyPhone", ""),
                    relationship="Emergency Contact"
                )
                db.add(emergency_contact)
            else:
                if "emergencyContact" in demographics_data:
                    emergency_contact.name = demographics_data["emergencyContact"]
                if "emergencyPhone" in demographics_data:
                    emergency_contact.phone_primary = demographics_data["emergencyPhone"]
        
        db.commit()
        db.refresh(patient)
        return patient
    
    # ==================== Appointments ====================
    
    def get_patient_appointments(
        self,
        db: Session,
        patient_id: UUID,
        scope: str = "upcoming",
        skip: int = 0,
        limit: int = 50
    ) -> List[Appointment]:
        """Get patient appointments based on scope (upcoming/past)."""
        query = db.query(Appointment).options(
            joinedload(Appointment.doctor).joinedload(Doctor.user),
            joinedload(Appointment.hospital)
        ).filter(
            Appointment.patient_id == patient_id
        )
        
        today = date.today()
        
        if scope == "upcoming":
            query = query.filter(
                Appointment.appointment_date >= today,
                Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])
            )
        elif scope == "past":
            query = query.filter(
                or_(
                    Appointment.appointment_date < today,
                    Appointment.status.in_([AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW])
                )
            )
        
        return query.order_by(
            desc(Appointment.appointment_date),
            desc(Appointment.start_time)
        ).offset(skip).limit(limit).all()
    
    def create_appointment(
        self,
        db: Session,
        patient_id: UUID,
        appointment_data: Dict[str, Any]
    ) -> Appointment:
        """Create a new appointment."""
        # Parse date and time
        appointment_date = datetime.strptime(appointment_data["appointmentDate"], "%Y-%m-%d").date()
        start_time = datetime.strptime(
            f"{appointment_data['appointmentDate']}T{appointment_data['appointmentTime']}:00",
            "%Y-%m-%dT%H:%M:%S"
        )
        end_time = start_time + timedelta(minutes=30)  # Default 30-minute slots
        
        # Find hospital by name
        hospital = db.query(Hospital).filter(
            Hospital.name == appointment_data["hospital"]
        ).first()
        
        # Get doctor if provided
        doctor_id = None
        if appointment_data.get("doctor_id"):
            doctor_id = UUID(appointment_data["doctor_id"])
        
        appointment = Appointment(
            id=uuid4(),
            patient_id=patient_id,
            hospital_id=hospital.id if hospital else None,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=end_time,
            appointment_type=self._map_appointment_type(appointment_data["appointmentType"]),
            status=AppointmentStatus.PENDING,
            description=appointment_data.get("additionalNote", ""),
            patient_instruction=appointment_data.get("additionalNote", ""),
            created_by=patient_id,  # Assuming patient creates their own appointment
            created_at=datetime.utcnow()
        )
        
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment
    
    def update_appointment(
        self,
        db: Session,
        patient_id: UUID,
        appointment_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Appointment]:
        """Update an appointment (reschedule or cancel)."""
        appointment = db.query(Appointment).filter(
            Appointment.id == UUID(appointment_id),
            Appointment.patient_id == patient_id
        ).first()
        
        if not appointment:
            return None
        
        # Update status if provided
        if "status" in update_data:
            status_map = {
                "cancelled": AppointmentStatus.CANCELLED,
                "noshow": AppointmentStatus.NO_SHOW
            }
            appointment.status = status_map.get(update_data["status"])
            if appointment.status == AppointmentStatus.CANCELLED:
                appointment.cancelled_at = datetime.utcnow()
                appointment.cancelled_by = patient_id
        
        # Reschedule if new date/time provided
        if "appointmentDate" in update_data and "appointmentTime" in update_data:
            appointment.appointment_date = datetime.strptime(
                update_data["appointmentDate"], "%Y-%m-%d"
            ).date()
            appointment.start_time = datetime.strptime(
                f"{update_data['appointmentDate']}T{update_data['appointmentTime']}:00",
                "%Y-%m-%dT%H:%M:%S"
            )
            appointment.end_time = appointment.start_time + timedelta(minutes=30)
            appointment.reschedule_count += 1
        
        # Update note if provided
        if "additionalNote" in update_data:
            appointment.description = update_data["additionalNote"]
            appointment.patient_instruction = update_data["additionalNote"]
        
        appointment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(appointment)
        return appointment
    
    # ==================== Medical Records ====================
    
    def get_patient_records(
        self,
        db: Session,
        patient_id: UUID,
        record_type: str = "Medical card",
        page: int = 1,
        size: int = 10
    ) -> Dict[str, Any]:
        """Get patient medical records with pagination."""
        query = db.query(MedicalRecord).options(
            joinedload(MedicalRecord.doctor).joinedload(Doctor.user),
            joinedload(MedicalRecord.hospital)
        ).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.status.in_(["final", "amended"])
        )
        
        # Apply type filter based on specialty map
        if record_type != "Medical card":
            # Map UI filter to record types
            type_mapping = {
                "Consultations": ["consultation", "follow_up"],
                "Surgery": ["surgery", "procedure"],
                "Diagnosis": ["diagnostic"],
                # Add more mappings as needed
            }
            
            if record_type in type_mapping:
                query = query.filter(
                    MedicalRecord.record_type.in_(type_mapping[record_type])
                )
            elif record_type in ["Cardiologist", "Dermatologist", "Psychologist", "Allergist", "Therapist", "Dentist"]:
                # Filter by doctor specialty
                query = query.join(Doctor).filter(
                    Doctor.specialization.ilike(f"%{record_type}%")
                )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        records = query.order_by(
            desc(MedicalRecord.record_date)
        ).offset((page - 1) * size).limit(size).all()
        
        return {
            "total": total,
            "page": page,
            "size": size,
            "items": records
        }
    
    # ==================== Prescriptions ====================
    
    def get_patient_prescriptions(
        self,
        db: Session,
        patient_id: UUID,
        scope: str = "active"
    ) -> List[Prescription]:
        """Get patient prescriptions based on scope."""
        query = db.query(Prescription).options(
            joinedload(Prescription.doctor).joinedload(Doctor.user),
            joinedload(Prescription.hospital)
        ).filter(
            Prescription.patient_id == patient_id
        )
        
        today = date.today()
        
        if scope == "active":
            query = query.filter(
                Prescription.status == PrescriptionStatus.ACTIVE,
                or_(
                    Prescription.end_date.is_(None),
                    Prescription.end_date >= today
                )
            )
        elif scope == "expired":
            query = query.filter(
                or_(
                    and_(
                        Prescription.end_date.isnot(None),
                        Prescription.end_date < today
                    ),
                    Prescription.status.in_([
                        PrescriptionStatus.COMPLETED,
                        PrescriptionStatus.EXPIRED,
                        PrescriptionStatus.CANCELLED
                    ])
                )
            )
        
        return query.order_by(desc(Prescription.prescribed_date)).all()
    
    def request_prescription_refill(
        self,
        db: Session,
        patient_id: UUID,
        prescription_id: str,
        pharmacy_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a prescription refill request."""
        prescription = db.query(Prescription).filter(
            Prescription.id == UUID(prescription_id),
            Prescription.patient_id == patient_id
        ).first()
        
        if not prescription:
            return None
        
        # Check if refills are available
        if prescription.remaining_refills <= 0:
            return {"error": "No refills remaining"}
        
        # Create a todo/task for the doctor
        todo = Todo(
            id=uuid4(),
            description=f"Prescription refill request for {prescription.medicine_name}",
            category="prescription",
            priority="high",
            created_by=patient_id,
            assigned_to=prescription.doctor.user_id,
            patient_id=patient_id,
            date=date.today().isoformat(),
            notes=f"Patient requested refill. Prescription #{prescription.prescription_number}",
            created_at=datetime.utcnow()
        )
        
        db.add(todo)
        
        # Also create a notification
        notification = Notification(
            id=uuid4(),
            recipient_id=prescription.doctor.user_id,
            sender_id=patient_id,
            title="Prescription Refill Request",
            message=f"Patient {prescription.patient.first_name} {prescription.patient.last_name} has requested a refill for {prescription.medicine_name}",
            notification_type="info",
            action_url=f"/prescriptions/{prescription_id}",
            action_required=True,
            reference_type="prescription",
            reference_id=str(prescription.id),
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        db.commit()
        
        return {"taskId": str(todo.id), "status": "requested"}
    
    # ==================== Doctor Search ====================
    
    def search_doctors(
        self,
        db: Session,
        full_name: Optional[str] = None,
        hospital: Optional[str] = None,
        specialty: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search for doctors based on criteria."""
        # Use Practitioner model for FHIR compatibility
        query = db.query(Practitioner).join(
            Practitioner.user
        ).join(
            PractitionerRole, 
            Practitioner.practitioner_roles
        ).filter(
            User.role == UserRole.DOCTOR,
            User.is_active == True
        )
        
        if full_name:
            search_term = f"%{full_name}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    func.concat(User.first_name, ' ', User.last_name).ilike(search_term)
                )
            )
        
        if specialty:
            # Search in practitioner roles
            query = query.join(PractitionerRole.specialties).filter(
                func.lower(func.jsonb_extract_path_text(PractitionerRole.roles, '0', 'text')).contains(specialty.lower())
            )
        
        if hospital:
            query = query.join(PractitionerRole.organization).filter(
                Hospital.name.ilike(f"%{hospital}%")
            )
        
        practitioners = query.limit(limit).all()
        
        # Format response
        result = []
        for practitioner in practitioners:
            # Get primary role
            primary_role = next((role for role in practitioner.practitioner_roles if role.active), None)
            
            result.append({
                "id": str(practitioner.id),
                "fullName": f"{practitioner.user.first_name} {practitioner.user.last_name}",
                "specialty": primary_role.roles[0].get('text') if primary_role and primary_role.roles else None,
                "hospital": primary_role.organization.name if primary_role else None
            })
        
        return result
    
    # ==================== Settings ====================
    
    def get_patient_settings(
        self,
        db: Session,
        patient_id: UUID
    ) -> Dict[str, Any]:
        """Get patient settings and preferences."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return None
        
        # Get or create settings
        settings = patient.settings
        
        if not settings:
            settings = PatientSettings(
                id=uuid4(),
                patient_id=patient_id
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return {
            "notifications": {
                "enabled": settings.email_appointments or settings.sms_appointments,
                "reminderTiming": settings.reminder_timing.value if settings.reminder_timing else "24hours",
                "_id": str(settings.id)
            },
            "privacy": {
                "allowResearch": settings.allow_research,
                "shareHealthData": settings.share_health_data,
                "_id": str(settings.id)
            },
            "preferences": {
                "language": settings.language.value if settings.language else "en"
            }
        }
    
    def update_patient_settings(
        self,
        db: Session,
        patient_id: UUID,
        settings_data: Dict[str, Any]
    ) -> bool:
        """Update patient settings."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return False
            
        settings = patient.settings
        if not settings:
            settings = PatientSettings(
                id=uuid4(),
                patient_id=patient_id
            )
            db.add(settings)
        
        # Update notifications
        if "notifications" in settings_data:
            notif = settings_data["notifications"]
            if "enabled" in notif:
                settings.email_appointments = notif["enabled"]
                settings.sms_appointments = notif["enabled"]
            if "reminderTiming" in notif:
                # Parse reminder timing (e.g., "24hours" -> "HOUR_24")
                timing_map = {
                    "15min": "MIN_15",
                    "30min": "MIN_30",
                    "1hour": "HOUR_1",
                    "2hours": "HOUR_2",
                    "24hours": "HOUR_24",
                    "48hours": "HOUR_48"
                }
                from app.common.models.patient import ReminderTiming
                settings.reminder_timing = ReminderTiming[timing_map.get(notif["reminderTiming"], "HOUR_24")]
        
        # Update privacy
        if "privacy" in settings_data:
            privacy = settings_data["privacy"]
            if "allowResearch" in privacy:
                settings.allow_research = privacy["allowResearch"]
            if "shareHealthData" in privacy:
                settings.share_health_data = privacy["shareHealthData"]
        
        # Update preferences
        if "preferences" in settings_data:
            prefs = settings_data["preferences"]
            if "language" in prefs:
                from app.common.models.patient import Language
                lang_map = {"en": Language.EN, "uz": Language.UZ, "ru": Language.RU}
                settings.language = lang_map.get(prefs["language"], Language.EN)
        
        settings.updated_at = datetime.utcnow()
        db.commit()
        return True
    
    # ==================== Messages ====================
    
    def get_patient_messages(
        self,
        db: Session,
        patient_id: UUID,
        conversation_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Message]:
        """Get patient messages."""
        query = db.query(Message).filter(
            or_(
                Message.sender_id == patient_id,
                Message.recipient_id == patient_id,
                Message.patient_id == patient_id
            )
        )
        
        if conversation_id:
            query = query.filter(Message.conversation_id == conversation_id)
        
        return query.order_by(desc(Message.timestamp)).offset(skip).limit(limit).all()
    
    def send_message(
        self,
        db: Session,
        patient_id: UUID,
        recipient_id: UUID,
        content: str,
        priority: str = "normal"
    ) -> Message:
        """Send a message from patient."""
        message = Message(
            id=uuid4(),
            conversation_id=str(uuid4()),  # Could be existing conversation
            sender_id=patient_id,
            recipient_id=recipient_id,
            content=content,
            priority=priority,
            timestamp=datetime.utcnow()
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    # ==================== Helper Methods ====================
    
    def _map_appointment_type(self, type_string: str) -> AppointmentType:
        """Map string appointment type to enum."""
        type_mapping = {
            "general consultation": AppointmentType.GENERAL_CONSULTATION,
            "follow-up": AppointmentType.FOLLOW_UP,
            "annual check-up": AppointmentType.ANNUAL_CHECK_UP,
            "emergency": AppointmentType.EMERGENCY,
            "specialist": AppointmentType.SPECIALIST,
            "therapy": AppointmentType.THERAPY,
            "diagnostic": AppointmentType.DIAGNOSTIC,
            "procedure": AppointmentType.PROCEDURE,
            "vaccination": AppointmentType.VACCINATION,
            "telemedicine": AppointmentType.TELEMEDICINE,
        }
        
        return type_mapping.get(type_string.lower(), AppointmentType.GENERAL_CONSULTATION)
    
    def get_patient_summary(
        self,
        db: Session,
        patient_id: UUID
    ) -> Dict[str, Any]:
        """Get comprehensive patient summary for dashboard."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return None
        
        # Count upcoming appointments
        upcoming_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.patient_id == patient_id,
            Appointment.appointment_date >= date.today(),
            Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])
        ).scalar()
        
        # Count active prescriptions
        active_prescriptions = db.query(func.count(Prescription.id)).filter(
            Prescription.patient_id == patient_id,
            Prescription.status == PrescriptionStatus.ACTIVE
        ).scalar()
        
        # Get latest vitals
        latest_vital = db.query(VitalSign).filter(
            VitalSign.patient_id == patient_id
        ).order_by(desc(VitalSign.measured_at)).first()
        
        # Count unread messages
        unread_messages = db.query(func.count(Message.id)).filter(
            Message.recipient_id == patient_id,
            Message.read == False
        ).scalar()
        
        return {
            "patient_id": str(patient_id),
            "full_name": f"{patient.first_name} {patient.last_name}",
            "upcoming_appointments": upcoming_appointments,
            "active_prescriptions": active_prescriptions,
            "unread_messages": unread_messages,
            "latest_vitals": {
                "date": latest_vital.measured_at if latest_vital else None,
                "blood_pressure": f"{latest_vital.blood_pressure_systolic}/{latest_vital.blood_pressure_diastolic}" if latest_vital and latest_vital.blood_pressure_systolic else None,
                "heart_rate": latest_vital.heart_rate if latest_vital else None,
                "weight": latest_vital.weight if latest_vital else None
            },
            "has_allergies": len(patient.allergies) > 0,
            "active_conditions": len([c for c in patient.conditions if c.clinical_status == ClinicalStatus.ACTIVE])
        }


# Create singleton instance
patient_portal_crud = CRUDPatientPortal()