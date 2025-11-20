#!/usr/bin/env python3
"""
Import ICD-11 codes from Excel files.

This script imports ICD-11 codes from multilingual Excel files:
- SimpleTabulation-ICD-11-MMS-en.xlsx (English)
- SimpleTabulation-ICD-11-MMS-ru.xlsx (Russian)
- SimpleTabulation-ICD-11-MMS-uz.xlsx (Uzbek)

Usage:
    python scripts/import_icd11.py [--dry-run] [--language en|ru|uz|all]
"""
import argparse
import sys
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple
import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db.session import SessionLocal
from app.db.models.ref import IcdCode

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def extract_icd11_code_from_url(code_value: any) -> Optional[str]:
    """
    Extract ICD-11 code from Foundation Linearization Code URL.
    Example: http://id.who.int/icd/entity/123456789 -> 123456789
    Or it might already be just the code: XD6UU3
    """
    if pd.isna(code_value) or code_value is None:
        return None
    
    code_str = str(code_value).strip()
    if not code_str:
        return None
    
    # If it's a URL, extract the entity ID
    if 'http://id.who.int/icd/entity/' in code_str:
        # Extract the code after the entity/ part
        parts = code_str.split('/entity/')
        if len(parts) > 1:
            code = parts[-1].split('/')[0].split('?')[0]  # Remove any query params or trailing paths
            return code.strip()
    
    # If it's already just a code (like XD6UU3), return as-is
    # ICD-11 codes can be alphanumeric like: XD6UU3, AB12.3, etc.
    return code_str


def normalize_text(text: any) -> Optional[str]:
    """Normalize text description."""
    if pd.isna(text) or text is None:
        return None
    text_str = str(text).strip()
    return text_str if text_str else None


def detect_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Detect column names that might represent ICD code and description.
    Returns a dict with keys: code, description, description_en, category, chapter, parent, level
    """
    columns_lower = {col.lower(): col for col in df.columns}
    columns_orig = {col: col for col in df.columns}
    
    # ICD-11 Excel structure:
    # - "Foundatio Linearizati Code" contains the code (URL format: http://id.who.int/icd/entity/...)
    # - "TitleEN" is English description
    # - "Title" is localized description (uz/ru)
    # - "ChapterNo" is chapter number
    # - "DepthInKi IsResidual" contains depth/level (first part) and IsResidual (second part)
    # - "ClassKind" indicates type (chapter, block, etc.)
    
    code_col = None
    # Look for Foundation Linearization Code (may be truncated in Excel)
    for col in df.columns:
        col_lower = col.lower()
        if 'foundatio' in col_lower or 'linearizati' in col_lower or 'linearization' in col_lower:
            code_col = col
            break
    # Fallback to common variations
    if not code_col:
        for possible in ['code', 'id', 'identifier', 'код', 'код_мкб', 'icd_code', 'icd11_code']:
            if possible in columns_lower:
                code_col = columns_lower[possible]
                break
    
    # English title
    desc_en_col = None
    if 'titleen' in columns_lower:
        desc_en_col = columns_lower['titleen']
    elif 'title_en' in columns_lower:
        desc_en_col = columns_lower['title_en']
    
    # Localized title (Title column - will be ru for ru file, uz for uz file)
    desc_col = None
    if 'title' in columns_lower and desc_en_col != columns_lower.get('title'):
        desc_col = columns_lower['title']
    
    # Fallback to common variations
    if not desc_col:
        for possible in ['title', 'description', 'term', 'name', 'название', 'описание', 'nom', 'nomi', 'ta\'rif', 'ta\'rifi']:
            if possible in columns_lower and possible != 'titleen':
                desc_col = columns_lower[possible]
                break
    
    # Chapter number
    chapter_col = None
    if 'chapterno' in columns_lower:
        chapter_col = columns_lower['chapterno']
    elif 'chapter_no' in columns_lower:
        chapter_col = columns_lower['chapter_no']
    elif 'chapter' in columns_lower:
        chapter_col = columns_lower['chapter']
    
    # Depth/Level (first part of "DepthInKi IsResidual")
    level_col = None
    for col in df.columns:
        col_lower = col.lower()
        if 'depthinki' in col_lower or 'depthinkind' in col_lower or 'depth' in col_lower:
            level_col = col
            break
    
    # Category/ClassKind
    category_col = None
    if 'classkind' in columns_lower:
        category_col = columns_lower['classkind']
    elif 'class_kind' in columns_lower:
        category_col = columns_lower['class_kind']
    
    # Parent code (may not be in Excel, but check)
    parent_col = None
    for possible in ['parent', 'parent_code', 'parent_id', 'parent code', 'родитель', 'ota', 'ota kod']:
        if possible in columns_lower:
            parent_col = columns_lower[possible]
            break
    
    return {
        'code': code_col,
        'description': desc_col,
        'description_en': desc_en_col,
        'category': category_col,
        'chapter': chapter_col,
        'parent': parent_col,
        'level': level_col
    }


def import_icd11_file(
    db: Session,
    file_path: Path,
    language: str,
    dry_run: bool = False
) -> Dict[str, int]:
    """
    Import ICD-11 codes from a single Excel file.
    
    Args:
        db: Database session
        file_path: Path to Excel file
        language: Language code (en, ru, uz)
        dry_run: If True, don't commit changes
        
    Returns:
        Statistics dictionary
    """
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return {'error': 1, 'rows_read': 0, 'rows_inserted': 0, 'rows_updated': 0}
    
    logger.info(f"Reading {file_path} (language: {language})")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path, dtype=str, keep_default_na=False)
        logger.info(f"Read {len(df)} rows from Excel file")
    except Exception as e:
        logger.error(f"Failed to read Excel file: {e}")
        return {'error': 1, 'rows_read': 0, 'rows_inserted': 0, 'rows_updated': 0}
    
    # Detect columns
    col_map = detect_columns(df)
    logger.info(f"Detected columns: {col_map}")
    
    if not col_map['code']:
        logger.error("Could not detect code column. Available columns: " + ", ".join(df.columns))
        return {'error': 1, 'rows_read': 0, 'rows_inserted': 0, 'rows_updated': 0}
    
    # Description is optional if we have description_en
    if not col_map['description'] and not col_map.get('description_en'):
        logger.error("Could not detect description or description_en column. Available columns: " + ", ".join(df.columns))
        return {'error': 1, 'rows_read': 0, 'rows_inserted': 0, 'rows_updated': 0}
    
    stats = {
        'rows_read': len(df),
        'rows_inserted': 0,
        'rows_updated': 0,
        'rows_skipped': 0,
        'errors': 0
    }
    
    # Track codes in current batch to avoid duplicates within batch
    batch_codes = {}
    batch_size = 500  # Smaller batches for better error recovery
    
    # Process each row
    for idx, row in df.iterrows():
        try:
            # Extract ICD code from Foundation Linearization Code column
            code_raw = row.get(col_map['code']) if col_map['code'] else None
            code = extract_icd11_code_from_url(code_raw)
            if not code:
                stats['rows_skipped'] += 1
                continue
            
            # Get English description
            description_en = normalize_text(row.get(col_map['description_en'])) if col_map.get('description_en') else None
            
            # Get localized description (Title column)
            description = normalize_text(row.get(col_map['description'])) if col_map.get('description') else None
            
            # Use localized description if English not available
            if not description_en and description:
                description_en = description
            
            # For language-specific imports, set the appropriate description
            if language == 'en':
                final_description = description_en or description or f"ICD-11 Code {code}"  # Fallback to code
            elif language == 'ru':
                final_description = description or description_en or f"ICD-11 Code {code}"  # Russian from Title column, fallback to EN
            elif language == 'uz':
                final_description = description or description_en or f"ICD-11 Code {code}"  # Uzbek from Title column, fallback to EN
            else:
                final_description = description_en or description or f"ICD-11 Code {code}"
            
            # Always use description_en as fallback for final_description to ensure NOT NULL constraint is met
            if not final_description or final_description == f"ICD-11 Code {code}":
                # Try to get any available description
                if description_en:
                    final_description = description_en
                elif description:
                    final_description = description
                else:
                    # Last resort: use the code as description
                    final_description = f"ICD-11 Code {code}"
                    logger.warning(f"Row {idx + 1}: No description found for code {code}, using code as description")
            
            # Ensure description_en is set for backward compatibility
            if not description_en:
                description_en = final_description
            
            category = normalize_text(row.get(col_map['category'])) if col_map.get('category') else None
            
            # Chapter number from ChapterNo column
            chapter = None
            if col_map.get('chapter'):
                chapter_val = row.get(col_map['chapter'])
                chapter = normalize_text(chapter_val)
            
            parent_code = None
            if col_map.get('parent'):
                parent_raw = row.get(col_map['parent'])
                parent_code = extract_icd11_code_from_url(parent_raw) if parent_raw else None
            
            # Level from "DepthInKi IsResidual" - extract the first part (depth)
            level = None
            if col_map.get('level'):
                level_val = row.get(col_map['level'])
                # Handle case where column contains "depth isresidual" (two values)
                if level_val:
                    level_str = str(level_val).strip()
                    # Try to extract just the numeric part if it's combined with boolean
                    # Format might be "1 False" or just "1"
                    parts = level_str.split()
                    if parts:
                        try:
                            level = int(float(parts[0]))
                        except (ValueError, TypeError):
                            pass
            
            # Check if code already exists for ICD-11 using raw SQL to avoid transaction state issues
            existing_id = None
            try:
                result = db.execute(
                    text("""
                        SELECT id FROM ref.icd_codes 
                        WHERE code = :code AND version = :version 
                        LIMIT 1
                    """),
                    {'code': code, 'version': 'ICD-11'}
                )
                row_result = result.fetchone()
                existing_id = row_result[0] if row_result else None
            except Exception as check_error:
                # If transaction is in error state, rollback and retry
                if 'InFailedSqlTransaction' in str(type(check_error).__name__) or 'current transaction is aborted' in str(check_error).lower():
                    db.rollback()
                    # Retry the check
                    try:
                        result = db.execute(
                            text("""
                                SELECT id FROM ref.icd_codes 
                                WHERE code = :code AND version = :version 
                                LIMIT 1
                            """),
                            {'code': code, 'version': 'ICD-11'}
                        )
                        row_result = result.fetchone()
                        existing_id = row_result[0] if row_result else None
                    except Exception as retry_error:
                        logger.error(f"Row {idx + 1}: Error checking existing code {code}: {retry_error}")
                        stats['errors'] += 1
                        continue
                else:
                    logger.error(f"Row {idx + 1}: Error checking existing code {code}: {check_error}")
                    stats['errors'] += 1
                    continue
            
            # Check if this code is already in the current batch (duplicate within file)
            # For duplicates in the same file, we should use the ON CONFLICT logic which will update
            # the existing record with the new language data, so we don't skip - just continue
            # The ON CONFLICT will handle the update automatically
            if code in batch_codes:
                # Duplicate code in same file - log but don't skip, let ON CONFLICT handle it
                if (idx + 1) % 1000 == 0:  # Only log every 1000th duplicate to reduce noise
                    logger.debug(f"Row {idx + 1}: Duplicate code {code} in same file - will update via ON CONFLICT")
                # Continue processing - ON CONFLICT will update the record
                # Don't increment skipped since we're still processing it
            
            if existing_id:
                # Fetch existing record for update
                try:
                    existing = db.query(IcdCode).filter(IcdCode.id == existing_id).first()
                except Exception as fetch_error:
                    if 'InFailedSqlTransaction' in str(type(fetch_error).__name__) or 'current transaction is aborted' in str(fetch_error).lower():
                        db.rollback()
                        existing = db.query(IcdCode).filter(IcdCode.id == existing_id).first()
                    else:
                        logger.error(f"Row {idx + 1}: Error fetching existing record: {fetch_error}")
                        stats['errors'] += 1
                        continue
                # Update existing record with language-specific description
                updated = False
                
                # Always update description for backward compatibility (use final_description or fallback to existing)
                if final_description:
                    existing.description = final_description
                    updated = True
                
                # Update language-specific descriptions
                if language == 'en' and final_description:
                    if existing.description_en != final_description:
                        existing.description_en = final_description
                        updated = True
                elif language == 'ru' and final_description:
                    if existing.description_ru != final_description:
                        existing.description_ru = final_description
                        updated = True
                elif language == 'uz' and final_description:
                    if existing.description_uz != final_description:
                        existing.description_uz = final_description
                        updated = True
                
                # Update metadata fields if provided
                if category and existing.category != category:
                    existing.category = category
                    updated = True
                if chapter and existing.chapter != chapter:
                    existing.chapter = chapter
                    updated = True
                if parent_code and existing.parent_code != parent_code:
                    existing.parent_code = parent_code
                    updated = True
                if level is not None and existing.level != level:
                    existing.level = level
                    updated = True
                
                # Always count as updated if we made any changes, otherwise it's already up to date
                if updated:
                    stats['rows_updated'] += 1
                else:
                    # Record exists and is already up to date - this is fine, don't count as skipped
                    stats['rows_updated'] += 1  # Count as updated even if no changes (already has data)
            else:
                # Use PostgreSQL ON CONFLICT for safer upsert
                try:
                    # Try insert with ON CONFLICT DO UPDATE
                    # Ensure description is populated for backward compatibility (NOT NULL constraint)
                    description_value = final_description if language == 'en' else (description_en if language != 'en' else final_description)
                    
                    result = db.execute(
                        text("""
                            INSERT INTO ref.icd_codes (
                                code, version, description, description_en, description_ru, description_uz,
                                category, chapter, parent_code, level, is_active
                            )
                            VALUES (
                                :code, :version, :description,
                                :description_en, :description_ru, :description_uz,
                                :category, :chapter, :parent_code, :level, :is_active
                            )
                            ON CONFLICT (code, version) 
                            DO UPDATE SET
                                description = COALESCE(EXCLUDED.description, ref.icd_codes.description,
                                    COALESCE(EXCLUDED.description_en, EXCLUDED.description_ru, EXCLUDED.description_uz, ref.icd_codes.description)),
                                description_en = CASE 
                                    WHEN EXCLUDED.description_en IS NOT NULL THEN EXCLUDED.description_en 
                                    ELSE ref.icd_codes.description_en 
                                END,
                                description_ru = CASE 
                                    WHEN EXCLUDED.description_ru IS NOT NULL THEN EXCLUDED.description_ru 
                                    ELSE ref.icd_codes.description_ru 
                                END,
                                description_uz = CASE 
                                    WHEN EXCLUDED.description_uz IS NOT NULL THEN EXCLUDED.description_uz 
                                    ELSE ref.icd_codes.description_uz 
                                END,
                                category = COALESCE(EXCLUDED.category, ref.icd_codes.category),
                                chapter = COALESCE(EXCLUDED.chapter, ref.icd_codes.chapter),
                                parent_code = COALESCE(EXCLUDED.parent_code, ref.icd_codes.parent_code),
                                level = COALESCE(EXCLUDED.level, ref.icd_codes.level)
                            RETURNING id
                        """),
                        {
                            'code': code,
                            'version': 'ICD-11',
                            'description': description_value,  # Backward compatibility
                            'description_en': final_description if language == 'en' else (description_en if language != 'en' else None),
                            'description_ru': final_description if language == 'ru' else None,
                            'description_uz': final_description if language == 'uz' else None,
                            'category': category,
                            'chapter': chapter,
                            'parent_code': parent_code,
                            'level': level,
                            'is_active': True
                        }
                    )
                    result_id = result.scalar_one_or_none()
                    if result_id:
                        # Check if this was an insert or update by checking if existing_id was None
                        if not existing_id:
                            stats['rows_inserted'] += 1
                        else:
                            stats['rows_updated'] += 1
                        batch_codes[code] = result_id
                except Exception as sql_error:
                    # Check if transaction is in error state
                    if 'InFailedSqlTransaction' in str(type(sql_error).__name__) or 'current transaction is aborted' in str(sql_error).lower():
                        db.rollback()
                        # Retry with raw SQL after rollback
                        try:
                            # Ensure description is populated for backward compatibility
                            description_value_retry = final_description if language == 'en' else (description_en if language != 'en' else final_description)
                            
                            result = db.execute(
                                text("""
                                    INSERT INTO ref.icd_codes (
                                        code, version, description, description_en, description_ru, description_uz,
                                        category, chapter, parent_code, level, is_active
                                    )
                                    VALUES (
                                        :code, :version, :description,
                                        :description_en, :description_ru, :description_uz,
                                        :category, :chapter, :parent_code, :level, :is_active
                                    )
                                    ON CONFLICT (code, version) 
                                    DO UPDATE SET
                                        description = COALESCE(EXCLUDED.description, ref.icd_codes.description,
                                            COALESCE(EXCLUDED.description_en, EXCLUDED.description_ru, EXCLUDED.description_uz, ref.icd_codes.description)),
                                        description_en = CASE 
                                            WHEN EXCLUDED.description_en IS NOT NULL THEN EXCLUDED.description_en 
                                            ELSE ref.icd_codes.description_en 
                                        END,
                                        description_ru = CASE 
                                            WHEN EXCLUDED.description_ru IS NOT NULL THEN EXCLUDED.description_ru 
                                            ELSE ref.icd_codes.description_ru 
                                        END,
                                        description_uz = CASE 
                                            WHEN EXCLUDED.description_uz IS NOT NULL THEN EXCLUDED.description_uz 
                                            ELSE ref.icd_codes.description_uz 
                                        END,
                                        category = COALESCE(EXCLUDED.category, ref.icd_codes.category),
                                        chapter = COALESCE(EXCLUDED.chapter, ref.icd_codes.chapter),
                                        parent_code = COALESCE(EXCLUDED.parent_code, ref.icd_codes.parent_code),
                                        level = COALESCE(EXCLUDED.level, ref.icd_codes.level)
                                    RETURNING id
                                """),
                                {
                                    'code': code,
                                    'version': 'ICD-11',
                                    'description': description_value_retry,  # Backward compatibility
                                    'description_en': final_description if language == 'en' else (description_en if language != 'en' else None),
                                    'description_ru': final_description if language == 'ru' else None,
                                    'description_uz': final_description if language == 'uz' else None,
                                    'category': category,
                                    'chapter': chapter,
                                    'parent_code': parent_code,
                                    'level': level,
                                    'is_active': True
                                }
                            )
                            result_id = result.scalar_one_or_none()
                            if result_id:
                                stats['rows_inserted'] += 1
                                batch_codes[code] = result_id
                        except Exception as retry_error:
                            logger.error(f"Row {idx + 1}: Error after rollback retry for code {code}: {retry_error}")
                            stats['errors'] += 1
                    else:
                        # Other error - fallback to ORM
                        logger.warning(f"Row {idx + 1}: Direct SQL upsert failed, using ORM: {sql_error}")
                        try:
                            # Ensure description is populated for backward compatibility
                            description_value_orm = final_description if language == 'en' else (description_en if language != 'en' else final_description)
                            
                            new_code = IcdCode(
                                code=code,
                                version="ICD-11",
                                description=description_value_orm,  # Backward compatibility
                                description_en=final_description if language == 'en' else (description_en if language != 'en' else None),
                                description_ru=final_description if language == 'ru' else None,
                                description_uz=final_description if language == 'uz' else None,
                                category=category,
                                chapter=chapter,
                                parent_code=parent_code,
                                level=level,
                                is_active=True
                            )
                            db.add(new_code)
                            batch_codes[code] = new_code
                            stats['rows_inserted'] += 1
                        except Exception as orm_error:
                            logger.error(f"Row {idx + 1}: Error with ORM fallback for code {code}: {orm_error}")
                            stats['errors'] += 1
                            db.rollback()  # Rollback on ORM error too
            
            # Commit in smaller batches for better error recovery
            if (idx + 1) % batch_size == 0 and not dry_run:
                try:
                    db.commit()
                    batch_codes.clear()  # Clear batch tracking after successful commit
                    logger.info(f"Processed {idx + 1} rows... (inserted: {stats['rows_inserted']}, updated: {stats['rows_updated']}, errors: {stats['errors']})")
                except Exception as commit_error:
                    # Rollback on any commit error
                    error_msg = str(commit_error).lower()
                    if 'current transaction is aborted' in error_msg or 'InFailedSqlTransaction' in str(type(commit_error).__name__):
                        logger.error(f"Row {idx + 1}: Transaction in error state during batch commit - rolling back")
                    else:
                        logger.error(f"Row {idx + 1}: Error committing batch: {commit_error}")
                    try:
                        db.rollback()
                    except:
                        pass
                    stats['errors'] += 1
                    batch_codes.clear()  # Clear batch tracking after rollback
                except IntegrityError as ie:
                    # Handle unique constraint violations during batch commit
                    db.rollback()
                    code_raw = row.get(col_map['code']) if col_map.get('code') else None
                    code_val = extract_icd11_code_from_url(code_raw) if code_raw else 'unknown'
                    logger.warning(f"Row {idx + 1}: Unique constraint violation during batch commit for code {code_val} - retrying row as update")
                    
                    # Retry this row as an update
                    try:
                        existing = db.query(IcdCode).filter(
                            IcdCode.code == code_val,
                            IcdCode.version == "ICD-11"
                        ).first()
                        
                        if existing:
                            description = normalize_text(row.get(col_map['description'])) if col_map.get('description') else None
                            if description:
                                if language == 'en':
                                    existing.description_en = description
                                elif language == 'ru':
                                    existing.description_ru = description
                                elif language == 'uz':
                                    existing.description_uz = description
                            
                            # Update other fields
                            category = normalize_text(row.get(col_map['category'])) if col_map.get('category') else None
                            chapter = normalize_text(row.get(col_map['chapter'])) if col_map.get('chapter') else category
                            parent_raw = row.get(col_map['parent']) if col_map.get('parent') else None
                            parent_code = extract_icd11_code_from_url(parent_raw) if parent_raw else None
                            
                            if category:
                                existing.category = category
                            if chapter:
                                existing.chapter = chapter
                            if parent_code:
                                existing.parent_code = parent_code
                            
                            if col_map.get('level'):
                                level_val = row.get(col_map['level'])
                                try:
                                    level = int(float(level_val)) if level_val and str(level_val).strip() else None
                                    if level is not None:
                                        existing.level = level
                                except (ValueError, TypeError):
                                    pass
                            
                            db.commit()
                            stats['rows_updated'] += 1
                            stats['rows_inserted'] -= 1  # Adjust count since this was counted as insert
                        else:
                            stats['errors'] += 1
                            stats['rows_inserted'] -= 1  # Adjust count
                    except Exception as e2:
                        logger.error(f"Row {idx + 1}: Failed to update existing record after rollback: {e2}")
                        stats['errors'] += 1
                        stats['rows_inserted'] -= 1  # Adjust count
                    batch_codes.clear()  # Clear batch tracking after rollback
                
        except Exception as e:
            code_raw = row.get(col_map.get('code', '')) if col_map.get('code') else None
            code_val = extract_icd11_code_from_url(code_raw) if code_raw else 'unknown'
            logger.error(f"Error processing row {idx + 1} (code: {code_val}): {e}")
            stats['errors'] += 1
            # Rollback on any error to reset transaction state
            try:
                db.rollback()
            except Exception as rollback_error:
                # If rollback fails, we're in a bad state - log and continue
                logger.error(f"Row {idx + 1}: Failed to rollback transaction: {rollback_error}")
            continue
    
    # Final commit (if any remaining changes)
    if not dry_run:
        try:
            db.commit()
            batch_codes.clear()
            logger.info(f"Final commit: {stats['rows_inserted']} inserts and {stats['rows_updated']} updates")
        except IntegrityError as ie:
            # Handle final commit errors - try to process remaining rows individually
            logger.warning(f"Error in final commit - processing remaining rows individually")
            db.rollback()
            # Note: This is a fallback - ideally batches should prevent this
            logger.error("Some rows may not have been committed. Re-run the script to process remaining rows.")
        except Exception as e:
            logger.error(f"Error in final commit: {e}")
            db.rollback()
    else:
        logger.info("DRY RUN - No changes committed")
        db.rollback()
    
    return stats


def apply_migration(db: Session, dry_run: bool = False) -> bool:
    """
    Apply ICD-11 database migration.
    Returns True if migration was applied successfully, False otherwise.
    """
    # Script is in backend/scripts/, migration is in backend/database/migrations/
    script_dir = Path(__file__).resolve().parent
    migration_file = script_dir.parent / "database" / "migrations" / "add_icd11_fields.sql"
    
    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        logger.error("  Expected path: backend/database/migrations/add_icd11_fields.sql")
        return False
    
    logger.info("=" * 60)
    logger.info("Applying database migration...")
    logger.info("=" * 60)
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for stmt in statements:
            if stmt:
                try:
                    if not dry_run:
                        db.execute(text(stmt))
                    logger.info(f"  ✓ Migration statement executed")
                except Exception as e:
                    error_msg = str(e).lower()
                    if any(kw in error_msg for kw in ["already exists", "duplicate", "does not exist"]):
                        logger.info(f"  ℹ (skipping - already exists or not found)")
                    else:
                        logger.warning(f"  ⚠ Warning: {e}")
        
        if not dry_run:
            db.commit()
            logger.info("✓ Migration applied successfully\n")
            return True
        else:
            logger.info("DRY RUN - Migration not applied\n")
            return True
    except Exception as e:
        error_msg = str(e).lower()
        # Check if migration was already applied (columns exist)
        if "already exists" in error_msg or "duplicate" in error_msg:
            logger.info("ℹ Migration may already be applied (columns exist)\n")
            return True
        logger.error(f"⚠ Migration error: {e}\n")
        if not dry_run:
            db.rollback()
        return False


def main():
    parser = argparse.ArgumentParser(description='Import ICD-11 codes from Excel files')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no DB changes)')
    parser.add_argument(
        '--language',
        choices=['en', 'ru', 'uz', 'all'],
        default='all',
        help='Language to import (default: all)'
    )
    parser.add_argument('--skip-migration', action='store_true', help='Skip database migration')
    
    args = parser.parse_args()
    
    # Base directory
    base_dir = Path(__file__).resolve().parent.parent.parent / "meds" / "icd11"
    
    if not base_dir.exists():
        logger.error(f"ICD-11 directory not found: {base_dir}")
        sys.exit(1)
    
    languages_to_process = ['en', 'ru', 'uz'] if args.language == 'all' else [args.language]
    
    db = SessionLocal()
    
    # Apply migration first (unless skipped)
    if not args.skip_migration:
        migration_applied = apply_migration(db, args.dry_run)
        if not migration_applied:
            logger.error("=" * 60)
            logger.error("CRITICAL: Database migration was not applied!")
            logger.error("Please run the migration manually first:")
            logger.error("  python backend/scripts/apply_icd11_migration.py")
            logger.error("=" * 60)
            db.close()
            sys.exit(1)
    total_stats = {
        'files_processed': 0,
        'files_failed': 0,
        'total_rows_read': 0,
        'total_rows_inserted': 0,
        'total_rows_updated': 0,
        'total_rows_skipped': 0,
        'total_errors': 0
    }
    
    try:
        for lang in languages_to_process:
            file_path = base_dir / lang / f"SimpleTabulation-ICD-11-MMS-{lang}.xlsx"
            
            if not file_path.exists():
                logger.warning(f"File not found: {file_path}")
                total_stats['files_failed'] += 1
                continue
            
            logger.info("=" * 60)
            logger.info(f"Processing {lang.upper()} file...")
            logger.info("=" * 60)
            
            stats = import_icd11_file(db, file_path, lang, args.dry_run)
            
            # Commit after each language file to ensure data is persisted
            if not args.dry_run:
                try:
                    db.commit()
                    logger.info(f"✓ Committed changes for {lang.upper()} file")
                except Exception as e:
                    logger.error(f"Error committing {lang.upper()} file: {e}")
                    db.rollback()
            
            total_stats['files_processed'] += 1
            total_stats['total_rows_read'] += stats['rows_read']
            total_stats['total_rows_inserted'] += stats['rows_inserted']
            total_stats['total_rows_updated'] += stats['rows_updated']
            total_stats['total_rows_skipped'] += stats['rows_skipped']
            total_stats['total_errors'] += stats.get('errors', 0)
            
            logger.info(f"Language {lang}: {stats['rows_inserted']} inserted, {stats['rows_updated']} updated, {stats['rows_skipped']} skipped, {stats.get('errors', 0)} errors")
        
        logger.info("=" * 60)
        logger.info("IMPORT SUMMARY:")
        logger.info(f"  Files processed: {total_stats['files_processed']}")
        logger.info(f"  Files failed: {total_stats['files_failed']}")
        logger.info(f"  Total rows read: {total_stats['total_rows_read']}")
        logger.info(f"  Total rows inserted: {total_stats['total_rows_inserted']}")
        logger.info(f"  Total rows updated: {total_stats['total_rows_updated']}")
        logger.info(f"  Total rows skipped: {total_stats['total_rows_skipped']}")
        logger.info(f"  Total errors: {total_stats['total_errors']}")
        logger.info("=" * 60)
        
        if args.dry_run:
            logger.info("DRY RUN - No changes were committed")
        
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()

