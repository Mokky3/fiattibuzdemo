"""
Medication reference models for the ref schema.
"""
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP, CITEXT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql.base import ischema_names
import uuid

from app.db.base_class import Base


class Unit(Base):
    """Unit of measurement for medications."""
    __tablename__ = "unit"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    code = Column(Text, unique=True, nullable=False, index=True)
    name = Column(Text, nullable=False)
    
    # Relationships
    strength_units = relationship("MedicationProduct", foreign_keys="MedicationProduct.strength_unit_id", back_populates="strength_unit")
    pack_size_units = relationship("MedicationPresentation", foreign_keys="MedicationPresentation.pack_size_unit_id", back_populates="pack_size_unit")


class Route(Base):
    """Administration route for medications."""
    __tablename__ = "route"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    code = Column(Text, unique=True, nullable=False, index=True)
    name = Column(Text, nullable=False)
    
    # Relationships
    products = relationship("MedicationProduct", back_populates="route")


class DosageForm(Base):
    """Dosage form for medications (tablet, capsule, etc.)."""
    __tablename__ = "dosage_form"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    code = Column(Text, unique=True, nullable=True, index=True)
    name = Column(Text, unique=True, nullable=False, index=True)
    
    # Relationships
    products = relationship("MedicationProduct", back_populates="dosage_form")


class Manufacturer(Base):
    """Medication manufacturer."""
    __tablename__ = "manufacturer"
    __table_args__ = (
        UniqueConstraint('name', 'country', name='uq_manufacturer_name_country'),
        {"schema": "ref"}
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    name = Column(CITEXT, nullable=False, index=True)  # Case-insensitive text
    country = Column(Text, nullable=True)
    
    # Relationships
    products = relationship("MedicationProduct", back_populates="manufacturer")


class MNN(Base):
    """International Nonproprietary Name (МНН)."""
    __tablename__ = "mnn"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    name = Column(CITEXT, unique=True, nullable=False, index=True)  # Case-insensitive text
    
    # Relationships
    products = relationship("MedicationProduct", back_populates="mnn")


class CategoryTag(Base):
    """Category tag for medication classification."""
    __tablename__ = "category_tag"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    name = Column(CITEXT, unique=True, nullable=False, index=True)  # Case-insensitive text
    
    # Relationships
    products = relationship("MedicationProduct", secondary="ref.medication_product_category", back_populates="categories")


class MedicationProduct(Base):
    """Medication product (brand name medication)."""
    __tablename__ = "medication_product"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    pharm_id = Column(Text, nullable=True, index=True)
    brand_name = Column(CITEXT, nullable=False, index=True)  # Case-insensitive text
    # brand_name_normalized is a generated column - handled in migration
    brand_name_normalized = Column(Text, nullable=True)  # Generated column for search
    registration_number = Column(Text, nullable=True, index=True)
    
    # Foreign keys
    mnn_id = Column(UUID(as_uuid=True), ForeignKey("ref.mnn.id"), nullable=True, index=True)
    dosage_form_id = Column(UUID(as_uuid=True), ForeignKey("ref.dosage_form.id"), nullable=True, index=True)
    route_id = Column(UUID(as_uuid=True), ForeignKey("ref.route.id"), nullable=True, index=True)
    strength_value = Column(Numeric, nullable=True)
    strength_unit_id = Column(UUID(as_uuid=True), ForeignKey("ref.unit.id"), nullable=True, index=True)
    manufacturer_id = Column(UUID(as_uuid=True), ForeignKey("ref.manufacturer.id"), nullable=True, index=True)
    
    country_of_origin = Column(Text, nullable=True)
    rx_required = Column(Boolean, nullable=True, index=True)
    product_metadata = Column("metadata", JSONB, nullable=True, server_default='{}')
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    mnn = relationship("MNN", back_populates="products")
    dosage_form = relationship("DosageForm", back_populates="products")
    route = relationship("Route", back_populates="products")
    strength_unit = relationship("Unit", foreign_keys=[strength_unit_id], back_populates="strength_units")
    manufacturer = relationship("Manufacturer", back_populates="products")
    
    categories = relationship("CategoryTag", secondary="ref.medication_product_category", back_populates="products")
    synonyms = relationship("MedicationProductSynonym", back_populates="product", cascade="all, delete-orphan")
    presentations = relationship("MedicationPresentation", back_populates="product", cascade="all, delete-orphan")


class MedicationProductSynonym(Base):
    """Synonym/alternative names for medication products."""
    __tablename__ = "medication_product_synonym"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    product_id = Column(UUID(as_uuid=True), ForeignKey("ref.medication_product.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(Text, nullable=False)
    lang = Column(Text, server_default='ru', nullable=True)
    
    # Relationships
    product = relationship("MedicationProduct", back_populates="synonyms")


# Association table for product-category many-to-many
class MedicationProductCategory(Base):
    """Association table for medication product categories."""
    __tablename__ = "medication_product_category"
    __table_args__ = {"schema": "ref"}
    
    product_id = Column(UUID(as_uuid=True), ForeignKey("ref.medication_product.id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("ref.category_tag.id", ondelete="CASCADE"), primary_key=True)


class MedicationPresentation(Base):
    """Medication presentation (packaging/unit)."""
    __tablename__ = "medication_presentation"
    __table_args__ = (
        UniqueConstraint('product_id', 'gtin', 'pack_text', name='uq_med_presentation_product_gtin_pack'),
        {"schema": "ref"}
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    product_id = Column(UUID(as_uuid=True), ForeignKey("ref.medication_product.id", ondelete="CASCADE"), nullable=False, index=True)
    pack_text = Column(Text, nullable=True)
    items_per_pack = Column(Integer, nullable=True)
    pack_size_value = Column(Numeric, nullable=True)
    pack_size_unit_id = Column(UUID(as_uuid=True), ForeignKey("ref.unit.id"), nullable=True, index=True)
    gtin = Column(Text, nullable=True, index=True)
    
    # Relationships
    product = relationship("MedicationProduct", back_populates="presentations")
    pack_size_unit = relationship("Unit", foreign_keys=[pack_size_unit_id], back_populates="pack_size_units")
    prices = relationship("MedicationPrice", back_populates="presentation", cascade="all, delete-orphan")


class MedicationPrice(Base):
    """Medication price (retail, wholesale, cap)."""
    __tablename__ = "medication_price"
    __table_args__ = {"schema": "ref"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.uuid_generate_v4())
    presentation_id = Column(UUID(as_uuid=True), ForeignKey("ref.medication_presentation.id", ondelete="CASCADE"), nullable=False, index=True)
    price_type = Column(Text, nullable=False, server_default='retail', index=True)  # retail, wholesale, cap
    currency = Column(Text, nullable=False)
    amount = Column(Numeric, nullable=False)
    source = Column(Text, nullable=True)
    noted_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    presentation = relationship("MedicationPresentation", back_populates="prices")


# Staging models
class DrugCatalogRaw(Base):
    """Raw staging table for drug catalog imports."""
    __tablename__ = "drug_catalog_raw"
    __table_args__ = {"schema": "staging"}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_row = Column(JSONB, nullable=False)
    src_file = Column(Text, nullable=True)
    src_sheet = Column(Text, nullable=True)
    imported_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class PriceRaw(Base):
    """Raw staging table for price imports."""
    __tablename__ = "price_raw"
    __table_args__ = {"schema": "staging"}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_row = Column(JSONB, nullable=False)
    src_file = Column(Text, nullable=True)
    src_sheet = Column(Text, nullable=True)
    imported_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

