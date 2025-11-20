# app/crud/patient_portal.py
"""CRUD operations for patient portal functionality."""
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta, timezone
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
from app.common.models.messaging import SystemNotification, Message, Todo
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
            Patient.patient_id == patient_id,
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
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
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
            # patient_id is now UUID, not string
            emergency_contact = db.query(EmergencyContact).filter(
                EmergencyContact.patient_id == patient_id,
                EmergencyContact.is_primary == True
            ).first()
            
            if not emergency_contact:
                emergency_contact = EmergencyContact(
                    id=str(uuid4()),
                    patient_id=patient_id,  # Use UUID directly
                    is_primary=True,
                    name=demographics_data.get("emergencyContact", ""),
                    phone_primary=demographics_data.get("emergencyPhone", ""),
                    relationship_type="Emergency"  # Fixed: use relationship_type, not relationship
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
        
        from datetime import datetime, time
        today_start = datetime.combine(date.today(), time.min)
        
        if scope == "upcoming":
            query = query.filter(
                Appointment.appointment_date >= today_start,
                Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])
            )
        elif scope == "past":
            query = query.filter(
                or_(
                    Appointment.appointment_date < today_start,
                    Appointment.status.in_([AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW])
                )
            )
        
        return query.order_by(
            desc(Appointment.appointment_date)
        ).offset(skip).limit(limit).all()
    
    def create_appointment(
        self,
        db: Session,
        patient_id: UUID,
        appointment_data: Dict[str, Any]
    ) -> Appointment:
        """Create a new appointment."""
        # Parse date and time into a single DateTime for appointment_date
        appointment_datetime_str = f"{appointment_data['appointmentDate']}T{appointment_data['appointmentTime']}:00"
        appointment_datetime = datetime.strptime(appointment_datetime_str, "%Y-%m-%dT%H:%M:%S")
        # Make it timezone-aware (UTC)
        appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)
        
        # Find hospital by name
        hospital = db.query(Hospital).filter(
            Hospital.name == appointment_data["hospital"]
        ).first()
        
        if not hospital:
            raise ValueError(f"Hospital '{appointment_data['hospital']}' not found")
        
        # Get doctor - validate it exists in the database
        doctor_id = None
        if appointment_data.get("doctor_id"):
            try:
                doctor_uuid = UUID(appointment_data["doctor_id"])
                # Validate doctor exists
                from app.common.models.doctor import Doctor
                doctor = db.query(Doctor).filter(Doctor.id == doctor_uuid).first()
                if doctor:
                    doctor_id = doctor.id
                else:
                    raise ValueError(f"Doctor with ID {appointment_data['doctor_id']} not found")
            except ValueError as e:
                # Re-raise ValueError (doctor not found)
                raise
            except Exception as e:
                # Invalid UUID format
                raise ValueError(f"Invalid doctor ID format: {appointment_data['doctor_id']}")
        
        # If no doctor_id provided, we need to find a doctor from the same hospital/clinic
        # OR create appointment as PENDING for receptionist to assign
        if not doctor_id:
            from app.common.models.doctor import Doctor
            # Try to find an active doctor from the same hospital/clinic
            # First, get the hospital's organization_id to find doctors in the same clinic
            hospital_org_id = hospital.organization_id if hasattr(hospital, 'organization_id') else None
            
            doctor = None
            if hospital_org_id:
                # Find a doctor in the same organization/clinic
                doctor = db.query(Doctor).join(User, Doctor.user_id == User.id).filter(
                    User.is_active == True,
                    User.organization_id == hospital_org_id
                ).first()
            
            # If no doctor found in same clinic, try any active doctor
            if not doctor:
                doctor = db.query(Doctor).join(User, Doctor.user_id == User.id).filter(
                    User.is_active == True
                ).first()
            
            # If still no doctor, try any doctor
            if not doctor:
                doctor = db.query(Doctor).first()
            
            # If no doctor at all, we still need to create the appointment
            # but mark it as needing assignment by receptionist
            # Since doctor_id is required, we'll use a fallback but mark in notes
            if not doctor:
                # Try to get any doctor as last resort (required by DB constraint)
                doctor = db.query(Doctor).first()
                if not doctor:
                    raise ValueError("No doctor available. Please select a doctor from the search or contact reception.")
            
            doctor_id = doctor.id
            
            # Add a note indicating this appointment needs doctor assignment
            # This helps receptionists identify appointments that need assignment
            if not appointment_data.get("additionalNote"):
                appointment_data["additionalNote"] = "[AUTO-ASSIGNED: Needs doctor assignment]"
            elif "[AUTO-ASSIGNED" not in appointment_data.get("additionalNote", ""):
                appointment_data["additionalNote"] = f"{appointment_data.get('additionalNote', '')} [AUTO-ASSIGNED: Needs doctor assignment]"
            
            # Double-check the doctor exists before proceeding
            doctor_check = db.query(Doctor).filter(Doctor.id == doctor_id).first()
            if not doctor_check:
                raise ValueError(f"Selected doctor (ID: {doctor_id}) does not exist in the database.")
        
        # Map appointment type - convert enum to string value
        appointment_type_enum = self._map_appointment_type(appointment_data.get("appointmentType", "general_consultation"))
        appointment_type_str = appointment_type_enum.value if hasattr(appointment_type_enum, 'value') else str(appointment_type_enum)
        
        # Map status - ensure it's a string
        status_str = AppointmentStatus.PENDING.value if hasattr(AppointmentStatus.PENDING, 'value') else "pending"
        
        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            hospital_id=hospital.id,
            appointment_date=appointment_datetime,
            duration_minutes=30,  # Default 30-minute slots
            status=status_str,
            appointment_type=appointment_type_str,
            reason=appointment_data.get("additionalNote", ""),
            notes=appointment_data.get("additionalNote", "")
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
            status_enum = status_map.get(update_data["status"].lower())
            if status_enum:
                appointment.status = status_enum.value if hasattr(status_enum, 'value') else str(status_enum)
        
        # Reschedule if new date/time provided
        if "appointmentDate" in update_data and "appointmentTime" in update_data:
            # Combine date and time into a single DateTime
            appointment_datetime_str = f"{update_data['appointmentDate']}T{update_data['appointmentTime']}:00"
            appointment_datetime = datetime.strptime(appointment_datetime_str, "%Y-%m-%dT%H:%M:%S")
            # Make it timezone-aware (UTC)
            appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)
            appointment.appointment_date = appointment_datetime
            # Keep duration_minutes as is (default 30 minutes)
        
        # Update note if provided
        if "additionalNote" in update_data:
            appointment.notes = update_data["additionalNote"]
            appointment.reason = update_data["additionalNote"]
        
        appointment.updated_at = datetime.now(timezone.utc)
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
            id=str(uuid4()),  # Convert UUID to string for SQLite compatibility
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
        notification = SystemNotification(
            id=str(uuid4()),  # Convert UUID to string for SQLite compatibility
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
        # Query patient with settings relationship loaded
        patient = db.query(Patient).options(
            joinedload(Patient.settings)
        ).filter(Patient.patient_id == patient_id).first()
        if not patient:
            return None
        
        # Get settings (don't create if not exists - let update function handle creation)
        settings = patient.settings
        
        # Refresh settings if they exist to ensure we have latest data
        if settings:
            db.refresh(settings)
        
        if not settings:
            # Return default settings if none exist
            return {
                "notifications": {
                    "email": {
                        "appointments": True,
                        "reminders": True,
                        "labResults": True,
                        "prescriptions": True,
                        "newsletters": False
                    },
                    "sms": {
                        "appointments": True,
                        "reminders": True,
                        "emergencyOnly": False
                    },
                    "push": {
                        "enabled": True,
                        "appointments": True,
                        "messages": True,
                        "updates": False
                    },
                    "reminderTiming": "24hours",
                    "_id": None
                },
                "privacy": {
                    "profileVisibility": "doctors-only",
                    "shareHealthData": True,
                    "allowResearch": False,
                    "dataRetention": "5years",
                    "activityTracking": True,
                    "_id": None
                },
                "security": {
                    "twoFactor": False,
                    "loginAlerts": True,
                    "sessionTimeout": "30",
                    "deviceManagement": True,
                    "_id": None
                },
                "preferences": {
                    "language": "en",
                    "dateFormat": "MM/DD/YYYY",
                    "timeFormat": "12hour",
                    "theme": "light",
                    "fontSize": "medium",
                    "soundEnabled": True,
                    "autoPlayVideos": False
                }
            }
        
        # Log what we're reading
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[CRUD_SETTINGS_GET] Reading settings for patient {patient_id}")
        logger.info(f"[CRUD_SETTINGS_GET] email_appointments = {settings.email_appointments} (type: {type(settings.email_appointments)})")
        logger.info(f"[CRUD_SETTINGS_GET] email_reminders = {settings.email_reminders} (type: {type(settings.email_reminders)})")
        
        # Convert to the expected format with all fields
        # Handle None values explicitly (shouldn't happen with defaults, but be safe)
        return {
            "notifications": {
                "email": {
                    "appointments": bool(settings.email_appointments) if settings.email_appointments is not None else True,
                    "reminders": bool(settings.email_reminders) if settings.email_reminders is not None else True,
                    "labResults": bool(settings.email_lab_results) if settings.email_lab_results is not None else True,
                    "prescriptions": bool(settings.email_prescriptions) if settings.email_prescriptions is not None else True,
                    "newsletters": bool(settings.email_newsletters) if settings.email_newsletters is not None else False
                },
                "sms": {
                    "appointments": bool(settings.sms_appointments) if settings.sms_appointments is not None else True,
                    "reminders": bool(settings.sms_reminders) if settings.sms_reminders is not None else True,
                    "emergencyOnly": bool(settings.sms_emergency_only) if settings.sms_emergency_only is not None else False
                },
                "push": {
                    "enabled": bool(settings.push_enabled) if settings.push_enabled is not None else True,
                    "appointments": bool(settings.push_appointments) if settings.push_appointments is not None else True,
                    "messages": bool(settings.push_messages) if settings.push_messages is not None else True,
                    "updates": bool(settings.push_updates) if settings.push_updates is not None else False
                },
                "reminderTiming": settings.reminder_timing.value if settings.reminder_timing else "24hours",
                "_id": str(settings.id)
            },
            "privacy": {
                "profileVisibility": settings.profile_visibility.value if settings.profile_visibility else "doctors-only",
                "shareHealthData": bool(settings.share_health_data) if settings.share_health_data is not None else True,
                "allowResearch": bool(settings.allow_research) if settings.allow_research is not None else False,
                "dataRetention": f"{settings.data_retention_years}years" if settings.data_retention_years else "5years",
                "activityTracking": bool(settings.activity_tracking) if settings.activity_tracking is not None else True,
                "_id": str(settings.id)
            },
            "security": {
                "twoFactor": bool(settings.two_factor_enabled) if settings.two_factor_enabled is not None else False,
                "loginAlerts": bool(settings.login_alerts) if settings.login_alerts is not None else True,
                "sessionTimeout": str(settings.session_timeout_minutes) if settings.session_timeout_minutes else "30",
                "deviceManagement": bool(settings.device_management) if settings.device_management is not None else True,
                "_id": str(settings.id)
            },
            "preferences": {
                "language": settings.language.value if settings.language else "en",
                "dateFormat": settings.date_format or "MM/DD/YYYY",
                "timeFormat": settings.time_format or "12hour",
                "theme": settings.theme.value if settings.theme else "light",
                "fontSize": settings.font_size or "medium",
                "soundEnabled": bool(settings.sound_enabled) if settings.sound_enabled is not None else True,
                "autoPlayVideos": bool(settings.auto_play_videos) if settings.auto_play_videos is not None else False
            }
        }
    
    def update_patient_settings(
        self,
        db: Session,
        patient_id: str,
        settings_data: Dict[str, Any]
    ) -> bool:
        """Update patient settings with comprehensive field mapping."""
        # Convert patient_id to UUID if it's a string
        from uuid import UUID as UUIDType
        if isinstance(patient_id, str):
            try:
                patient_id_uuid = UUIDType(patient_id)
            except ValueError:
                return False
        else:
            patient_id_uuid = patient_id
        
        # Load patient with settings relationship
        patient = db.query(Patient).options(
            joinedload(Patient.settings)
        ).filter(Patient.patient_id == patient_id_uuid).first()
        if not patient:
            return False
            
        settings = patient.settings
        if not settings:
            # Create new settings with explicit default values to avoid None issues
            # patient_id is now UUID type in the model, so use UUID directly
            settings = PatientSettings(
                id=str(uuid4()),
                patient_id=patient_id_uuid,
                # Set explicit defaults for all boolean fields
                email_appointments=True,
                email_reminders=True,
                email_lab_results=True,
                email_prescriptions=True,
                email_newsletters=False,
                sms_appointments=True,
                sms_reminders=True,
                sms_emergency_only=False,
                push_enabled=True,
                push_appointments=True,
                push_messages=True,
                push_updates=False,
                share_health_data=True,
                allow_research=False,
                activity_tracking=True,
                two_factor_enabled=False,
                login_alerts=True,
                session_timeout_minutes=30,
                device_management=True,
                sound_enabled=True,
                auto_play_videos=False
            )
            db.add(settings)
            db.flush()  # Flush to get the ID before continuing
        
        # Update notifications - Email settings
        if "notifications" in settings_data:
            notif = settings_data["notifications"]
            
            # Email notifications
            if "email" in notif:
                email = notif["email"]
                # Use explicit checks to allow False values to be saved
                if "appointments" in email:
                    settings.email_appointments = email["appointments"]
                if "reminders" in email:
                    settings.email_reminders = email["reminders"]
                if "labResults" in email:
                    settings.email_lab_results = email["labResults"]
                if "prescriptions" in email:
                    settings.email_prescriptions = email["prescriptions"]
                if "newsletters" in email:
                    settings.email_newsletters = email["newsletters"]
            
            # SMS notifications
            if "sms" in notif:
                sms = notif["sms"]
                if "appointments" in sms:
                    settings.sms_appointments = sms["appointments"]
                if "reminders" in sms:
                    settings.sms_reminders = sms["reminders"]
                if "emergencyOnly" in sms:
                    settings.sms_emergency_only = sms["emergencyOnly"]
            
            # Push notifications
            if "push" in notif:
                push = notif["push"]
                if "enabled" in push:
                    settings.push_enabled = push["enabled"]
                if "appointments" in push:
                    settings.push_appointments = push["appointments"]
                if "messages" in push:
                    settings.push_messages = push["messages"]
                if "updates" in push:
                    settings.push_updates = push["updates"]
            
            # Reminder timing
            if "reminderTiming" in notif:
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
        
        # Update privacy settings
        if "privacy" in settings_data:
            privacy = settings_data["privacy"]
            if "profileVisibility" in privacy:
                from app.common.models.patient import ProfileVisibility
                visibility_map = {
                    "public": ProfileVisibility.PUBLIC,
                    "doctors-only": ProfileVisibility.DOCTORS_ONLY,
                    "private": ProfileVisibility.PRIVATE
                }
                settings.profile_visibility = visibility_map.get(privacy["profileVisibility"], ProfileVisibility.DOCTORS_ONLY)
            if "shareHealthData" in privacy:
                settings.share_health_data = privacy["shareHealthData"]
            if "allowResearch" in privacy:
                settings.allow_research = privacy["allowResearch"]
            if "dataRetention" in privacy:
                # Parse data retention (e.g., "5years" -> 5)
                retention_str = privacy["dataRetention"]
                if retention_str and retention_str.endswith("years"):
                    settings.data_retention_years = int(retention_str.replace("years", ""))
            if "activityTracking" in privacy:
                settings.activity_tracking = privacy["activityTracking"]
        
        # Update security settings
        if "security" in settings_data:
            security = settings_data["security"]
            if "twoFactor" in security:
                settings.two_factor_enabled = security["twoFactor"]
            if "loginAlerts" in security:
                settings.login_alerts = security["loginAlerts"]
            if "sessionTimeout" in security:
                try:
                    settings.session_timeout_minutes = int(security["sessionTimeout"])
                except (ValueError, TypeError):
                    pass  # Keep existing value if conversion fails
            if "deviceManagement" in security:
                settings.device_management = security["deviceManagement"]
        
        # Update preferences
        if "preferences" in settings_data:
            prefs = settings_data["preferences"]
            if "language" in prefs:
                from app.common.models.patient import Language
                lang_map = {"en": Language.EN, "uz": Language.UZ, "ru": Language.RU}
                settings.language = lang_map.get(prefs["language"], Language.EN)
            if "dateFormat" in prefs:
                settings.date_format = prefs["dateFormat"]
            if "timeFormat" in prefs:
                settings.time_format = prefs["timeFormat"]
            if "theme" in prefs:
                from app.common.models.patient import Theme
                theme_map = {"light": Theme.LIGHT, "dark": Theme.DARK, "auto": Theme.AUTO}
                settings.theme = theme_map.get(prefs["theme"], Theme.LIGHT)
            if "fontSize" in prefs:
                settings.font_size = prefs["fontSize"]
            if "soundEnabled" in prefs:
                settings.sound_enabled = prefs["soundEnabled"]
            if "autoPlayVideos" in prefs:
                settings.auto_play_videos = prefs["autoPlayVideos"]
        
        settings.updated_at = datetime.utcnow()
        
        # Log what we're about to save
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[CRUD_SETTINGS] Saving settings for patient {patient_id}")
        logger.info(f"[CRUD_SETTINGS] email_appointments = {settings.email_appointments}")
        logger.info(f"[CRUD_SETTINGS] email_reminders = {settings.email_reminders}")
        
        db.commit()
        db.refresh(settings)
        
        # Verify what was actually saved
        logger.info(f"[CRUD_SETTINGS] After commit and refresh:")
        logger.info(f"[CRUD_SETTINGS] email_appointments = {settings.email_appointments}")
        logger.info(f"[CRUD_SETTINGS] email_reminders = {settings.email_reminders}")
        
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
            id=str(uuid4()),  # Convert UUID to string for SQLite compatibility
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
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
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