#!/usr/bin/env python3
"""
Import medication prices from Excel files into staging and reference tables.

Usage:
    python app/scripts/import_prices.py --file path/to/prices.xlsx --sheet Sheet1 --currency UZS --prefer retail [--dry-run]
"""
import argparse
import sys
import os
from pathlib import Path
import json
import logging
from typing import Dict, Any, Optional, List
import re

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from app.db.session import SessionLocal
from app.scripts.lib.normalize_med import normalize_text, to_bool_prescription

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def find_product_by_registration_number(db: Session, reg_number: str) -> Optional[str]:
    """Find product by exact registration number match."""
    normalized = normalize_text(reg_number)
    if not normalized:
        return None
    
    result = db.execute(
        text("SELECT id::text FROM ref.medication_product WHERE registration_number = :reg_num"),
        {'reg_num': normalized}
    ).scalar_one_or_none()
    
    return result


def find_product_by_pharm_id(db: Session, pharm_id: str) -> Optional[str]:
    """Find product by Pharm ID."""
    normalized = normalize_text(pharm_id)
    if not normalized:
        return None
    
    result = db.execute(
        text("SELECT id::text FROM ref.medication_product WHERE pharm_id = :pharm_id"),
        {'pharm_id': normalized}
    ).scalar_one_or_none()
    
    return result


def find_product_by_fuzzy_match(
    db: Session,
    brand_name: str,
    mnn_name: Optional[str] = None,
    pack_text: Optional[str] = None,
    threshold: float = 0.3
) -> Optional[str]:
    """
    Find product using fuzzy matching on brand_name_normalized with pg_trgm.
    
    Args:
        db: Database session
        brand_name: Brand name to match
        mnn_name: Optional MNN name for additional matching
        pack_text: Optional packaging text
        threshold: Similarity threshold (0-1)
        
    Returns:
        Product UUID or None
    """
    normalized_brand = normalize_text(brand_name).lower()
    if not normalized_brand:
        return None
    
    # Use ILIKE-based fuzzy search (pg_trgm not available)
    # Try exact match first
    query = text("""
        SELECT id::text, brand_name_normalized
        FROM ref.medication_product
        WHERE LOWER(brand_name_normalized) = LOWER(:brand_name)
        LIMIT 1
    """)
    
    result = db.execute(query, {'brand_name': normalized_brand}).fetchone()
    
    # If no exact match, try partial match
    if not result:
        query = text("""
            SELECT id::text, brand_name_normalized
            FROM ref.medication_product
            WHERE LOWER(brand_name_normalized) LIKE LOWER(:brand_name_pattern)
            ORDER BY LENGTH(brand_name_normalized)
            LIMIT 1
        """)
        
        # Use % wildcard for partial matching
        brand_pattern = f"%{normalized_brand}%"
        result = db.execute(query, {'brand_name_pattern': brand_pattern}).fetchone()
    
    if result:
        return result[0]
    
    return None


def parse_packaging(pack_text: str) -> Dict[str, Any]:
    """
    Parse packaging text to extract pack information.
    
    Returns dict with:
    - items_per_pack: int or None
    - pack_size_value: float or None
    - pack_size_unit_id: str (UUID) or None
    - gtin: str or None
    """
    if not pack_text:
        return {}
    
    pack_text = normalize_text(pack_text)
    result = {}
    
    # Extract numbers
    numbers = re.findall(r'(\d+\.?\d*)', pack_text)
    
    # Try to extract items per pack (common patterns)
    if numbers:
        # Common patterns: "10 таб", "20 капс", etc.
        if any(keyword in pack_text.lower() for keyword in ['таб', 'tab', 'капс', 'cap', 'амп', 'amp']):
            try:
                result['items_per_pack'] = int(float(numbers[0]))
            except (ValueError, IndexError):
                pass
    
    # Try to extract pack size (ml, g, etc.)
    # This is a simplified parser - can be enhanced
    
    return result


def upsert_presentation(
    db: Session,
    product_id: str,
    pack_text: Optional[str] = None,
    gtin: Optional[str] = None,
) -> Optional[str]:
    """Upsert medication presentation and return UUID."""
    pack_text_norm = normalize_text(pack_text) if pack_text else None
    gtin_norm = normalize_text(gtin) if gtin else None
    
    # Parse packaging
    pack_info = parse_packaging(pack_text) if pack_text else {}
    
    result = db.execute(
        text("""
            INSERT INTO ref.medication_presentation (
                product_id, pack_text, items_per_pack,
                pack_size_value, pack_size_unit_id, gtin
            )
            VALUES (
                CAST(:product_id AS UUID), :pack_text, :items_per_pack,
                :pack_size_value, CAST(:pack_size_unit_id AS UUID), :gtin
            )
            ON CONFLICT (product_id, COALESCE(gtin,''), COALESCE(pack_text,''))
            DO UPDATE SET
                pack_text = COALESCE(EXCLUDED.pack_text, ref.medication_presentation.pack_text),
                items_per_pack = COALESCE(EXCLUDED.items_per_pack, ref.medication_presentation.items_per_pack),
                pack_size_value = COALESCE(EXCLUDED.pack_size_value, ref.medication_presentation.pack_size_value),
                pack_size_unit_id = COALESCE(EXCLUDED.pack_size_unit_id, ref.medication_presentation.pack_size_unit_id)
            RETURNING id::text
        """),
        {
            'product_id': product_id,
            'pack_text': pack_text_norm,
            'items_per_pack': pack_info.get('items_per_pack'),
            'pack_size_value': pack_info.get('pack_size_value'),
            'pack_size_unit_id': pack_info.get('pack_size_unit_id'),
            'gtin': gtin_norm,
        }
    ).scalar_one_or_none()
    
    return result


def parse_price(price_str: Optional[str]) -> Optional[float]:
    """Parse price string to float."""
    if not price_str:
        return None
    
    # Remove currency symbols, spaces, and other non-numeric chars
    price_clean = re.sub(r'[^\d.,]', '', str(price_str))
    
    # Handle comma as decimal separator
    price_clean = price_clean.replace(',', '.')
    
    try:
        return float(price_clean)
    except ValueError:
        return None


def upsert_price(
    db: Session,
    presentation_id: str,
    price_type: str,
    currency: str,
    amount: float,
    source: Optional[str] = None,
) -> Optional[str]:
    """Upsert medication price and return UUID."""
    # Check if price already exists
    existing = db.execute(
        text("""
            SELECT id::text FROM ref.medication_price 
            WHERE presentation_id = CAST(:presentation_id AS UUID)
            AND price_type = :price_type
            AND currency = :currency
            LIMIT 1
        """),
        {
            'presentation_id': presentation_id,
            'price_type': price_type,
            'currency': currency,
        }
    ).scalar_one_or_none()
    
    if existing:
        # Update existing price
        db.execute(
            text("""
                UPDATE ref.medication_price SET
                    amount = :amount,
                    source = COALESCE(:source, source),
                    noted_at = now()
                WHERE id = CAST(:existing_id AS UUID)
            """),
            {
                'amount': amount,
                'source': source,
                'existing_id': existing,
            }
        )
        return existing
    else:
        # Insert new price
        result = db.execute(
            text("""
                INSERT INTO ref.medication_price (
                    presentation_id, price_type, currency, amount, source
                )
                VALUES (CAST(:presentation_id AS UUID), :price_type, :currency, :amount, :source)
                RETURNING id::text
            """),
            {
                'presentation_id': presentation_id,
                'price_type': price_type,
                'currency': currency,
                'amount': amount,
                'source': source,
            }
        ).scalar_one_or_none()
        
        return result


def import_prices(
    db: Session,
    file_path: Path,
    sheet_name: str = "Sheet1",
    currency: str = "UZS",
    prefer_price_type: str = "retail",
    dry_run: bool = False,
) -> Dict[str, int]:
    """
    Import prices from Excel file.
    
    Expected headers (in Russian):
    Pharm ID | Торговая марка | МНН | Производитель | Упаковка ЛП | 
    Номер регистрации | Валюта | Предельная цена | Оптовая цена (с НДС) | 
    Розничная цена (с НДС) | Условия отпуска | ИД упаковки
    """
    logger.info(f"Reading {file_path} sheet '{sheet_name}'")
    
    # Read Excel file
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)
    except Exception as e:
        logger.error(f"Failed to read Excel file: {e}")
        raise
    
    df.columns = df.columns.str.strip()
    
    stats = {
        'rows_read': len(df),
        'rows_inserted_raw': 0,
        'products_found': 0,
        'presentations_created': 0,
        'prices_inserted': 0,
        'errors': 0,
    }
    
    # Insert raw rows into staging
    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        
        # Insert into staging (skip if staging schema not accessible)
        if not dry_run:
            try:
                db.execute(
                    text("""
                        INSERT INTO staging.price_raw (source_row, src_file, src_sheet)
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
                # If staging is not accessible, rollback and continue
                if 'does not exist' in str(e) or 'UndefinedTable' in str(e) or 'InFailedSqlTransaction' in str(e):
                    db.rollback()
                    logger.warning(f"Row {idx}: Skipping staging insert (schema not accessible), continuing with import...")
                else:
                    raise
        
        try:
            # Convert NaN to empty string
            def clean_value(v):
                if pd.isna(v) or v == 'nan' or v == 'NaN' or str(v).strip() == '':
                    return ''
                return str(v).strip()
            
            # Extract fields
            pharm_id = clean_value(row_dict.get('Pharm ID', ''))
            brand_name = clean_value(row_dict.get('Торговая марка', ''))
            mnn_name = clean_value(row_dict.get('МНН', ''))
            pack_text = clean_value(row_dict.get('Упаковка ЛП', ''))
            reg_number = clean_value(row_dict.get('Номер регистрации', ''))
            currency_str = clean_value(row_dict.get('Валюта', currency))
            cap_price = clean_value(row_dict.get('Предельная цена', ''))
            wholesale_price = clean_value(row_dict.get('Оптовая цена (с НДС)', ''))
            retail_price = clean_value(row_dict.get('Розничная цена (с НДС)', ''))
            prescription_text = clean_value(row_dict.get('Условия отпуска', ''))
            gtin = clean_value(row_dict.get('ИД упаковки', ''))
            
            # Find product
            product_id = None
            
            # Priority 1: Exact registration number match
            if reg_number:
                product_id = find_product_by_registration_number(db, reg_number)
            
            # Priority 2: Pharm ID match
            if not product_id and pharm_id:
                product_id = find_product_by_pharm_id(db, pharm_id)
            
            # Priority 3: Fuzzy match on brand name
            if not product_id and brand_name:
                product_id = find_product_by_fuzzy_match(db, brand_name, mnn_name, pack_text)
            
            if not product_id:
                logger.warning(f"Row {idx}: Product not found for {brand_name or 'unknown'}")
                continue
            
            stats['products_found'] += 1
            
            # Update rx_required if prescription info is present
            if prescription_text:
                rx_required = to_bool_prescription(prescription_text)
                if not dry_run:
                    db.execute(
                        text("""
                            UPDATE ref.medication_product
                            SET rx_required = :rx_required
                            WHERE id = CAST(:product_id AS UUID) AND rx_required IS NULL
                        """),
                        {
                            'product_id': product_id,
                            'rx_required': rx_required,
                        }
                    )
            
            # Upsert presentation
            presentation_id = upsert_presentation(
                db,
                product_id=product_id,
                pack_text=pack_text,
                gtin=gtin,
            )
            
            if presentation_id:
                stats['presentations_created'] += 1
                
                # Insert prices
                prices_to_insert = []
                
                if retail_price:
                    price_val = parse_price(retail_price)
                    if price_val and price_val > 0:
                        prices_to_insert.append(('retail', price_val))
                
                if wholesale_price:
                    price_val = parse_price(wholesale_price)
                    if price_val and price_val > 0:
                        prices_to_insert.append(('wholesale', price_val))
                
                if cap_price:
                    price_val = parse_price(cap_price)
                    if price_val and price_val > 0:
                        prices_to_insert.append(('cap', price_val))
                
                # Use currency from row or default
                final_currency = normalize_text(currency_str) or currency
                
                for price_type, amount in prices_to_insert:
                    if not dry_run:
                        upsert_price(
                            db,
                            presentation_id=presentation_id,
                            price_type=price_type,
                            currency=final_currency,
                            amount=amount,
                            source=str(file_path.name),
                        )
                        stats['prices_inserted'] += 1
            
            if not dry_run and (idx + 1) % 100 == 0:
                db.commit()
                logger.info(f"Processed {idx + 1}/{len(df)} rows...")
        
        except Exception as e:
            logger.error(f"Error processing row {idx}: {e}", exc_info=True)
            stats['errors'] += 1
            continue
    
    if not dry_run:
        db.commit()
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Import medication prices from Excel')
    parser.add_argument('--file', required=True, type=Path, help='Excel file path')
    parser.add_argument('--sheet', default='Sheet1', help='Sheet name')
    parser.add_argument('--currency', default='UZS', help='Default currency code')
    parser.add_argument('--prefer', default='retail', choices=['retail', 'wholesale', 'cap'], help='Preferred price type')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no DB changes)')
    
    args = parser.parse_args()
    
    if not args.file.exists():
        logger.error(f"File not found: {args.file}")
        sys.exit(1)
    
    db = SessionLocal()
    try:
        stats = import_prices(
            db,
            args.file,
            args.sheet,
            args.currency,
            args.prefer,
            args.dry_run,
        )
        
        logger.info("=" * 60)
        logger.info("Import Summary:")
        logger.info(f"  Rows read: {stats['rows_read']}")
        logger.info(f"  Raw rows inserted: {stats['rows_inserted_raw']}")
        logger.info(f"  Products found: {stats['products_found']}")
        logger.info(f"  Presentations created: {stats['presentations_created']}")
        logger.info(f"  Prices inserted: {stats['prices_inserted']}")
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

