# app/crud/lab_settings.py
"""CRUD operations for lab settings."""
import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.common.models.lab_settings import LabSettings, LabEquipmentInstrument


def get_lab_settings_by_type(db: Session, settings_type: str) -> Optional[LabSettings]:
    """Get lab settings by type."""
    return db.query(LabSettings).filter(
        and_(
            LabSettings.settings_type == settings_type,
            LabSettings.is_active == True
        )
    ).first()


def create_lab_settings(db: Session, settings_type: str, settings_data: Dict[str, Any], created_by: str = None) -> LabSettings:
    """Create new lab settings."""
    # Deactivate any existing settings of this type
    existing = db.query(LabSettings).filter(
        and_(
            LabSettings.settings_type == settings_type,
            LabSettings.is_active == True
        )
    ).first()
    
    if existing:
        existing.is_active = False
    
    # Create new settings
    db_settings = LabSettings(
        id=str(uuid.uuid4()),  # Ensure ID is a string for SQLite
        settings_type=settings_type,
        settings_data=settings_data,
        created_by=created_by
    )
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings


def update_lab_settings(db: Session, settings_type: str, settings_data: Dict[str, Any], updated_by: str = None) -> Optional[LabSettings]:
    """Update lab settings by type."""
    settings = get_lab_settings_by_type(db, settings_type)
    if not settings:
        # Create new settings if they don't exist
        return create_lab_settings(db, settings_type, settings_data, updated_by)
    
    # Update existing settings
    settings.settings_data = settings_data
    settings.created_by = updated_by  # Track who made the update
    db.commit()
    db.refresh(settings)
    return settings


def get_all_lab_settings(db: Session) -> List[LabSettings]:
    """Get all active lab settings."""
    return db.query(LabSettings).filter(LabSettings.is_active == True).all()


def get_equipment_instruments(db: Session) -> List[LabEquipmentInstrument]:
    """Get all active equipment instruments."""
    return db.query(LabEquipmentInstrument).filter(LabEquipmentInstrument.is_active == True).all()


def get_equipment_instrument_by_id(db: Session, instrument_id: str) -> Optional[LabEquipmentInstrument]:
    """Get equipment instrument by ID."""
    return db.query(LabEquipmentInstrument).filter(
        and_(
            LabEquipmentInstrument.instrument_id == instrument_id,
            LabEquipmentInstrument.is_active == True
        )
    ).first()


def create_equipment_instrument(db: Session, instrument_data: Dict[str, Any], created_by: str = None) -> LabEquipmentInstrument:
    """Create new equipment instrument."""
    db_instrument = LabEquipmentInstrument(
        id=str(uuid.uuid4()),  # Ensure ID is a string for SQLite
        instrument_id=instrument_data.get("id"),
        name=instrument_data.get("name"),
        type=instrument_data.get("type"),
        status=instrument_data.get("status", "active"),
        location=instrument_data.get("location"),
        calibration_due=instrument_data.get("calibrationDue"),
        maintenance_due=instrument_data.get("maintenanceDue"),
        settings=instrument_data.get("settings"),
        created_by=created_by
    )
    db.add(db_instrument)
    db.commit()
    db.refresh(db_instrument)
    return db_instrument


def update_equipment_instrument(db: Session, instrument_id: str, instrument_data: Dict[str, Any], updated_by: str = None) -> Optional[LabEquipmentInstrument]:
    """Update equipment instrument by ID."""
    instrument = get_equipment_instrument_by_id(db, instrument_id)
    if not instrument:
        return None
    
    # Update instrument data
    for key, value in instrument_data.items():
        if hasattr(instrument, key):
            setattr(instrument, key, value)
    
    instrument.created_by = updated_by  # Track who made the update
    db.commit()
    db.refresh(instrument)
    return instrument


def delete_equipment_instrument(db: Session, instrument_id: str) -> bool:
    """Delete equipment instrument by ID (soft delete)."""
    instrument = get_equipment_instrument_by_id(db, instrument_id)
    if not instrument:
        return False
    
    instrument.is_active = False
    db.commit()
    return True
