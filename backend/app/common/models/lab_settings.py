# app/common/models/lab_settings.py
"""Lab settings and configuration models for the EHR system."""
from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base


class LabSettings(Base):
    """Lab settings and configuration storage."""
    __tablename__ = "lab_settings"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Settings type (general, system, notification, equipment, user, integration)
    settings_type = Column(String(50), nullable=False, index=True)
    
    # Settings data as JSON
    settings_data = Column(JSON, nullable=False)
    
    # Metadata
    version = Column(String(20), default="1.0")
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), nullable=True)  # User ID who created/updated
    
    # Note: created_by is a string field, not a foreign key relationship


class LabEquipmentInstrument(Base):
    """Lab equipment instruments with settings."""
    __tablename__ = "lab_equipment_instruments"
    __table_args__ = {"schema": "ops"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Instrument identification
    instrument_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="active")
    location = Column(String(200), nullable=True)
    
    # Maintenance schedule
    calibration_due = Column(DateTime(timezone=True), nullable=True)
    maintenance_due = Column(DateTime(timezone=True), nullable=True)
    
    # Settings
    settings = Column(JSON, nullable=True)  # autoStart, qualityControl, dataBackup, etc.
    
    # Metadata
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), nullable=True)
    
    # Note: created_by is a string field, not a foreign key relationship
