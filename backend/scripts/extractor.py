#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
General-Purpose Medical Document Parser using Unstructured.io

This script extracts structured data from any medical document (.doc, .docx, .pdf)
using Unstructured.io library. It preserves all clinical data including:
- Dynamic table reconstruction (key-value pairs and matrices)
- Medical character preservation (/, -, %, .)
- Context-aware tail capture for prescriptions/recommendations
- Multi-language support (UTF-8 encoding throughout)

Supports OCR for Uzbek and Russian documents using Tesseract.
"""

import json
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
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

try:
    from unstructured.partition.auto import partition
    from unstructured.cleaners.core import (
        clean_extra_whitespace,
        clean_bullets,
        clean_dashes,
        group_broken_paragraphs,
    )
    try:
        from unstructured.cleaners.core import replace_unicode_quotes
        REPLACE_UNICODE_QUOTES_AVAILABLE = True
    except ImportError:
        REPLACE_UNICODE_QUOTES_AVAILABLE = False
        logger.warning("replace_unicode_quotes not available, using fallback")
    from unstructured.documents.elements import (
        Title,
        NarrativeText,
        Table,
        ListItem,
        Element,
    )
    try:
        from bs4 import BeautifulSoup
        BEAUTIFULSOUP_AVAILABLE = True
    except ImportError:
        BEAUTIFULSOUP_AVAILABLE = False
        logger.warning("BeautifulSoup not available. Table text recovery from HTML will be limited.")
    UNSTRUCTURED_AVAILABLE = True
except (ImportError, OSError) as e:
    error_text = str(e)
    logger.error(
        "unstructured.io library is not installed. "
        "Please install it with: pip install 'unstructured[pdf,docx]'"
    )
    logger.error(f"Import error: {e}")

    # Common runtime dependency issue for cv2/image stack
    if "libGL.so.1" in error_text:
        logger.error(
            "Missing system dependency 'libGL.so.1'. "
            "Install it with: sudo apt-get update && sudo apt-get install -y libgl1"
        )

    sys.exit(1)


class MedicalDocumentExtractor:
    """Extract structured data from medical documents."""
    
    # Allowed element types
    ALLOWED_ELEMENT_TYPES = {Title, NarrativeText, Table, ListItem}
    
    def __init__(
        self,
        ocr_languages: Optional[List[str]] = None,
        strategy: str = "auto"
    ):
        """
        Initialize the extractor.
        
        Args:
            ocr_languages: List of Tesseract language codes (e.g., ['uzb', 'rus', 'eng'])
            strategy: Partitioning strategy ('fast', 'hi_res', 'ocr_only', 'auto')
        """
        # Default to Russian, Uzbek, and Uzbek Cyrillic for better medical document support
        # uzb_cyrl is the correct Tesseract code for Uzbek Cyrillic (with underscore, not hyphen)
        self.ocr_languages = ocr_languages or ['rus', 'uzb', 'uzb_cyrl']
        self.strategy = strategy
        
    def clean_text(self, text: str) -> str:
        """
        Universal clinical character preservation cleaner.
        
        Preserves all medical-critical characters: /, -, %, .
        Only removes redundant whitespace and non-printable control characters.
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text with all medical characters preserved
        """
        if not text:
            return ""
        
        # Remove only non-printable control characters (keep all printable chars including /, -, %, .)
        # Include Cyrillic and other Unicode characters
        cleaned = ''.join(c for c in text if c.isprintable() or c.isspace())
        
        # Preserve all medical-critical patterns before any cleaning
        import re
        medical_patterns = {}
        pattern_counter = 0
        
        # Pattern to preserve: numbers with /, -, %, . (e.g., "170/80", "30-40", "0.5%", "30-40 Wt")
        medical_pattern = r'(\d+\.?\d*[%]?\s*[-/]\s*\d+\.?\d*[%]?)\s*([A-Za-zа-яА-ЯёЁ]+)?'
        
        def replace_medical_pattern(match):
            nonlocal pattern_counter
            placeholder = f"__MEDICAL_{pattern_counter}__"
            medical_patterns[placeholder] = match.group(0)
            pattern_counter += 1
            return placeholder
        
        # Replace medical patterns with placeholders
        cleaned = re.sub(medical_pattern, replace_medical_pattern, cleaned)
        
        # Only remove redundant whitespace (preserve single spaces)
        cleaned = clean_extra_whitespace(cleaned)
        
        # Replace unicode quotes if available (doesn't affect medical chars)
        if REPLACE_UNICODE_QUOTES_AVAILABLE:
            cleaned = replace_unicode_quotes(cleaned)
        else:
            # Fallback: manual unicode quote replacement
            quote_replacements = {
                '\u2018': "'",
                '\u2019': "'",
                '\u201C': '"',
                '\u201D': '"',
                '\u201E': '"',
                '\u2032': "'",
                '\u2033': '"',
            }
            for unicode_char, replacement in quote_replacements.items():
                cleaned = cleaned.replace(unicode_char, replacement)
        
        # Clean bullets but preserve medical dashes
        cleaned = clean_bullets(cleaned)
        
        # Group broken paragraphs
        cleaned = group_broken_paragraphs(cleaned)
        
        # Restore all medical patterns
        for placeholder, original_pattern in medical_patterns.items():
            cleaned = cleaned.replace(placeholder, original_pattern)
        
        return cleaned.strip()
    
    def has_alphanumeric(self, text: str) -> bool:
        """
        Check if text contains at least one alphanumeric character.
        
        Args:
            text: Text to check
            
        Returns:
            True if text contains alphanumeric characters, False otherwise
        """
        import re
        return bool(re.search(r'[a-zA-Zа-яА-ЯёЁ0-9]', text))
    
    def is_prescription_or_recommendation_item(self, element_dict: Dict[str, Any], previous_element: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if element is a list item following 'Prescriptions' or 'Recommendations' header.
        
        Args:
            element_dict: Current element dictionary
            previous_element: Previous element dictionary (if available)
            
        Returns:
            True if element should be preserved as a prescription/recommendation item
        """
        if not previous_element:
            return False
        
        # Check if previous element is a Title with prescription/recommendation keywords
        if previous_element.get('element_type') == 'Title':
            prev_text = previous_element.get('text', '').lower()
            prescription_keywords = ['назначения', 'prescriptions', 'рекомендации', 'recommendations']
            
            if any(keyword in prev_text for keyword in prescription_keywords):
                # Current element is likely a list item following the header
                return True
        
        return False
    
    def extract_text_from_html(self, html_content: str) -> str:
        """
        Extract clean text from HTML using BeautifulSoup.
        
        Args:
            html_content: HTML string
            
        Returns:
            Clean text extracted from HTML
        """
        if not html_content:
            return ""
        
        if not BEAUTIFULSOUP_AVAILABLE:
            # Fallback: simple regex-based HTML tag removal
            import re
            text = re.sub(r'<[^>]+>', '', html_content)
            # Decode HTML entities
            import html
            text = html.unescape(text)
            return self.clean_text(text)
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            return self.clean_text(text)
        except Exception as e:
            logger.warning(f"Error parsing HTML with BeautifulSoup: {e}")
            # Fallback to regex
            import re
            text = re.sub(r'<[^>]+>', '', html_content)
            import html
            text = html.unescape(text)
            return self.clean_text(text)
    
    def parse_table_to_structured_json(self, html_content: str) -> Dict[str, Any]:
        """
        Dynamic table reconstruction: Parse HTML table into generic structured format.
        
        Creates key-value pairs or matrix structure without hardcoded headers.
        Preserves all label-value associations regardless of table structure.
        
        Args:
            html_content: HTML table string
            
        Returns:
            Dictionary with structured data: key_value_pairs (dict) and/or matrix (list of lists)
        """
        if not html_content:
            return {}
        
        structured_data = {
            "key_value_pairs": {},
            "matrix": []
        }
        
        if not BEAUTIFULSOUP_AVAILABLE:
            logger.warning("BeautifulSoup not available for table parsing, using fallback")
            return structured_data
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            table = soup.find('table')
            
            if not table:
                return structured_data
            
            # Extract all rows
            rows = table.find_all('tr')
            matrix_rows = []
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                row_data = []
                
                for cell in cells:
                    cell_text = self.clean_text(cell.get_text()).strip()
                    row_data.append(cell_text)
                
                if row_data:
                    matrix_rows.append(row_data)
                    
                    # If row has 2 cells, treat as key-value pair
                    if len(row_data) == 2:
                        key, value = row_data[0], row_data[1]
                        if key and value:
                            # Use original key (no hardcoded mapping)
                            structured_data["key_value_pairs"][key] = value
                    
                    # Handle multi-column key-value patterns (e.g., "Key: Value" in single cell)
                    elif len(row_data) == 1:
                        cell_text = row_data[0]
                        # Try to split on common separators
                        import re
                        match = re.match(r'^(.+?)[:\-]\s*(.+)$', cell_text)
                        if match:
                            key = self.clean_text(match.group(1)).strip()
                            value = self.clean_text(match.group(2)).strip()
                            if key and value:
                                structured_data["key_value_pairs"][key] = value
            
            # Store matrix representation
            structured_data["matrix"] = matrix_rows
            
            return structured_data
            
        except Exception as e:
            logger.warning(f"Error parsing table HTML: {e}")
            return structured_data
    
    def extract_elements(
        self,
        file_path: Path,
        infer_table_structure: bool = True
    ) -> List[Element]:
        """
        Extract elements from a document using unstructured.partition.auto.
        
        Args:
            file_path: Path to the document file
            infer_table_structure: Whether to infer table structure (for Table elements)
            
        Returns:
            List of extracted elements
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        logger.info(f"Processing file: {file_path}")
        logger.info(f"Strategy: {self.strategy}, Languages: {self.ocr_languages}")
        
        # Check for .doc files which require LibreOffice
        if file_path.suffix.lower() == '.doc':
            logger.warning(
                "Processing .doc file. Note: This requires LibreOffice to be installed.\n"
                "If you encounter errors, please install LibreOffice from:\n"
                "https://www.libreoffice.org/download/download/\n"
                "Or convert the file to .docx format."
            )
        
        # Build partition parameters
        partition_kwargs = {
            "filename": str(file_path),
            "strategy": self.strategy,
        }
        
        # Explicitly set languages for better Cyrillic and Uzbek support
        # Use 'languages' parameter (not deprecated 'ocr_languages')
        # rus = Russian (Cyrillic), uzb = Uzbek (Latin), uzb_cyrl = Uzbek (Cyrillic)
        partition_kwargs["languages"] = self.ocr_languages
        
        # Add table structure inference for PDFs
        if file_path.suffix.lower() == '.pdf':
            partition_kwargs["infer_table_structure"] = infer_table_structure
        
        # Partition the document
        try:
            elements = partition(**partition_kwargs)
            logger.info(f"Extracted {len(elements)} elements from {file_path.name}")
            return elements
        except FileNotFoundError as e:
            if "soffice" in str(e) or "libreoffice" in str(e).lower():
                error_msg = (
                    f"\n{'='*70}\n"
                    f"LibreOffice is required to process .doc files.\n"
                    f"{'='*70}\n"
                    f"Please install LibreOffice:\n"
                    f"  Windows: https://www.libreoffice.org/download/download/\n"
                    f"  Mac: brew install --cask libreoffice\n"
                    f"  Linux: sudo apt-get install libreoffice\n"
                    f"\nAlternatively, convert your .doc file to .docx format.\n"
                    f"{'='*70}\n"
                )
                logger.error(error_msg)
            raise
        except (KeyError, ValueError) as e:
            error_str = str(e)
            if "officeDocument" in error_str or "relationship" in error_str.lower():
                error_msg = (
                    f"\n{'='*70}\n"
                    f"Invalid or corrupted document file: {file_path.name}\n"
                    f"{'='*70}\n"
                    f"The file appears to be corrupted or not a valid Office document.\n"
                    f"This can happen if:\n"
                    f"  1. A .doc file was renamed to .docx (not a true conversion)\n"
                    f"  2. The file is corrupted\n"
                    f"  3. The file is in an unsupported format\n"
                    f"\nSolutions:\n"
                    f"  1. Open the file in Microsoft Word or LibreOffice and save it as .docx\n"
                    f"  2. If it's a .doc file, install LibreOffice and use the original .doc file\n"
                    f"  3. Try converting the file using an online converter\n"
                    f"{'='*70}\n"
                )
                logger.error(error_msg)
            raise
        except Exception as e:
            error_str = str(e)
            # Check for Tesseract OCR errors
            if "tesseract" in error_str.lower() or "TesseractNotFoundError" in str(type(e)):
                error_msg = (
                    f"\n{'='*70}\n"
                    f"Tesseract OCR is required but not found\n"
                    f"{'='*70}\n"
                    f"The PDF appears to be a scanned/image-based document requiring OCR.\n"
                    f"Tesseract OCR is not installed or not in your PATH.\n"
                    f"\nInstallation Instructions:\n"
                    f"  Windows:\n"
                    f"    1. Download Tesseract installer from:\n"
                    f"       https://github.com/UB-Mannheim/tesseract/wiki\n"
                    f"    2. Install Tesseract (default location: C:\\Program Files\\Tesseract-OCR)\n"
                    f"    3. Add to PATH or restart terminal\n"
                    f"    4. Download language packs:\n"
                    f"       - tesseract-ocr-rus (Russian)\n"
                    f"       - tesseract-ocr-uzb (Uzbek)\n"
                    f"\n  Alternative: Use 'fast' strategy for text-based PDFs:\n"
                    f"     python backend/scripts/extractor.py {file_path.name} --strategy fast\n"
                    f"\n  Note: 'fast' strategy only works for PDFs with embedded text.\n"
                    f"        For scanned PDFs, you must install Tesseract OCR.\n"
                    f"{'='*70}\n"
                )
                logger.error(error_msg)
            else:
                logger.error(f"Error partitioning document {file_path}: {e}")
            raise
    
    def filter_elements(self, elements: List[Element]) -> List[Element]:
        """
        Filter elements to include Title, NarrativeText, Table, and ListItem.
        
        Args:
            elements: List of all extracted elements
            
        Returns:
            Filtered list containing only allowed element types
        """
        filtered = [
            elem for elem in elements
            if type(elem) in self.ALLOWED_ELEMENT_TYPES
        ]
        
        logger.info(
            f"Filtered {len(elements)} elements down to {len(filtered)} "
            f"(Title, NarrativeText, Table, ListItem)"
        )
        
        return filtered
    
    def element_to_dict(self, element: Element) -> Dict[str, Any]:
        """
        Convert an element to a dictionary with element_type, text, and metadata.
        
        Args:
            element: Element to convert
            
        Returns:
            Dictionary with element_type, text, and metadata
        """
        # Get text content
        text_content = ""
        if hasattr(element, 'text'):
            text_content = element.text or ""
        elif hasattr(element, '__str__'):
            text_content = str(element)
        
        # Extract metadata first to check for text_as_html
        metadata = None
        if hasattr(element, 'metadata'):
            metadata = element.metadata
        
        # For Table elements, parse HTML into structured JSON
        structured_table_data = None
        if isinstance(element, Table):
            # Try to get text_as_html
            text_as_html = None
            
            # Method 1: Check metadata.text_as_html
            if metadata and hasattr(metadata, 'text_as_html') and metadata.text_as_html:
                text_as_html = metadata.text_as_html
            
            # Method 2: Check element.text_as_html directly
            elif hasattr(element, 'text_as_html') and element.text_as_html:
                text_as_html = element.text_as_html
            
            # Method 3: Check metadata.metadata.text_as_html (nested)
            elif metadata and hasattr(metadata, 'metadata'):
                nested_meta = metadata.metadata
                if isinstance(nested_meta, dict) and 'text_as_html' in nested_meta:
                    text_as_html = nested_meta['text_as_html']
            
            # Parse table HTML into structured JSON
            if text_as_html:
                logger.info(f"Parsing table HTML into structured JSON")
                structured_table_data = self.parse_table_to_structured_json(text_as_html)
                # Also extract readable text for the text field
                text_content = self.extract_text_from_html(text_as_html)
            else:
                # Fallback to regular text cleaning if no HTML available
                text_content = self.clean_text(text_content)
        else:
            # For non-table elements, just clean the text
            text_content = self.clean_text(text_content)
        
        # Determine element type (group ListItem as List)
        element_type = element.__class__.__name__
        if element_type == "ListItem":
            element_type = "List"
        
        element_dict = {
            "element_type": element_type,
            "text": text_content,
            "metadata": {}
        }
        
        # Add structured data for tables
        if isinstance(element, Table) and structured_table_data:
            element_dict["structured_data"] = structured_table_data
        
        # Common metadata fields - ENSURE page_number is always present
        page_number = None
        if metadata:
            # Page number (REQUIRED - always include)
            if hasattr(metadata, 'page_number') and metadata.page_number is not None:
                page_number = metadata.page_number
            
            # Filename
            if hasattr(metadata, 'filename') and metadata.filename:
                element_dict["metadata"]["filename"] = metadata.filename
            
            # Filetype
            if hasattr(metadata, 'filetype') and metadata.filetype:
                element_dict["metadata"]["filetype"] = metadata.filetype
            
            # File directory
            if hasattr(metadata, 'file_directory') and metadata.file_directory:
                element_dict["metadata"]["file_directory"] = metadata.file_directory
            
            # Last modified
            if hasattr(metadata, 'last_modified') and metadata.last_modified:
                element_dict["metadata"]["last_modified"] = metadata.last_modified.isoformat() if hasattr(metadata.last_modified, 'isoformat') else str(metadata.last_modified)
        
        # Always set page_number (even if None) - REQUIRED field
        element_dict["metadata"]["page_number"] = page_number
        
        # Table-specific metadata (text_as_html already extracted above for text recovery)
        if isinstance(element, Table):
            # Store text_as_html in metadata if we have it
            # (We already extracted it above, but need to store it in the dict)
            if metadata:
                # Store text_as_html if available
                if hasattr(metadata, 'text_as_html') and metadata.text_as_html:
                    element_dict["metadata"]["text_as_html"] = metadata.text_as_html
                elif hasattr(element, 'text_as_html') and element.text_as_html:
                    element_dict["metadata"]["text_as_html"] = element.text_as_html
                
                # Table as HTML
                if hasattr(metadata, 'table_as_html') and metadata.table_as_html:
                    element_dict["metadata"]["table_as_html"] = metadata.table_as_html
                
                # Table as cells (structured data)
                if hasattr(metadata, 'table_as_cells') and metadata.table_as_cells:
                    element_dict["metadata"]["table_as_cells"] = metadata.table_as_cells
                
                # Table structure
                if hasattr(metadata, 'table_structure') and metadata.table_structure:
                    element_dict["metadata"]["table_structure"] = metadata.table_structure
        
        return element_dict
    
    def process_document(
        self,
        file_path: Path,
        output_path: Optional[Path] = None,
        infer_table_structure: bool = True
    ) -> Dict[str, Any]:
        """
        Process a medical document and extract structured data.
        
        Args:
            file_path: Path to input document
            output_path: Optional path to save JSON output (if None, auto-generates)
            infer_table_structure: Whether to infer table structure (for Table elements)
            
        Returns:
            Dictionary containing extracted elements and metadata
        """
        # Extract elements
        elements = self.extract_elements(file_path, infer_table_structure=infer_table_structure)
        
        # Filter to allowed types
        filtered_elements = self.filter_elements(elements)
        
        # Convert to dictionaries
        element_dicts = [self.element_to_dict(elem) for elem in filtered_elements]
        
        # Context-Aware Tail Capture: Detect Title in final 20% of document
        total_elements = len(element_dicts)
        tail_start_index = int(total_elements * 0.8)  # Final 20%
        title_in_tail = False
        
        for i in range(tail_start_index, total_elements):
            if element_dicts[i].get('element_type') == 'Title':
                title_in_tail = True
                logger.info(f"Title detected in final 20% of document at position {i}/{total_elements}. Lowering threshold for subsequent elements.")
                break
        
        # Deduplication with context-aware threshold
        valid_elements = []
        removed_count = 0
        
        for i, elem_dict in enumerate(element_dicts):
            text = elem_dict.get('text', '')
            previous_element = element_dicts[i - 1] if i > 0 else None
            
            # Check if this is a prescription/recommendation item
            is_prescription_item = self.is_prescription_or_recommendation_item(elem_dict, previous_element)
            
            # Context-aware: If Title in tail and we're past tail_start_index, lower threshold
            is_in_tail_zone = i >= tail_start_index
            is_narrative_or_list = elem_dict.get('element_type') in ['NarrativeText', 'List']
            
            # Keep element if:
            # 1. It has alphanumeric characters, OR
            # 2. It's a prescription/recommendation list item (even if short), OR
            # 3. It's in tail zone after Title detected and is NarrativeText/List (context-aware capture)
            should_keep = (
                self.has_alphanumeric(text) or 
                is_prescription_item or
                (title_in_tail and is_in_tail_zone and is_narrative_or_list and text.strip())
            )
            
            if should_keep:
                valid_elements.append(elem_dict)
                if is_prescription_item:
                    logger.debug(f"Preserved prescription/recommendation item: {text[:50]}...")
                elif title_in_tail and is_in_tail_zone:
                    logger.debug(f"Preserved tail element (context-aware): {text[:50]}...")
            else:
                removed_count += 1
                logger.debug(f"Removing element with no alphanumeric content: {text[:50]}...")
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} elements with no alphanumeric content")
        
        structured_data = {
            "source_file": str(file_path),
            "total_elements": len(elements),
            "filtered_elements": len(filtered_elements),
            "valid_elements": len(valid_elements),
            "removed_elements": removed_count,
            "elements": valid_elements
        }
        
        # Save to JSON if output path provided
        if output_path:
            self.save_json(structured_data, output_path)
            logger.info(f"Saved structured data to: {output_path}")
        
        return structured_data
    
    def save_json(self, data: Dict[str, Any], output_path: Path):
        """
        Save structured data to JSON file with UTF-8 encoding.
        
        Ensures all Cyrillic characters are properly encoded.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Explicitly use UTF-8 encoding for Cyrillic support
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"JSON output saved to: {output_path} (UTF-8 encoded)")


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Extract structured data from medical documents using Unstructured.io",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process a PDF file
  python extractor.py document.pdf
  
  # Process a Word document with custom output
  python extractor.py report.docx -o output.json
  
  # Process with specific OCR languages
  python extractor.py scan.pdf --ocr-languages uzb rus eng
  
  # Use high-resolution strategy
  python extractor.py document.pdf --strategy hi_res
        """
    )
    
    parser.add_argument(
        'input_file',
        type=str,
        help='Path to input document (.pdf, .doc, .docx)'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default=None,
        help='Output JSON file path (default: <input_file>.json)'
    )
    
    parser.add_argument(
        '--ocr-languages',
        nargs='+',
        default=['rus', 'uzb', 'uzb_cyrl'],
        help='Tesseract OCR language codes (default: rus uzb uzb_cyrl). Note: Use underscore in uzb_cyrl (not hyphen). .doc files require LibreOffice.'
    )
    
    parser.add_argument(
        '--strategy',
        type=str,
        choices=['fast', 'hi_res', 'ocr_only', 'auto'],
        default='auto',
        help='Partitioning strategy (default: auto)'
    )
    
    parser.add_argument(
        '--no-table-structure',
        action='store_true',
        help='Disable table structure inference (faster but less accurate)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        sys.exit(1)
    
    # Validate file extension
    valid_extensions = {'.pdf', '.doc', '.docx'}
    if input_path.suffix.lower() not in valid_extensions:
        logger.warning(
            f"File extension '{input_path.suffix}' may not be supported. "
            f"Supported extensions: {', '.join(valid_extensions)}"
        )
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_suffix('.json')
    
    # Create extractor
    extractor = MedicalDocumentExtractor(
        ocr_languages=args.ocr_languages,
        strategy=args.strategy
    )
    
    # Process document
    try:
        structured_data = extractor.process_document(
            file_path=input_path,
            output_path=output_path,
            infer_table_structure=not args.no_table_structure,
        )
        
        # Print summary
        print("\n" + "="*60)
        print("EXTRACTION SUMMARY")
        print("="*60)
        print(f"Source file: {input_path}")
        print(f"Total elements extracted: {structured_data['total_elements']}")
        print(f"Filtered elements (Title/NarrativeText/Table): {structured_data['filtered_elements']}")
        print(f"Valid elements (after deduplication): {structured_data['valid_elements']}")
        print(f"Removed elements (no alphanumeric): {structured_data['removed_elements']}")
        print(f"Output saved to: {output_path}")
        print("="*60)
        
        # Print element type breakdown
        element_types = {}
        for elem in structured_data['elements']:
            elem_type = elem['element_type']
            element_types[elem_type] = element_types.get(elem_type, 0) + 1
        
        print("\nElement type breakdown:")
        for elem_type, count in sorted(element_types.items()):
            print(f"  {elem_type}: {count}")
        
        print("\nExtraction completed successfully!")
        
    except Exception as e:
        logger.error(f"Error processing document: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
