from sqlalchemy import Column, ForeignKey, text, Integer, Float, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, DATE, TEXT, TIMESTAMP, JSONB, BIGINT
from sqlalchemy.orm import relationship
from app.db.base_class import Base

# Note: Patient model is defined in app.common.models.patient
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Appointment model is defined in app.common.models.appointment
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Encounter model is defined in app.common.models.appointment
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: LabOrder model is defined in app.common.models.lab_insurance
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: LabResult model is defined in app.common.models.lab_insurance
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: LabReport model is defined in app.common.models.lab_insurance
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Prescription model is defined in app.common.models.prescription
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Condition model is defined in app.common.models.clinical
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Observation model is defined in app.common.models.clinical
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: AllergyIntolerance model is defined in app.common.models.clinical
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Immunization model is defined in app.common.models.clinical
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: RadiologyStudy model is defined in app.common.models.radiology
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: RadiologyReport model is defined in app.common.models.radiology
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: Message model is defined in app.common.models.messaging
# Removed duplicate definition to avoid SQLAlchemy table conflict

# Note: LabSettings model is defined in app.common.models.lab_settings
# Removed duplicate definition to avoid SQLAlchemy table conflict

class SourceTranslation(Base):
    """Stores original source language text (e.g., Russian) from FHIR resource text.div for clinical audit trail."""
    __tablename__ = "source_translations"
    __table_args__ = {"schema": "ehr"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    fhir_resource_type = Column(TEXT, nullable=False, index=True)  # Patient, Condition, Observation, etc.
    fhir_resource_id = Column(TEXT, nullable=False, index=True)  # The FHIR resource ID
    original_text = Column(TEXT, nullable=False)  # Original source language text from text.div
    source_language = Column(TEXT, nullable=False, default="ru")  # Language code (ru, uz, etc.)
    extracted_from_div = Column(TEXT)  # Full HTML div content if needed
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True))
