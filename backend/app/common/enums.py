"""Unified enums for the EHR system to avoid vocabulary mismatches."""
from enum import Enum


class ServiceRequestStatus(str, Enum):
    """FHIR ServiceRequestStatus enum with lowercase values."""
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on-hold"
    REVOKED = "revoked"
    COMPLETED = "completed"
    ENTERED_IN_ERROR = "entered-in-error"
    UNKNOWN = "unknown"


class ServiceRequestPriority(str, Enum):
    """FHIR ServiceRequestPriority enum with lowercase values."""
    ROUTINE = "routine"
    URGENT = "urgent"
    ASAP = "asap"
    STAT = "stat"


class ServiceRequestIntent(str, Enum):
    """FHIR ServiceRequestIntent enum with lowercase values."""
    PROPOSAL = "proposal"
    PLAN = "plan"
    DIRECTIVE = "directive"
    ORDER = "order"
    ORIGINAL_ORDER = "original-order"
    REFLEX_ORDER = "reflex-order"
    FILLER_ORDER = "filler-order"
    INSTANCE_ORDER = "instance-order"


# Legacy to FHIR mapping for backward compatibility
LEGACY_TO_FHIR_STATUS = {
    "pending": "active",
    "sent": "active", 
    "received": "active",
    "not-received": "active",
    "ready": "completed",
    "cancelled": "revoked",
    "canceled": "revoked",  # US spelling
}

LEGACY_TO_FHIR_PRIORITY = {
    "normal": "routine",
}

LEGACY_TO_FHIR_INTENT = {
    "order": "order",  # already correct
}
