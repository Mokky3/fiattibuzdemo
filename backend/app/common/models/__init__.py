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
    DoctorScheduleException, ClinicalNote
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
    CarePlan, VitalSign
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
    LabOrder, ServiceRequestStatus, ServiceRequestIntent, ServiceRequestPriority,
    LabResult, LabResultStatus, AbnormalityType, SpecimenType,
    LabResultNotification,
    Insurance, InsuranceStatus, CoverageType, InsuranceClaim, ClaimStatus,
    ClaimLineItem, InsuranceAuthorization
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
    "DoctorScheduleException", "ClinicalNote",
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
    "CarePlan", "VitalSign",
    
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
    "LabOrder", "ServiceRequestStatus", "ServiceRequestIntent", "ServiceRequestPriority",
    "LabResult", "LabResultStatus", "AbnormalityType", "SpecimenType",
    "LabResultNotification", 
    "Insurance", "InsuranceStatus", "CoverageType", "InsuranceClaim", "ClaimStatus",
    "ClaimLineItem", "InsuranceAuthorization",
    
    # Financial
    "ChargeItem", "ChargeItemStatus", "ChargeItemModifier", "DiscountType",
    "PatientAccount", "Bill", "BillStatus", "Payment", "PaymentStatus",
    "PaymentMethod", "FinancialTransaction",
    
    # Support
    \
    "Notification", "NotificationType", "NotificationChannel", "NotificationPriority",
    "NotificationStatus", "NotificationTemplate", "NotificationPreference",
    "LoginSession",
    
    # Association tables
    "doctor_hospitals", "doctor_departments",
]