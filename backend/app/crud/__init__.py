# app/crud/__init__.py
"""
CRUD operations for all models.

This module provides database operations for all models in the EHR system.
Import all CRUD instances here for easy access throughout the application.
"""

from app.crud.user import user
from app.crud.admin import admin
from app.crud.doctor import doctor_portal as doctor
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

# Additional CRUD imports
from app.crud.appointment import appointment
from app.crud.message import message
from app.crud.notification import notification
from app.crud.todo import todo
from app.crud.vitals import vitals
from app.crud.nurse_tasks import nurse_tasks
from app.crud.medication_administration import med_admin
from app.crud.lab_orders import lab_orders
from app.crud.lab_results import lab_results
from app.crud.lab_reports import lab_reports
from app.crud.patient_portal import patient_portal_crud
from app.crud.patient_medication import patient_medication

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
    
    # Additional CRUD
    "appointment",
    "message",
    "notification",
    "todo",
    
    # Nurse portal CRUD
    "vitals",
    "nurse_tasks",
    "med_admin",

    # Lab portal CRUD
    "lab_orders",
    "lab_results",
    "lab_reports",
    
    # Patient portal CRUD
    "patient_portal_crud",
    
    # Patient medication CRUD
    "patient_medication",
]