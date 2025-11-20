#!/usr/bin/env python3
"""
Import drug catalog from Excel files into staging and reference tables.

Usage:
    python app/scripts/import_drug_catalog.py --file path/to/catalog.xlsx --sheet Sheet1 [--dry-run]
"""
import argparse
import sys
import os
from pathlib import Path
import json
import logging
from typing import Dict, Any, Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from app.db.session import SessionLocal
from app.scripts.lib.normalize_med import (
    normalize_text,
    to_bool_prescription,
    parse_strength,
    detect_route,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def upsert_mnn(db: Session, name: str) -> Optional[str]:
    """Upsert MNN and return UUID."""
    normalized = normalize_text(name)
    if not normalized:
        return None
    
    result = db.execute(
        text("""
            INSERT INTO ref.mnn (name)
            VALUES (:name)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id::text
        """),
        {'name': normalized}
    ).scalar_one_or_none()
    
    return result


def upsert_dosage_form(db: Session, name: str) -> Optional[str]:
    """Upsert dosage form and return UUID."""
    normalized = normalize_text(name)
    if not normalized:
        return None
    
    result = db.execute(
        text("""
            INSERT INTO ref.dosage_form (name)
            VALUES (:name)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id::text
        """),
        {'name': normalized}
    ).scalar_one_or_none()
    
    return result


def upsert_unit(db: Session, code: str, name: str) -> Optional[str]:
    """Upsert unit and return UUID."""
    result = db.execute(
        text("""
            INSERT INTO ref.unit (code, name)
            VALUES (:code, :name)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id::text
        """),
        {'code': code, 'name': name}
    ).scalar_one_or_none()
    
    return result


def upsert_manufacturer(db: Session, name: str, country: Optional[str] = None) -> Optional[str]:
    """Upsert manufacturer and return UUID."""
    normalized_name = normalize_text(name)
    normalized_country = normalize_text(country) if country else None
    
    if not normalized_name:
        return None
    
    # Use the unique index on (LOWER(name), COALESCE(country, ''))
    # We need to check if exists first, then insert or update
    existing = db.execute(
        text("""
            SELECT id::text FROM ref.manufacturer 
            WHERE LOWER(name) = LOWER(:name) 
            AND COALESCE(country, '') = COALESCE(:country, '')
        """),
        {'name': normalized_name, 'country': normalized_country}
    ).scalar_one_or_none()
    
    if existing:
        return existing
    
    # Insert new manufacturer
    result = db.execute(
        text("""
            INSERT INTO ref.manufacturer (name, country)
            VALUES (:name, :country)
            RETURNING id::text
        """),
        {'name': normalized_name, 'country': normalized_country}
    ).scalar_one_or_none()
    
    return result


def upsert_category_tag(db: Session, name: str) -> Optional[str]:
    """Upsert category tag and return UUID."""
    normalized = normalize_text(name)
    if not normalized:
        return None
    
    result = db.execute(
        text("""
            INSERT INTO ref.category_tag (name)
            VALUES (:name)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id::text
        """),
        {'name': normalized}
    ).scalar_one_or_none()
    
    return result


def upsert_medication_product(
    db: Session,
    pharm_id: Optional[str],
    brand_name: str,
    registration_number: Optional[str],
    mnn_id: Optional[str],
    dosage_form_id: Optional[str],
    route_id: Optional[str],
    strength_value: Optional[float],
    strength_unit_id: Optional[str],
    manufacturer_id: Optional[str],
    country_of_origin: Optional[str],
    rx_required: Optional[bool],
) -> Optional[str]:
    """Upsert medication product and return UUID."""
    normalized_brand = normalize_text(brand_name)
    if not normalized_brand:
        return None
    
    # Build unique constraint key parts
    reg_num = normalize_text(registration_number) if registration_number else ''
    
    # Check if product exists using priority-based matching:
    # 1. If registration_number exists, it's the primary unique identifier
    # 2. If no registration_number, use brand_name + dosage_form + strength as unique identifier
    #    (this prevents incorrectly deduplicating different products with the same brand name)
    existing_id = None
    
    if reg_num:
        # Registration number is the primary unique identifier
        existing = db.execute(
            text("SELECT id::text FROM ref.medication_product WHERE registration_number = :reg_num LIMIT 1"),
            {'reg_num': reg_num}
        ).scalar_one_or_none()
        if existing:
            existing_id = existing
    else:
        # No registration number - match by brand_name + dosage_form + strength
        # This ensures we don't incorrectly deduplicate different products with same brand name
        match_conditions = ["LOWER(brand_name) = LOWER(:brand_name)"]
        match_params = {'brand_name': normalized_brand}
        
        if dosage_form_id:
            match_conditions.append("dosage_form_id = CAST(:dosage_form_id AS UUID)")
            match_params['dosage_form_id'] = dosage_form_id
        else:
            match_conditions.append("dosage_form_id IS NULL")
        
        if strength_value is not None:
            match_conditions.append("strength_value = :strength_value")
            match_params['strength_value'] = strength_value
        else:
            match_conditions.append("strength_value IS NULL")
        
        if strength_unit_id:
            match_conditions.append("strength_unit_id = CAST(:strength_unit_id AS UUID)")
            match_params['strength_unit_id'] = strength_unit_id
        else:
            match_conditions.append("strength_unit_id IS NULL")
        
        # Also ensure registration_number is NULL/empty for this match
        match_conditions.append("(registration_number IS NULL OR registration_number = '')")
        
        existing = db.execute(
            text(f"""
                SELECT id::text FROM ref.medication_product 
                WHERE {' AND '.join(match_conditions)}
                LIMIT 1
            """),
            match_params
        ).scalar_one_or_none()
        if existing:
            existing_id = existing
    
    if existing_id:
        # Update existing product
        result = db.execute(
            text("""
                UPDATE ref.medication_product SET
                    pharm_id = COALESCE(:pharm_id, pharm_id),
                    mnn_id = COALESCE(CAST(:mnn_id AS UUID), mnn_id),
                    dosage_form_id = COALESCE(CAST(:dosage_form_id AS UUID), dosage_form_id),
                    route_id = COALESCE(CAST(:route_id AS UUID), route_id),
                    strength_value = COALESCE(:strength_value, strength_value),
                    strength_unit_id = COALESCE(CAST(:strength_unit_id AS UUID), strength_unit_id),
                    manufacturer_id = COALESCE(CAST(:manufacturer_id AS UUID), manufacturer_id),
                    country_of_origin = COALESCE(:country_of_origin, country_of_origin),
                    rx_required = COALESCE(:rx_required, rx_required),
                    updated_at = now()
                WHERE id = CAST(:existing_id AS UUID)
                RETURNING id::text
            """),
            {
                'pharm_id': normalize_text(pharm_id) if pharm_id else None,
                'mnn_id': mnn_id if mnn_id else None,
                'dosage_form_id': dosage_form_id if dosage_form_id else None,
                'route_id': route_id if route_id else None,
                'strength_value': strength_value,
                'strength_unit_id': strength_unit_id if strength_unit_id else None,
                'manufacturer_id': manufacturer_id if manufacturer_id else None,
                'country_of_origin': normalize_text(country_of_origin) if country_of_origin else None,
                'rx_required': rx_required,
                'existing_id': existing_id,
            }
        ).scalar_one_or_none()
        return existing_id  # Return existing ID after update
    else:
        # Insert new product
        result = db.execute(
            text("""
                INSERT INTO ref.medication_product (
                    pharm_id, brand_name, registration_number,
                    mnn_id, dosage_form_id, route_id,
                    strength_value, strength_unit_id,
                    manufacturer_id, country_of_origin, rx_required
                )
                VALUES (
                    :pharm_id, :brand_name, :registration_number,
                    CAST(:mnn_id AS UUID), CAST(:dosage_form_id AS UUID), CAST(:route_id AS UUID),
                    :strength_value, CAST(:strength_unit_id AS UUID),
                    CAST(:manufacturer_id AS UUID), :country_of_origin, :rx_required
                )
                RETURNING id::text
            """),
            {
                'pharm_id': normalize_text(pharm_id) if pharm_id else None,
                'brand_name': normalized_brand,
                'registration_number': reg_num if reg_num else None,
                'mnn_id': mnn_id,
                'dosage_form_id': dosage_form_id,
                'route_id': route_id,
                'strength_value': strength_value,
                'strength_unit_id': strength_unit_id,
                'manufacturer_id': manufacturer_id,
                'country_of_origin': normalize_text(country_of_origin) if country_of_origin else None,
                'rx_required': rx_required,
            }
        ).scalar_one_or_none()
        return result


def import_catalog(
    db: Session,
    file_path: Path,
    sheet_name: str = "Sheet1",
    dry_run: bool = False,
) -> Dict[str, int]:
    """
    Import drug catalog from Excel file.
    
    Expected headers:
    ID | short Name | full Name | mnn | dosage Form | strength | country | manufacturer | registration Code | prescription | pharma Cotherapeutic Group
    """
    logger.info(f"Reading {file_path} sheet '{sheet_name}'")
    
    # Read Excel file
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)
    except Exception as e:
        logger.error(f"Failed to read Excel file: {e}")
        raise
    
    # Normalize column names (handle variations)
    df.columns = df.columns.str.strip()
    
    # Required columns mapping
    required_cols = {
        'ID': 'ID',
        'short Name': 'short Name',
        'full Name': 'full Name',
        'mnn': 'mnn',
        'dosage Form': 'dosage Form',
        'strength': 'strength',
        'country': 'country',
        'manufacturer': 'manufacturer',
        'registration Code': 'registration Code',
        'prescription': 'prescription',
        'pharma Cotherapeutic Group': 'pharma Cotherapeutic Group',
    }
    
    # Check for missing columns
    missing = [col for col in required_cols.values() if col not in df.columns]
    if missing:
        logger.warning(f"Missing columns: {missing}")
        logger.info(f"Available columns: {list(df.columns)}")
    
    stats = {
        'rows_read': len(df),
        'rows_inserted_raw': 0,
        'products_inserted': 0,
        'products_updated': 0,
        'synonyms_inserted': 0,
        'categories_linked': 0,
        'errors': 0,
    }
    
    # Insert raw rows into staging
    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        
        # Insert into staging (skip if staging schema not accessible - will import directly)
        if not dry_run:
            try:
                # Try to insert into staging
                db.execute(
                    text("""
                        INSERT INTO staging.drug_catalog_raw (source_row, src_file, src_sheet)
                        VALUES (:source_row, :src_file, :src_sheet)
                    """),
                    {
                        'source_row': json.dumps(row_dict, ensure_ascii=False),
                        'src_file': str(file_path.name),
                        'src_sheet': sheet_name,
                    }
                )
                stats['rows_inserted_raw'] += 1
            except Exception as e:
                # If staging is not accessible, rollback the failed transaction and continue
                if 'does not exist' in str(e) or 'UndefinedTable' in str(e) or 'InFailedSqlTransaction' in str(e):
                    db.rollback()
                    logger.warning(f"Row {idx}: Skipping staging insert (schema not accessible), continuing with import...")
                else:
                    raise
        
        # Process row
        try:
            # Convert NaN to empty string
            def clean_value(v):
                if pd.isna(v) or v == 'nan' or v == 'NaN' or str(v).strip() == '':
                    return ''
                return str(v).strip()
            
            pharm_id = clean_value(row_dict.get('ID', ''))
            short_name = clean_value(row_dict.get('short Name', ''))
            full_name = clean_value(row_dict.get('full Name', ''))
            mnn_name = clean_value(row_dict.get('mnn', ''))
            dosage_form_name = clean_value(row_dict.get('dosage Form', ''))
            strength_raw = clean_value(row_dict.get('strength', ''))
            country = clean_value(row_dict.get('country', ''))
            manufacturer_name = clean_value(row_dict.get('manufacturer', ''))
            registration_code = clean_value(row_dict.get('registration Code', ''))
            prescription_text = clean_value(row_dict.get('prescription', ''))
            category_group = clean_value(row_dict.get('pharma Cotherapeutic Group', ''))
            
            # Upsert references
            mnn_id = upsert_mnn(db, mnn_name) if mnn_name else None
            dosage_form_id = upsert_dosage_form(db, dosage_form_name) if dosage_form_name else None
            
            # Parse strength
            strength_value, strength_unit_code = parse_strength(strength_raw)
            strength_unit_id = None
            if strength_unit_code:
                strength_unit_id = upsert_unit(db, strength_unit_code, strength_unit_code)
            
            manufacturer_id = upsert_manufacturer(db, manufacturer_name, country) if manufacturer_name else None
            
            # Detect route
            route_id = None
            route_code = detect_route(short_name, full_name, dosage_form_name)
            if route_code:
                result = db.execute(
                    text("SELECT id::text FROM ref.route WHERE code = :code"),
                    {'code': route_code}
                ).scalar_one_or_none()
                route_id = result
            
            # Rx requirement
            rx_required = to_bool_prescription(prescription_text)
            
            # Upsert product
            product_id = upsert_medication_product(
                db,
                pharm_id=pharm_id,
                brand_name=short_name or full_name,
                registration_number=registration_code,
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
                # Insert synonym if full_name exists and different
                if full_name and normalize_text(full_name) != normalize_text(short_name):
                    if not dry_run:
                        db.execute(
                            text("""
                                INSERT INTO ref.medication_product_synonym (product_id, name, lang)
                                VALUES (CAST(:product_id AS UUID), :name, 'ru')
                                ON CONFLICT DO NOTHING
                            """),
                            {
                                'product_id': product_id,
                                'name': normalize_text(full_name),
                            }
                        )
                        stats['synonyms_inserted'] += 1
                
                # Link category
                if category_group:
                    category_id = upsert_category_tag(db, category_group)
                    if category_id and not dry_run:
                        db.execute(
                            text("""
                                INSERT INTO ref.medication_product_category (product_id, category_id)
                                VALUES (CAST(:product_id AS UUID), CAST(:category_id AS UUID))
                                ON CONFLICT DO NOTHING
                            """),
                            {
                                'product_id': product_id,
                                'category_id': category_id,
                            }
                        )
                        stats['categories_linked'] += 1
                
                stats['products_inserted'] += 1
            else:
                # Product was skipped - log for debugging
                logger.warning(f"Row {idx}: Product skipped - brand_name: '{short_name or full_name}', registration: '{registration_code}'")
                stats['errors'] += 1
            
            if not dry_run and (idx + 1) % 100 == 0:
                db.commit()
                logger.info(f"Processed {idx + 1}/{len(df)} rows...")
        
        except Exception as e:
            # Rollback on error and continue
            try:
                db.rollback()
            except:
                pass
            logger.error(f"Error processing row {idx}: {e}")
            stats['errors'] += 1
            continue
    
    if not dry_run:
        db.commit()
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Import drug catalog from Excel')
    parser.add_argument('--file', required=True, type=Path, help='Excel file path')
    parser.add_argument('--sheet', default='Sheet1', help='Sheet name')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no DB changes)')
    
    args = parser.parse_args()
    
    if not args.file.exists():
        logger.error(f"File not found: {args.file}")
        sys.exit(1)
    
    db = SessionLocal()
    try:
        stats = import_catalog(db, args.file, args.sheet, args.dry_run)
        
        logger.info("=" * 60)
        logger.info("Import Summary:")
        logger.info(f"  Rows read: {stats['rows_read']}")
        logger.info(f"  Raw rows inserted: {stats['rows_inserted_raw']}")
        logger.info(f"  Products inserted/updated: {stats['products_inserted']}")
        logger.info(f"  Synonyms inserted: {stats['synonyms_inserted']}")
        logger.info(f"  Categories linked: {stats['categories_linked']}")
        logger.info(f"  Errors: {stats['errors']}")
        
        if args.dry_run:
            logger.info("DRY RUN - No changes committed")
        
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()

