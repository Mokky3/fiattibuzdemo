# app/common/models/patient.py
"""Patient models for the EHR system - consolidated version."""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Text, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import String
import uuid
import enum

from app.db.base_class import Base


class PatientStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DECEASED = "deceased"


class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    SEPARATED = "separated"
    OTHER = "other"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class BloodGroup(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"


class MentalHealthStatus(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class ReminderTiming(str, enum.Enum):
    MIN_15 = "15min"
    MIN_30 = "30min"
    HOUR_1 = "1hour"
    HOUR_2 = "2hours"
    HOUR_24 = "24hours"
    HOUR_48 = "48hours"


class ProfileVisibility(str, enum.Enum):
    PRIVATE = "private"
    DOCTORS_ONLY = "doctors_only"
    PUBLIC = "public"


class Theme(str, enum.Enum):
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"


class Language(str, enum.Enum):
    EN = "en"
    UZ = "uz"
    RU = "ru"


class Patient(Base):
    """Patient model representing individuals receiving care."""
    __tablename__ = "patients"
    
    # Primary identifiers
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    medical_record_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Link to user account (if patient has portal access)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    
    # National identifier (PINFL for Uzbekistan)
    national_id = Column(String(14), unique=True, index=True, nullable=False)  # PINFL
    
    # Contact information
    phone = Column(String(20), nullable=False)
    phone_secondary = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    preferred_language = Column(String(5), default="uz")  # uz, ru, en
    
    # Address
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(2), default="UZ")
    
    # Demographics
    nationality = Column(String(100), nullable=True)
    marital_status = Column(Enum(MaritalStatus), nullable=True)
    occupation = Column(String(100), nullable=True)
    
    # Physical information
    height = Column(Float, nullable=True)  # in cm
    weight = Column(Float, nullable=True)  # in kg
    bmi = Column(Float, nullable=True)  # calculated
    blood_group = Column(Enum(BloodGroup), nullable=True)
    
    # Health metrics
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    visual_acuity_left = Column(Float, nullable=True)
    visual_acuity_right = Column(Float, nullable=True)
    mental_health_status = Column(Enum(MentalHealthStatus), nullable=True)
    
    # Status
    status = Column(Enum(PatientStatus), default=PatientStatus.ACTIVE)
    is_vip = Column(Boolean, default=False)
    
    # Registration info
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    registered_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # FHIR reference
    fhir_patient_id = Column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="patient_profile")
    emergency_contacts = relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    insurance_policies = relationship("InsurancePolicy", back_populates="patient", cascade="all, delete-orphan")
    insurances = relationship("Insurance", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient")
    medical_history = relationship("MedicalHistory", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("AllergyIntolerance", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("PatientMedication", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    lab_results = relationship("LabResult", back_populates="patient")
    immunizations = relationship("Immunization", back_populates="patient")
    vital_signs = relationship("VitalSign", back_populates="patient")
    clinical_notes = relationship("ClinicalNote", back_populates="patient")
    conditions = relationship("Condition", back_populates="patient")
    observations = relationship("Observation", back_populates="patient")


class EmergencyContact(Base):
    """Emergency contact information for patients."""
    __tablename__ = "emergency_contacts"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Contact details
    name = Column(String(200), nullable=False)
    relationship_type = Column(String(50), nullable=False)
    phone_primary = Column(String(20), nullable=False)
    phone_secondary = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    
    # Priority
    is_primary = Column(Boolean, default=False)
    priority = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="emergency_contacts")


class InsurancePolicy(Base):
    """Patient insurance information."""
    __tablename__ = "insurance_policies"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Policy details
    provider = Column(String(200), nullable=False)
    policy_number = Column(String(100), nullable=False)
    group_number = Column(String(100), nullable=True)
    
    # Policy holder (if different from patient)
    holder_name = Column(String(200), nullable=True)
    holder_relationship = Column(String(50), nullable=True)
    holder_date_of_birth = Column(Date, nullable=True)
    
    # Coverage period
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    
    # Status
    is_primary = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    # Verification
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Additional info
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="insurance_policies")


class MedicalHistory(Base):
    """Patient medical history records."""
    __tablename__ = "medical_history"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Condition details
    condition = Column(String(500), nullable=False)
    icd10_code = Column(String(10), nullable=True)
    diagnosed_date = Column(Date, nullable=True)
    resolved_date = Column(Date, nullable=True)
    
    # Status
    status = Column(String(20), default="active")  # active, resolved, chronic
    severity = Column(String(20), nullable=True)  # mild, moderate, severe
    
    # Additional info
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="medical_history")


class PatientMedication(Base):
    """Current medications for patients."""
    __tablename__ = "patient_medications"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), nullable=True)
    
    # Medication details
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    route = Column(String(50), nullable=True)  # oral, injection, topical, etc.
    
    # Duration
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_discontinued = Column(Boolean, default=False)
    discontinued_date = Column(Date, nullable=True)
    discontinued_reason = Column(String(500), nullable=True)
    
    # Prescriber
    prescribed_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    prescribed_date = Column(Date, nullable=False)
    
    # Additional info
    instructions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="medications")
    prescription = relationship("Prescription", back_populates="medications")


class PatientSettings(Base):
    """Patient preferences and settings."""
    __tablename__ = "patient_settings"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), unique=True, nullable=False)
    
    # Email notification settings
    email_appointments = Column(Boolean, default=True)
    email_reminders = Column(Boolean, default=True)
    email_lab_results = Column(Boolean, default=True)
    email_prescriptions = Column(Boolean, default=True)
    email_newsletters = Column(Boolean, default=False)
    
    # SMS notification settings
    sms_appointments = Column(Boolean, default=True)
    sms_reminders = Column(Boolean, default=True)
    sms_emergency_only = Column(Boolean, default=False)
    
    # Push notification settings
    push_enabled = Column(Boolean, default=True)
    push_appointments = Column(Boolean, default=True)
    push_messages = Column(Boolean, default=True)
    push_updates = Column(Boolean, default=False)
    
    # Reminder timing
    reminder_timing = Column(Enum(ReminderTiming), default=ReminderTiming.HOUR_24)
    
    # Privacy settings
    profile_visibility = Column(Enum(ProfileVisibility), default=ProfileVisibility.DOCTORS_ONLY)
    share_health_data = Column(Boolean, default=True)
    allow_research = Column(Boolean, default=False)
    data_retention_years = Column(Integer, default=5)
    activity_tracking = Column(Boolean, default=True)
    
    # Security settings
    two_factor_enabled = Column(Boolean, default=False)
    login_alerts = Column(Boolean, default=True)
    session_timeout_minutes = Column(Integer, default=30)
    device_management = Column(Boolean, default=True)
    
    # Display preferences
    language = Column(Enum(Language), default=Language.UZ)
    date_format = Column(String(20), default="DD/MM/YYYY")
    time_format = Column(String(10), default="24hour")
    theme = Column(Enum(Theme), default=Theme.LIGHT)
    font_size = Column(String(20), default="medium")
    sound_enabled = Column(Boolean, default=True)
    auto_play_videos = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="settings")