# app/crud/__init__.py
"""
CRUD operations for all models.

This module provides database operations for all models in the EHR system.
Import all CRUD instances here for easy access throughout the application.
"""

from app.crud.user import user
from app.crud.admin import (
    department,
    organization_stats,
    department_stats,
    service_price,
    system_config,
    admin_activity,
    system_alert,
    bulk_operation,
    report_template,
    scheduled_report
)
from app.crud.doctor import doctor
from app.crud.patient import patient
from app.crud.hospital import (
    hospital,
    hospital_department,
    location,
    clinic  # Alias for hospital
)
from app.crud.financial import (
    charge_item,
    patient_account,
    bill,
    payment,
    financial_transaction
)
from app.crud.clinical import (
    condition,
    observation,
    allergy_intolerance,
    immunization,
    family_history,
    clinical_aggregator
)

# You can add more CRUD imports as you create them:
# from app.crud.appointment import appointment
# from app.crud.prescription import prescription
# from app.crud.report import report
# from app.crud.message import message

__all__ = [
    # User CRUD
    "user",
    
    # Admin CRUD
    "department",
    "organization_stats", 
    "department_stats",
    "service_price",
    "system_config",
    "admin_activity",
    "system_alert",
    "bulk_operation",
    "report_template",
    "scheduled_report",
    
    # Medical CRUD
    "doctor",
    "patient",
    
    # Hospital/Clinic CRUD
    "hospital",
    "hospital_department",
    "location",
    "clinic",
    
    # Financial CRUD
    "charge_item",
    "patient_account",
    "bill",
    "payment",
    "financial_transaction",
    
    # Clinical CRUD
    "condition",
    "observation",
    "allergy_intolerance",
    "immunization",
    "family_history",
    "clinical_aggregator",
]