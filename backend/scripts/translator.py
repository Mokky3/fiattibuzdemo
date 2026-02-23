#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Medical Document Translator using OpenAI API

This script processes extracted JSON from extractor.py and translates
medical content from source language to English using OpenAI's gpt-4o-mini model.

Features:
- Selective translation (only text fields and structured_data values)
- Medical context preservation
- Batch processing for cost efficiency
- Error handling with fallback to original text
"""

import json
import sys
import argparse
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import time
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
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.error(
        "OpenAI library is not installed. "
        "Please install it with: pip install openai"
    )


# Medical translator system prompt
MEDICAL_TRANSLATOR_SYSTEM_PROMPT = """You are a specialized medical translator. Translate the following clinical data from the source language to English. 

Rules:
- Maintain standard international medical abbreviations (e.g., AVNRT, RFA, bpm, ECG, BP)
- If a term is a specific medication brand name, keep it but provide the international non-proprietary name (INN) in brackets if known
- Preserve all numbers, measurements, units, and dosages exactly as written
- Keep dates, times, and reference numbers unchanged
- Maintain medical terminology accuracy
- Translate only the content, not formatting or structure
- If a term is already in English or is a universal medical term, keep it as is

Output only the translated text, nothing else."""


class MedicalDocumentTranslator:
    """Translate medical document JSON using OpenAI API."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        batch_size: int = 7,
        max_retries: int = 3
    ):
        """
        Initialize the translator.
        
        Args:
            api_key: OpenAI API key (if None, reads from OPENAI_API_KEY env var)
            model: OpenAI model to use (default: gpt-4o-mini)
            batch_size: Number of elements to process per batch (default: 7)
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
        self.batch_size = batch_size
        self.max_retries = max_retries
        
        logger.info(f"Initialized translator with model: {model}, batch size: {batch_size}")
    
    def translate_text(self, text: str, retry_count: int = 0) -> str:
        """
        Translate a single text string using OpenAI API.
        
        Args:
            text: Text to translate
            retry_count: Current retry attempt number
            
        Returns:
            Translated text, or original text if translation fails
        """
        if not text or not text.strip():
            return text
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": MEDICAL_TRANSLATOR_SYSTEM_PROMPT},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,  # Lower temperature for more consistent medical translations
                max_tokens=2000
            )
            
            translated = response.choices[0].message.content.strip()
            return translated
            
        except Exception as e:
            if retry_count < self.max_retries:
                wait_time = 2 ** retry_count  # Exponential backoff
                logger.warning(
                    f"Translation failed (attempt {retry_count + 1}/{self.max_retries}), "
                    f"retrying in {wait_time}s: {e}"
                )
                time.sleep(wait_time)
                return self.translate_text(text, retry_count + 1)
            else:
                logger.error(f"Translation failed after {self.max_retries} attempts: {e}")
                logger.info(f"Keeping original text: {text[:100]}...")
                return text  # Return original text on failure
    
    def translate_batch(self, texts: List[str]) -> List[str]:
        """
        Translate a batch of texts.
        
        Args:
            texts: List of texts to translate
            
        Returns:
            List of translated texts (or original if translation fails)
        """
        translated = []
        for i, text in enumerate(texts):
            logger.debug(f"Translating batch item {i+1}/{len(texts)}")
            translated_text = self.translate_text(text)
            translated.append(translated_text)
            # Small delay to avoid rate limits
            if i < len(texts) - 1:
                time.sleep(0.5)
        
        return translated
    
    def translate_element(self, element: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translate text fields in a single element.
        
        Only translates:
        - 'text' field
        - 'values' in structured_data (key_value_pairs values and matrix cell values)
        
        Does NOT translate:
        - JSON keys (element_type, metadata keys, structured_data keys)
        - Keys in key_value_pairs
        
        Args:
            element: Element dictionary to translate
            
        Returns:
            Translated element dictionary
        """
        translated_element = element.copy()
        
        # Translate main text field
        if 'text' in translated_element and translated_element['text']:
            original_text = translated_element['text']
            translated_element['text'] = self.translate_text(original_text)
            logger.debug(f"Translated text field: {original_text[:50]}...")
        
        # Translate structured_data if present (for Table elements)
        if 'structured_data' in translated_element:
            structured_data = translated_element['structured_data'].copy()
            
            # Translate values in key_value_pairs (not the keys)
            if 'key_value_pairs' in structured_data:
                translated_kvp = {}
                for key, value in structured_data['key_value_pairs'].items():
                    # Keep key as-is, translate value
                    if value and isinstance(value, str):
                        translated_kvp[key] = self.translate_text(value)
                    else:
                        translated_kvp[key] = value
                structured_data['key_value_pairs'] = translated_kvp
            
            # Translate matrix cell values (preserve structure)
            if 'matrix' in structured_data:
                translated_matrix = []
                for row in structured_data['matrix']:
                    translated_row = []
                    for cell in row:
                        if cell and isinstance(cell, str):
                            translated_row.append(self.translate_text(cell))
                        else:
                            translated_row.append(cell)
                    translated_matrix.append(translated_row)
                structured_data['matrix'] = translated_matrix
            
            translated_element['structured_data'] = structured_data
        
        return translated_element
    
    def translate_document(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translate all translatable content in the document JSON.
        
        Args:
            data: Input JSON data from extractor.py
            
        Returns:
            Translated JSON data with same structure
        """
        translated_data = data.copy()
        
        if 'elements' not in translated_data:
            logger.warning("No 'elements' field found in input data")
            return translated_data
        
        elements = translated_data['elements']
        total_elements = len(elements)
        
        logger.info(f"Starting translation of {total_elements} elements")
        
        # Process in batches
        translated_elements = []
        batch_count = 0
        
        for i in range(0, total_elements, self.batch_size):
            batch = elements[i:i + self.batch_size]
            batch_count += 1
            
            logger.info(
                f"Processing batch {batch_count} "
                f"(elements {i+1}-{min(i+self.batch_size, total_elements)}/{total_elements})"
            )
            
            for element in batch:
                try:
                    translated_element = self.translate_element(element)
                    translated_elements.append(translated_element)
                except Exception as e:
                    logger.error(f"Error translating element: {e}")
                    logger.info("Keeping original element")
                    translated_elements.append(element)  # Keep original on error
            
            # Delay between batches to avoid rate limits
            if i + self.batch_size < total_elements:
                logger.info("Waiting before next batch...")
                time.sleep(2)
        
        translated_data['elements'] = translated_elements
        
        logger.info(f"Translation completed. Processed {total_elements} elements.")
        
        return translated_data


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Translate medical document JSON from extractor.py to English",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Translate extracted JSON
  python translator.py АВУРТ.json -o АВУРТ_en.json
  
  # Use custom API key
  python translator.py input.json --api-key sk-... -o output.json
  
  # Adjust batch size
  python translator.py input.json --batch-size 10 -o output.json
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
        help='Output JSON file path (default: <input_file>_en.json)'
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
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=7,
        help='Number of elements to process per batch (default: 7, range: 5-10)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input_file)
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        sys.exit(1)
    
    # Validate batch size
    if not (5 <= args.batch_size <= 10):
        logger.warning(f"Batch size {args.batch_size} is outside recommended range (5-10). Using anyway.")
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_en{input_path.suffix}"
    
    # Load input JSON
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        logger.info(f"Loaded JSON from: {input_path}")
    except Exception as e:
        logger.error(f"Error loading input JSON: {e}")
        sys.exit(1)
    
    # Initialize translator
    try:
        translator = MedicalDocumentTranslator(
            api_key=args.api_key,
            model=args.model,
            batch_size=args.batch_size
        )
    except Exception as e:
        logger.error(f"Error initializing translator: {e}")
        sys.exit(1)
    
    # Translate document
    try:
        translated_data = translator.translate_document(input_data)
        
        # Save translated JSON
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Translated JSON saved to: {output_path}")
        
        # Print summary
        print("\n" + "="*60)
        print("TRANSLATION SUMMARY")
        print("="*60)
        print(f"Input file: {input_path}")
        print(f"Output file: {output_path}")
        print(f"Elements processed: {len(translated_data.get('elements', []))}")
        print(f"Model used: {args.model}")
        print("="*60)
        print("\nTranslation completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during translation: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
