#!/usr/bin/env python3
"""
Verify ICD-11 import results.
Checks:
1. Total count of ICD-11 codes in database
2. Duplicate codes (should be 0)
3. Missing descriptions
4. Compare with import stats
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.db.session import SessionLocal

def verify_import():
    """Verify ICD-11 import results."""
    print("=" * 60)
    print("Verifying ICD-11 Import Results")
    print("=" * 60)
    print()
    
    db = SessionLocal()
    try:
        # 1. Count total ICD-11 codes
        result = db.execute(
            text("""
                SELECT COUNT(*) as total_count
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
            """)
        )
        total_count = result.scalar()
        print(f"1. Total ICD-11 codes in database: {total_count:,}")
        
        # 2. Check for duplicates (codes with same code and version)
        result = db.execute(
            text("""
                SELECT code, version, COUNT(*) as duplicate_count
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
                GROUP BY code, version
                HAVING COUNT(*) > 1
                ORDER BY duplicate_count DESC
            """)
        )
        duplicates = result.fetchall()
        if duplicates:
            print(f"\n2. ⚠ WARNING: Found {len(duplicates)} duplicate codes!")
            print("   First 10 duplicates:")
            for dup in duplicates[:10]:
                print(f"      Code {dup[0]}: {dup[2]} occurrences")
        else:
            print("\n2. ✓ No duplicates found - all codes are unique")
        
        # 3. Check codes without descriptions
        result = db.execute(
            text("""
                SELECT COUNT(*) as missing_count
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
                AND (description IS NULL OR description = '')
                AND (description_en IS NULL OR description_en = '')
                AND (description_ru IS NULL OR description_ru = '')
                AND (description_uz IS NULL OR description_uz = '')
            """)
        )
        missing_desc = result.scalar()
        if missing_desc > 0:
            print(f"\n3. ⚠ WARNING: Found {missing_desc} codes without any description")
        else:
            print("\n3. ✓ All codes have at least one description")
        
        # 4. Check codes with all language descriptions
        result = db.execute(
            text("""
                SELECT COUNT(*) as multilingual_count
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
                AND description_en IS NOT NULL
                AND description_ru IS NOT NULL
                AND description_uz IS NOT NULL
            """)
        )
        multilingual_count = result.scalar()
        print(f"\n4. Codes with all 3 languages (EN, RU, UZ): {multilingual_count:,}")
        
        # 5. Language breakdown
        result = db.execute(
            text("""
                SELECT 
                    COUNT(*) FILTER (WHERE description_en IS NOT NULL) as has_en,
                    COUNT(*) FILTER (WHERE description_ru IS NOT NULL) as has_ru,
                    COUNT(*) FILTER (WHERE description_uz IS NOT NULL) as has_uz
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
            """)
        )
        lang_stats = result.fetchone()
        print(f"\n5. Language coverage:")
        print(f"   - English (EN): {lang_stats[0]:,}")
        print(f"   - Russian (RU): {lang_stats[1]:,}")
        print(f"   - Uzbek (UZ): {lang_stats[2]:,}")
        
        # 6. Check unique codes count
        result = db.execute(
            text("""
                SELECT COUNT(DISTINCT code) as unique_codes
                FROM ref.icd_codes
                WHERE version = 'ICD-11'
            """)
        )
        unique_codes = result.scalar()
        print(f"\n6. Unique ICD-11 codes: {unique_codes:,}")
        
        if unique_codes == total_count:
            print("   ✓ Count matches total - no duplicates!")
        else:
            print(f"   ⚠ WARNING: {total_count - unique_codes} duplicate entries found!")
        
        # 7. Expected count (from import summary)
        expected_rows = 110346
        print(f"\n7. Expected rows from import: {expected_rows:,}")
        print(f"   Actual rows in database: {total_count:,}")
        
        if total_count >= expected_rows:
            print(f"   ✓ Database has at least as many rows as expected")
            if total_count > expected_rows:
                print(f"   ℹ Database has {total_count - expected_rows} more rows (may include ICD-10 or other versions)")
        else:
            print(f"   ⚠ WARNING: Database has {expected_rows - total_count} fewer rows than expected")
        
        print()
        print("=" * 60)
        print("Verification Complete")
        print("=" * 60)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    verify_import()

