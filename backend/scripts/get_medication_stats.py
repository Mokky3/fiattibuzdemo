#!/usr/bin/env python3
"""Get detailed medication statistics."""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("=" * 60)
    print("MEDICATION DATABASE STATISTICS")
    print("=" * 60)
    
    total = db.execute(text("SELECT COUNT(*) FROM ref.medication_product")).scalar()
    print(f"Total medications: {total:,}")
    
    unique_brands = db.execute(text("SELECT COUNT(DISTINCT brand_name) FROM ref.medication_product")).scalar()
    print(f"Unique brand names: {unique_brands:,}")
    
    with_prices = db.execute(text("""
        SELECT COUNT(DISTINCT mp.id) 
        FROM ref.medication_product mp
        INNER JOIN ref.medication_presentation pres ON pres.product_id = mp.id
        INNER JOIN ref.medication_price price ON price.presentation_id = pres.id
    """)).scalar()
    print(f"Medications with prices: {with_prices:,}")
    
    with_presentations = db.execute(text("""
        SELECT COUNT(DISTINCT mp.id)
        FROM ref.medication_product mp
        INNER JOIN ref.medication_presentation pres ON pres.product_id = mp.id
    """)).scalar()
    print(f"Medications with presentations: {with_presentations:,}")
    
    total_presentations = db.execute(text("SELECT COUNT(*) FROM ref.medication_presentation")).scalar()
    print(f"Total presentations: {total_presentations:,}")
    
    total_prices = db.execute(text("SELECT COUNT(*) FROM ref.medication_price")).scalar()
    print(f"Total price records: {total_prices:,}")
    
    print("=" * 60)
finally:
    db.close()

