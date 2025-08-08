# app/common/models/base.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from uuid import UUID, uuid4


# FHIR Enums
class ResourceType(str, Enum):
    ORGANIZATION = "Organization"
    PRACTITIONER = "Practitioner"
    PATIENT = "Patient"
    LOCATION = "Location"
    PRACTITIONER_ROLE = "PractitionerRole"
    HEALTHCARE_SERVICE = "HealthcareService"
    CHARGE_ITEM = "ChargeItem"
    APPOINTMENT = "Appointment"
    ENCOUNTER = "Encounter"
    OBSERVATION = "Observation"
    MEDICATION_REQUEST = "MedicationRequest"
    CONDITION = "Condition"
    CLINICAL_IMPRESSION = "ClinicalImpression"
    DOCUMENT_REFERENCE = "DocumentReference"
    CARE_PLAN = "CarePlan"
    SERVICE_REQUEST = "ServiceRequest"
    ALLERGY_INTOLERANCE = "AllergyIntolerance"
    IMMUNIZATION = "Immunization"


class IdentifierUse(str, Enum):
    USUAL = "usual"
    OFFICIAL = "official"
    TEMP = "temp"
    SECONDARY = "secondary"
    OLD = "old"


class ContactPointSystem(str, Enum):
    PHONE = "phone"
    FAX = "fax"
    EMAIL = "email"
    PAGER = "pager"
    URL = "url"
    SMS = "sms"
    OTHER = "other"


class ContactPointUse(str, Enum):
    HOME = "home"
    WORK = "work"
    TEMP = "temp"
    OLD = "old"
    MOBILE = "mobile"


class AddressUse(str, Enum):
    HOME = "home"
    WORK = "work"
    TEMP = "temp"
    OLD = "old"
    BILLING = "billing"


class AddressType(str, Enum):
    POSTAL = "postal"
    PHYSICAL = "physical"
    BOTH = "both"


class NameUse(str, Enum):
    USUAL = "usual"
    OFFICIAL = "official"
    TEMP = "temp"
    NICKNAME = "nickname"
    ANONYMOUS = "anonymous"
    OLD = "old"
    MAIDEN = "maiden"


class AdministrativeGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"


class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class PractitionerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class LocationStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class LocationMode(str, Enum):
    INSTANCE = "instance"
    KIND = "kind"


# Base FHIR Components
class Identifier(BaseModel):
    use: Optional[IdentifierUse] = None
    type: Optional[Dict[str, Any]] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period: Optional[Dict[str, Any]] = None
    assigner: Optional[Dict[str, Any]] = None


class ContactPoint(BaseModel):
    system: Optional[ContactPointSystem] = None
    value: Optional[str] = None
    use: Optional[ContactPointUse] = None
    rank: Optional[int] = None
    period: Optional[Dict[str, Any]] = None


class Address(BaseModel):
    use: Optional[AddressUse] = None
    type: Optional[AddressType] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    period: Optional[Dict[str, Any]] = None


class HumanName(BaseModel):
    use: Optional[NameUse] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period: Optional[Dict[str, Any]] = None


class Period(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class Reference(BaseModel):
    reference: Optional[str] = None
    type: Optional[str] = None
    identifier: Optional[Identifier] = None
    display: Optional[str] = None


class CodeableConcept(BaseModel):
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class Coding(BaseModel):
    system: Optional[str] = None
    version: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    userSelected: Optional[bool] = None


class Meta(BaseModel):
    versionId: Optional[str] = None
    lastUpdated: Optional[datetime] = None
    source: Optional[str] = None
    profile: Optional[List[str]] = None
    security: Optional[List[Coding]] = None
    tag: Optional[List[Coding]] = None


# Base Resource
class FHIRResource(BaseModel):
    resourceType: str
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()))
    meta: Optional[Meta] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    
    class Config:
        use_enum_values = True