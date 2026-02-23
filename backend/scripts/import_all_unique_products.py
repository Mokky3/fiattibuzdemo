#!/usr/bin/env python3
"""
Import all unique registration codes from source files.

This script processes each unique registration code once, ensuring
all unique products are imported regardless of how many rows
share the same registration code.
"""
import pandas as pd
import glob
from pathlib import Path
from app.db.session import SessionLocal
from sqlalchemy import text
from app.scripts.import_drug_catalog import (
    upsert_medication_product, upsert_mnn, upsert_dosage_form,
    upsert_unit, upsert_manufacturer
)
from app.scripts.lib.normalize_med import normalize_text, parse_strength, detect_route, to_bool_prescription
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def clean_value(v):
    if pd.isna(v) or v == 'nan' or v == 'NaN' or str(v).strip() == '':
        return ''
    return str(v).strip()


def main():
    # Get all unique registration codes with their first row data
    logger.info("Collecting unique registration codes from source files...")
    
    unique_regs = {}  # reg_code -> first row with that code
    
    files = sorted(glob.glob("../meds/list/drugs*.xlsx"))
    logger.info(f"Found {len(files)} files")
    
    for file_path in files:
        try:
            df = pd.read_excel(file_path, sheet_name="Drugs List")
            if 'registration Code' not in df.columns:
                logger.warning(f"Skipping {Path(file_path).name} - missing 'registration Code' column")
                continue
            
            for idx, row in df.iterrows():
                reg = clean_value(row.get('registration Code', ''))
                if not reg or reg == 'nan':
                    continue
                
                # Keep first occurrence of each unique registration code
                if reg not in unique_regs:
                    unique_regs[reg] = {
                        'row': row,
                        'file': Path(file_path).name
                    }
                    
        except Exception as e:
            logger.error(f"Error reading {file_path}: {e}")
            continue
    
    logger.info(f"Found {len(unique_regs):,} unique registration codes")
    
    # Check which ones are already in database
    db = SessionLocal()
    try:
        existing_regs = set()
        existing = db.execute(
            text("SELECT registration_number FROM ref.medication_product WHERE registration_number IS NOT NULL AND registration_number != ''")
        ).fetchall()
        existing_regs = {str(r[0]).strip() for r in existing}
        
        logger.info(f"Already in database: {len(existing_regs):,}")
        
        # Find missing ones
        missing_regs = {reg: data for reg, data in unique_regs.items() if reg not in existing_regs}
        logger.info(f"Missing from database: {len(missing_regs):,}")
        
        if len(missing_regs) == 0:
            logger.info("All unique registration codes are already in database!")
            return
        
        # Import missing ones
        logger.info("=" * 60)
        logger.info("IMPORTING MISSING PRODUCTS")
        logger.info("=" * 60)
        
        imported = 0
        failed = 0
        
        for reg_code, data in missing_regs.items():  # Process all missing products
            row = data['row']
            file_name = data['file']
            
            try:
                # Extract row data
                pharm_id = clean_value(row.get('ID', ''))
                short_name = clean_value(row.get('short Name', ''))
                full_name = clean_value(row.get('full Name', ''))
                mnn_name = clean_value(row.get('mnn', ''))
                dosage_form_name = clean_value(row.get('dosage Form', ''))
                strength_raw = clean_value(row.get('strength', ''))
                country = clean_value(row.get('country', ''))
                manufacturer_name = clean_value(row.get('manufacturer', ''))
                prescription_text = clean_value(row.get('prescription', ''))
                
                # Skip if no brand name
                if not short_name and not full_name:
                    failed += 1
                    continue
                
                # Upsert references
                mnn_id = upsert_mnn(db, mnn_name) if mnn_name else None
                dosage_form_id = upsert_dosage_form(db, dosage_form_name) if dosage_form_name else None
                
                strength_value, strength_unit_code = parse_strength(strength_raw)
                strength_unit_id = None
                if strength_unit_code:
                    strength_unit_id = upsert_unit(db, strength_unit_code, strength_unit_code)
                
                manufacturer_id = upsert_manufacturer(db, manufacturer_name, country) if manufacturer_name else None
                
                # Detect route
                route_code = detect_route(short_name, full_name, dosage_form_name)
                route_id = None
                if route_code:
                    result = db.execute(
                        text("SELECT id::text FROM ref.route WHERE code = :code"),
                        {'code': route_code}
                    ).scalar_one_or_none()
                    route_id = result
                
                rx_required = to_bool_prescription(prescription_text)
                
                # Upsert product
                product_id = upsert_medication_product(
                    db,
                    pharm_id=pharm_id,
                    brand_name=short_name or full_name,
                    registration_number=reg_code,
                    mnn_id=mnn_id,
                    dosage_form_id=dosage_form_id,
                    route_id=route_id,
                    strength_value=strength_value,
                    strength_unit_id=strength_unit_id,
                    manufacturer_id=manufacturer_id,
                    country_of_origin=country,
                    rx_required=rx_required,
                )
                
                if product_id:
                    imported += 1
                    if imported % 100 == 0:
                        db.commit()
                        logger.info(f"Imported {imported}/{len(missing_regs)} products...")
                else:
                    failed += 1
                    logger.warning(f"Failed to import: {reg_code} - {short_name or full_name}")
                    
            except Exception as e:
                db.rollback()
                failed += 1
                logger.error(f"Error importing {reg_code}: {e}")
                continue
        
        # Final commit
        db.commit()
        
        # Verify
        final_count = db.execute(text("SELECT COUNT(*) FROM ref.medication_product")).scalar()
        unique_count = db.execute(
            text("SELECT COUNT(DISTINCT registration_number) FROM ref.medication_product WHERE registration_number IS NOT NULL AND registration_number != ''")
        ).scalar()
        
        logger.info("=" * 60)
        logger.info("IMPORT COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Successfully imported: {imported:,}")
        logger.info(f"Failed: {failed:,}")
        logger.info(f"Total products in database: {final_count:,}")
        logger.info(f"Unique registration codes: {unique_count:,}")
        logger.info("=" * 60)
        
    finally:
        db.close()


if __name__ == '__main__':
    main()

