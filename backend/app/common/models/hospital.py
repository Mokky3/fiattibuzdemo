# app/common/models/hospital.py
"""Hospital and organization models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, JSON, ForeignKey, Enum, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import String
import uuid
import enum

from app.db.base_class import Base


class HospitalType(str, enum.Enum):
    GENERAL = "general"
    SPECIALTY = "specialty"
    CLINIC = "clinic"
    DIAGNOSTIC_CENTER = "diagnostic_center"
    URGENT_CARE = "urgent_care"
    REHABILITATION = "rehabilitation"


class HospitalStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    UNDER_REVIEW = "under_review"


class DepartmentType(str, enum.Enum):
    EMERGENCY = "emergency"
    OUTPATIENT = "outpatient"
    INPATIENT = "inpatient"
    ICU = "icu"
    SURGERY = "surgery"
    RADIOLOGY = "radiology"
    LABORATORY = "laboratory"
    PHARMACY = "pharmacy"
    ADMINISTRATION = "administration"


class Hospital(Base):
    """Hospital/Organization model - primary organization entity."""
    __tablename__ = "hospitals"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic information
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200), nullable=True)
    code = Column(String(50), unique=True, nullable=False)
    hospital_type = Column(Enum(HospitalType), nullable=False)
    
    # Registration details
    registration_number = Column(String(100), unique=True, nullable=False)
    tax_id = Column(String(50), unique=True, nullable=False)
    license_number = Column(String(100), nullable=False)
    license_valid_until = Column(Date, nullable=True)
    
    # Contact information
    phone = Column(String(20), nullable=False)
    phone_emergency = Column(String(20), nullable=True)
    email = Column(String(255), nullable=False)
    website = Column(String(500), nullable=True)
    
    # Address
    address_line1 = Column(String(200), nullable=False)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=False)
    country = Column(String(2), default="UZ")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Operating information
    operating_hours = Column(JSON, nullable=True)  # Structured hours per day
    is_24_hours = Column(Boolean, default=False)
    emergency_services = Column(Boolean, default=False)
    
    # Capacity
    total_beds = Column(Integer, nullable=True)
    icu_beds = Column(Integer, nullable=True)
    emergency_beds = Column(Integer, nullable=True)
    operating_rooms = Column(Integer, nullable=True)
    
    # Services and specialties
    services_offered = Column(JSON, nullable=True)  # Array of service codes
    specialties = Column(JSON, nullable=True)  # Array of specialty codes
    certifications = Column(JSON, nullable=True)  # Array of certifications
    
    # Financial
    accepts_insurance = Column(Boolean, default=True)
    accepted_insurance_providers = Column(JSON, nullable=True)  # Array of provider IDs
    default_currency = Column(String(3), default="UZS")
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Hex color
    secondary_color = Column(String(7), nullable=True)
    
    # Status
    status = Column(Enum(HospitalStatus), default=HospitalStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    
    # Parent organization (for multi-facility systems)
    parent_organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    
    # FHIR reference
    fhir_organization_id = Column(String(255), unique=True, nullable=True)
    
    # Metadata
    established_date = Column(Date, nullable=True)
    accreditation_date = Column(Date, nullable=True)
    last_inspection_date = Column(Date, nullable=True)
    next_inspection_date = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent_organization = relationship("Hospital", remote_side=[id])
    child_organizations = relationship("Hospital", back_populates="parent_organization")
    departments = relationship("HospitalDepartment", back_populates="hospital", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization")
    doctors = relationship("Doctor", secondary="doctor_hospitals", back_populates="hospitals")
    stats = relationship("OrganizationStats", back_populates="organization", uselist=False)
    system_configs = relationship("SystemConfig", back_populates="organization")
    service_prices = relationship("ServicePrice", back_populates="organization")


class HospitalDepartment(Base):
    """Hospital department model."""
    __tablename__ = "hospital_departments"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    
    # Basic information
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    department_type = Column(Enum(DepartmentType), nullable=False)
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
    head_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    deputy_head_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Parent department (for sub-departments)
    parent_department_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=True)
    
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
    doctors = relationship("Doctor", secondary="doctor_departments", back_populates="departments")
    head = relationship("User", foreign_keys=[head_id])
    deputy_head = relationship("User", foreign_keys=[deputy_head_id])
    parent_department = relationship("HospitalDepartment", remote_side=[id])
    sub_departments = relationship("HospitalDepartment", back_populates="parent_department")


class Location(Base):
    """Physical locations within hospital (rooms, wards, etc)."""
    __tablename__ = "locations"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=True)
    
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
    current_patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    
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