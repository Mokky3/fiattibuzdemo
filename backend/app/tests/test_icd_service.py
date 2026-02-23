#!/usr/bin/env python3
"""
Quick test script for ICD code service.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db.session import SessionLocal
from app.services.icd_code_service import IcdCodeService

def test_icd_search():
    """Test ICD code search functionality."""
    db = SessionLocal()
    try:
        service = IcdCodeService(db)
        
        print("=" * 60)
        print("Testing ICD Code Search Service")
        print("=" * 60)
        print()
        
        # Test 1: Search by code
        print("Test 1: Search by code '280385798'")
        result = service.search(query="280385798", limit=5)
        print(f"  Found {result.total} results")
        if result.results:
            print(f"  First result: {result.results[0].code} - {result.results[0].description_en}")
        print()
        
        # Test 2: Search by description (English)
        print("Test 2: Search by description 'electrocardiograph' (EN)")
        result = service.search(query="electrocardiograph", language="en", limit=5)
        print(f"  Found {result.total} results")
        if result.results:
            for r in result.results[:3]:
                print(f"    - {r.code}: {r.description_en}")
        print()
        
        # Test 3: Search by description (Russian)
        print("Test 3: Search by description 'кислород' (RU)")
        result = service.search(query="кислород", language="ru", limit=5)
        print(f"  Found {result.total} results")
        if result.results:
            for r in result.results[:3]:
                print(f"    - {r.code}: {r.description_ru}")
        print()
        
        # Test 4: Get by code
        print("Test 4: Get code by code '280385798'")
        code = service.get_by_code("280385798")
        if code:
            print(f"  Found: {code.code} - {code.description_en}")
        else:
            print("  Not found")
        print()
        
        # Test 5: Search without query (list all)
        print("Test 5: List all codes (limit 5)")
        result = service.search(limit=5)
        print(f"  Total available: {result.total}")
        print(f"  Showing {len(result.results)} results")
        print()
        
        print("=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    test_icd_search()

