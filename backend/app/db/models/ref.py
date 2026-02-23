from sqlalchemy import Column, text, Integer, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, DATE, TEXT, TIMESTAMP, JSONB
from app.db.base_class import Base

# Note: Specialty model is defined in app.common.models.practitioner
# Removed duplicate definition to avoid SQLAlchemy table conflict

class IcdCode(Base):
    __tablename__ = "icd_codes"
    __table_args__ = {"schema": "ref"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code = Column(TEXT, nullable=False, index=True)
    version = Column(TEXT, default="ICD-11", nullable=False, index=True)  # ICD-10, ICD-11, etc.
    description_en = Column(TEXT)  # English description
    description_ru = Column(TEXT)  # Russian description
    description_uz = Column(TEXT)  # Uzbek description
    # Legacy field - kept for backward compatibility
    description = Column(TEXT)  # Deprecated: use description_en/ru/uz
    category = Column(TEXT)
    chapter = Column(TEXT)  # Chapter code/number
    parent_code = Column(TEXT, index=True)  # Parent code for hierarchy
    level = Column(Integer)  # Hierarchy level (1, 2, 3, etc.)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    
    # Note: Unique constraint on (code, version) should be added via migration

class CptCode(Base):
    __tablename__ = "cpt_codes"
    __table_args__ = {"schema": "ref"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code = Column(TEXT, nullable=False, unique=True)
    description = Column(TEXT, nullable=False)
    category = Column(TEXT)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

class Medication(Base):
    __tablename__ = "medications"
    __table_args__ = {"schema": "ref"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(TEXT, nullable=False)
    generic_name = Column(TEXT)
    brand_name = Column(TEXT)
    ndc_code = Column(TEXT, unique=True)
    dosage_form = Column(TEXT)
    strength = Column(TEXT)
    manufacturer = Column(TEXT)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

class LabTest(Base):
    __tablename__ = "lab_tests"
    __table_args__ = {"schema": "ref"}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    test_code = Column(TEXT, nullable=False, unique=True)
    test_name = Column(TEXT, nullable=False)
    category = Column(TEXT)
    normal_range_low = Column(Float)
    normal_range_high = Column(Float)
    unit = Column(TEXT)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

# Hospital model is defined in app.common.models.hospital to avoid duplicate definition
# from app.common.models.hospital import Hospital

# Pharmacy model is defined in app.common.models.prescription to avoid duplicate definition
# from app.common.models.prescription import Pharmacy
