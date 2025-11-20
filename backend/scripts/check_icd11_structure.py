#!/usr/bin/env python3
"""Check the structure of ICD-11 Excel files."""
import pandas as pd
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent.parent / "meds" / "icd11"

# Check English file
en_file = base_dir / "en" / "SimpleTabulation-ICD-11-MMS-en.xlsx"
if en_file.exists():
    print("=" * 60)
    print("ENGLISH FILE STRUCTURE:")
    print("=" * 60)
    df = pd.read_excel(en_file, nrows=10)
    print(f"Columns: {list(df.columns)}")
    print(f"\nColumn details:")
    for col in df.columns:
        print(f"  - {col}: {df[col].dtype}")
    print(f"\nFirst 5 rows:")
    print(df.head().to_string())
    print(f"\nSample data types: {df.dtypes}")
    
# Check Russian file
ru_file = base_dir / "ru" / "SimpleTabulation-ICD-11-MMS-ru.xlsx"
if ru_file.exists():
    print("\n" + "=" * 60)
    print("RUSSIAN FILE STRUCTURE:")
    print("=" * 60)
    df = pd.read_excel(ru_file, nrows=10)
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst 5 rows:")
    print(df.head().to_string())

# Check Uzbek file
uz_file = base_dir / "uz" / "SimpleTabulation-ICD-11-MMS-uz.xlsx"
if uz_file.exists():
    print("\n" + "=" * 60)
    print("UZBEK FILE STRUCTURE:")
    print("=" * 60)
    df = pd.read_excel(uz_file, nrows=10)
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst 5 rows:")
    print(df.head().to_string())
