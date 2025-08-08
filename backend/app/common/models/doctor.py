# app/common/models/doctor.py
"""Doctor and related models for the EHR system."""
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, Integer, Text, 
    ForeignKey, Enum, JSON, Float, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base, UUIDColumn

# Association tables
doctor_hospitals = Table(
    'doctor_hospitals',
    Base.metadata,
    Column('doctor_id', String(36), ForeignKey('doctors.id'), primary_key=True),
    Column('hospital_id', String(36), ForeignKey('hospitals.id'), primary_key=True)
)

doctor_departments = Table(
    'doctor_departments',
    Base.metadata,
    Column('doctor_id', String(36), ForeignKey('doctors.id'), primary_key=True),
    Column('department_id', String(36), ForeignKey('hospital_departments.id'), primary_key=True)
)

# Enums
class ConsultationType(str, enum.Enum):
    IN_PERSON = "in_person"
    VIDEO = "video"
    PHONE = "phone"
    EMERGENCY = "emergency"

class Doctor(Base):
    """Doctor profile model."""
    __tablename__ = "doctors"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    user_id = UUIDColumn(ForeignKey("users.id"), unique=True, nullable=False)
    
    # Professional information
    license_number = Column(String(50), unique=True, nullable=False, index=True)
    license_issuer = Column(String(100), nullable=True)
    license_issued_date = Column(Date, nullable=True)
    license_expiry_date = Column(Date, nullable=True)
    
    # Specialization
    primary_specialization = Column(String(100), nullable=False)
    sub_specializations = Column(JSON, nullable=True)  # Array of sub-specialties
    board_certifications = Column(JSON, nullable=True)  # Array of certifications
    
    # Experience
    years_of_experience = Column(Integer, nullable=True)
    previous_positions = Column(JSON, nullable=True)  # Array of previous work experience
    
    # Consultation settings
    consultation_fee = Column(Float, nullable=True)
    consultation_fee_currency = Column(String(3), default="UZS")
    consultation_types = Column(JSON, nullable=True)  # Array of ConsultationType
    average_consultation_time = Column(Integer, default=30)  # minutes
    
    # Professional profile
    bio = Column(Text, nullable=True)
    education = Column(JSON, nullable=True)  # Array of education records
    publications = Column(JSON, nullable=True)  # Array of publications
    awards = Column(JSON, nullable=True)  # Array of awards/recognitions
    professional_memberships = Column(JSON, nullable=True)  # Array of memberships
    
    # Skills and expertise
    languages_spoken = Column(JSON, nullable=True)  # Array of languages with proficiency
    procedures_performed = Column(JSON, nullable=True)  # Array of procedures
    special_interests = Column(JSON, nullable=True)  # Array of special interests
    
    # Ratings and reviews
    rating = Column(Float, nullable=True)  # Average rating (1-5)
    rating_count = Column(Integer, default=0)
    
    # Availability
    is_accepting_patients = Column(Boolean, default=True)
    max_patients_per_day = Column(Integer, nullable=True)
    
    # Digital presence
    professional_email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    linkedin_profile = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    hospitals = relationship("Hospital", secondary=doctor_hospitals, back_populates="doctors")
    departments = relationship("HospitalDepartment", secondary=doctor_departments, back_populates="doctors")
    
    # Clinical relationships
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")
    medical_records = relationship("MedicalRecord", back_populates="doctor", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="doctor", cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", foreign_keys="LabOrder.ordered_by", back_populates="orderer")
    
    # Schedule and availability
    schedule_templates = relationship("DoctorScheduleTemplate", back_populates="doctor", cascade="all, delete-orphan")
    schedule_exceptions = relationship("DoctorScheduleException", back_populates="doctor", cascade="all, delete-orphan")
    
    # Team collaboration - Removed care_teams relationship since CareTeam table doesn't exist
    # care_teams = relationship("CareTeamMember", back_populates="doctor", cascade="all, delete-orphan")


class DoctorScheduleTemplate(Base):
    """Weekly schedule template for doctors."""
    __tablename__ = "doctor_schedule_templates"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    doctor_id = UUIDColumn(ForeignKey("doctors.id"), nullable=False)
    
    # Day of week (0=Monday, 6=Sunday)
    day_of_week = Column(Integer, nullable=False)
    
    # Time slots
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)
    
    # Breaks
    break_start = Column(String(5), nullable=True)
    break_end = Column(String(5), nullable=True)
    
    # Settings
    slot_duration = Column(Integer, default=30)  # minutes
    buffer_time = Column(Integer, default=10)  # minutes between appointments
    
    # Location
    location_id = UUIDColumn(ForeignKey("locations.id"), nullable=True)
    room_number = Column(String(50), nullable=True)
    
    # Consultation types allowed
    consultation_types = Column(JSON, nullable=True)  # Array of ConsultationType
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    doctor = relationship("Doctor", back_populates="schedule_templates")


class DoctorScheduleException(Base):
    """Schedule exceptions (holidays, leaves, special hours)."""
    __tablename__ = "doctor_schedule_exceptions"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    doctor_id = UUIDColumn(ForeignKey("doctors.id"), nullable=False)
    
    # Exception details
    exception_date = Column(Date, nullable=False)
    exception_type = Column(String(50), nullable=False)  # leave, holiday, special_hours, blocked
    
    # For special hours
    start_time = Column(String(5), nullable=True)
    end_time = Column(String(5), nullable=True)
    
    # Reason
    reason = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    doctor = relationship("Doctor", back_populates="schedule_exceptions")


class ClinicalNote(Base):
    """Clinical notes (SOAP notes, progress notes, etc.)."""
    __tablename__ = "clinical_notes"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    patient_id = UUIDColumn(ForeignKey("patients.id"), nullable=False)
    doctor_id = UUIDColumn(ForeignKey("doctors.id"), nullable=False)
    encounter_id = UUIDColumn(ForeignKey("appointments.id"), nullable=True)
    
    # Note type and format
    note_type = Column(String(50), nullable=False)  # soap, progress, consultation, discharge, operative
    note_date = Column(DateTime(timezone=True), nullable=False)
    
    # SOAP format fields
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    
    # Alternative format
    content = Column(Text, nullable=True)  # For non-SOAP notes
    
    # Templates
    template_id = UUIDColumn(nullable=True)
    template_data = Column(JSON, nullable=True)  # Structured template data
    
    # Status
    is_draft = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    is_amended = Column(Boolean, default=False)
    amendment_notes = Column(Text, nullable=True)
    
    # Sharing
    shared_with_patient = Column(Boolean, default=False)
    shared_with_team = Column(JSON, nullable=True)  # Array of user IDs
    
    # Metadata
    created_by = UUIDColumn(ForeignKey("users.id"), nullable=False)
    locked_by = UUIDColumn(ForeignKey("users.id"), nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    
    # FHIR reference
    fhir_document_reference_id = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="clinical_notes")
    doctor = relationship("Doctor", back_populates="clinical_notes")


# Removed CareTeamMember class since it references non-existent care_teams table
# class CareTeamMember(Base):
#     """Care team members for collaborative patient care."""
#     __tablename__ = "care_team_members"
#     
#     id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
#     care_team_id = UUIDColumn(ForeignKey("care_teams.id"), nullable=False)
#     doctor_id = UUIDColumn(ForeignKey("doctors.id"), nullable=False)
#     
#     # Role in team
#     role = Column(String(100), nullable=False)  # primary, consultant, specialist, etc.
#     is_lead = Column(Boolean, default=False)
#     
#     # Permissions
#     can_prescribe = Column(Boolean, default=True)
#     can_order_tests = Column(Boolean, default=True)
#     can_view_records = Column(Boolean, default=True)
#     can_edit_records = Column(Boolean, default=True)
#     
#     # Period
#     start_date = Column(Date, nullable=False)
#     end_date = Column(Date, nullable=True)
#     is_active = Column(Boolean, default=True)
#     
#     # Timestamps
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), onupdate=func.now())
#     
#     # Relationships
#     doctor = relationship("Doctor", back_populates="care_teams")
#     care_team = relationship("CareTeam", back_populates="members")