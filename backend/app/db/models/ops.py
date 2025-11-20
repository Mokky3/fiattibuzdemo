from sqlalchemy import Column, ForeignKey, text, Integer, Float, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, DATE, TEXT, TIMESTAMP, JSONB, BIGINT
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "ops"}

    id = Column(BIGINT, primary_key=True, autoincrement=True)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"))
    action = Column(TEXT, nullable=False)
    entity = Column(TEXT, nullable=False)
    entity_id = Column(TEXT)
    metadata = Column(JSONB, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    title = Column(TEXT, nullable=False)
    message = Column(TEXT, nullable=False)
    type = Column(TEXT, nullable=False)
    priority = Column(TEXT, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(TIMESTAMP(timezone=True))
    action_url = Column(TEXT)
    metadata = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

class Todo(Base):
    __tablename__ = "todos"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    title = Column(TEXT, nullable=False)
    description = Column(TEXT)
    status = Column(TEXT, nullable=False)
    priority = Column(TEXT, nullable=False)
    due_date = Column(TIMESTAMP(timezone=True))
    completed_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class NurseTask(Base):
    __tablename__ = "nurse_tasks"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    nurse_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    task_type = Column(TEXT, nullable=False)
    title = Column(TEXT, nullable=False)
    description = Column(TEXT)
    status = Column(TEXT, nullable=False)
    priority = Column(TEXT, nullable=False)
    scheduled_time = Column(TIMESTAMP(timezone=True))
    completed_time = Column(TIMESTAMP(timezone=True))
    notes = Column(TEXT)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class MedicationAdministrationEvent(Base):
    __tablename__ = "medication_administration_events"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    medication_id = Column(UUID(as_uuid=True))
    nurse_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    action = Column(TEXT, nullable=False)
    reason = Column(TEXT)
    dose_given = Column(TEXT)
    route = Column(TEXT)
    administered_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    comments = Column(TEXT)

class BlockedTimeSlot(Base):
    __tablename__ = "blocked_time_slots"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    schedule_id = Column(UUID(as_uuid=True))
    start_datetime = Column(TIMESTAMP(timezone=True), nullable=False)
    end_datetime = Column(TIMESTAMP(timezone=True), nullable=False)
    reason = Column(TEXT, nullable=False)
    block_type = Column(TEXT, nullable=False)
    description = Column(TEXT)
    is_recurring = Column(Boolean)
    recurrence_pattern = Column(JSONB)
    recurrence_end_date = Column(DATE)
    is_active = Column(Boolean)
    created_by = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class MessageAttachment(Base):
    __tablename__ = "message_attachments"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    message_id = Column(UUID(as_uuid=True), ForeignKey("ehr.messages.id"), nullable=False)
    file_name = Column(TEXT, nullable=False)
    file_type = Column(TEXT, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_url = Column(TEXT, nullable=False)
    description = Column(TEXT)
    uploaded_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    fhir_binary_id = Column(TEXT)

class PatientMedication(Base):
    __tablename__ = "patient_medications"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("ehr.prescriptions.id"))
    medication_name = Column(TEXT, nullable=False)
    dosage = Column(TEXT, nullable=False)
    frequency = Column(TEXT, nullable=False)
    route = Column(TEXT)
    start_date = Column(DATE, nullable=False)
    end_date = Column(DATE)
    is_active = Column(Boolean)
    is_discontinued = Column(Boolean)
    discontinued_date = Column(DATE)
    discontinued_reason = Column(TEXT)
    prescribed_by = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"), nullable=False)
    prescribed_date = Column(DATE, nullable=False)
    instructions = Column(TEXT)
    notes = Column(TEXT)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class PrescriptionReminder(Base):
    __tablename__ = "prescription_reminders"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("ehr.prescriptions.id"), nullable=False)
    title = Column(TEXT, nullable=False)
    subtitle = Column(TEXT)
    message = Column(TEXT)
    reminder_time = Column(TIMESTAMP(timezone=True), nullable=False)
    repeat_pattern = Column(TEXT)
    priority = Column(TEXT)
    is_active = Column(Boolean)
    is_acknowledged = Column(Boolean)
    acknowledged_at = Column(TIMESTAMP(timezone=True))
    send_email = Column(Boolean)
    send_sms = Column(Boolean)
    send_push = Column(Boolean)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class PrescriptionRefill(Base):
    __tablename__ = "prescription_refills"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("ehr.prescriptions.id"), nullable=False)
    pharmacy_id = Column(UUID(as_uuid=True), nullable=False)
    refill_number = Column(Integer, nullable=False)
    refill_date = Column(TIMESTAMP(timezone=True), nullable=False)
    quantity_dispensed = Column(Integer, nullable=False)
    days_supply = Column(Integer)
    dispensed_by = Column(TEXT)
    dispensed_by_id = Column(UUID(as_uuid=True))
    price = Column(Float)
    insurance_covered_amount = Column(Float)
    patient_paid_amount = Column(Float)
    notes = Column(TEXT)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class PharmacyPrescriptionPrice(Base):
    __tablename__ = "pharmacy_prescription_prices"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    pharmacy_id = Column(UUID(as_uuid=True), nullable=False)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("ehr.prescriptions.id"), nullable=False)
    is_available = Column(Boolean)
    stock_quantity = Column(Integer)
    last_stock_check = Column(TIMESTAMP(timezone=True))
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    currency = Column(TEXT)
    discount_percent = Column(Float)
    discount_amount = Column(Float)
    final_price = Column(Float, nullable=False)
    insurance_accepted = Column(Boolean)
    insurance_coverage_percent = Column(Float)
    estimated_copay = Column(Float)
    generic_available = Column(Boolean)
    generic_price = Column(Float)
    price_valid_until = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))

class LabEquipmentInstrument(Base):
    __tablename__ = "lab_equipment_instruments"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    instrument_id = Column(TEXT, nullable=False)
    name = Column(TEXT, nullable=False)
    type = Column(TEXT, nullable=False)
    status = Column(TEXT, nullable=False)
    location = Column(TEXT)
    calibration_due = Column(TIMESTAMP(timezone=True))
    maintenance_due = Column(TIMESTAMP(timezone=True))
    settings = Column(JSONB)
    is_active = Column(Boolean)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))
    created_by = Column(UUID(as_uuid=True))

class RadiologyTemplate(Base):
    __tablename__ = "radiology_templates"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(TEXT, nullable=False)
    modality = Column(TEXT, nullable=False)
    body_part = Column(TEXT, nullable=False)
    category = Column(TEXT, nullable=False)
    description = Column(TEXT)
    author_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"))
    created_date = Column(DATE, nullable=False)
    last_modified = Column(DATE, nullable=False)
    usage_count = Column(Integer)
    is_private = Column(Boolean)
    is_favorite = Column(Boolean)
    content = Column(JSONB, nullable=False)
    tags = Column(JSONB)

class RadiologyWorklistAssignment(Base):
    __tablename__ = "radiology_worklist_assignments"
    __table_args__ = {"schema": "ops"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    study_id = Column(UUID(as_uuid=True), ForeignKey("ehr.radiology_studies.id"), nullable=False)
    assigned_radiologist_id = Column(UUID(as_uuid=True), ForeignKey("core.users.user_id"))
    reading_status = Column(TEXT, nullable=False)
    critical_flag = Column(Boolean)
    tags = Column(JSONB)
    preliminary_findings = Column(TEXT)
    image_count = Column(Integer)
    series_count = Column(Integer)
    study_size = Column(TEXT)
    protocol_name = Column(TEXT)
    assigned_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    turnaround_time = Column(TEXT)
    estimated_read_time = Column(TEXT)

class FhirResource(Base):
    __tablename__ = "fhir_resources"
    __table_args__ = {"schema": "ops"}

    key = Column(TEXT, primary_key=True)
    resource_type = Column(TEXT, nullable=False)
    resource_id = Column(TEXT)
    resource = Column(JSONB, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))