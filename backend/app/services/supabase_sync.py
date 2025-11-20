"""Supabase synchronization service for mapping FHIR resources to canonical tables."""
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

from app.db.session import get_db
from app.common.schemas.responses_enhanced import AuditLogEntry

class SupabaseSyncService:
    """Service for synchronizing FHIR resources with Supabase canonical tables."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def sync_patient_to_canonical(self, fhir_patient: Dict[str, Any]) -> Dict[str, Any]:
        """Sync FHIR Patient to canonical patients table."""
        try:
            # Extract patient data from FHIR
            patient_data = self._extract_patient_data(fhir_patient)
            
            # Check if patient already exists
            existing_patient = self._get_canonical_patient(fhir_patient["id"])
            
            if existing_patient:
                # Update existing patient
                updated_patient = self._update_canonical_patient(fhir_patient["id"], patient_data)
                return updated_patient
            else:
                # Create new patient
                new_patient = self._create_canonical_patient(patient_data)
                return new_patient
                
        except Exception as e:
            # Log error and re-raise
            print(f"Error syncing patient {fhir_patient.get('id', 'unknown')}: {str(e)}")
            raise
    
    async def sync_practitioner_to_canonical(self, fhir_practitioner: Dict[str, Any]) -> Dict[str, Any]:
        """Sync FHIR Practitioner to canonical users table."""
        try:
            # Extract practitioner data from FHIR
            practitioner_data = self._extract_practitioner_data(fhir_practitioner)
            
            # Check if practitioner already exists
            existing_practitioner = self._get_canonical_user(fhir_practitioner["id"])
            
            if existing_practitioner:
                # Update existing practitioner
                updated_practitioner = self._update_canonical_user(fhir_practitioner["id"], practitioner_data)
                return updated_practitioner
            else:
                # Create new practitioner
                new_practitioner = self._create_canonical_user(practitioner_data)
                return new_practitioner
                
        except Exception as e:
            print(f"Error syncing practitioner {fhir_practitioner.get('id', 'unknown')}: {str(e)}")
            raise
    
    async def sync_appointment_to_canonical(self, fhir_appointment: Dict[str, Any]) -> Dict[str, Any]:
        """Sync FHIR Appointment to canonical appointments table."""
        try:
            # Extract appointment data from FHIR
            appointment_data = self._extract_appointment_data(fhir_appointment)
            
            # Check if appointment already exists
            existing_appointment = self._get_canonical_appointment(fhir_appointment["id"])
            
            if existing_appointment:
                # Update existing appointment
                updated_appointment = self._update_canonical_appointment(fhir_appointment["id"], appointment_data)
                return updated_appointment
            else:
                # Create new appointment
                new_appointment = self._create_canonical_appointment(appointment_data)
                return new_appointment
                
        except Exception as e:
            print(f"Error syncing appointment {fhir_appointment.get('id', 'unknown')}: {str(e)}")
            raise
    
    async def sync_medication_request_to_canonical(self, fhir_medication_request: Dict[str, Any]) -> Dict[str, Any]:
        """Sync FHIR MedicationRequest to canonical prescriptions table."""
        try:
            # Extract prescription data from FHIR
            prescription_data = self._extract_prescription_data(fhir_medication_request)
            
            # Check if prescription already exists
            existing_prescription = self._get_canonical_prescription(fhir_medication_request["id"])
            
            if existing_prescription:
                # Update existing prescription
                updated_prescription = self._update_canonical_prescription(fhir_medication_request["id"], prescription_data)
                return updated_prescription
            else:
                # Create new prescription
                new_prescription = self._create_canonical_prescription(prescription_data)
                return new_prescription
                
        except Exception as e:
            print(f"Error syncing medication request {fhir_medication_request.get('id', 'unknown')}: {str(e)}")
            raise
    
    async def sync_observation_to_canonical(self, fhir_observation: Dict[str, Any]) -> Dict[str, Any]:
        """Sync FHIR Observation to canonical observations table."""
        try:
            # Extract observation data from FHIR
            observation_data = self._extract_observation_data(fhir_observation)
            
            # Check if observation already exists
            existing_observation = self._get_canonical_observation(fhir_observation["id"])
            
            if existing_observation:
                # Update existing observation
                updated_observation = self._update_canonical_observation(fhir_observation["id"], observation_data)
                return updated_observation
            else:
                # Create new observation
                new_observation = self._create_canonical_observation(observation_data)
                return new_observation
                
        except Exception as e:
            print(f"Error syncing observation {fhir_observation.get('id', 'unknown')}: {str(e)}")
            raise
    
    def _extract_patient_data(self, fhir_patient: Dict[str, Any]) -> Dict[str, Any]:
        """Extract patient data from FHIR Patient resource."""
        name = fhir_patient.get("name", [{}])[0] if fhir_patient.get("name") else {}
        
        # Extract contact information
        telecom = fhir_patient.get("telecom", [])
        email = None
        phone = None
        for contact in telecom:
            if contact.get("system") == "email":
                email = contact.get("value")
            elif contact.get("system") == "phone":
                phone = contact.get("value")
        
        # Extract address
        address = fhir_patient.get("address", [{}])[0] if fhir_patient.get("address") else {}
        
        return {
            "fhir_id": fhir_patient["id"],
            "fhir_version_id": fhir_patient.get("meta", {}).get("versionId"),
            "first_name": name.get("given", [""])[0] if name.get("given") else "",
            "last_name": name.get("family", ""),
            "email": email,
            "phone": phone,
            "gender": fhir_patient.get("gender"),
            "date_of_birth": fhir_patient.get("birthDate"),
            "address": address.get("text", ""),
            "city": address.get("city", ""),
            "state": address.get("state", ""),
            "postal_code": address.get("postalCode", ""),
            "country": address.get("country", ""),
            "active": fhir_patient.get("active", True),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    def _extract_practitioner_data(self, fhir_practitioner: Dict[str, Any]) -> Dict[str, Any]:
        """Extract practitioner data from FHIR Practitioner resource."""
        name = fhir_practitioner.get("name", [{}])[0] if fhir_practitioner.get("name") else {}
        
        # Extract contact information
        telecom = fhir_practitioner.get("telecom", [])
        email = None
        phone = None
        for contact in telecom:
            if contact.get("system") == "email":
                email = contact.get("value")
            elif contact.get("system") == "phone":
                phone = contact.get("value")
        
        # Extract qualification/specialty
        specialty = "Unknown"
        if fhir_practitioner.get("qualification"):
            qualification = fhir_practitioner["qualification"][0].get("code", {}).get("coding", [{}])[0]
            specialty = qualification.get("display", "Unknown")
        
        # Extract organization/clinic
        clinic_id = None
        if fhir_practitioner.get("practitionerRole"):
            org_ref = fhir_practitioner["practitionerRole"][0].get("organization", {}).get("reference")
            if org_ref:
                clinic_id = org_ref.split("/")[-1]
        
        return {
            "fhir_id": fhir_practitioner["id"],
            "fhir_version_id": fhir_practitioner.get("meta", {}).get("versionId"),
            "first_name": name.get("given", [""])[0] if name.get("given") else "",
            "last_name": name.get("family", ""),
            "email": email,
            "phone": phone,
            "specialty": specialty,
            "clinic_id": clinic_id,
            "role": "doctor",  # Default role
            "active": fhir_practitioner.get("active", True),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    def _extract_appointment_data(self, fhir_appointment: Dict[str, Any]) -> Dict[str, Any]:
        """Extract appointment data from FHIR Appointment resource."""
        # Extract participants
        patient_id = None
        doctor_id = None
        for participant in fhir_appointment.get("participant", []):
            ref = participant["actor"]["reference"]
            if ref.startswith("Patient/"):
                patient_id = ref.split("/")[-1]
            elif ref.startswith("Practitioner/"):
                doctor_id = ref.split("/")[-1]
        
        # Extract time
        start_time = fhir_appointment.get("start")
        end_time = fhir_appointment.get("end")
        
        return {
            "fhir_id": fhir_appointment["id"],
            "fhir_version_id": fhir_appointment.get("meta", {}).get("versionId"),
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": start_time.split("T")[0] if start_time else None,
            "start_time": start_time,
            "end_time": end_time,
            "status": fhir_appointment.get("status"),
            "description": fhir_appointment.get("description"),
            "appointment_type": self._extract_appointment_type(fhir_appointment),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    def _extract_prescription_data(self, fhir_medication_request: Dict[str, Any]) -> Dict[str, Any]:
        """Extract prescription data from FHIR MedicationRequest resource."""
        # Extract medication
        medication = fhir_medication_request.get("medicationCodeableConcept", {}).get("coding", [{}])[0]
        
        # Extract dosage
        dosage = fhir_medication_request.get("dosageInstruction", [{}])[0]
        
        # Extract prescriber
        prescriber_id = None
        if fhir_medication_request.get("requester", {}).get("reference"):
            prescriber_ref = fhir_medication_request["requester"]["reference"]
            prescriber_id = prescriber_ref.split("/")[-1]
        
        # Extract patient
        patient_id = None
        if fhir_medication_request.get("subject", {}).get("reference"):
            patient_ref = fhir_medication_request["subject"]["reference"]
            patient_id = patient_ref.split("/")[-1]
        
        return {
            "fhir_id": fhir_medication_request["id"],
            "fhir_version_id": fhir_medication_request.get("meta", {}).get("versionId"),
            "patient_id": patient_id,
            "prescriber_id": prescriber_id,
            "medication_name": medication.get("display", ""),
            "dosage": dosage.get("text", ""),
            "frequency": dosage.get("timing", {}).get("repeat", {}).get("frequency", ""),
            "status": fhir_medication_request.get("status"),
            "authored_on": fhir_medication_request.get("authoredOn"),
            "valid_until": fhir_medication_request.get("dispenseRequest", {}).get("validityPeriod", {}).get("end"),
            "refills_remaining": fhir_medication_request.get("dispenseRequest", {}).get("numberOfRepeatsAllowed", 0),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    def _extract_observation_data(self, fhir_observation: Dict[str, Any]) -> Dict[str, Any]:
        """Extract observation data from FHIR Observation resource."""
        # Extract patient
        patient_id = None
        if fhir_observation.get("subject", {}).get("reference"):
            patient_ref = fhir_observation["subject"]["reference"]
            patient_id = patient_ref.split("/")[-1]
        
        # Extract value
        value = fhir_observation.get("valueQuantity", {})
        
        # Extract code
        code = fhir_observation.get("code", {}).get("coding", [{}])[0]
        
        return {
            "fhir_id": fhir_observation["id"],
            "fhir_version_id": fhir_observation.get("meta", {}).get("versionId"),
            "patient_id": patient_id,
            "observation_type": code.get("code", ""),
            "observation_name": code.get("display", ""),
            "value": value.get("value"),
            "unit": value.get("unit"),
            "effective_date": fhir_observation.get("effectiveDateTime"),
            "status": fhir_observation.get("status"),
            "category": fhir_observation.get("category", [{}])[0].get("coding", [{}])[0].get("code", ""),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    
    def _extract_appointment_type(self, fhir_appointment: Dict[str, Any]) -> str:
        """Extract appointment type from FHIR Appointment."""
        # Check extensions for custom appointment type
        for ext in fhir_appointment.get("extension", []):
            if ext.get("url") == "http://example.org/appointment-type":
                return ext.get("valueString", "consultation")
        
        # Check service type
        if fhir_appointment.get("serviceType"):
            return fhir_appointment["serviceType"][0].get("coding", [{}])[0].get("display", "consultation")
        
        return "consultation"
    
    # Database operations for canonical tables
    def _get_canonical_patient(self, fhir_id: str) -> Optional[Dict[str, Any]]:
        """Get patient from canonical table by FHIR ID."""
        query = text("""
            SELECT * FROM patients 
            WHERE fhir_id = :fhir_id
        """)
        result = self.db.execute(query, {"fhir_id": fhir_id})
        return result.fetchone()
    
    def _create_canonical_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create patient in canonical table."""
        query = text("""
            INSERT INTO patients (
                fhir_id, fhir_version_id, first_name, last_name, email, phone,
                gender, date_of_birth, address, city, state, postal_code, country,
                active, created_at, updated_at
            ) VALUES (
                :fhir_id, :fhir_version_id, :first_name, :last_name, :email, :phone,
                :gender, :date_of_birth, :address, :city, :state, :postal_code, :country,
                :active, :created_at, :updated_at
            ) RETURNING *
        """)
        result = self.db.execute(query, patient_data)
        self.db.commit()
        return result.fetchone()
    
    def _update_canonical_patient(self, fhir_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update patient in canonical table."""
        query = text("""
            UPDATE patients SET
                fhir_version_id = :fhir_version_id,
                first_name = :first_name,
                last_name = :last_name,
                email = :email,
                phone = :phone,
                gender = :gender,
                date_of_birth = :date_of_birth,
                address = :address,
                city = :city,
                state = :state,
                postal_code = :postal_code,
                country = :country,
                active = :active,
                updated_at = :updated_at
            WHERE fhir_id = :fhir_id
            RETURNING *
        """)
        patient_data["fhir_id"] = fhir_id
        result = self.db.execute(query, patient_data)
        self.db.commit()
        return result.fetchone()
    
    def _get_canonical_user(self, fhir_id: str) -> Optional[Dict[str, Any]]:
        """Get user from canonical table by FHIR ID."""
        query = text("""
            SELECT * FROM users 
            WHERE fhir_id = :fhir_id
        """)
        result = self.db.execute(query, {"fhir_id": fhir_id})
        return result.fetchone()
    
    def _create_canonical_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user in canonical table."""
        query = text("""
            INSERT INTO users (
                fhir_id, fhir_version_id, first_name, last_name, email, phone,
                specialty, clinic_id, role, active, created_at, updated_at
            ) VALUES (
                :fhir_id, :fhir_version_id, :first_name, :last_name, :email, :phone,
                :specialty, :clinic_id, :role, :active, :created_at, :updated_at
            ) RETURNING *
        """)
        result = self.db.execute(query, user_data)
        self.db.commit()
        return result.fetchone()
    
    def _update_canonical_user(self, fhir_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user in canonical table."""
        query = text("""
            UPDATE users SET
                fhir_version_id = :fhir_version_id,
                first_name = :first_name,
                last_name = :last_name,
                email = :email,
                phone = :phone,
                specialty = :specialty,
                clinic_id = :clinic_id,
                role = :role,
                active = :active,
                updated_at = :updated_at
            WHERE fhir_id = :fhir_id
            RETURNING *
        """)
        user_data["fhir_id"] = fhir_id
        result = self.db.execute(query, user_data)
        self.db.commit()
        return result.fetchone()
    
    def _get_canonical_appointment(self, fhir_id: str) -> Optional[Dict[str, Any]]:
        """Get appointment from canonical table by FHIR ID."""
        query = text("""
            SELECT * FROM appointments 
            WHERE fhir_id = :fhir_id
        """)
        result = self.db.execute(query, {"fhir_id": fhir_id})
        return result.fetchone()
    
    def _create_canonical_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create appointment in canonical table."""
        query = text("""
            INSERT INTO appointments (
                fhir_id, fhir_version_id, patient_id, doctor_id, appointment_date,
                start_time, end_time, status, description, appointment_type,
                created_at, updated_at
            ) VALUES (
                :fhir_id, :fhir_version_id, :patient_id, :doctor_id, :appointment_date,
                :start_time, :end_time, :status, :description, :appointment_type,
                :created_at, :updated_at
            ) RETURNING *
        """)
        result = self.db.execute(query, appointment_data)
        self.db.commit()
        return result.fetchone()
    
    def _update_canonical_appointment(self, fhir_id: str, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update appointment in canonical table."""
        query = text("""
            UPDATE appointments SET
                fhir_version_id = :fhir_version_id,
                patient_id = :patient_id,
                doctor_id = :doctor_id,
                appointment_date = :appointment_date,
                start_time = :start_time,
                end_time = :end_time,
                status = :status,
                description = :description,
                appointment_type = :appointment_type,
                updated_at = :updated_at
            WHERE fhir_id = :fhir_id
            RETURNING *
        """)
        appointment_data["fhir_id"] = fhir_id
        result = self.db.execute(query, appointment_data)
        self.db.commit()
        return result.fetchone()
    
    def _get_canonical_prescription(self, fhir_id: str) -> Optional[Dict[str, Any]]:
        """Get prescription from canonical table by FHIR ID."""
        query = text("""
            SELECT * FROM prescriptions 
            WHERE fhir_id = :fhir_id
        """)
        result = self.db.execute(query, {"fhir_id": fhir_id})
        return result.fetchone()
    
    def _create_canonical_prescription(self, prescription_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create prescription in canonical table."""
        query = text("""
            INSERT INTO prescriptions (
                fhir_id, fhir_version_id, patient_id, prescriber_id, medication_name,
                dosage, frequency, status, authored_on, valid_until, refills_remaining,
                created_at, updated_at
            ) VALUES (
                :fhir_id, :fhir_version_id, :patient_id, :prescriber_id, :medication_name,
                :dosage, :frequency, :status, :authored_on, :valid_until, :refills_remaining,
                :created_at, :updated_at
            ) RETURNING *
        """)
        result = self.db.execute(query, prescription_data)
        self.db.commit()
        return result.fetchone()
    
    def _update_canonical_prescription(self, fhir_id: str, prescription_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update prescription in canonical table."""
        query = text("""
            UPDATE prescriptions SET
                fhir_version_id = :fhir_version_id,
                patient_id = :patient_id,
                prescriber_id = :prescriber_id,
                medication_name = :medication_name,
                dosage = :dosage,
                frequency = :frequency,
                status = :status,
                authored_on = :authored_on,
                valid_until = :valid_until,
                refills_remaining = :refills_remaining,
                updated_at = :updated_at
            WHERE fhir_id = :fhir_id
            RETURNING *
        """)
        prescription_data["fhir_id"] = fhir_id
        result = self.db.execute(query, prescription_data)
        self.db.commit()
        return result.fetchone()
    
    def _get_canonical_observation(self, fhir_id: str) -> Optional[Dict[str, Any]]:
        """Get observation from canonical table by FHIR ID."""
        query = text("""
            SELECT * FROM observations 
            WHERE fhir_id = :fhir_id
        """)
        result = self.db.execute(query, {"fhir_id": fhir_id})
        return result.fetchone()
    
    def _create_canonical_observation(self, observation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create observation in canonical table."""
        query = text("""
            INSERT INTO observations (
                fhir_id, fhir_version_id, patient_id, observation_type, observation_name,
                value, unit, effective_date, status, category, created_at, updated_at
            ) VALUES (
                :fhir_id, :fhir_version_id, :patient_id, :observation_type, :observation_name,
                :value, :unit, :effective_date, :status, :category, :created_at, :updated_at
            ) RETURNING *
        """)
        result = self.db.execute(query, observation_data)
        self.db.commit()
        return result.fetchone()
    
    def _update_canonical_observation(self, fhir_id: str, observation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update observation in canonical table."""
        query = text("""
            UPDATE observations SET
                fhir_version_id = :fhir_version_id,
                patient_id = :patient_id,
                observation_type = :observation_type,
                observation_name = :observation_name,
                value = :value,
                unit = :unit,
                effective_date = :effective_date,
                status = :status,
                category = :category,
                updated_at = :updated_at
            WHERE fhir_id = :fhir_id
            RETURNING *
        """)
        observation_data["fhir_id"] = fhir_id
        result = self.db.execute(query, observation_data)
        self.db.commit()
        return result.fetchone()
