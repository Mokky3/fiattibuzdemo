# app/common/models/hospital.py
"""Hospital and organization models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, JSON, ForeignKey, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import String
import uuid
import enum

from app.db.base_class import Base
from .doctor import doctor_hospitals, doctor_departments


class HospitalType(str, enum.Enum):
    GENERAL = "GENERAL"
    SPECIALTY = "SPECIALTY"
    CLINIC = "CLINIC"
    DIAGNOSTIC_CENTER = "DIAGNOSTIC_CENTER"
    URGENT_CARE = "URGENT_CARE"
    REHABILITATION = "REHABILITATION"


class HospitalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    UNDER_REVIEW = "UNDER_REVIEW"


class DepartmentType(str, enum.Enum):
    EMERGENCY = "EMERGENCY"
    OUTPATIENT = "OUTPATIENT"
    INPATIENT = "INPATIENT"
    ICU = "ICU"
    SURGERY = "SURGERY"
    SURGICAL = "SURGICAL"
    RADIOLOGY = "RADIOLOGY"
    LABORATORY = "LABORATORY"
    PHARMACY = "PHARMACY"
    ADMINISTRATION = "ADMINISTRATION"
    MEDICAL = "MEDICAL"
    DIAGNOSTIC = "DIAGNOSTIC"
    CARDIOLOGY = "CARDIOLOGY"
    NEUROLOGY = "NEUROLOGY"
    ONCOLOGY = "ONCOLOGY"
    PEDIATRICS = "PEDIATRICS"
    OBSTETRICS = "OBSTETRICS"
    GYNECOLOGY = "GYNECOLOGY"
    ORTHOPEDICS = "ORTHOPEDICS"
    DERMATOLOGY = "DERMATOLOGY"
    PSYCHIATRY = "PSYCHIATRY"
    ANESTHESIOLOGY = "ANESTHESIOLOGY"
    PATHOLOGY = "PATHOLOGY"
    PHYSICAL_THERAPY = "PHYSICAL_THERAPY"
    REHABILITATION = "REHABILITATION"
    NURSING = "NURSING"
    SUPPORT = "SUPPORT"
    MAINTENANCE = "MAINTENANCE"
    SECURITY = "SECURITY"
    HOUSEKEEPING = "HOUSEKEEPING"


class Hospital(Base):
    """Hospital/Organization model - simplified to match database structure."""
    __tablename__ = "hospitals"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic information (matching database structure)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)  # URL to clinic logo
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships (simplified - only essential ones to avoid circular dependencies)
    users = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
    doctors = relationship("Doctor", secondary=doctor_hospitals, back_populates="hospitals")
    departments = relationship("HospitalDepartment", back_populates="hospital", cascade="all, delete-orphan")
    general_reports = relationship("GeneralReport", back_populates="clinic", cascade="all, delete-orphan")
    organization_patients = relationship("OrganizationPatient", back_populates="organization", cascade="all, delete-orphan")
    
    # Commented out to avoid circular dependency issues
    # stats = relationship("OrganizationStats", back_populates="organization", uselist=False)
    # service_prices = relationship("ServicePrice", back_populates="organization", cascade="all, delete-orphan")
    # system_configs = relationship("SystemConfig", back_populates="organization", cascade="all, delete-orphan")


class HospitalDepartment(Base):
    """Hospital department model."""
    __tablename__ = "hospital_departments"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("ref.hospitals.id"), nullable=False)
    
    # Basic information
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    department_type = Column(Enum(DepartmentType, native_enum=False), nullable=False)
    description = Column(Text, nullable=True)
    
    # Location within hospital
    floor = Column(String(10), nullable=True)
    building = Column(String(50), nullable=True)
    wing = Column(String(50), nullable=True)
    room_numbers = Column(JSON, nullable=True)  # Array of room numbers
    
    # Contact
    phone = Column(String(20), nullable=True)
    extension = Column(String(10), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Capacity
    bed_capacity = Column(Integer, nullable=True)
    current_occupancy = Column(Integer, default=0)
    max_occupancy_rate = Column(Float, default=0.9)  # 90%
    
    # Staff capacity
    doctor_capacity = Column(Integer, nullable=True)
    nurse_capacity = Column(Integer, nullable=True)
    
    # Operating hours
    operating_hours = Column(JSON, nullable=True)
    is_24_hours = Column(Boolean, default=False)
    
    # Services
    services_offered = Column(JSON, nullable=True)  # Array of service codes
    equipment_available = Column(JSON, nullable=True)  # Array of equipment
    
    # Department head
    head_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=True)
    deputy_head_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=True)
    
    # Parent department (for sub-departments)
    parent_department_id = Column(UUID(as_uuid=True), ForeignKey("ref.hospital_departments.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_accepting_patients = Column(Boolean, default=True)
    
    # Cost center
    cost_center_code = Column(String(50), nullable=True)
    budget_allocated = Column(Float, nullable=True)
    
    # Quality metrics
    patient_satisfaction_target = Column(Float, default=4.0)  # Out of 5
    average_wait_time_target = Column(Integer, default=30)  # minutes
    
    # FHIR reference
    fhir_location_id = Column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    hospital = relationship("Hospital", back_populates="departments")
    users = relationship("User", foreign_keys="User.department_id", back_populates="department")
    doctors = relationship("Doctor", secondary=doctor_departments, back_populates="departments")
    head = relationship("User", foreign_keys=[head_id])
    deputy_head = relationship("User", foreign_keys=[deputy_head_id])
    parent_department = relationship("HospitalDepartment", remote_side=[id])
    sub_departments = relationship("HospitalDepartment", back_populates="parent_department", cascade="all, delete-orphan")


class Location(Base):
    """Physical locations within hospital (rooms, wards, etc)."""
    __tablename__ = "locations"
    __table_args__ = {"schema": "ref"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    hospital_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("ref.hospital_departments.id"), nullable=True)
    
    # Location details
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    location_type = Column(String(50), nullable=False)  # room, ward, bed, operating_room, etc.
    
    # Physical location
    building = Column(String(50), nullable=True)
    floor = Column(String(10), nullable=True)
    section = Column(String(50), nullable=True)
    room_number = Column(String(20), nullable=True)
    bed_number = Column(String(10), nullable=True)
    
    # Capacity and usage
    capacity = Column(Integer, default=1)
    is_occupied = Column(Boolean, default=False)
    current_patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=True)
    
    # Features
    features = Column(JSON, nullable=True)  # Array of features (TV, bathroom, window, etc.)
    equipment = Column(JSON, nullable=True)  # Array of equipment IDs
    
    # Status
    is_active = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    maintenance_required = Column(Boolean, default=False)
    cleaning_required = Column(Boolean, default=False)
    
    # For operating rooms
    is_sterile = Column(Boolean, nullable=True)
    last_sterilized = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # FHIR reference
    fhir_location_id = Column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    hospital = relationship("Hospital")
    department = relationship("HospitalDepartment")
    current_patient = relationship("Patient")


# Update the Organization references in admin.py to use Hospital
# This provides a migration path from Organization to Hospital model