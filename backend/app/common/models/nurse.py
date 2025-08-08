# app/common/models/nurse.py
"""Nurse models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Float, Text, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base


class NurseSpecialty(str, enum.Enum):
    GENERAL = "general"
    PEDIATRIC = "pediatric"
    EMERGENCY = "emergency"
    ICU = "icu"
    SURGICAL = "surgical"
    OBSTETRIC = "obstetric"
    PSYCHIATRIC = "psychiatric"
    GERIATRIC = "geriatric"
    ONCOLOGY = "oncology"
    CARDIAC = "cardiac"


class NurseRole(str, enum.Enum):
    STAFF_NURSE = "staff_nurse"
    CHARGE_NURSE = "charge_nurse"
    HEAD_NURSE = "head_nurse"
    NURSE_PRACTITIONER = "nurse_practitioner"
    CLINICAL_NURSE_SPECIALIST = "clinical_nurse_specialist"
    NURSE_EDUCATOR = "nurse_educator"
    NURSE_MANAGER = "nurse_manager"


class Nurse(Base):
    """Nurse profile model."""
    __tablename__ = "nurses"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Professional information
    license_number = Column(String(50), unique=True, nullable=False, index=True)
    license_issuer = Column(String(100), nullable=True)
    license_issued_date = Column(Date, nullable=True)
    license_expiry_date = Column(Date, nullable=True)
    
    # Specialization
    primary_specialty = Column(Enum(NurseSpecialty), nullable=False)
    secondary_specialties = Column(JSON, nullable=True)  # Array of specialties
    role = Column(Enum(NurseRole), nullable=False)
    
    # Certifications
    certifications = Column(JSON, nullable=True)  # Array of certification objects
    
    # Experience
    years_of_experience = Column(Integer, nullable=True)
    previous_positions = Column(JSON, nullable=True)
    
    # Skills
    clinical_skills = Column(JSON, nullable=True)  # Array of skills
    languages_spoken = Column(JSON, nullable=True)
    
    # Work settings
    can_work_nights = Column(Boolean, default=True)
    can_work_weekends = Column(Boolean, default=True)
    preferred_shifts = Column(JSON, nullable=True)  # Array of shift preferences
    
    # Department assignments
    primary_department_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=True)
    can_float = Column(Boolean, default=True)  # Can work in multiple departments
    
    # Performance
    rating = Column(Float, nullable=True)
    rating_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="nurse_profile")
    primary_department = relationship("HospitalDepartment")
    shift_assignments = relationship("NurseShiftAssignment", back_populates="nurse", cascade="all, delete-orphan")
    patient_assignments = relationship("NursePatientAssignment", back_populates="nurse", cascade="all, delete-orphan")


class NurseShiftAssignment(Base):
    """Nurse shift assignments."""
    __tablename__ = "nurse_shift_assignments"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    nurse_id = Column(String(36), ForeignKey("nurses.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=False)
    
    # Shift details
    shift_date = Column(Date, nullable=False, index=True)
    shift_type = Column(String(20), nullable=False)  # day, evening, night
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Status
    status = Column(String(20), default="scheduled")  # scheduled, in_progress, completed, cancelled
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)
    
    # Coverage
    is_overtime = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)
    replaced_nurse_id = Column(String(36), ForeignKey("nurses.id"), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    nurse = relationship("Nurse", back_populates="shift_assignments", foreign_keys=[nurse_id])
    department = relationship("HospitalDepartment")
    replaced_nurse = relationship("Nurse", foreign_keys=[replaced_nurse_id])


class NursePatientAssignment(Base):
    """Nurse-patient assignments for care coordination."""
    __tablename__ = "nurse_patient_assignments"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    nurse_id = Column(String(36), ForeignKey("nurses.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Assignment details
    assignment_date = Column(Date, nullable=False, index=True)
    shift_type = Column(String(20), nullable=False)
    is_primary = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Care level
    acuity_level = Column(Integer, nullable=True)  # 1-5, patient care complexity
    special_instructions = Column(Text, nullable=True)
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    unassigned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    nurse = relationship("Nurse", back_populates="patient_assignments")
    patient = relationship("Patient")
