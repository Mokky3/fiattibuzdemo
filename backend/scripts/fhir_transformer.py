#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FHIR R4 Bundle Transformer

Transforms extracted medical document JSON into a valid FHIR R4 Bundle (Transaction type).

As a Senior Health Informatics Engineer, this script:
- Extracts Patient information (Medical history ID, Date of birth)
- Maps Procedures with technical parameters
- Maps Observations with LOINC codes and UCUM units
- Maps MedicationAdministration with dosages
- Creates proper resource relationships
- Outputs valid FHIR R4 Bundle
"""

import json
import sys
import argparse
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from uuid import uuid4
import logging
import io

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


class FHIRTransformer:
    """Transform extracted JSON to FHIR R4 Bundle."""
    
    def __init__(self):
        """Initialize the transformer."""
        self.patient_id = None
        self.resources = []
        
        # LOINC codes for common observations
        self.loinc_codes = {
            'heart_rate': {
                'code': '8867-4',
                'display': 'Heart rate',
                'system': 'http://loinc.org'
            },
            'wenckebach': {
                'code': '8885-8',
                'display': 'Wenckebach point',
                'system': 'http://loinc.org'
            },
            'electrical_interval': {
                'code': '34551-2',
                'display': 'Electrical interval',
                'system': 'http://loinc.org'
            }
        }
    
    def parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse date string in various formats to FHIR date format (YYYY-MM-DD).
        
        Args:
            date_str: Date string (e.g., "24.07.1966", "24.07.2023")
            
        Returns:
            ISO date string (YYYY-MM-DD) or None
        """
        if not date_str:
            return None
        
        # Try DD.MM.YYYY format
        match = re.match(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', date_str.strip())
        if match:
            day, month, year = match.groups()
            try:
                # Validate and format
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            except:
                return None
        
        return None
    
    def extract_patient_info(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract Patient information from structured data.
        
        Looks for:
        - Medical history ID
        - Date of birth
        
        Args:
            data: Input JSON data
            
        Returns:
            Patient resource dictionary or None
        """
        patient_id_value = None
        birth_date = None
        
        # Search through elements for patient information
        for element in data.get('elements', []):
            # Check structured_data in Table elements
            if element.get('element_type') == 'Table' and 'structured_data' in element:
                structured = element.get('structured_data', {})
                
                # Check key_value_pairs
                kvp = structured.get('key_value_pairs', {})
                for key, value in kvp.items():
                    key_lower = key.lower()
                    if 'date of birth' in key_lower or 'birth' in key_lower:
                        birth_date = self.parse_date(value)
                    if 'medical history' in key_lower or 'history' in key_lower:
                        patient_id_value = value if value else "medical-history"
                
                # Also check matrix for patient info
                matrix = structured.get('matrix', [])
                for row in matrix:
                    row_text = ' '.join([str(cell) for cell in row if cell]).lower()
                    # Look for "Medical history" in row
                    if 'medical history' in row_text:
                        # Use "Medical history" as patient ID
                        patient_id_value = "medical-history"
                        # Try to find a value in the same row
                        for cell in row:
                            if cell and str(cell).strip() and 'medical history' not in str(cell).lower():
                                patient_id_value = str(cell).strip()
                                break
                
                # Check matrix
                matrix = structured.get('matrix', [])
                for row in matrix:
                    for i, cell in enumerate(row):
                        if cell and isinstance(cell, str):
                            cell_lower = cell.lower()
                            # Look for "Date of birth" or "Medical history" labels
                            if 'date of birth' in cell_lower or 'birth' in cell_lower:
                                # Next cell might be the date
                                if i + 1 < len(row):
                                    birth_date = self.parse_date(row[i + 1])
                            if 'medical history' in cell_lower:
                                # Use as patient ID
                                patient_id_value = "medical-history"  # Default if not found
                                # Check if there's a value in the row
                                for j, val in enumerate(row):
                                    if j != i and val and val.strip():
                                        patient_id_value = val.strip()
            
            # Also check text content for date patterns
            text = element.get('text', '')
            if text:
                # Look for date of birth pattern
                dob_match = re.search(r'date of birth[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})', text, re.IGNORECASE)
                if dob_match:
                    birth_date = self.parse_date(dob_match.group(1))
        
        # If we found patient info, create Patient resource
        if birth_date or patient_id_value:
            # Generate patient ID if not found
            if not patient_id_value:
                patient_id_value = f"patient-{uuid4().hex[:8]}"
            
            self.patient_id = patient_id_value
            
            patient_resource = {
                "resourceType": "Patient",
                "id": patient_id_value,
                "identifier": [
                    {
                        "use": "usual",
                        "system": "http://hospital.example.org/patients",
                        "value": patient_id_value
                    }
                ],
                "birthDate": birth_date
            }
            
            logger.info(f"Created Patient resource: {patient_id_value}, birthDate: {birth_date}")
            return patient_resource
        
        return None
    
    def extract_procedures(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract Procedure resources from document.
        
        Maps procedures like:
        - Radiofrequency ablation
        - Electrophysiological study (EPS)
        - Modification of AV nodal conduction
        
        Includes P, t, I parameters as extensions or notes.
        
        Args:
            data: Input JSON data
            
        Returns:
            List of Procedure resource dictionaries
        """
        procedures = []
        procedure_counter = 0
        
        for element in data.get('elements', []):
            text = element.get('text', '')
            if not text:
                continue
            
            text_lower = text.lower()
            
            # Detect procedure keywords
            is_procedure = False
            procedure_type = None
            procedure_date = None
            procedure_note = text
            
            # Check for procedure types
            if 'radiofrequency ablation' in text_lower or 'rfa' in text_lower:
                is_procedure = True
                procedure_type = "Radiofrequency ablation"
            elif 'electrophysiological study' in text_lower or 'eps' in text_lower:
                is_procedure = True
                procedure_type = "Electrophysiological study (EPS)"
            elif 'modification of av nodal conduction' in text_lower:
                is_procedure = True
                procedure_type = "Modification of AV nodal conduction"
            
            if is_procedure:
                procedure_counter += 1
                
                # Extract date from text or metadata
                date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', text)
                if date_match:
                    procedure_date = self.parse_date(date_match.group(1))
                
                # Extract procedure parameters (P, t, I)
                extensions = []
                
                # Power (P) parameter
                p_match = re.search(r'P\s*=\s*(\d+(?:-\d+)?)\s*W', text, re.IGNORECASE)
                if p_match:
                    extensions.append({
                        "url": "http://fhir.example.org/StructureDefinition/procedure-power",
                        "valueString": p_match.group(1) + " W"
                    })
                
                # Temperature (t) parameter
                t_match = re.search(r't\s*=\s*(\d+(?:-\d+)?)\s*°?C', text, re.IGNORECASE)
                if t_match:
                    extensions.append({
                        "url": "http://fhir.example.org/StructureDefinition/procedure-temperature",
                        "valueString": t_match.group(1) + "°C"
                    })
                
                # Impedance (I) parameter
                i_match = re.search(r'I\s*=\s*(\d+(?:-\d+)?)\s*Ohm', text, re.IGNORECASE)
                if i_match:
                    extensions.append({
                        "url": "http://fhir.example.org/StructureDefinition/procedure-impedance",
                        "valueString": i_match.group(1) + " Ohm"
                    })
                
                # Extract duration if mentioned
                duration_match = re.search(r'(\d+)\s*seconds?', text, re.IGNORECASE)
                duration = None
                if duration_match:
                    duration = int(duration_match.group(1))
                
                procedure_resource = {
                    "resourceType": "Procedure",
                    "id": f"procedure-{procedure_counter}",
                    "status": "completed",
                    "code": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "387713003" if "ablation" in text_lower else "257610000",
                                "display": procedure_type
                            }
                        ],
                        "text": procedure_type
                    },
                    "subject": {
                        "reference": f"Patient/{self.patient_id}" if self.patient_id else None
                    },
                    "performedDateTime": procedure_date or datetime.now(timezone.utc).isoformat(),
                    "note": [
                        {
                            "text": procedure_note
                        }
                    ]
                }
                
                # Add extensions if parameters found
                if extensions:
                    procedure_resource["extension"] = extensions
                
                # Add duration if found
                if duration:
                    procedure_resource["performedPeriod"] = {
                        "duration": {
                            "value": duration,
                            "unit": "s",
                            "system": "http://unitsofmeasure.org",
                            "code": "s"
                        }
                    }
                
                procedures.append(procedure_resource)
                logger.info(f"Created Procedure resource: {procedure_type}")
        
        return procedures
    
    def extract_observations(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract Observation resources from document.
        
        Maps:
        - Heart rate (bpm) → LOINC 8867-4
        - Wenckebach points → LOINC 8885-8
        - Electrical measurements (msec) → LOINC 34551-2
        
        Uses UCUM units.
        
        Args:
            data: Input JSON data
            
        Returns:
            List of Observation resource dictionaries
        """
        observations = []
        observation_counter = 0
        
        for element in data.get('elements', []):
            text = element.get('text', '')
            if not text:
                continue
            
            # Heart rate observations
            hr_matches = re.finditer(r'heart rate[:\s]+(\d+)\s*bpm', text, re.IGNORECASE)
            for match in hr_matches:
                observation_counter += 1
                value = int(match.group(1))
                
                observation = {
                    "resourceType": "Observation",
                    "id": f"observation-hr-{observation_counter}",
                    "status": "final",
                    "code": {
                        "coding": [self.loinc_codes['heart_rate']],
                        "text": "Heart rate"
                    },
                    "subject": {
                        "reference": f"Patient/{self.patient_id}" if self.patient_id else None
                    },
                    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
                    "valueQuantity": {
                        "value": value,
                        "unit": "/min",
                        "system": "http://unitsofmeasure.org",
                        "code": "/min"
                    }
                }
                observations.append(observation)
                logger.debug(f"Created Heart Rate Observation: {value} bpm")
            
            # Wenckebach point observations
            wenckebach_matches = re.finditer(
                r'wenckebach[^=]*=\s*(\d+)\s*bpm', 
                text, 
                re.IGNORECASE
            )
            for match in wenckebach_matches:
                observation_counter += 1
                value = int(match.group(1))
                wenckebach_type = "retrograde" if "retrograde" in text.lower() else "antegrade"
                
                observation = {
                    "resourceType": "Observation",
                    "id": f"observation-wb-{observation_counter}",
                    "status": "final",
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "8885-8",
                                "display": f"Wenckebach {wenckebach_type} point"
                            }
                        ],
                        "text": f"Wenckebach {wenckebach_type} point"
                    },
                    "subject": {
                        "reference": f"Patient/{self.patient_id}" if self.patient_id else None
                    },
                    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
                    "valueQuantity": {
                        "value": value,
                        "unit": "/min",
                        "system": "http://unitsofmeasure.org",
                        "code": "/min"
                    }
                }
                observations.append(observation)
                logger.debug(f"Created Wenckebach Observation: {value} bpm ({wenckebach_type})")
            
            # Electrical interval observations (msec)
            interval_matches = re.finditer(
                r'(RERP|AERP|AVU)[^=]*=\s*(\d+)(?:\((\d+)\))?\s*msec', 
                text, 
                re.IGNORECASE
            )
            for match in interval_matches:
                observation_counter += 1
                interval_type = match.group(1)
                value = int(match.group(2))
                # Optional second value in parentheses
                value2 = int(match.group(3)) if match.group(3) else None
                
                observation = {
                    "resourceType": "Observation",
                    "id": f"observation-interval-{observation_counter}",
                    "status": "final",
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "34551-2",
                                "display": f"{interval_type} interval"
                            }
                        ],
                        "text": f"{interval_type} interval"
                    },
                    "subject": {
                        "reference": f"Patient/{self.patient_id}" if self.patient_id else None
                    },
                    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
                    "valueQuantity": {
                        "value": value,
                        "unit": "ms",
                        "system": "http://unitsofmeasure.org",
                        "code": "ms"
                    }
                }
                
                # Add second value as component if present
                if value2:
                    observation["component"] = [
                        {
                            "code": {
                                "text": f"{interval_type} (secondary)"
                            },
                            "valueQuantity": {
                                "value": value2,
                                "unit": "ms",
                                "system": "http://unitsofmeasure.org",
                                "code": "ms"
                            }
                        }
                    ]
                
                observations.append(observation)
                logger.debug(f"Created Interval Observation: {interval_type} = {value} msec")
        
        return observations
    
    def extract_medications(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract MedicationAdministration resources from document.
        
        Maps medications like:
        - Atropine
        - Novocaini (Novocain)
        
        Captures dosage information (e.g., 0.1%-0.5 ml).
        
        Args:
            data: Input JSON data
            
        Returns:
            List of MedicationAdministration resource dictionaries
        """
        medications = []
        medication_counter = 0
        
        for element in data.get('elements', []):
            text = element.get('text', '')
            if not text:
                continue
            
            text_lower = text.lower()
            
            # Detect medications
            medication_name = None
            dosage = None
            
            # Atropine
            if 'atropine' in text_lower:
                medication_name = "Atropine"
                # Extract dosage
                dosage_match = re.search(r'(\d+\.?\d*%?)\s*-\s*(\d+\.?\d*%?)\s*ml', text, re.IGNORECASE)
                if dosage_match:
                    dosage = f"{dosage_match.group(1)}-{dosage_match.group(2)} ml"
            
            # Novocain/Novocaini
            elif 'novocain' in text_lower:
                medication_name = "Novocain (Procaine)"
                # Extract dosage
                dosage_match = re.search(r'(\d+\.?\d*%?)\s*-\s*(\d+\.?\d*)\s*ml', text, re.IGNORECASE)
                if not dosage_match:
                    # Try single value
                    dosage_match = re.search(r'(\d+\.?\d*%?)\s*-\s*(\d+\.?\d*)\s*ml', text, re.IGNORECASE)
                if dosage_match:
                    dosage = f"{dosage_match.group(1)}-{dosage_match.group(2)} ml"
                elif '0.5%' in text and '20.0' in text:
                    dosage = "0.5% - 20.0 ml"
            
            if medication_name:
                medication_counter += 1
                
                medication_resource = {
                    "resourceType": "MedicationAdministration",
                    "id": f"medication-{medication_counter}",
                    "status": "completed",
                    "medicationCodeableConcept": {
                        "coding": [
                            {
                                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                                "code": "1191" if "atropine" in text_lower else "8554",
                                "display": medication_name
                            }
                        ],
                        "text": medication_name
                    },
                    "subject": {
                        "reference": f"Patient/{self.patient_id}" if self.patient_id else None
                    },
                    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
                    "dosage": {
                        "text": dosage or "As documented"
                    }
                }
                
                # Add dosage details if available
                if dosage:
                    medication_resource["dosage"]["dose"] = {
                        "text": dosage
                    }
                
                medications.append(medication_resource)
                logger.info(f"Created MedicationAdministration: {medication_name}, dosage: {dosage}")
        
        return medications
    
    def create_bundle(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create FHIR R4 Bundle (Transaction type) from extracted data.
        
        Args:
            data: Input JSON data from extractor/translator
            
        Returns:
            FHIR R4 Bundle dictionary
        """
        # Extract Patient
        patient = self.extract_patient_info(data)
        if patient:
            self.resources.append(patient)
            self.patient_id = patient.get('id')
        
        # Extract Procedures
        procedures = self.extract_procedures(data)
        self.resources.extend(procedures)
        
        # Extract Observations
        observations = self.extract_observations(data)
        self.resources.extend(observations)
        
        # Extract Medications
        medications = self.extract_medications(data)
        self.resources.extend(medications)
        
        # Create Bundle
        bundle = {
            "resourceType": "Bundle",
            "id": str(uuid4()),
            "type": "transaction",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry": [
                {
                    "fullUrl": f"urn:uuid:{resource.get('id', uuid4().hex)}",
                    "resource": resource,
                    "request": {
                        "method": "POST",
                        "url": resource.get("resourceType")
                    }
                }
                for resource in self.resources
            ]
        }
        
        logger.info(f"Created FHIR Bundle with {len(self.resources)} resources")
        logger.info(f"  - Patient: {1 if patient else 0}")
        logger.info(f"  - Procedures: {len(procedures)}")
        logger.info(f"  - Observations: {len(observations)}")
        logger.info(f"  - Medications: {len(medications)}")
        
        return bundle


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Transform extracted medical document JSON to FHIR R4 Bundle",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Transform translated JSON to FHIR Bundle
  python fhir_transformer.py АВУРТ_en.json -o АВУРТ_fhir.json
  
  # Transform original JSON (will work but may have non-English content)
  python fhir_transformer.py АВУРТ.json -o bundle.json
        """
    )
    
    parser.add_argument(
        'input_file',
        type=str,
        help='Path to input JSON file (from extractor.py or translator.py)'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default=None,
        help='Output JSON file path (default: <input_file>_fhir.json)'
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
    
    # Transform to FHIR Bundle
    try:
        transformer = FHIRTransformer()
        bundle = transformer.create_bundle(input_data)
        
        # Save FHIR Bundle
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(bundle, f, ensure_ascii=False, indent=2)
        
        logger.info(f"FHIR Bundle saved to: {output_path}")
        
        # Print summary
        print("\n" + "="*60)
        print("FHIR TRANSFORMATION SUMMARY")
        print("="*60)
        print(f"Input file: {input_path}")
        print(f"Output file: {output_path}")
        print(f"Bundle ID: {bundle.get('id')}")
        print(f"Bundle type: {bundle.get('type')}")
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
        
        print("\nFHIR Bundle created successfully!")
        print(f"\nOutput JSON (first 500 chars):")
        bundle_json = json.dumps(bundle, ensure_ascii=False, indent=2)
        print(bundle_json[:500] + "..." if len(bundle_json) > 500 else bundle_json)
        
    except Exception as e:
        logger.error(f"Error during transformation: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
