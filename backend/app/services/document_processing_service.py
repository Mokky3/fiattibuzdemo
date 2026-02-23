"""
Service for processing unstructured documents (PDF, Word) into structured clinical notes.
Uses unstructured.io to extract and structure data from uploaded documents.
"""
import json
import re
import tempfile
import os
from typing import Dict, Any, Optional, List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

try:
    from unstructured.partition.pdf import partition_pdf
    from unstructured.partition.docx import partition_docx
    from unstructured.chunking.title import chunk_by_title
    from unstructured.staging.base import elements_to_json
    UNSTRUCTURED_AVAILABLE = True
except ImportError:
    logger.warning("unstructured.io library not available. Document processing will be limited.")
    UNSTRUCTURED_AVAILABLE = False


class DocumentProcessingService:
    """Service for processing medical documents into structured clinical notes."""
    
    def __init__(self):
        self.supported_formats = {
            "application/pdf": "pdf",
            "application/msword": "docx",  # .doc files may need conversion
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
        }
    
    async def process_document(
        self,
        file_content: bytes,
        file_type: str,
        filename: str
    ) -> Dict[str, Any]:
        """
        Process a document and extract structured clinical note data.
        
        Args:
            file_content: Raw file bytes
            file_type: MIME type of the file
            filename: Original filename
            
        Returns:
            Dictionary with structured data mapped to SOAP format
        """
        if not UNSTRUCTURED_AVAILABLE:
            raise ValueError("unstructured.io library is not installed. Please install it with: pip install unstructured[pdf,docx]")
        
        try:
            # Determine file format
            format_type = self.supported_formats.get(file_type)
            if not format_type:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Create temporary file for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format_type}") as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Extract text using unstructured.io
                if format_type == "pdf":
                    elements = partition_pdf(
                        filename=temp_file_path,
                        strategy="hi_res",  # High resolution for better extraction
                        infer_table_structure=True
                    )
                elif format_type == "docx":
                    elements = partition_docx(filename=temp_file_path)
                else:
                    raise ValueError(f"Unsupported format: {format_type}")
                
                # Chunk by title for better structure
                chunks = chunk_by_title(elements)
                
                # Convert to JSON for easier processing
                elements_json = elements_to_json(chunks)
                elements_data = json.loads(elements_json)
                
                # Extract full text
                full_text = "\n\n".join([
                    elem.get("text", "") for elem in elements_data 
                    if elem.get("text")
                ])
                
                # Structure the data into SOAP format
                structured_data = self._extract_soap_structure(full_text, elements_data)
                
                return structured_data
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                    except Exception as e:
                        logger.warning(f"Failed to delete temp file {temp_file_path}: {e}")
                    
        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            raise
    
    def _extract_soap_structure(
        self,
        full_text: str,
        elements_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract and structure data into SOAP format.
        
        SOAP:
        - Subjective: Patient's symptoms, history, chief complaint
        - Objective: Physical exam findings, vital signs, lab results
        - Assessment: Diagnosis, clinical impression
        - Plan: Treatment plan, medications, follow-up
        """
        # Normalize text
        text_lower = full_text.lower()
        
        # Define patterns for SOAP sections
        patterns = {
            "subjective": [
                r"(?:subjective|chief complaint|cc|history of present illness|hpi|patient reports?|complains? of)",
                r"(?:s:)",  # Common abbreviation
            ],
            "objective": [
                r"(?:objective|physical exam|pe|examination|vital signs|vitals|lab results?|laboratory)",
                r"(?:o:)",  # Common abbreviation
            ],
            "assessment": [
                r"(?:assessment|diagnosis|impression|dx|diagnoses)",
                r"(?:a:)",  # Common abbreviation
            ],
            "plan": [
                r"(?:plan|treatment plan|medications?|prescription|follow.?up|f/u)",
                r"(?:p:)",  # Common abbreviation
            ]
        }
        
        structured = {
            "subjective": None,
            "objective": None,
            "assessment": None,
            "plan": None,
            "content": full_text,  # Store full text as fallback
            "raw_elements": elements_data  # Store raw elements for advanced processing
        }
        
        # Try to find explicit SOAP sections
        for section, section_patterns in patterns.items():
            for pattern in section_patterns:
                # Look for section headers
                matches = re.finditer(
                    rf"(?i)(?:^|\n)\s*{pattern}\s*:?\s*\n(.*?)(?=\n\s*(?:{'|'.join([p for p in patterns.keys() if p != section])}):|$)",
                    full_text,
                    re.MULTILINE | re.DOTALL
                )
                
                section_content = []
                for match in matches:
                    content = match.group(1).strip()
                    if content:
                        section_content.append(content)
                
                if section_content:
                    structured[section] = "\n\n".join(section_content)
        
        # If explicit sections not found, use intelligent extraction
        if not any([structured["subjective"], structured["objective"], 
                   structured["assessment"], structured["plan"]]):
            structured = self._intelligent_extraction(full_text, elements_data)
        
        # Extract metadata
        metadata = self._extract_metadata(full_text)
        structured["metadata"] = metadata
        
        return structured
    
    def _intelligent_extraction(
        self,
        text: str,
        elements_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Intelligently extract SOAP components when explicit sections aren't found.
        Uses NLP-like patterns to identify different sections.
        """
        structured = {
            "subjective": None,
            "objective": None,
            "assessment": None,
            "plan": None,
            "content": text
        }
        
        # Subjective indicators: patient-reported symptoms, history
        subjective_keywords = [
            "complains", "reports", "states", "denies", "history",
            "symptoms", "pain", "feels", "noticed", "experienced"
        ]
        
        # Objective indicators: measurements, findings, test results
        objective_keywords = [
            "temperature", "blood pressure", "heart rate", "respiratory rate",
            "exam", "examination", "findings", "results", "test", "lab",
            "x-ray", "ct", "mri", "ultrasound", "vital signs"
        ]
        
        # Assessment indicators: diagnosis, impression
        assessment_keywords = [
            "diagnosis", "diagnoses", "impression", "assessment",
            "likely", "consistent with", "suggestive of", "rule out"
        ]
        
        # Plan indicators: treatment, medications, follow-up
        plan_keywords = [
            "prescribe", "medication", "treatment", "follow-up", "follow up",
            "return", "refer", "order", "recommend", "advise"
        ]
        
        # Split text into sentences/paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        
        subjective_parts = []
        objective_parts = []
        assessment_parts = []
        plan_parts = []
        
        for para in paragraphs:
            para_lower = para.lower()
            
            # Score paragraph for each section
            subjective_score = sum(1 for kw in subjective_keywords if kw in para_lower)
            objective_score = sum(1 for kw in objective_keywords if kw in para_lower)
            assessment_score = sum(1 for kw in assessment_keywords if kw in para_lower)
            plan_score = sum(1 for kw in plan_keywords if kw in para_lower)
            
            # Assign to section with highest score
            scores = {
                "subjective": subjective_score,
                "objective": objective_score,
                "assessment": assessment_score,
                "plan": plan_score
            }
            
            max_score = max(scores.values())
            if max_score > 0:
                section = max(scores, key=scores.get)
                if section == "subjective":
                    subjective_parts.append(para)
                elif section == "objective":
                    objective_parts.append(para)
                elif section == "assessment":
                    assessment_parts.append(para)
                elif section == "plan":
                    plan_parts.append(para)
        
        structured["subjective"] = "\n\n".join(subjective_parts) if subjective_parts else None
        structured["objective"] = "\n\n".join(objective_parts) if objective_parts else None
        structured["assessment"] = "\n\n".join(assessment_parts) if assessment_parts else None
        structured["plan"] = "\n\n".join(plan_parts) if plan_parts else None
        
        return structured
    
    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """Extract metadata like date, patient info, etc."""
        metadata = {}
        
        # Extract date patterns
        date_patterns = [
            r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
            r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b"
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                metadata["dates_found"] = matches
                break
        
        return metadata
