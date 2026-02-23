# Medical Document Extractor

A Python script for extracting structured data from medical documents (.pdf, .doc, .docx) using Unstructured.io library.

## Features

- **Multi-format support**: Processes PDF, DOC, and DOCX files
- **Element filtering**: Extracts only Title, NarrativeText, and Table elements to reduce processing costs
- **Table structure**: Captures `text_as_html` metadata for tables when available
- **Text cleaning**: Removes extra whitespace and non-printable characters common in medical documents
- **Multi-language OCR**: Supports Uzbek, Russian, and English documents using Tesseract OCR
- **Structured JSON output**: Produces clean, structured JSON with element types, text, and metadata

## Prerequisites

### System Dependencies

1. **Tesseract OCR** with language packs:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr tesseract-ocr-rus tesseract-ocr-uzb
   
   # macOS
   brew install tesseract tesseract-lang
   
   # Windows
   # Download from: https://github.com/UB-Mannheim/tesseract/wiki
   # Install language packs separately
   ```

2. **Python 3.8+**

### Python Dependencies

Install required Python packages:

```bash
pip install 'unstructured[pdf,docx]'
```

Or install from requirements.txt (if unstructured is already listed):

```bash
pip install -r backend/requirements.txt
```

## Usage

### Basic Usage

```bash
# Process a PDF file
python backend/scripts/extractor.py document.pdf

# Process a Word document
python backend/scripts/extractor.py report.docx

# Specify custom output file
python backend/scripts/extractor.py document.pdf -o output.json
```

### Advanced Options

```bash
# Use high-resolution strategy for better accuracy
python backend/scripts/extractor.py scan.pdf --strategy hi_res

# Specify OCR languages
python backend/scripts/extractor.py document.pdf --ocr-languages uzb rus eng

# Disable table structure inference (faster processing)
python backend/scripts/extractor.py document.pdf --no-table-structure

# Combine options
python backend/scripts/extractor.py medical_report.pdf \
    --strategy hi_res \
    --ocr-languages uzb rus eng \
    -o structured_output.json
```

### Command-Line Arguments

- `input_file`: Path to input document (required)
- `-o, --output`: Output JSON file path (default: `<input_file>.json`)
- `--ocr-languages`: Tesseract OCR language codes (default: `uzb rus eng`)
- `--strategy`: Partitioning strategy - `fast`, `hi_res`, `ocr_only`, or `auto` (default: `auto`)
- `--no-table-structure`: Disable table structure inference for faster processing

## Output Format

The script generates a JSON file with the following structure:

```json
{
  "source_file": "path/to/document.pdf",
  "total_elements": 45,
  "filtered_elements": 12,
  "elements": [
    {
      "element_type": "Title",
      "text": "Patient Medical Report",
      "metadata": {
        "page_number": 1,
        "filename": "document.pdf",
        "filetype": "application/pdf"
      }
    },
    {
      "element_type": "NarrativeText",
      "text": "Patient presents with chief complaint of...",
      "metadata": {
        "page_number": 1
      }
    },
    {
      "element_type": "Table",
      "text": "Vital Signs\nBP: 120/80\nHR: 72",
      "metadata": {
        "page_number": 2,
        "text_as_html": "<table>...</table>",
        "table_as_html": "<table>...</table>"
      }
    }
  ]
}
```

### Element Types

- **Title**: Document titles and section headers
- **NarrativeText**: Paragraphs and body text
- **Table**: Tabular data with HTML representation

### Metadata Fields

Common metadata fields include:
- `page_number`: Page where element appears
- `filename`: Source filename
- `filetype`: MIME type of source file
- `file_directory`: Directory of source file
- `last_modified`: File modification timestamp

Table-specific metadata:
- `text_as_html`: HTML representation of table (if available)
- `table_as_html`: Alternative HTML table representation
- `table_as_cells`: Structured cell data
- `table_structure`: Table structure information

## Text Cleaning

The script automatically applies the following cleaners:

- **Extra whitespace removal**: Normalizes multiple spaces and line breaks
- **Non-printable character removal**: Removes control characters
- **Bullet point normalization**: Standardizes bullet formats
- **Dash normalization**: Standardizes dash characters
- **Paragraph grouping**: Groups broken paragraphs

## Processing Strategies

- **`fast`**: Fastest processing, suitable for text-based PDFs
- **`hi_res`**: High-resolution processing for scanned documents and images
- **`ocr_only`**: OCR-only mode for image-based documents
- **`auto`**: Automatically selects the best strategy (recommended)

## Examples

### Example 1: Process a scanned PDF

```bash
python backend/scripts/extractor.py scanned_report.pdf \
    --strategy hi_res \
    --ocr-languages uzb rus eng
```

### Example 2: Process multiple documents (bash)

```bash
for file in *.pdf; do
    python backend/scripts/extractor.py "$file" -o "${file%.pdf}.json"
done
```

### Example 3: Process Word document with custom output

```bash
python backend/scripts/extractor.py clinical_note.docx \
    -o structured_clinical_data.json \
    --strategy auto
```

## Integration with FIATTIB

This script can be integrated with the existing `DocumentProcessingService`:

```python
from scripts.extractor import MedicalDocumentExtractor
from pathlib import Path

# Create extractor
extractor = MedicalDocumentExtractor(
    ocr_languages=['uzb', 'rus', 'eng'],
    strategy='auto'
)

# Process document
structured_data = extractor.process_document(
    file_path=Path('medical_report.pdf'),
    output_path=Path('output.json')
)

# Use structured_data['elements'] for further processing
```

## Troubleshooting

### Tesseract OCR not found

If you see errors about Tesseract, ensure it's installed and in your PATH:

```bash
# Check installation
tesseract --version

# Verify language packs
tesseract --list-langs
```

### Import errors

If you see import errors for unstructured.io:

```bash
pip install --upgrade 'unstructured[pdf,docx]'
```

### Table structure not captured

Ensure `infer_table_structure` is enabled (default) and use `hi_res` strategy for better table detection:

```bash
python backend/scripts/extractor.py document.pdf --strategy hi_res
```

## Performance Tips

1. Use `--strategy fast` for text-based PDFs (faster)
2. Use `--no-table-structure` if tables aren't needed (faster)
3. Use `hi_res` strategy only for scanned documents (slower but more accurate)
4. Process documents in batch for better throughput

## License

This script is part of the FIATTIB project and uses Unstructured.io (Apache 2.0 license).
