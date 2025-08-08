# app/common/models/practitioner.py
"""Practitioner models for the EHR system."""
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, Integer, Text, 
    ForeignKey, Enum, JSON, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base, UUIDColumn

# Association tables
practitioner_specialties = Table(
    'practitioner_specialties',
    Base.metadata,
    Column('practitioner_role_id', String(36), ForeignKey('practitioner_roles.id'), primary_key=True),
    Column('specialty_id', String(36), ForeignKey('specialties.id'), primary_key=True),
)

practitioner_locations = Table(
    'practitioner_locations',
    Base.metadata,
    Column('practitioner_role_id', String(36), ForeignKey('practitioner_roles.id'), primary_key=True),
    Column('location_id', String(36), ForeignKey('hospital_departments.id'), primary_key=True),
)

# Enums
class PractitionerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    RETIRED = "retired"

class PractitionerRole(str, enum.Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    SPECIALIST = "specialist"
    CONSULTANT = "consultant"
    RESIDENT = "resident"
    INTERN = "intern"
    STUDENT = "student"
    TECHNICIAN = "technician"
    THERAPIST = "therapist"
    PHARMACIST = "pharmacist"

class Practitioner(Base):
    """Healthcare provider model (doctors, nurses, etc.) - converted from FHIR."""
    __tablename__ = "practitioners"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    
    # Link to user account
    user_id = UUIDColumn(ForeignKey("users.id"), unique=True, nullable=False)
    
    # FHIR identifiers
    fhir_practitioner_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of {system, value, type, period}
    
    # Status
    status = Column(Enum(PractitionerStatus), default=PractitionerStatus.ACTIVE)
    
    # Personal information (additional to User model)
    gender = Column(String(20), nullable=True)
    birth_date = Column(Date, nullable=True)
    
    # Photos
    photos = Column(JSON, nullable=True)  # Array of {url, contentType, title}
    
    # Professional qualifications
    qualifications = Column(JSON, nullable=True)  
    # Array of {identifier: {system, value}, code: {coding, text}, period: {start, end}, issuer: {reference, display}}
    
    # Communication languages
    communication_languages = Column(JSON, nullable=True)  
    # Array of {language: {coding, text}, proficiency: level, preferred: boolean}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="practitioner")
    practitioner_roles = relationship("PractitionerRole", back_populates="practitioner", cascade="all, delete-orphan")


class PractitionerRole(Base):
    """Links practitioners to organizations, departments, and their roles."""
    __tablename__ = "practitioner_roles"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR reference
    fhir_practitioner_role_id = Column(String(255), unique=True, nullable=True)
    
    # Core relationships
    practitioner_id = UUIDColumn(ForeignKey("practitioners.id"), nullable=False)
    organization_id = UUIDColumn(ForeignKey("hospitals.id"), nullable=False)  # Changed from organizations.id to hospitals.id
    
    # Role and specialty
    roles = Column(JSON, nullable=True)  # Array of role codes {coding: [{system, code, display}], text}
    
    # Status and period
    active = Column(Boolean, default=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    
    # Contact information for this role
    telecom = Column(JSON, nullable=True)  # Role-specific contact details
    
    # Availability
    available_times = Column(JSON, nullable=True)  
    # Array of {daysOfWeek: [], allDay: boolean, availableStartTime: time, availableEndTime: time}
    
    not_available = Column(JSON, nullable=True)  
    # Array of {description: string, during: {start: datetime, end: datetime}}
    
    availability_exceptions = Column(Text, nullable=True)
    
    # Healthcare services
    healthcare_services = Column(JSON, nullable=True)  # Array of service references
    
    # Endpoints (for telemedicine, etc.)
    endpoints = Column(JSON, nullable=True)  # Array of endpoint references
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    practitioner = relationship("Practitioner", back_populates="practitioner_roles")
    organization = relationship("Hospital")  # Changed from Organization to Hospital
    specialties = relationship("Specialty", secondary=practitioner_specialties)
    locations = relationship("HospitalDepartment", secondary=practitioner_locations)  # Changed from Department to HospitalDepartment


class Specialty(Base):
    """Medical specialties lookup table."""
    __tablename__ = "specialties"
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    
    # Coding
    system = Column(String(255), nullable=False)  # e.g., "http://hl7.org/fhir/practitioner-specialty"
    code = Column(String(50), nullable=False, unique=True)
    display = Column(String(200), nullable=False)
    
    # Additional info
    description = Column(Text, nullable=True)
    parent_id = UUIDColumn(ForeignKey("specialties.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Specialty", remote_side=[id])
    sub_specialties = relationship("Specialty", back_populates="parent")


# Integration with existing User model
# Add this relationship to your User model:
# practitioner = relationship("Practitioner", back_populates="user", uselist=False)

# Integration with existing Doctor model
# The Doctor model can be seen as an extension of Practitioner with additional app-specific fields
# You might want to either:
# 1. Merge Doctor fields into Practitioner, or
# 2. Keep Doctor as a separate model that references Practitioner instead of User

# For option 2, update Doctor model:
# practitioner_id = UUIDColumn(ForeignKey("practitioners.id"), unique=True, nullable=False)
# practitioner = relationship("Practitioner")