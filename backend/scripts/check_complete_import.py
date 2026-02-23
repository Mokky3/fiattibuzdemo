#!/usr/bin/env python3
"""Check complete medication import including prices."""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("=" * 60)
    print("COMPLETE MEDICATION IMPORT SUMMARY")
    print("=" * 60)
    
    products = db.execute(text("SELECT COUNT(*) FROM ref.medication_product")).scalar()
    print(f"Products: {products:,}")
    
    mnn = db.execute(text("SELECT COUNT(*) FROM ref.mnn WHERE LOWER(name) != 'nan'")).scalar()
    print(f"MNN: {mnn:,}")
    
    manufacturers = db.execute(text("SELECT COUNT(*) FROM ref.manufacturer")).scalar()
    print(f"Manufacturers: {manufacturers:,}")
    
    dosage_forms = db.execute(text("SELECT COUNT(*) FROM ref.dosage_form")).scalar()
    print(f"Dosage Forms: {dosage_forms:,}")
    
    synonyms = db.execute(text("SELECT COUNT(*) FROM ref.medication_product_synonym")).scalar()
    print(f"Synonyms: {synonyms:,}")
    
    categories = db.execute(text("SELECT COUNT(*) FROM ref.category_tag")).scalar()
    print(f"Categories: {categories:,}")
    
    category_links = db.execute(text("SELECT COUNT(*) FROM ref.medication_product_category")).scalar()
    print(f"Product-Category Links: {category_links:,}")
    
    presentations = db.execute(text("SELECT COUNT(*) FROM ref.medication_presentation")).scalar()
    print(f"Presentations: {presentations:,}")
    
    prices = db.execute(text("SELECT COUNT(*) FROM ref.medication_price")).scalar()
    print(f"Prices: {prices:,}")
    
    price_types = db.execute(text("""
        SELECT price_type, COUNT(*) 
        FROM ref.medication_price 
        GROUP BY price_type 
        ORDER BY price_type
    """)).fetchall()
    print(f"\nPrice Types:")
    for ptype, count in price_types:
        print(f"  {ptype}: {count:,}")
    
    print("=" * 60)
finally:
    db.close()

