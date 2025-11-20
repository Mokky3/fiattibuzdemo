#!/usr/bin/env python3
"""
Import all drug catalog Excel files into the database.

Usage:
    python import_all_drug_files.py [--dry-run]
"""
import argparse
import sys
import glob
from pathlib import Path
import logging

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.scripts.import_drug_catalog import import_catalog

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Import all drug catalog Excel files')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no DB changes)')
    parser.add_argument('--sheet', default='Drugs List', help='Sheet name (default: "Drugs List")')
    
    args = parser.parse_args()
    
    # Find all drug catalog files
    meds_dir = Path(__file__).resolve().parent.parent / "meds" / "list"
    if not meds_dir.exists():
        logger.error(f"Directory not found: {meds_dir}")
        sys.exit(1)
    
    # Find all Excel files matching drugs*.xlsx
    drug_files = sorted(glob.glob(str(meds_dir / "drugs*.xlsx")))
    
    if not drug_files:
        logger.error(f"No drug catalog files found in {meds_dir}")
        sys.exit(1)
    
    logger.info(f"Found {len(drug_files)} drug catalog files")
    logger.info("=" * 60)
    
    db = SessionLocal()
    total_stats = {
        'files_processed': 0,
        'files_failed': 0,
        'total_rows_read': 0,
        'total_products_inserted': 0,
        'total_synonyms_inserted': 0,
        'total_categories_linked': 0,
        'total_errors': 0,
    }
    
    try:
        for file_path in drug_files:
            file_name = Path(file_path).name
            logger.info("")
            logger.info("=" * 60)
            logger.info(f"Processing: {file_name}")
            logger.info("=" * 60)
            
            try:
                stats = import_catalog(db, Path(file_path), args.sheet, args.dry_run)
                
                if not args.dry_run:
                    db.commit()
                    logger.info(f"✓ Successfully imported {file_name}")
                else:
                    logger.info(f"✓ Dry run completed for {file_name}")
                
                total_stats['files_processed'] += 1
                total_stats['total_rows_read'] += stats['rows_read']
                total_stats['total_products_inserted'] += stats['products_inserted']
                total_stats['total_synonyms_inserted'] += stats['synonyms_inserted']
                total_stats['total_categories_linked'] += stats['categories_linked']
                total_stats['total_errors'] += stats['errors']
                
                logger.info(f"  Rows read: {stats['rows_read']:,}")
                logger.info(f"  Products inserted/updated: {stats['products_inserted']:,}")
                logger.info(f"  Synonyms inserted: {stats['synonyms_inserted']:,}")
                logger.info(f"  Categories linked: {stats['categories_linked']:,}")
                logger.info(f"  Errors: {stats['errors']:,}")
                
            except Exception as e:
                db.rollback()
                logger.error(f"✗ Failed to import {file_name}: {e}", exc_info=True)
                total_stats['files_failed'] += 1
                continue
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("IMPORT SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Files processed: {total_stats['files_processed']:,}")
        logger.info(f"Files failed: {total_stats['files_failed']:,}")
        logger.info(f"Total rows read: {total_stats['total_rows_read']:,}")
        logger.info(f"Total products inserted/updated: {total_stats['total_products_inserted']:,}")
        logger.info(f"Total synonyms inserted: {total_stats['total_synonyms_inserted']:,}")
        logger.info(f"Total categories linked: {total_stats['total_categories_linked']:,}")
        logger.info(f"Total errors: {total_stats['total_errors']:,}")
        logger.info("=" * 60)
        
        if args.dry_run:
            logger.info("DRY RUN - No changes committed")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()

