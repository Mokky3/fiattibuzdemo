#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unified Medical Document Translator and FHIR Mapper with Structured Outputs

This script processes extracted JSON from extractor.py and uses OpenAI API
with Structured Outputs (JSON Schema) to both translate medical content to English
AND map it directly to FHIR R4 Bundle with strict R4 compliance.

Features:
- Structured Outputs with JSON Schema for strict R4 compliance
- UCUM unit validation (http://unitsofmeasure.org)
- RF ablation parameters as Observation components (linked via partOf)
- Referential integrity with urn:uuid: IDs
- Data lineage: Original source text in Narrative.text.div blocks
- Proper terminology bindings (SNOMED CT, LOINC, RxNorm)

Single-step process: Translation + FHIR transformation in one API call.
"""

import json
import sys
import argparse
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import time
import io
from datetime import datetime, timezone

# Ensure UTF-8 encoding for all string operations
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.error(
        "OpenAI library is not installed. "
        "Please install it with: pip install openai"
    )


# Combined system prompt for translation + FHIR mapping with strict R4 compliance
TRANSLATE_AND_MAP_SYSTEM_PROMPT = """You are a Senior Health Informatics Engineer specializing in medical translation and FHIR R4 resource mapping with strict compliance.

Your task is to:
1. Translate medical content from the source language to English
2. Transform the translated content into a valid FHIR R4 Bundle (Transaction type) following strict clinical rules

MANDATORY CLINICAL RULES:

1. STRICT UCUM UNITS (http://unitsofmeasure.org):
   - Heart Rate / Tachycardia / Wenckebach points → Code: "{beats}/min" (NOT "bpm" or "/min")
   - Intervals (RERP, AERP, AVU, msec) → Code: "ms" (milliseconds)
   - ALL valueQuantity MUST have:
     * system: "http://unitsofmeasure.org"
     * code: UCUM code (e.g., "{beats}/min", "ms")
     * unit: Human-readable unit (e.g., "beats/min", "ms")

2. TERMINOLOGY BINDING:
   - Procedures: Use SNOMED CT codes
     * Radiofrequency ablation → 447432005 (RF Ablation)
     * Electrophysiological study → 257610000 (EPS)
   - Observations: Use LOINC codes
     * Heart Rate → 8867-4
     * Wenckebach point / Refractory Period → Use generic EP LOINC (e.g., 8885-8) and place specific name in code.text
   - Medications: Use RxNorm codes
     * Atropine → 1191
     * Novocain/Procaine → 8554

3. PROCEDURE DETAIL EXTRACTION:
   - RF ablation parameters (P, t, I) MUST be mapped as Observation components
   - Create an Observation resource for ablation parameters
   - Link to Procedure via partOf.reference
   - Structure as component entries:
     * Component 1: Power (P) in Watts → valueQuantity with UCUM code "W"
     * Component 2: Temperature (t) in Celsius → valueQuantity with UCUM code "Cel"
     * Component 3: Impedance (I) in Ohms → valueQuantity with UCUM code "Ohm"

4. REFERENTIAL INTEGRITY:
   - Generate urn:uuid: temporary IDs for ALL resources
   - Every Observation/Procedure/MedicationAdministration MUST have:
     * subject.reference: "urn:uuid:patient-id"
   - Observations linked to Procedures MUST have:
     * partOf.reference: "urn:uuid:procedure-id"
   - Use fullUrl in Bundle entry matching the resource ID

5. DATA LINEAGE (Narrative):
   - Include original source language text for each resource
   - Add text.div in Narrative block with original text
   - Format: <div xmlns="http://www.w3.org/1999/xhtml">Original Russian text here</div>
   - This is for clinical auditing and traceability

PATIENT RESOURCE:
- Extract 'Medical history' as the Patient ID
- Extract 'Date of birth' and convert to FHIR date format (YYYY-MM-DD)
- Create Patient resource with urn:uuid: ID
- Include Narrative with original text

PROCEDURE RESOURCES:
- Map procedures: radiofrequency ablation, EPS, Modification of AV nodal conduction
- Use SNOMED CT codes (447432005 for RF ablation, 257610000 for EPS)
- Include procedure notes and dates
- Include Narrative with original source text

OBSERVATION RESOURCES:
- Heart rate → LOINC 8867-4, UCUM "{beats}/min"
- Wenckebach points → LOINC 8885-8, UCUM "{beats}/min", specific type in code.text
- Electrical intervals (RERP, AERP, AVU) → LOINC 34551-2, UCUM "ms"
- RF ablation parameters → Separate Observation with components (P, t, I), linked via partOf
- All observations: status "final", proper valueQuantity with UCUM
- Include Narrative with original source text

MEDICATIONADMINISTRATION RESOURCES:
- Map medications: Atropine, Novocain/Novocaini
- Extract dosage (e.g., "0.1%-0.5 ml")
- Use RxNorm codes (1191 for Atropine, 8554 for Procaine)
- Include dosage details in dosage field
- Include Narrative with original source text

TRANSLATION RULES:
- Maintain standard international medical abbreviations (AVNRT, RFA, bpm, ECG, BP, EPS)
- Preserve medication brand names but add INN in brackets if known
- Keep all numbers, measurements, units, and dosages exactly as written
- Preserve dates, times, and reference numbers unchanged
- Maintain medical terminology accuracy

COMPOSITION (strongly recommended for clinical notes):
- Include a Composition resource when the document describes a consultation or clinical note.
- Add a section with title "Chief Complaint" or "Reason for Visit" containing the patient's main complaint or reason for the visit.
- Put the narrative text in section.text.div (e.g. <div xmlns="http://www.w3.org/1999/xhtml">translated complaint text</div>).
- You may add a section "History of Present Illness" with section.text.div for HPI if present in the document.
- This allows downstream systems to display chief complaint and HPI correctly instead of letterhead.

OUTPUT REQUIREMENTS:
- Return ONLY valid FHIR R4 Bundle JSON matching the provided JSON Schema
- Bundle type MUST be "transaction"
- All resources MUST use urn:uuid: IDs
- All units MUST use UCUM codes from http://unitsofmeasure.org
- All resources MUST include Narrative.text.div with original source text
- Do NOT include any conversational text, explanations, or markdown"""


# FHIR R4 Bundle JSON Schema for Structured Outputs
# Note: OpenAI Structured Outputs requires additionalProperties to be explicitly set
# For FHIR resources, we allow additional properties since they can have many fields
FHIR_BUNDLE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "resourceType": {
            "type": "string",
            "const": "Bundle"
        },
        "id": {
            "type": "string"
        },
        "type": {
            "type": "string",
            "const": "transaction"
        },
        "timestamp": {
            "type": "string",
            "format": "date-time"
        },
        "entry": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "fullUrl": {
                        "type": "string",
                        "pattern": "^urn:uuid:"
                    },
                    "resource": {
                        "type": "object",
                        "additionalProperties": False,  # Required by OpenAI, but strict:False allows flexibility
                        "properties": {
                            "resourceType": {
                                "type": "string",
                                "enum": ["Patient", "Procedure", "Observation", "MedicationAdministration", "Condition", "Composition"]
                            },
                            "id": {
                                "type": "string"
                            },
                            "text": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "status": {
                                        "type": "string",
                                        "const": "generated"
                                    },
                                    "div": {
                                        "type": "string"
                                    }
                                },
                                "required": ["status", "div"]
                            }
                        },
                        "required": ["resourceType", "id"]
                    },
                    "request": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "method": {
                                "type": "string",
                                "const": "POST"
                            },
                            "url": {
                                "type": "string"
                            }
                        },
                        "required": ["method", "url"]
                    }
                },
                "required": ["fullUrl", "resource", "request"]
            }
        }
    },
    "required": ["resourceType", "type", "timestamp", "entry"]
}


class TranslateToFHIRMapper:
    """Translate and map medical documents to FHIR R4 Bundle using OpenAI Structured Outputs."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        max_retries: int = 3
    ):
        """
        Initialize the mapper.
        
        Args:
            api_key: OpenAI API key (if None, reads from OPENAI_API_KEY env var)
            model: OpenAI model to use (default: gpt-4o-mini)
            max_retries: Maximum retry attempts for failed API calls
        """
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI library is not installed. Install with: pip install openai")
        
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not provided. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.max_retries = max_retries
        
        logger.info(f"Initialized TranslateToFHIRMapper with model: {model} (using Structured Outputs)")
    
    def _extract_original_text(self, extracted_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract original source language text from elements for Narrative blocks.
        
        Args:
            extracted_data: Input JSON data from extractor.py
            
        Returns:
            Dictionary mapping element indices to original text
        """
        original_texts = {}
        for i, element in enumerate(extracted_data.get('elements', [])):
            # Get original text (before translation)
            text = element.get('text', '')
            if text:
                original_texts[f"element-{i}"] = text
        return original_texts
    
    def _validate_ucum_units(self, bundle: Dict[str, Any]) -> List[str]:
        """
        Validate that all valueQuantity use proper UCUM units.
        
        Args:
            bundle: FHIR Bundle to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        ucum_system = "http://unitsofmeasure.org"
        
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            resource_type = resource.get("resourceType")
            
            if resource_type == "Observation":
                # Check valueQuantity
                value_qty = resource.get("valueQuantity")
                if value_qty:
                    system = value_qty.get("system")
                    code = value_qty.get("code")
                    
                    if system != ucum_system:
                        errors.append(f"Observation {resource.get('id')}: valueQuantity.system must be {ucum_system}, got {system}")
                    
                    # Validate UCUM codes
                    valid_codes = ["{beats}/min", "ms", "W", "Cel", "Ohm"]
                    if code not in valid_codes:
                        errors.append(f"Observation {resource.get('id')}: Invalid UCUM code '{code}'. Must be one of {valid_codes}")
                
                # Check components
                for component in resource.get("component", []):
                    comp_value = component.get("valueQuantity")
                    if comp_value:
                        comp_system = comp_value.get("system")
                        comp_code = comp_value.get("code")
                        
                        if comp_system != ucum_system:
                            errors.append(f"Observation {resource.get('id')} component: system must be {ucum_system}")
                        
                        if comp_code not in valid_codes:
                            errors.append(f"Observation {resource.get('id')} component: Invalid UCUM code '{comp_code}'")
        
        return errors
    
    def _validate_referential_integrity(self, bundle: Dict[str, Any]) -> List[str]:
        """
        Validate referential integrity (all references use urn:uuid:).
        
        Args:
            bundle: FHIR Bundle to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        patient_ids = set()
        
        # Collect all resource IDs
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            resource_id = resource.get("id")
            full_url = entry.get("fullUrl", "")
            
            if resource_id and full_url:
                patient_ids.add(full_url)
        
        # Validate references
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            resource_type = resource.get("resourceType")
            
            # Check subject reference
            subject = resource.get("subject")
            if subject:
                ref = subject.get("reference", "")
                if ref and not ref.startswith("urn:uuid:"):
                    errors.append(f"{resource_type} {resource.get('id')}: subject.reference must start with 'urn:uuid:', got '{ref}'")
                elif ref and ref not in patient_ids:
                    errors.append(f"{resource_type} {resource.get('id')}: subject.reference '{ref}' not found in bundle")
            
            # Check partOf reference (for Observations linked to Procedures)
            part_of = resource.get("partOf")
            if part_of:
                ref = part_of.get("reference", "")
                if ref and not ref.startswith("urn:uuid:"):
                    errors.append(f"{resource_type} {resource.get('id')}: partOf.reference must start with 'urn:uuid:', got '{ref}'")
        
        return errors
    
    def translate_and_map_to_fhir(
        self,
        extracted_data: Dict[str, Any],
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Translate extracted JSON and map directly to FHIR R4 Bundle using Structured Outputs.
        
        Args:
            extracted_data: Input JSON data from extractor.py
            retry_count: Current retry attempt number
            
        Returns:
            FHIR R4 Bundle dictionary with strict R4 compliance
        """
        try:
            # Extract original texts for Narrative blocks
            original_texts = self._extract_original_text(extracted_data)
            
            # Prepare the input data for the AI
            user_prompt = f"""Translate and map the following medical document extraction to FHIR R4 Bundle.

Extracted Data:
{json.dumps(extracted_data, ensure_ascii=False, indent=2)}

CRITICAL: Follow all mandatory clinical rules:
1. Use UCUM units: {{beats}}/min for heart rates, ms for intervals
2. Map RF ablation parameters (P, t, I) as Observation components linked via partOf
3. All resources must use urn:uuid: IDs
4. Include original source text in Narrative.text.div for each resource
5. Use proper terminology codes (SNOMED CT, LOINC, RxNorm)

Return ONLY the FHIR R4 Bundle JSON matching the provided schema."""
            
            # Use Structured Outputs with JSON Schema
            # Note: For complex FHIR resources, we use non-strict mode to allow additional properties
            # OpenAI's Structured Outputs requires additionalProperties to be explicitly set
            try:
                # For models supporting Structured Outputs (gpt-4o, gpt-4-turbo, etc.)
                # Use strict=False to allow additional properties in FHIR resources
                response = self.client.beta.chat.completions.parse(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": TRANSLATE_AND_MAP_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=4000,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "fhir_bundle",
                            "strict": False,  # Allow additional properties for FHIR resources
                            "schema": FHIR_BUNDLE_SCHEMA
                        }
                    }
                )
                # Extract parsed response (already validated by OpenAI)
                # Check if parsed attribute exists and is not None
                message = response.choices[0].message
                if hasattr(message, 'parsed') and message.parsed is not None:
                    bundle = message.parsed
                    logger.info("Used Structured Outputs API for schema validation")
                else:
                    # Fallback: parse from content if parsed is None
                    logger.warning("Parsed response is None, attempting to parse from content")
                    response_text = getattr(message, 'content', None)
                    if response_text:
                        # Remove markdown code blocks if present
                        if response_text.startswith("```"):
                            response_text = response_text.split("```")[1]
                            if response_text.startswith("json"):
                                response_text = response_text[4:]
                            response_text = response_text.strip()
                        bundle = json.loads(response_text)
                        logger.info("Parsed JSON from content")
                    else:
                        # Log the actual response structure for debugging
                        logger.error(f"Response structure: {dir(message)}")
                        logger.error(f"Response message: {message}")
                        raise ValueError("Response has no parsed data and no content")
            except Exception as e:
                # Fallback: Use json_object mode with manual validation
                # This handles cases where Structured Outputs API is not available or schema validation fails
                logger.warning(f"Structured Outputs API not available or failed, using json_object mode: {e}")
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": TRANSLATE_AND_MAP_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=4000,
                    response_format={"type": "json_object"}
                )
                # Parse JSON manually
                response_text = response.choices[0].message.content.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                    response_text = response_text.strip()
                bundle = json.loads(response_text)
                logger.info("Used json_object mode with manual validation")
            
            # Validate bundle is not None
            if bundle is None:
                raise ValueError("Bundle is None - failed to parse response")
            
            # Additional validations
            if bundle.get("resourceType") != "Bundle":
                raise ValueError("Response is not a FHIR Bundle")
            
            if bundle.get("type") != "transaction":
                logger.warning("Bundle type is not 'transaction', setting it")
                bundle["type"] = "transaction"
            
            # Ensure timestamp
            if "timestamp" not in bundle:
                bundle["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            # Validate UCUM units
            ucum_errors = self._validate_ucum_units(bundle)
            if ucum_errors:
                logger.warning(f"UCUM validation errors: {ucum_errors}")
            
            # Validate referential integrity
            ref_errors = self._validate_referential_integrity(bundle)
            if ref_errors:
                logger.warning(f"Referential integrity errors: {ref_errors}")
            
            # Ensure each entry has proper structure and Narrative
            for i, entry in enumerate(bundle.get("entry", [])):
                if "resource" not in entry:
                    logger.warning(f"Entry {i} missing 'resource', skipping")
                    continue
                
                resource = entry.get("resource", {})
                resource_type = resource.get("resourceType")
                
                # Ensure fullUrl uses urn:uuid:
                if "fullUrl" not in entry:
                    resource_id = resource.get("id", f"resource-{i}")
                    entry["fullUrl"] = f"urn:uuid:{resource_id}"
                elif not entry["fullUrl"].startswith("urn:uuid:"):
                    resource_id = resource.get("id", f"resource-{i}")
                    entry["fullUrl"] = f"urn:uuid:{resource_id}"
                
                # Ensure resource ID matches fullUrl
                if resource.get("id") and not entry["fullUrl"].endswith(resource.get("id")):
                    resource_id = resource.get("id")
                    entry["fullUrl"] = f"urn:uuid:{resource_id}"
                
                # Ensure request
                if "request" not in entry:
                    entry["request"] = {
                        "method": "POST",
                        "url": resource_type
                    }
                
                # Ensure Narrative with original text if available
                if "text" not in resource:
                    # Try to find original text for this resource
                    original_text = original_texts.get(f"element-{i}", "")
                    if not original_text:
                        # Try to extract from element text
                        for elem in extracted_data.get('elements', []):
                            if resource_type == "Patient" and "history" in elem.get('text', '').lower():
                                original_text = elem.get('text', '')
                                break
                            elif resource_type == "Procedure" and any(proc in elem.get('text', '').lower() for proc in ['ablation', 'eps', 'procedure']):
                                original_text = elem.get('text', '')
                                break
                    
                    if original_text:
                        resource["text"] = {
                            "status": "generated",
                            "div": f'<div xmlns="http://www.w3.org/1999/xhtml">{original_text}</div>'
                        }
            
            logger.info(f"Successfully created FHIR Bundle with {len(bundle.get('entry', []))} resources")
            if ucum_errors:
                logger.warning(f"Found {len(ucum_errors)} UCUM validation warnings")
            if ref_errors:
                logger.warning(f"Found {len(ref_errors)} referential integrity warnings")
            
            return bundle
            
        except Exception as e:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count  # Exponential backoff
                logger.warning(
                    f"Translation/mapping failed (attempt {retry_count + 1}/{self.max_retries}), "
                    f"retrying in {wait_time}s: {e}"
                )
                time.sleep(wait_time)
                return self.translate_and_map_to_fhir(extracted_data, retry_count + 1)
            else:
                logger.error(f"Translation/mapping failed after {self.max_retries} attempts: {e}")
                raise


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Translate and map medical document JSON to FHIR R4 Bundle in one step",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Translate and map to FHIR
  python translate_to_fhir.py АВУРТ.json -o АВУРТ_fhir.json
  
  # Use custom API key
  python translate_to_fhir.py input.json --api-key sk-... -o output.json
  
  # Use different model
  python translate_to_fhir.py input.json --model gpt-4o -o output.json
        """
    )
    
    parser.add_argument(
        'input_file',
        type=str,
        help='Path to input JSON file from extractor.py'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default=None,
        help='Output JSON file path (default: <input_file>_fhir.json)'
    )
    
    parser.add_argument(
        '--api-key',
        type=str,
        default=None,
        help='OpenAI API key (default: reads from OPENAI_API_KEY env var)'
    )
    
    parser.add_argument(
        '--model',
        type=str,
        default='gpt-4o-mini',
        help='OpenAI model to use (default: gpt-4o-mini)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_fhir{input_path.suffix}"
    
    # Load input JSON
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        logger.info(f"Loaded JSON from: {input_path}")
    except Exception as e:
        logger.error(f"Error loading input JSON: {e}")
        sys.exit(1)
    
    # Initialize mapper
    try:
        mapper = TranslateToFHIRMapper(
            api_key=args.api_key,
            model=args.model
        )
    except Exception as e:
        logger.error(f"Error initializing mapper: {e}")
        sys.exit(1)
    
    # Translate and map to FHIR
    try:
        logger.info("Starting translation and FHIR mapping...")
        bundle = mapper.translate_and_map_to_fhir(input_data)
        
        # Save FHIR Bundle
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(bundle, f, ensure_ascii=False, indent=2)
        
        logger.info(f"FHIR Bundle saved to: {output_path}")
        
        # Print summary
        print("\n" + "="*60)
        print("TRANSLATION & FHIR MAPPING SUMMARY")
        print("="*60)
        print(f"Input file: {input_path}")
        print(f"Output file: {output_path}")
        print(f"Model used: {args.model}")
        print(f"Bundle ID: {bundle.get('id', 'N/A')}")
        print(f"Bundle type: {bundle.get('type', 'N/A')}")
        print(f"Total resources: {len(bundle.get('entry', []))}")
        print("="*60)
        
        # Resource breakdown
        resource_types = {}
        for entry in bundle.get('entry', []):
            resource = entry.get('resource', {})
            res_type = resource.get('resourceType', 'Unknown')
            resource_types[res_type] = resource_types.get(res_type, 0) + 1
        
        print("\nResource breakdown:")
        for res_type, count in sorted(resource_types.items()):
            print(f"  {res_type}: {count}")
        
        print("\nTranslation and FHIR mapping completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during translation/mapping: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
