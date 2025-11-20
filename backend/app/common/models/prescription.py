# app/common/models/prescription.py
"""Consolidated prescription and pharmacy models for the EHR system."""
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Boolean, Integer, Float, Enum, Time, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base


class PrescriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    DRAFT = "draft"
    ENTERED_IN_ERROR = "entered_in_error"


class PrescriptionIntent(str, enum.Enum):
    PROPOSAL = "proposal"
    PLAN = "plan"
    ORDER = "order"
    ORIGINAL_ORDER = "original_order"
    REFLEX_ORDER = "reflex_order"
    FILLER_ORDER = "filler_order"
    INSTANCE_ORDER = "instance_order"
    OPTION = "option"


class PrescriptionPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    ASAP = "asap"
    STAT = "stat"


class ReminderPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Prescription(Base):
    """Prescription/MedicationRequest model - merged SQLAlchemy and FHIR concepts."""
    __tablename__ = "prescriptions"
    __table_args__ = {"schema": "ehr"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR MedicationRequest fields
    fhir_medication_request_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of {system, value, use}
    
    # Core relationships - using UUID for PostgreSQL compatibility
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("ehr.doctors.id"), nullable=False)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("ref.hospitals.id"), nullable=False)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("ehr.appointments.id"), nullable=True)
    
    # Prescription details
    prescription_number = Column(String(50), unique=True, nullable=False, index=True)
    medicine_name = Column(String(200), nullable=False)
    medicine_code = Column(String(50), nullable=True)  # RxNorm or other coding system
    generic_name = Column(String(200), nullable=True)
    brand_name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    
    # Status and intent
    status = Column(Enum(PrescriptionStatus, native_enum=False), default=PrescriptionStatus.ACTIVE, nullable=False)
    status_reason = Column(JSON, nullable=True)  # CodeableConcept
    intent = Column(Enum(PrescriptionIntent, native_enum=False), default=PrescriptionIntent.ORDER, nullable=False)
    priority = Column(Enum(PrescriptionPriority, native_enum=False), default=PrescriptionPriority.ROUTINE)
    
    # Dates
    prescribed_date = Column(DateTime(timezone=True), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # Dosage instructions
    dosage = Column(String(100), nullable=False)
    dosage_unit = Column(String(50), nullable=True)
    frequency = Column(String(100), nullable=False)
    route = Column(String(50), nullable=True)  # oral, injection, topical, etc.
    duration = Column(String(100), nullable=True)
    dosage_instructions = Column(JSON, nullable=True)  # Full FHIR dosageInstruction structure
    
    # Clinical information
    purpose = Column(Text, nullable=True)
    indication = Column(Text, nullable=True)
    reason_codes = Column(JSON, nullable=True)  # Array of CodeableConcept
    notes = Column(Text, nullable=True)
    
    # Refill information
    total_refills = Column(Integer, default=0)
    remaining_refills = Column(Integer, default=0)
    tablets_per_refill = Column(Integer, nullable=True)
    quantity = Column(Float, nullable=True)
    quantity_unit = Column(String(50), nullable=True)
    days_supply = Column(Integer, nullable=True)
    
    # Dispense request
    dispense_request = Column(JSON, nullable=True)  # FHIR dispenseRequest structure
    expected_supply_duration = Column(Integer, nullable=True)  # days
    
    # Substitution
    allow_generic_substitution = Column(Boolean, default=True)
    substitution_reason = Column(String(200), nullable=True)
    
    # Pricing
    estimated_price = Column(Float, nullable=True)
    currency = Column(String(3), default="UZS")
    
    # Prior prescription reference
    prior_prescription_id = Column(UUID(as_uuid=True), ForeignKey("ehr.prescriptions.id"), nullable=True)
    
    # Signature and authentication
    is_signed = Column(Boolean, default=False)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    signature_data = Column(Text, nullable=True)
    
    # Metadata - using UUID for PostgreSQL compatibility
    created_by = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)
    prescribed_by = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)
    last_modified_by = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=True)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    hospital = relationship("Hospital")
    encounter = relationship("Appointment")
    prior_prescription = relationship("Prescription", remote_side=[id])
    prescriber = relationship("User", foreign_keys=[prescribed_by])
    
    # Related records
    refills = relationship("PrescriptionRefill", back_populates="prescription", cascade="all, delete-orphan")
    reminders = relationship("PrescriptionReminder", back_populates="prescription", cascade="all, delete-orphan")
    pharmacy_prices = relationship("PharmacyPrescriptionPrice", back_populates="prescription", cascade="all, delete-orphan")
    medications = relationship("PatientMedication", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionReminder(Base):
    """Prescription reminder settings."""
    __tablename__ = "prescription_reminders"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    prescription_id = Column(String(36), ForeignKey("ehr.prescriptions.id"), nullable=False)
    
    # Reminder details
    title = Column(String(200), nullable=False)
    subtitle = Column(String(200), nullable=True)
    message = Column(Text, nullable=True)
    
    # Timing
    reminder_time = Column(DateTime(timezone=True), nullable=False)
    repeat_pattern = Column(String(50), nullable=True)  # daily, weekly, etc.
    priority = Column(Enum(ReminderPriority, native_enum=False), default=ReminderPriority.MEDIUM)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notification preferences
    send_email = Column(Boolean, default=True)
    send_sms = Column(Boolean, default=True)
    send_push = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    prescription = relationship("Prescription", back_populates="reminders")


class PrescriptionRefill(Base):
    """Prescription refill history."""
    __tablename__ = "prescription_refills"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    prescription_id = Column(String(36), ForeignKey("ehr.prescriptions.id"), nullable=False)
    pharmacy_id = Column(String(36), ForeignKey("ehr.pharmacies.id"), nullable=False)
    
    # Refill details
    refill_number = Column(Integer, nullable=False)
    refill_date = Column(DateTime(timezone=True), nullable=False)
    quantity_dispensed = Column(Integer, nullable=False)
    days_supply = Column(Integer, nullable=True)
    
    # Dispensing information
    dispensed_by = Column(String(200), nullable=True)  # Pharmacist name
    dispensed_by_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    
    # Pricing
    price = Column(Float, nullable=True)
    insurance_covered_amount = Column(Float, nullable=True)
    patient_paid_amount = Column(Float, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    prescription = relationship("Prescription", back_populates="refills")
    pharmacy = relationship("Pharmacy", back_populates="refills")


class Pharmacy(Base):
    """Pharmacy information."""
    __tablename__ = "pharmacies"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Basic information
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200), nullable=True)
    license_number = Column(String(100), unique=True, nullable=False)
    
    # Contact information
    phone = Column(String(20), nullable=False)
    fax = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    
    # Address
    address = Column(Text, nullable=False)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(2), default="UZ")
    
    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Operating hours
    is_24_hours = Column(Boolean, default=False)
    opening_time = Column(Time, nullable=True)
    closing_time = Column(Time, nullable=True)
    operating_hours = Column(JSON, nullable=True)  # Detailed hours by day
    
    # Services
    delivery_available = Column(Boolean, default=False)
    online_ordering = Column(Boolean, default=False)
    consultation_available = Column(Boolean, default=False)
    
    # Ratings
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    # Network/Insurance
    accepted_insurances = Column(JSON, nullable=True)  # Array of insurance IDs
    is_in_network = Column(Boolean, default=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # FHIR reference
    fhir_organization_id = Column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    prescription_prices = relationship("PharmacyPrescriptionPrice", back_populates="pharmacy", cascade="all, delete-orphan")
    refills = relationship("PrescriptionRefill", back_populates="pharmacy", cascade="all, delete-orphan")


class PharmacyPrescriptionPrice(Base):
    """Pharmacy-specific prescription pricing."""
    __tablename__ = "pharmacy_prescription_prices"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    pharmacy_id = Column(String(36), ForeignKey("ehr.pharmacies.id"), nullable=False)
    prescription_id = Column(String(36), ForeignKey("ehr.prescriptions.id"), nullable=False)
    
    # Availability
    is_available = Column(Boolean, default=True)
    stock_quantity = Column(Integer, nullable=True)
    last_stock_check = Column(DateTime(timezone=True), nullable=True)
    
    # Pricing
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    currency = Column(String(3), default="UZS")
    
    # Discounts
    discount_percent = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    final_price = Column(Float, nullable=False)
    
    # Insurance
    insurance_accepted = Column(Boolean, default=True)
    insurance_coverage_percent = Column(Float, nullable=True)
    estimated_copay = Column(Float, nullable=True)
    
    # Generic alternatives
    generic_available = Column(Boolean, default=False)
    generic_price = Column(Float, nullable=True)
    
    # Validity
    price_valid_until = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="prescription_prices")
    prescription = relationship("Prescription", back_populates="pharmacy_prices")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('pharmacy_id', 'prescription_id', name='uq_pharmacy_prescription'),
    )