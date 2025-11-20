# app/common/models/__init__.py
"""Common models package for the EHR system."""

# User and authentication models
from .user import (
    User, UserRole, UserStatus, UserProfile, UserSession, 
    UserActivity, UserSettings, Permission, RolePermission
)

# Healthcare provider models
from .doctor import (
    Doctor, ConsultationType, DoctorScheduleTemplate, 
    DoctorScheduleException, ClinicalNote, GeneralReport
)
from .nurse import (
    Nurse, NurseSpecialty, NurseRole, NurseShiftAssignment, 
    NursePatientAssignment
)
from .practitioner import (
    Practitioner, PractitionerStatus, PractitionerRole, Specialty
)

# Patient models
from .patient import (
    Patient, PatientStatus, MaritalStatus, Gender, BloodGroup,
    MentalHealthStatus, EmergencyContact, InsurancePolicy,
    MedicalHistory, PatientMedication, PatientSettings,
    ReminderTiming, ProfileVisibility, Theme, Language
)

# Organization models
from .hospital import (
    Hospital, HospitalType, HospitalStatus, HospitalDepartment,
    DepartmentType, Location
)
from .admin import (
    Department, AdminRole, OrganizationStats, DepartmentStats,
    ServicePrice, SystemConfig, AdminActivity, ActivityType,
    SystemAlert, AlertType, AlertSeverity, BulkOperation,
    ReportTemplate, ScheduledReport
)

# Clinical models
from .clinical import (
    Condition, ClinicalStatus, VerificationStatus, ConditionCategory,
    Severity, ConditionStage, ConditionEvidence,
    Observation, ObservationStatus, ObservationCategory, ObservationComponent,
    AllergyIntolerance, AllergyType, AllergyCategory, AllergyCriticality,
    ReactionSeverity, AllergyReaction,
    Immunization, ImmunizationStatus, ImmunizationReaction, ImmunizationProtocol,
    FamilyMemberHistory, FamilyMemberCondition
)
from .medical import (
    MedicalRecord, RecordType, RecordStatus, DocumentReference,
    DocumentStatus, DocumentType, ClinicalImpression, ClinicalImpressionStatus,
    CarePlan, VitalSign, MedicationAdministration
)

# Appointment and encounter models
from .appointment import (
    Appointment, AppointmentStatus, AppointmentType, AppointmentPriority,
    AppointmentParticipant, ParticipantType,
    Encounter, EncounterStatus, EncounterClass, EncounterDiagnosis,
    EncounterLocation, EncounterParticipant, Hospitalization,
    AppointmentReminder, DoctorSchedule, BlockedTimeSlot
)

# Prescription and pharmacy models
from .prescription import (
    Prescription, PrescriptionStatus, PrescriptionIntent, PrescriptionPriority,
    PrescriptionReminder, ReminderPriority, PrescriptionRefill,
    Pharmacy, PharmacyPrescriptionPrice
)

# Laboratory and insurance models
from .lab_insurance import (
    LabOrder as InsuranceLabOrder,
    ServiceRequestStatus, ServiceRequestIntent, ServiceRequestPriority,
    LabResult as InsuranceLabResult,
    LabResultStatus, AbnormalityType, SpecimenType,
    LabReport as InsuranceLabReport,
    LabResultNotification,
    Insurance, InsuranceStatus, CoverageType, InsuranceClaim, ClaimStatus,
    ClaimLineItem, InsuranceAuthorization
)

# Lab settings models
from .lab_settings import (
    LabSettings, LabEquipmentInstrument
)

# Medication reference models
from .medication_ref import (
    Unit, Route, DosageForm, Manufacturer, MNN, CategoryTag,
    MedicationProduct, MedicationProductSynonym, MedicationProductCategory,
    MedicationPresentation, MedicationPrice,
    DrugCatalogRaw, PriceRaw,
)


# Financial models
from .financial import (
    ChargeItem, ChargeItemStatus, ChargeItemModifier, DiscountType,
    PatientAccount, Bill, BillStatus, Payment, PaymentStatus,
    PaymentMethod, FinancialTransaction
)


from .notification import (
    Notification, NotificationType, NotificationChannel, NotificationPriority,
    NotificationStatus, NotificationTemplate, NotificationPreference
)
from .log_ses import LoginSession

# Messaging models
from .messaging import (
    Message, MessageAttachment, MessageTemplate, SystemNotification, Todo, MessagePriority
)

# Association tables
from .doctor import doctor_hospitals, doctor_departments

# Base class (if you have one)
# from .base import Base

__all__ = [
    # User and auth
    "User", "UserRole", "UserStatus", "UserProfile", "UserSession",
    "UserActivity", "UserSettings", "Permission", "RolePermission",
    
    # Healthcare providers
    "Doctor", "ConsultationType", "DoctorScheduleTemplate", 
    "DoctorScheduleException", "ClinicalNote", "GeneralReport",
    "Nurse", "NurseSpecialty", "NurseRole", "NurseShiftAssignment",
    "NursePatientAssignment",
    "Practitioner", "PractitionerStatus", "PractitionerRole", "Specialty",
    
    # Patients
    "Patient", "PatientStatus", "MaritalStatus", "Gender", "BloodGroup",
    "MentalHealthStatus", "EmergencyContact", "InsurancePolicy",
    "MedicalHistory", "PatientMedication", "PatientSettings",
    "ReminderTiming", "ProfileVisibility", "Theme", "Language",
    
    # Organization
    "Hospital", "HospitalType", "HospitalStatus", "HospitalDepartment",
    "DepartmentType", "Location",
    "Department", "AdminRole", "OrganizationStats", "DepartmentStats",
    "ServicePrice", "SystemConfig", "AdminActivity", "ActivityType",
    "SystemAlert", "AlertType", "AlertSeverity", "BulkOperation",
    "ReportTemplate", "ScheduledReport",
    
    # Clinical
    "Condition", "ClinicalStatus", "VerificationStatus", "ConditionCategory",
    "Severity", "ConditionStage", "ConditionEvidence",
    "Observation", "ObservationStatus", "ObservationCategory", "ObservationComponent",
    "AllergyIntolerance", "AllergyType", "AllergyCategory", "AllergyCriticality",
    "ReactionSeverity", "AllergyReaction",
    "Immunization", "ImmunizationStatus", "ImmunizationReaction", "ImmunizationProtocol",
    "FamilyMemberHistory", "FamilyMemberCondition",
    "MedicalRecord", "RecordType", "RecordStatus", "DocumentReference",
    "DocumentStatus", "DocumentType", "ClinicalImpression", "ClinicalImpressionStatus",
    "CarePlan", "VitalSign", "MedicationAdministration",
    
    # Appointments
    "Appointment", "AppointmentStatus", "AppointmentType", "AppointmentPriority",
    "AppointmentParticipant", "ParticipantType",
    "Encounter", "EncounterStatus", "EncounterClass", "EncounterDiagnosis",
    "EncounterLocation", "EncounterParticipant", "Hospitalization",
    "AppointmentReminder", "DoctorSchedule", "BlockedTimeSlot",
    
    # Prescriptions
    "Prescription", "PrescriptionStatus", "PrescriptionIntent", "PrescriptionPriority",
    "PrescriptionReminder", "ReminderPriority", "PrescriptionRefill",
    "Pharmacy", "PharmacyPrescriptionPrice",
    
    # Laboratory and Insurance
    "InsuranceLabOrder", "ServiceRequestStatus", "ServiceRequestIntent", "ServiceRequestPriority",
    "InsuranceLabResult", "LabResultStatus", "AbnormalityType", "SpecimenType", "InsuranceLabReport",
    "LabResultNotification", 
    "Insurance", "InsuranceStatus", "CoverageType", "InsuranceClaim", "ClaimStatus",
    "ClaimLineItem", "InsuranceAuthorization",
    
    # Lab Settings
    "LabSettings", "LabEquipmentInstrument",
    
    # Financial
    "ChargeItem", "ChargeItemStatus", "ChargeItemModifier", "DiscountType",
    "PatientAccount", "Bill", "BillStatus", "Payment", "PaymentStatus",
    "PaymentMethod", "FinancialTransaction",
    
    # Support
    
    "Notification", "NotificationType", "NotificationChannel", "NotificationPriority",
    "NotificationStatus", "NotificationTemplate", "NotificationPreference",
    "LoginSession",
    
    # Messaging
    "Message", "MessageAttachment", "MessageTemplate", "SystemNotification", "Todo", "MessagePriority",
    
    # Association tables
    "doctor_hospitals", "doctor_departments",
]