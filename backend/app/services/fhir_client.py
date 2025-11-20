"""Centralized FHIR client for all portals."""

import os
import httpx
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from urllib.parse import urlencode

from fastapi import HTTPException, status
from pydantic import BaseModel

from app.common.models.appointment import Appointment
from app.common.models.patient import Patient
from app.common.models.doctor import Doctor
from app.common.models.messaging import Message, MessageAttachment
from app.common.models.medical import MedicalRecord, DocumentReference
from app.common.models.clinical import Observation
from app.common.models.prescription import Prescription
from app.services.supabase_sync import SupabaseSyncService


class FHIRConfig(BaseModel):
    base_url: str
    auth_token: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3


class FHIRClient:
    """Centralized FHIR client for all resource operations."""
    
    def __init__(self, config: Optional[FHIRConfig] = None, db_session=None):
        self.config = config or FHIRConfig(
            base_url=os.getenv("FHIR_BASE_URL", "http://localhost:8080/fhir"),
            auth_token=os.getenv("FHIR_AUTH_TOKEN"),
            timeout=int(os.getenv("FHIR_TIMEOUT", "30")),
            max_retries=int(os.getenv("FHIR_MAX_RETRIES", "3"))
        )
        self.db_session = db_session
        self.supabase_sync = SupabaseSyncService(db_session) if db_session else None
    
    async def _make_request(self, method: str, path: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        # Short-circuit when FHIR is disabled for local/offline development
        try:
            if os.getenv("FHIR_DISABLE", "true").lower() in {"1", "true", "yes"}:
                # For GET requests, many callers expect a FHIR Bundle with optional 'entry'
                if method and method.upper() == "GET":
                    return {"resourceType": "Bundle", "type": "searchset", "entry": []}
                # For write operations, return an empty object to indicate no-op success
                return {}
        except Exception:
            # If env access fails, proceed with normal behavior
            pass
        """Make HTTP request to FHIR server."""
        headers = {
            "Accept": "application/fhir+json",
            "Content-Type": "application/fhir+json"
        }
        
        if self.config.auth_token:
            headers["Authorization"] = f"Bearer {self.config.auth_token}"
        
        url = f"{self.config.base_url.rstrip('/')}/{path.lstrip('/')}"
        
        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            for attempt in range(self.config.max_retries):
                try:
                    if method.upper() == "GET":
                        response = await client.get(url, headers=headers, params=params)
                    elif method.upper() == "POST":
                        response = await client.post(url, headers=headers, json=data)
                    elif method.upper() == "PUT":
                        response = await client.put(url, headers=headers, json=data)
                    elif method.upper() == "PATCH":
                        response = await client.patch(url, headers=headers, json=data)
                    elif method.upper() == "DELETE":
                        response = await client.delete(url, headers=headers)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")
                    
                    response.raise_for_status()
                    return response.json()
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code >= 500 and attempt < self.config.max_retries - 1:
                        continue
                    raise HTTPException(
                        status_code=e.response.status_code,
                        detail=f"FHIR server error: {e.response.text}"
                    )
                except httpx.RequestError as e:
                    if attempt < self.config.max_retries - 1:
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"FHIR server unavailable: {str(e)}"
                    )
    
    # Patient Operations
    async def create_patient(self, patient: Patient) -> Dict[str, Any]:
        """Create FHIR Patient resource."""
        fhir_patient = self._convert_patient_to_fhir(patient)
        result = await self._make_request("POST", "Patient", data=fhir_patient)
        
        # Sync to Supabase canonical table
        if self.supabase_sync:
            await self.supabase_sync.sync_patient_to_canonical(result)
        
        return result
    
    async def update_patient(self, patient: Patient) -> Dict[str, Any]:
        """Update FHIR Patient resource."""
        fhir_patient = self._convert_patient_to_fhir(patient)
        result = await self._make_request("PUT", f"Patient/{patient.fhir_patient_id}", data=fhir_patient)
        
        # Sync to Supabase canonical table
        if self.supabase_sync:
            await self.supabase_sync.sync_patient_to_canonical(result)
        
        return result
    
    async def get_patient(self, patient_id: str) -> Dict[str, Any]:
        """Get FHIR Patient resource."""
        return await self._make_request("GET", f"Patient/{patient_id}")
    
    async def search_patients(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Patient resources."""
        return await self._make_request("GET", "Patient", params=params)
    
    # Practitioner Operations
    async def create_practitioner(self, doctor: Doctor) -> Dict[str, Any]:
        """Create FHIR Practitioner resource."""
        fhir_practitioner = self._convert_doctor_to_fhir(doctor)
        return await self._make_request("POST", "Practitioner", data=fhir_practitioner)
    
    async def update_practitioner(self, doctor: Doctor) -> Dict[str, Any]:
        """Update FHIR Practitioner resource."""
        fhir_practitioner = self._convert_doctor_to_fhir(doctor)
        return await self._make_request("PUT", f"Practitioner/{doctor.fhir_practitioner_id}", data=fhir_practitioner)
    
    async def get_practitioner(self, practitioner_id: str) -> Dict[str, Any]:
        """Get FHIR Practitioner resource."""
        return await self._make_request("GET", f"Practitioner/{practitioner_id}")
    
    async def search_practitioners(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Practitioner resources."""
        return await self._make_request("GET", "Practitioner", params=params)
    
    # Appointment Operations
    async def create_appointment(self, appointment: Appointment) -> Dict[str, Any]:
        """Create FHIR Appointment resource."""
        fhir_appointment = self._convert_appointment_to_fhir(appointment)
        return await self._make_request("POST", "Appointment", data=fhir_appointment)
    
    async def update_appointment(self, appointment: Appointment) -> Dict[str, Any]:
        """Update FHIR Appointment resource."""
        fhir_appointment = self._convert_appointment_to_fhir(appointment)
        return await self._make_request("PUT", f"Appointment/{appointment.fhir_appointment_id}", data=fhir_appointment)
    
    async def get_appointment(self, appointment_id: str) -> Dict[str, Any]:
        """Get FHIR Appointment resource."""
        return await self._make_request("GET", f"Appointment/{appointment_id}")
    
    async def search_appointments(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Appointment resources."""
        return await self._make_request("GET", "Appointment", params=params)
    
    # MedicationRequest Operations
    async def create_medication_request(self, prescription: Prescription) -> Dict[str, Any]:
        """Create FHIR MedicationRequest resource."""
        fhir_medication_request = self._convert_prescription_to_fhir(prescription)
        return await self._make_request("POST", "MedicationRequest", data=fhir_medication_request)
    
    async def update_medication_request(self, prescription: Prescription) -> Dict[str, Any]:
        """Update FHIR MedicationRequest resource."""
        fhir_medication_request = self._convert_prescription_to_fhir(prescription)
        return await self._make_request("PUT", f"MedicationRequest/{prescription.fhir_medication_request_id}", data=fhir_medication_request)
    
    async def get_medication_request(self, medication_request_id: str) -> Dict[str, Any]:
        """Get FHIR MedicationRequest resource."""
        return await self._make_request("GET", f"MedicationRequest/{medication_request_id}")
    
    async def search_medication_requests(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR MedicationRequest resources."""
        return await self._make_request("GET", "MedicationRequest", params=params)
    
    # DocumentReference Operations
    async def create_document_reference(self, document: DocumentReference) -> Dict[str, Any]:
        """Create FHIR DocumentReference resource."""
        fhir_document = self._convert_document_to_fhir(document)
        return await self._make_request("POST", "DocumentReference", data=fhir_document)
    
    async def update_document_reference(self, document: DocumentReference) -> Dict[str, Any]:
        """Update FHIR DocumentReference resource."""
        fhir_document = self._convert_document_to_fhir(document)
        return await self._make_request("PUT", f"DocumentReference/{document.fhir_document_reference_id}", data=fhir_document)
    
    async def get_document_reference(self, document_id: str) -> Dict[str, Any]:
        """Get FHIR DocumentReference resource."""
        return await self._make_request("GET", f"DocumentReference/{document_id}")
    
    async def search_document_references(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR DocumentReference resources."""
        return await self._make_request("GET", "DocumentReference", params=params)
    
    # Observation Operations
    async def create_observation(self, observation: Observation) -> Dict[str, Any]:
        """Create FHIR Observation resource."""
        fhir_observation = self._convert_observation_to_fhir(observation)
        return await self._make_request("POST", "Observation", data=fhir_observation)
    
    async def update_observation(self, observation: Observation) -> Dict[str, Any]:
        """Update FHIR Observation resource."""
        fhir_observation = self._convert_observation_to_fhir(observation)
        return await self._make_request("PUT", f"Observation/{observation.fhir_observation_id}", data=fhir_observation)
    
    async def get_observation(self, observation_id: str) -> Dict[str, Any]:
        """Get FHIR Observation resource."""
        return await self._make_request("GET", f"Observation/{observation_id}")
    
    async def search_observations(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Observation resources."""
        return await self._make_request("GET", "Observation", params=params)
    
    # Coverage Operations
    async def create_coverage(self, coverage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create FHIR Coverage resource."""
        return await self._make_request("POST", "Coverage", data=coverage_data)
    
    async def update_coverage(self, coverage_id: str, coverage_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update FHIR Coverage resource."""
        return await self._make_request("PUT", f"Coverage/{coverage_id}", data=coverage_data)
    
    async def get_coverage(self, coverage_id: str) -> Dict[str, Any]:
        """Get FHIR Coverage resource."""
        return await self._make_request("GET", f"Coverage/{coverage_id}")
    
    async def search_coverage(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Coverage resources."""
        return await self._make_request("GET", "Coverage", params=params)
    
    # Task Operations
    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create FHIR Task resource."""
        return await self._make_request("POST", "Task", data=task_data)
    
    async def update_task(self, task_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update FHIR Task resource."""
        return await self._make_request("PUT", f"Task/{task_id}", data=task_data)
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """Get FHIR Task resource."""
        return await self._make_request("GET", f"Task/{task_id}")
    
    async def search_tasks(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search FHIR Task resources."""
        return await self._make_request("GET", "Task", params=params)
    
    # Communication Operations
    async def create_communication(self, message: Message) -> Dict[str, Any]:
        """Create FHIR Communication resource."""
        fhir_communication = self._convert_message_to_fhir(message)
        return await self._make_request("POST", "Communication", data=fhir_communication)
    
    async def update_communication(self, message: Message) -> Dict[str, Any]:
        """Update FHIR Communication resource."""
        fhir_communication = self._convert_message_to_fhir(message)
        return await self._make_request("PUT", f"Communication/{message.fhir_communication_id}", data=fhir_communication)
    
    # Binary Operations
    async def create_binary(self, attachment: MessageAttachment, content: bytes) -> Dict[str, Any]:
        """Create FHIR Binary resource."""
        fhir_binary = {
            "resourceType": "Binary",
            "id": attachment.id,
            "contentType": attachment.file_type,
            "data": content.hex(),
            "meta": {
                "lastUpdated": datetime.utcnow().isoformat()
            }
        }
        return await self._make_request("POST", "Binary", data=fhir_binary)
    
    # Conversion Methods
    def _convert_patient_to_fhir(self, patient: Patient) -> Dict[str, Any]:
        """Convert Patient model to FHIR Patient resource."""
        return {
            "resourceType": "Patient",
            "id": patient.fhir_patient_id or str(patient.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(patient.id)
                }
            ],
            "name": [
                {
                    "use": "official",
                    "family": patient.last_name,
                    "given": [patient.first_name]
                }
            ],
            "telecom": [
                {
                    "system": "phone",
                    "value": patient.phone
                },
                {
                    "system": "email",
                    "value": patient.email
                }
            ] if patient.phone or patient.email else [],
            "gender": patient.gender.value.lower() if patient.gender else None,
            "birthDate": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            "address": [
                {
                    "text": patient.address
                }
            ] if patient.address else [],
            "maritalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                        "code": patient.marital_status.value if patient.marital_status else "U"
                    }
                ]
            } if patient.marital_status else None,
            "contact": [
                {
                    "name": {
                        "text": contact.name
                    },
                    "telecom": [
                        {
                            "system": "phone",
                            "value": contact.phone_primary
                        }
                    ]
                }
                for contact in patient.emergency_contacts
            ] if patient.emergency_contacts else []
        }
    
    def _convert_doctor_to_fhir(self, doctor: Doctor) -> Dict[str, Any]:
        """Convert Doctor model to FHIR Practitioner resource."""
        return {
            "resourceType": "Practitioner",
            "id": doctor.fhir_practitioner_id or str(doctor.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(doctor.id)
                }
            ],
            "name": [
                {
                    "use": "official",
                    "family": doctor.last_name,
                    "given": [doctor.first_name]
                }
            ],
            "telecom": [
                {
                    "system": "phone",
                    "value": doctor.phone
                },
                {
                    "system": "email",
                    "value": doctor.email
                }
            ] if doctor.phone or doctor.email else [],
            "gender": doctor.gender.value.lower() if doctor.gender else None,
            "birthDate": doctor.date_of_birth.isoformat() if doctor.date_of_birth else None,
            "qualification": [
                {
                    "code": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
                                "code": "MD",
                                "display": "Medical Doctor"
                            }
                        ]
                    }
                }
            ]
        }
    
    def _convert_appointment_to_fhir(self, appointment: Appointment) -> Dict[str, Any]:
        """Convert Appointment model to FHIR Appointment resource."""
        return {
            "resourceType": "Appointment",
            "id": appointment.fhir_appointment_id or str(appointment.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(appointment.id)
                }
            ],
            "status": appointment.status.value,
            "serviceCategory": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/service-category",
                            "code": "1",
                            "display": "Medical Care"
                        }
                    ]
                }
            ],
            "serviceType": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/service-type",
                            "code": appointment.appointment_type.value,
                            "display": appointment.appointment_type.value.replace("_", " ").title()
                        }
                    ]
                }
            ],
            "specialty": [
                {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "394579002",
                            "display": "General Practice"
                        }
                    ]
                }
            ],
            "appointmentType": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0276",
                        "code": "ROUTINE",
                        "display": "Routine"
                    }
                ]
            },
            "reasonCode": [
                {
                    "text": appointment.description or "General consultation"
                }
            ] if appointment.description else [],
            "priority": appointment.priority.value if appointment.priority else 0,
            "description": appointment.description,
            "start": appointment.start_time.isoformat(),
            "end": appointment.end_time.isoformat() if appointment.end_time else None,
            "minutesDuration": appointment.minutes_duration,
            "participant": [
                {
                    "actor": {
                        "reference": f"Patient/{appointment.patient_id}"
                    },
                    "status": "accepted"
                },
                {
                    "actor": {
                        "reference": f"Practitioner/{appointment.doctor_id}"
                    },
                    "status": "accepted"
                } if appointment.doctor_id else None
            ],
            "comment": appointment.comment
        }
    
    def _convert_prescription_to_fhir(self, prescription: Prescription) -> Dict[str, Any]:
        """Convert Prescription model to FHIR MedicationRequest resource."""
        return {
            "resourceType": "MedicationRequest",
            "id": prescription.fhir_medication_request_id or str(prescription.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(prescription.id)
                }
            ],
            "status": prescription.status.value,
            "intent": prescription.intent.value if prescription.intent else "order",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                            "code": "outpatient",
                            "display": "Outpatient"
                        }
                    ]
                }
            ],
            "priority": prescription.priority.value if prescription.priority else "routine",
            "medicationCodeableConcept": {
                "coding": [
                    {
                        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                        "code": prescription.medicine_code,
                        "display": prescription.medicine_name
                    }
                ],
                "text": prescription.medicine_name
            },
            "subject": {
                "reference": f"Patient/{prescription.patient_id}"
            },
            "encounter": {
                "reference": f"Encounter/{prescription.appointment_id}"
            } if prescription.appointment_id else None,
            "authoredOn": prescription.prescribed_date.isoformat() if prescription.prescribed_date else None,
            "requester": {
                "reference": f"Practitioner/{prescription.doctor_id}"
            },
            "dosageInstruction": [
                {
                    "text": prescription.dosage,
                    "timing": {
                        "repeat": {
                            "frequency": prescription.frequency
                        }
                    }
                }
            ] if prescription.dosage else [],
            "dispenseRequest": {
                "numberOfRepeatsAllowed": prescription.total_refills,
                "quantity": {
                    "value": prescription.quantity,
                    "unit": prescription.unit
                } if prescription.quantity else None
            },
            "note": [
                {
                    "text": prescription.description
                }
            ] if prescription.description else []
        }
    
    def _convert_document_to_fhir(self, document: DocumentReference) -> Dict[str, Any]:
        """Convert DocumentReference model to FHIR DocumentReference resource."""
        return {
            "resourceType": "DocumentReference",
            "id": document.fhir_document_reference_id or str(document.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(document.id)
                }
            ],
            "status": document.status.value,
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": document.type.value,
                        "display": document.type.value.replace("_", " ").title()
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/document-classcodes",
                            "code": "clinical-note",
                            "display": "Clinical Note"
                        }
                    ]
                }
            ],
            "subject": {
                "reference": f"Patient/{document.patient_id}"
            },
            "date": document.date.isoformat() if document.date else None,
            "author": [
                {
                    "reference": f"Practitioner/{document.authors[0]}" if document.authors else None
                }
            ] if document.authors else [],
            "content": [
                {
                    "attachment": {
                        "contentType": "application/pdf",
                        "url": document.content[0]["url"] if document.content else None
                    }
                }
            ] if document.content else [],
            "description": document.description
        }
    
    def _convert_observation_to_fhir(self, observation: Observation) -> Dict[str, Any]:
        """Convert Observation model to FHIR Observation resource."""
        return {
            "resourceType": "Observation",
            "id": observation.fhir_observation_id or str(observation.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(observation.id)
                }
            ],
            "status": observation.status.value,
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": observation.category.value,
                            "display": observation.category.value.replace("_", " ").title()
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": observation.code["code"] if isinstance(observation.code, dict) else "unknown",
                        "display": observation.display_name
                    }
                ],
                "text": observation.display_name
            },
            "subject": {
                "reference": f"Patient/{observation.patient_id}"
            },
            "effectiveDateTime": observation.effective_date.isoformat() if observation.effective_date else None,
            "issued": observation.issued.isoformat() if observation.issued else None,
            "valueQuantity": {
                "value": observation.value_quantity,
                "unit": observation.value_unit
            } if observation.value_quantity else None,
            "valueString": observation.value_string if observation.value_string else None
        }
    
    def _convert_message_to_fhir(self, message: Message) -> Dict[str, Any]:
        """Convert Message model to FHIR Communication resource."""
        return {
            "resourceType": "Communication",
            "id": message.fhir_communication_id or str(message.id),
            "identifier": [
                {
                    "use": "official",
                    "value": str(message.id)
                }
            ],
            "status": "completed",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/communication-category",
                            "code": message.message_type.value if hasattr(message.message_type, 'value') else str(message.message_type),
                            "display": (message.message_type.value if hasattr(message.message_type, 'value') else str(message.message_type)).replace("_", " ").title()
                        }
                    ]
                }
            ],
            "priority": message.priority.value if hasattr(message.priority, 'value') else str(message.priority),
            "subject": {
                "reference": f"Patient/{message.patient_id}"
            } if message.patient_id else None,
            "sender": {
                "reference": f"Practitioner/{message.sender_id}" if message.sender_id != "system" else None,
                "display": "System" if message.sender_id == "system" else None
            },
            "recipient": [
                {
                    "reference": f"Practitioner/{message.recipient_id}"
                }
            ] if message.recipient_id else [],
            "sent": message.timestamp.isoformat(),
            "received": message.timestamp.isoformat(),
            "payload": [
                {
                    "contentString": message.content
                }
            ],
            "note": [
                {
                    "text": message.content
                }
            ]
        }
