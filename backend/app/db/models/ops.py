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
    metadata_json = Column(JSONB, server_default=text("'{}'::jsonb"), name="metadata")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

# Note: Notification model is defined in app.common.models.notification
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Todo model is defined in app.common.models.messaging
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: MedicationAdministrationEvent model is defined in app.common.models.nurse
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: BlockedTimeSlot model is defined in app.common.models.appointment
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: MessageAttachment model is defined in app.common.models.messaging
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: PatientMedication model is defined in app.common.models.patient
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: PrescriptionReminder model is defined in app.common.models.prescription
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: PrescriptionRefill model is defined in app.common.models.prescription
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: PharmacyPrescriptionPrice model is defined in app.common.models.prescription
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: LabEquipmentInstrument model is defined in app.common.models.lab_settings
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: RadiologyTemplate model is defined in app.common.models.radiology
# Removed duplicate definition to avoid SQLAlchemy table conflict

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