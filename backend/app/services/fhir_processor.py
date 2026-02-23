"""
FHIR Processor Service - Hybrid Storage Logic

Handles processing of FHIR resources with hybrid storage approach:
1. Raw Storage: Saves entire JSON resource to ops.FhirResource table
2. Relational Sync: Syncs Patient resources to ehr.patients
3. Clinical Sync: Syncs Condition/Observation resources to clinical models
4. Translation Metadata: Extracts and stores original source text from text.div
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import UUID as UUIDType
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import SessionLocal
from app.db.models.ops import FhirResource
from app.db.models.ehr import SourceTranslation
from app.common.models.patient import Patient as CommonPatient
from app.common.models.clinical import Condition as CommonCondition, Observation as CommonObservation
from app.common.models.clinical import (
    ClinicalStatus, VerificationStatus, ConditionCategory,
    ObservationStatus, ObservationCategory
)

logger = logging.getLogger(__name__)


class FHIRProcessor:
    """Processes FHIR resources with hybrid storage logic."""
    
    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory
        # Track patient mappings from FHIR IDs to database patient_ids during bundle processing
        self._patient_id_map: Dict[str, str] = {}
    
    def process_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single FHIR resource or Bundle.
        
        Args:
            resource: FHIR resource dictionary (can be a Bundle or single resource)
            
        Returns:
            Dictionary with processing results
        """
        if not isinstance(resource, dict):
            raise ValueError("resource must be a dict")
        
        resource_type = resource.get("resourceType")
        if not resource_type:
            raise ValueError("resourceType is required in FHIR resource")
        
        results = {
            "raw_storage": None,
            "relational_sync": [],
            "clinical_sync": [],
            "translation_metadata": []
        }
        
        with self.session_factory() as session:
            try:
                # Handle Bundle resources
                if resource_type == "Bundle":
                    results = self._process_bundle(session, resource)
                else:
                    # Single resource
                    results["raw_storage"] = self._save_raw_resource(session, resource)
                    results["relational_sync"] = self._sync_relational(session, resource)
                    results["clinical_sync"] = self._sync_clinical(session, resource)
                    results["translation_metadata"] = self._save_translation_metadata(session, resource)
                
                session.commit()
                logger.info(f"Successfully processed FHIR resource: {resource_type}")
                return results
                
            except Exception as e:
                session.rollback()
                logger.error(f"Error processing FHIR resource: {e}", exc_info=True)
                raise
    
    def _process_bundle(self, session: Session, bundle: Dict[str, Any]) -> Dict[str, Any]:
        """Process a FHIR Bundle by processing each entry."""
        results = {
            "raw_storage": [],
            "relational_sync": [],
            "clinical_sync": [],
            "translation_metadata": []
        }
        
        # Reset patient ID mapping for this bundle
        self._patient_id_map = {}
        
        # Save the bundle itself as raw resource
        bundle_result = self._save_raw_resource(session, bundle)
        results["raw_storage"].append(bundle_result)
        
        # Process Patient resources first to build patient_id mapping
        entries = bundle.get("entry", [])
        patient_entries = [e for e in entries if isinstance(e.get("resource"), dict) and e.get("resource", {}).get("resourceType") == "Patient"]
        other_entries = [e for e in entries if e not in patient_entries]
        
        # Process Patient entries first
        for entry in patient_entries:
            if not isinstance(entry, dict):
                continue
            
            resource = entry.get("resource")
            if not isinstance(resource, dict):
                continue
            
            # Save raw resource
            raw_result = self._save_raw_resource(session, resource)
            results["raw_storage"].append(raw_result)
            
            # Sync relational data
            relational_results = self._sync_relational(session, resource)
            results["relational_sync"].extend(relational_results)
            
            # Sync clinical data
            clinical_results = self._sync_clinical(session, resource)
            results["clinical_sync"].extend(clinical_results)
            
            # Save translation metadata
            translation_results = self._save_translation_metadata(session, resource)
            results["translation_metadata"].extend(translation_results)
        
        # Process other entries (Condition, Observation, etc.) after patients are mapped
        for entry in other_entries:
            if not isinstance(entry, dict):
                continue
            
            resource = entry.get("resource")
            if not isinstance(resource, dict):
                continue
            
            # Save raw resource
            raw_result = self._save_raw_resource(session, resource)
            results["raw_storage"].append(raw_result)
            
            # Sync relational data (should be empty for non-Patient resources)
            relational_results = self._sync_relational(session, resource)
            results["relational_sync"].extend(relational_results)
            
            # Sync clinical data
            clinical_results = self._sync_clinical(session, resource)
            results["clinical_sync"].extend(clinical_results)
            
            # Save translation metadata
            translation_results = self._save_translation_metadata(session, resource)
            results["translation_metadata"].extend(translation_results)
        
        return results
    
    def _save_raw_resource(self, session: Session, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save entire JSON resource to ops.FhirResource table.
        
        Args:
            session: Database session
            resource: FHIR resource dictionary
            
        Returns:
            Dictionary with save result
        """
        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        
        if not resource_type:
            raise ValueError("resourceType is required")
        
        if not resource_id:
            # Generate ID if missing
            resource_id = str(uuid.uuid4())
            resource = {**resource, "id": resource_id}
        
        key = f"{resource_type}/{resource_id}"
        
        # Check if resource already exists
        existing = session.get(FhirResource, key)
        is_new = existing is None
        
        if existing:
            existing.resource = resource
            existing.resource_type = resource_type
            existing.resource_id = resource_id
            existing.updated_at = datetime.utcnow()
            logger.debug(f"Updated existing FHIR resource: {key}")
        else:
            existing = FhirResource(
                key=key,
                resource_type=resource_type,
                resource_id=resource_id,
                resource=resource
            )
            session.add(existing)
            logger.debug(f"Created new FHIR resource: {key}")
        
        return {
            "key": key,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": "created" if is_new else "updated"
        }
    
    def _sync_relational(self, session: Session, resource: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Sync Patient resource to ehr.patients table.
        
        Args:
            session: Database session
            resource: FHIR resource dictionary
            
        Returns:
            List of sync results
        """
        results = []
        
        if resource.get("resourceType") != "Patient":
            return results
        
        resource_id = resource.get("id")
        if not resource_id:
            logger.warning("Patient resource missing ID, skipping relational sync")
            return results
        
        # Extract patient data
        birth_date = resource.get("birthDate")
        gender = resource.get("gender")
        
        # Convert birthDate string to date if needed
        birth_date_obj = None
        if birth_date:
            try:
                if isinstance(birth_date, str):
                    birth_date_obj = datetime.strptime(birth_date, "%Y-%m-%d").date()
                elif isinstance(birth_date, datetime):
                    birth_date_obj = birth_date.date()
            except Exception as e:
                logger.warning(f"Could not parse birthDate '{birth_date}': {e}")
        
        # Map FHIR gender to our sex field
        sex = None
        if gender:
            gender_lower = gender.lower()
            if gender_lower in ["male", "m"]:
                sex = "male"
            elif gender_lower in ["female", "f"]:
                sex = "female"
            elif gender_lower in ["other", "unknown"]:
                sex = gender_lower
            else:
                sex = gender  # Store as-is if unknown format
        
        # Try to find existing patient by FHIR ID or create new
        # First, try to find by looking up in source_translations or by matching data
        patient = None
        
        # Try to find existing patient with matching birth date and sex
        is_new_patient = True
        if birth_date_obj and sex:
            stmt = select(CommonPatient).where(
                CommonPatient.date_of_birth == birth_date_obj,
                CommonPatient.sex == sex
            )
            existing_patients = session.execute(stmt).scalars().all()
            if existing_patients:
                patient = existing_patients[0]
                is_new_patient = False
                logger.debug(f"Found existing patient by birth date and sex: {patient.patient_id}")
        
        # If not found, create new patient
        if not patient:
            patient = CommonPatient(
                date_of_birth=birth_date_obj,
                sex=sex
            )
            session.add(patient)
            session.flush()  # Flush to get the patient_id
            logger.info(f"Created new patient: {patient.patient_id}")
        
        # Update patient if we have new data
        if birth_date_obj and patient.date_of_birth != birth_date_obj:
            patient.date_of_birth = birth_date_obj
        if sex and patient.sex != sex:
            patient.sex = sex
        
        # Store mapping from FHIR patient ID to database patient_id
        self._patient_id_map[resource_id] = str(patient.patient_id)
        
        results.append({
            "resource_type": "Patient",
            "fhir_resource_id": resource_id,
            "patient_id": str(patient.patient_id),
            "action": "created" if is_new_patient else "updated"
        })
        
        return results
    
    def _sync_clinical(self, session: Session, resource: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Sync Condition or Observation resources to clinical models.
        
        Args:
            session: Database session
            resource: FHIR resource dictionary
            
        Returns:
            List of sync results
        """
        results = []
        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        
        if resource_type == "Condition":
            result = self._sync_condition(session, resource)
            if result:
                results.append(result)
        elif resource_type == "Observation":
            result = self._sync_observation(session, resource)
            if result:
                results.append(result)
        
        return results
    
    def _sync_condition(self, session: Session, resource: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Sync FHIR Condition to ehr.conditions table."""
        resource_id = resource.get("id")
        if not resource_id:
            logger.warning("Condition resource missing ID, skipping sync")
            return None
        
        # Extract patient reference
        subject = resource.get("subject", {})
        patient_ref = subject.get("reference", "") if isinstance(subject, dict) else ""
        
        # Extract patient ID from reference (could be urn:uuid:xxx or Patient/xxx)
        patient_id_str = None
        if patient_ref.startswith("urn:uuid:"):
            patient_id_str = patient_ref.replace("urn:uuid:", "")
        elif "/" in patient_ref:
            patient_id_str = patient_ref.split("/")[-1]
        else:
            patient_id_str = patient_ref
        
        # Look up patient using the mapping built during bundle processing
        patient_db_id = None
        if patient_id_str in self._patient_id_map:
            patient_db_id = self._patient_id_map[patient_id_str]
        else:
            # Try to find patient by FHIR ID in source_translations or by other means
            # Fallback: try to find by matching data if available
            logger.warning(f"Patient FHIR ID {patient_id_str} not found in bundle mapping, attempting lookup")
            # Could implement additional lookup logic here
        
        # If we can't find patient, we can't create condition
        if not patient_db_id:
            logger.warning(f"Could not find patient for Condition {resource_id}, skipping sync")
            return None
        
        # Extract condition data
        clinical_status_code = resource.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "active")
        verification_status_code = resource.get("verificationStatus", {}).get("coding", [{}])[0].get("code", "unconfirmed")
        category_code = resource.get("category", [{}])[0].get("coding", [{}])[0].get("code", "problem_list_item")
        code = resource.get("code", {})
        display_name = code.get("text") or code.get("coding", [{}])[0].get("display", "")
        
        # Map to enums
        try:
            clinical_status = ClinicalStatus(clinical_status_code)
        except ValueError:
            clinical_status = ClinicalStatus.ACTIVE
        
        try:
            verification_status = VerificationStatus(verification_status_code)
        except ValueError:
            verification_status = VerificationStatus.UNCONFIRMED
        
        try:
            category = ConditionCategory(category_code)
        except ValueError:
            category = ConditionCategory.PROBLEM_LIST_ITEM
        
        # Extract onset date
        onset = resource.get("onsetDateTime") or resource.get("onsetPeriod", {}).get("start")
        onset_date = None
        if onset:
            try:
                if isinstance(onset, str):
                    onset_date = datetime.fromisoformat(onset.replace("Z", "+00:00")).date()
            except Exception:
                pass
        
        # Extract recorded date
        recorded_date = datetime.utcnow()
        if resource.get("recordedDate"):
            try:
                recorded_date = datetime.fromisoformat(resource["recordedDate"].replace("Z", "+00:00"))
            except Exception:
                pass
        
        # Check if condition already exists
        stmt = select(CommonCondition).where(
            CommonCondition.fhir_condition_id == resource_id
        )
        existing = session.execute(stmt).scalar_one_or_none()
        is_new = existing is None
        
        if existing:
            # Update existing condition
            existing.clinical_status = clinical_status
            existing.verification_status = verification_status
            existing.category = category
            existing.code = code
            existing.display_name = display_name
            existing.onset_date = onset_date
            existing.recorded_date = recorded_date
            logger.debug(f"Updated existing condition: {existing.id}")
        else:
            # Create new condition
            condition = CommonCondition(
                fhir_condition_id=resource_id,
                patient_id=patient_db_id,  # Use string patient_id
                clinical_status=clinical_status,
                verification_status=verification_status,
                category=category,
                code=code,
                display_name=display_name,
                onset_date=onset_date,
                recorded_date=recorded_date
            )
            session.add(condition)
            session.flush()
            logger.info(f"Created new condition: {condition.id}")
            existing = condition
        
        return {
            "resource_type": "Condition",
            "fhir_resource_id": resource_id,
            "condition_id": str(existing.id),
            "action": "created" if is_new else "updated"
        }
    
    def _sync_observation(self, session: Session, resource: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Sync FHIR Observation to ehr.observations table."""
        resource_id = resource.get("id")
        if not resource_id:
            logger.warning("Observation resource missing ID, skipping sync")
            return None
        
        # Extract patient reference (same logic as Condition)
        subject = resource.get("subject", {})
        patient_ref = subject.get("reference", "") if isinstance(subject, dict) else ""
        
        patient_id_str = None
        if patient_ref.startswith("urn:uuid:"):
            patient_id_str = patient_ref.replace("urn:uuid:", "")
        elif "/" in patient_ref:
            patient_id_str = patient_ref.split("/")[-1]
        
        # Look up patient using the mapping built during bundle processing
        patient_db_id = None
        if patient_id_str in self._patient_id_map:
            patient_db_id = self._patient_id_map[patient_id_str]
        else:
            logger.warning(f"Patient FHIR ID {patient_id_str} not found in bundle mapping for Observation {resource_id}")
        
        if not patient_db_id:
            logger.warning(f"Could not find patient for Observation {resource_id}, skipping sync")
            return None
        
        # Extract observation data
        status_code = resource.get("status", "final")
        category_code = resource.get("category", [{}])[0].get("coding", [{}])[0].get("code", "laboratory")
        code = resource.get("code", {})
        display_name = code.get("text") or code.get("coding", [{}])[0].get("display", "")
        
        # Map to enums
        try:
            status = ObservationStatus(status_code)
        except ValueError:
            status = ObservationStatus.FINAL
        
        try:
            category = ObservationCategory(category_code)
        except ValueError:
            category = ObservationCategory.LABORATORY
        
        # Extract value
        value_quantity = resource.get("valueQuantity", {})
        value_qty = None
        value_unit = None
        if value_quantity:
            value_qty = value_quantity.get("value")
            value_unit = value_quantity.get("unit")
        
        # Extract effective date
        effective_date = None
        if resource.get("effectiveDateTime"):
            try:
                effective_date = datetime.fromisoformat(resource["effectiveDateTime"].replace("Z", "+00:00"))
            except Exception:
                pass
        
        # Check if observation already exists
        stmt = select(CommonObservation).where(
            CommonObservation.fhir_observation_id == resource_id
        )
        existing = session.execute(stmt).scalar_one_or_none()
        is_new = existing is None
        
        if existing:
            # Update existing observation
            existing.status = status
            existing.category = category
            existing.code = code
            existing.display_name = display_name
            existing.value_quantity = value_qty
            existing.value_unit = value_unit
            existing.effective_date = effective_date
            logger.debug(f"Updated existing observation: {existing.id}")
        else:
            # Create new observation
            # Convert patient_db_id string to UUID if needed
            try:
                patient_uuid = UUIDType(patient_db_id) if isinstance(patient_db_id, str) else patient_db_id
            except (ValueError, TypeError):
                logger.error(f"Invalid patient_id format: {patient_db_id}")
                return None
            
            observation = CommonObservation(
                fhir_observation_id=resource_id,
                patient_id=patient_uuid,  # CommonObservation uses UUID type
                status=status,
                category=category,
                code=code,
                display_name=display_name,
                value_quantity=value_qty,
                value_unit=value_unit,
                effective_date=effective_date
            )
            session.add(observation)
            session.flush()
            logger.info(f"Created new observation: {observation.id}")
            existing = observation
        
        return {
            "resource_type": "Observation",
            "fhir_resource_id": resource_id,
            "observation_id": str(existing.id),
            "action": "created" if is_new else "updated"
        }
    
    def _save_translation_metadata(self, session: Session, resource: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract and save original source text from text.div to ehr.source_translations.
        
        Args:
            session: Database session
            resource: FHIR resource dictionary
            
        Returns:
            List of translation metadata save results
        """
        results = []
        
        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        
        if not resource_type or not resource_id:
            return results
        
        # Extract text.div
        text_block = resource.get("text", {})
        if not isinstance(text_block, dict):
            return results
        
        div_content = text_block.get("div")
        if not div_content:
            return results
        
        # Extract text from HTML div
        # Remove HTML tags and extract text content
        original_text = self._extract_text_from_div(div_content)
        
        if not original_text:
            return results
        
        # Detect source language (simplified - assume Russian if contains Cyrillic)
        source_language = self._detect_language(original_text)
        
        # Check if translation already exists
        stmt = select(SourceTranslation).where(
            SourceTranslation.fhir_resource_type == resource_type,
            SourceTranslation.fhir_resource_id == resource_id
        )
        existing = session.execute(stmt).scalar_one_or_none()
        
        action = "created"
        if existing:
            # Update existing translation
            existing.original_text = original_text
            existing.source_language = source_language
            existing.extracted_from_div = div_content
            existing.updated_at = datetime.utcnow()
            action = "updated"
            logger.debug(f"Updated existing translation for {resource_type}/{resource_id}")
        else:
            # Create new translation
            translation = SourceTranslation(
                fhir_resource_type=resource_type,
                fhir_resource_id=resource_id,
                original_text=original_text,
                source_language=source_language,
                extracted_from_div=div_content
            )
            session.add(translation)
            logger.info(f"Created new translation for {resource_type}/{resource_id}")
            existing = translation
        
        results.append({
            "resource_type": resource_type,
            "fhir_resource_id": resource_id,
            "source_language": source_language,
            "text_length": len(original_text),
            "action": action
        })
        
        return results
    
    def _extract_text_from_div(self, div_content: str) -> str:
        """Extract plain text from HTML div content."""
        if not div_content:
            return ""
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', div_content)
        
        # Decode HTML entities (basic)
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        # Clean up whitespace
        text = ' '.join(text.split())
        
        return text.strip()
    
    def _detect_language(self, text: str) -> str:
        """Detect source language from text (simplified)."""
        if not text:
            return "unknown"
        
        # Check for Cyrillic characters (Russian, Ukrainian, etc.)
        if re.search(r'[А-Яа-яЁё]', text):
            return "ru"
        
        # Check for Latin characters with diacritics (Uzbek uses Latin)
        if re.search(r'[A-Za-z]', text):
            # Could be English, Uzbek, etc. - default to uz for this region
            return "uz"
        
        return "unknown"


# Singleton instance
fhir_processor = FHIRProcessor()
