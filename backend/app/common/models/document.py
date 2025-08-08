# app/common/models/document.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import (
    FHIRResource, ResourceType, Identifier, Reference, CodeableConcept, 
    Period
)


class DocumentReference(FHIRResource):
    """FHIR DocumentReference Resource - Clinical documents and reports"""
    resourceType: str = Field(default=ResourceType.DOCUMENT_REFERENCE, const=True)
    masterIdentifier: Optional[Identifier] = None
    identifier: Optional[List[Identifier]] = None
    status: str  # Required: current | superseded | entered-in-error
    docStatus: Optional[str] = None  # preliminary | final | amended | entered-in-error
    type: Optional[CodeableConcept] = None  # Type of document
    category: Optional[List[CodeableConcept]] = None
    subject: Optional[Reference] = None  # Patient
    date: Optional[datetime] = None
    author: Optional[List[Reference]] = None  # Practitioner
    authenticator: Optional[Reference] = None
    custodian: Optional[Reference] = None  # Organization
    relatesTo: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    securityLabel: Optional[List[CodeableConcept]] = None
    content: List[Dict[str, Any]]  # Required: Document referenced
    context: Optional[Dict[str, Any]] = None


class ClinicalImpression(FHIRResource):
    """FHIR ClinicalImpression Resource - Clinical assessment and summary"""
    resourceType: str = Field(default=ResourceType.CLINICAL_IMPRESSION, const=True)
    identifier: Optional[List[Identifier]] = None
    status: str  # Required: preparation | in-progress | not-done | on-hold | stopped | completed | entered-in-error | unknown
    statusReason: Optional[CodeableConcept] = None
    description: Optional[str] = None
    subject: Reference  # Required: Patient
    encounter: Optional[Reference] = None
    effectiveDateTime: Optional[datetime] = None
    effectivePeriod: Optional[Period] = None
    date: Optional[datetime] = None
    assessor: Optional[Reference] = None  # Practitioner
    previous: Optional[Reference] = None
    problem: Optional[List[Reference]] = None  # Condition or AllergyIntolerance
    investigation: Optional[List[Dict[str, Any]]] = None
    protocol: Optional[List[str]] = None
    summary: Optional[str] = None
    finding: Optional[List[Dict[str, Any]]] = None
    prognosisCodeableConcept: Optional[List[CodeableConcept]] = None
    prognosisReference: Optional[List[Reference]] = None
    supportingInfo: Optional[List[Reference]] = None
    note: Optional[List[Dict[str, Any]]] = None


class CarePlan(FHIRResource):
    """FHIR CarePlan Resource - Treatment plans"""
    resourceType: str = Field(default=ResourceType.CARE_PLAN, const=True)
    identifier: Optional[List[Identifier]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    basedOn: Optional[List[Reference]] = None
    replaces: Optional[List[Reference]] = None
    partOf: Optional[List[Reference]] = None
    status: str  # Required: draft | active | on-hold | revoked | completed | entered-in-error | unknown
    intent: str  # Required: proposal | plan | order | option
    category: Optional[List[CodeableConcept]] = None
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Reference  # Required: Patient
    encounter: Optional[Reference] = None
    period: Optional[Period] = None
    created: Optional[datetime] = None
    author: Optional[Reference] = None
    contributor: Optional[List[Reference]] = None
    careTeam: Optional[List[Reference]] = None
    addresses: Optional[List[Reference]] = None  # Conditions
    supportingInfo: Optional[List[Reference]] = None
    goal: Optional[List[Reference]] = None
    activity: Optional[List[Dict[str, Any]]] = None
    note: Optional[List[Dict[str, Any]]] = None


class ServiceRequest(FHIRResource):
    """FHIR ServiceRequest Resource - Lab orders, diagnostic tests, etc."""
    resourceType: str = Field(default=ResourceType.SERVICE_REQUEST, const=True)
    identifier: Optional[List[Identifier]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    basedOn: Optional[List[Reference]] = None
    replaces: Optional[List[Reference]] = None
    requisition: Optional[Identifier] = None
    status: str  # Required: draft | active | on-hold | revoked | completed | entered-in-error | unknown
    intent: str  # Required: proposal | plan | directive | order | original-order | reflex-order | filler-order | instance-order | option
    category: Optional[List[CodeableConcept]] = None
    priority: Optional[str] = None  # routine | urgent | asap | stat
    doNotPerform: Optional[bool] = None
    code: Optional[CodeableConcept] = None
    orderDetail: Optional[List[CodeableConcept]] = None
    quantityQuantity: Optional[Dict[str, Any]] = None
    quantityRatio: Optional[Dict[str, Any]] = None
    quantityRange: Optional[Dict[str, Any]] = None
    subject: Reference  # Required: Patient
    encounter: Optional[Reference] = None
    occurrenceDateTime: Optional[datetime] = None
    occurrencePeriod: Optional[Period] = None
    occurrenceTiming: Optional[Dict[str, Any]] = None
    asNeededBoolean: Optional[bool] = None
    asNeededCodeableConcept: Optional[CodeableConcept] = None
    authoredOn: Optional[datetime] = None
    requester: Optional[Reference] = None  # Practitioner
    performerType: Optional[CodeableConcept] = None
    performer: Optional[List[Reference]] = None
    locationCode: Optional[List[CodeableConcept]] = None
    locationReference: Optional[List[Reference]] = None
    reasonCode: Optional[List[CodeableConcept]] = None
    reasonReference: Optional[List[Reference]] = None
    insurance: Optional[List[Reference]] = None
    supportingInfo: Optional[List[Reference]] = None
    specimen: Optional[List[Reference]] = None
    bodySite: Optional[List[CodeableConcept]] = None
    note: Optional[List[Dict[str, Any]]] = None
    patientInstruction: Optional[str] = None
    relevantHistory: Optional[List[Reference]] = None