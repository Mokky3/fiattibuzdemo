#!/usr/bin/env python3
"""Check migration status and database tables."""
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib")
# Remove sqlalchemy driver prefix if present
if DATABASE_URL.startswith("postgresql+psycopg"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")
elif DATABASE_URL.startswith("postgresql+psycopg2"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

print("=" * 60)
print("MIGRATION STATUS CHECK")
print("=" * 60)

# Check alembic_version table (may be in ref schema or public)
try:
    cur.execute("SELECT version_num FROM ref.alembic_version ORDER BY version_num")
    versions = cur.fetchall()
    print(f"\n✓ Applied migrations (from ref.alembic_version):")
    for v in versions:
        print(f"  - {v[0]}")
    conn.rollback()
except Exception as e:
    conn.rollback()
    try:
        cur.execute("SELECT version_num FROM alembic_version ORDER BY version_num")
        versions = cur.fetchall()
        print(f"\n✓ Applied migrations (from public.alembic_version):")
        for v in versions:
            print(f"  - {v[0]}")
        conn.rollback()
    except Exception as e2:
        conn.rollback()
        print(f"\n✗ No alembic_version table found - migrations may not have been applied")

# Check schemas
print("\n" + "=" * 60)
print("SCHEMAS")
print("=" * 60)
cur.execute("""
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name IN ('ref', 'ops', 'staging', 'core', 'ehr', 'financial')
    ORDER BY schema_name
""")
schemas = cur.fetchall()
if schemas:
    print("✓ Existing schemas:")
    for s in schemas:
        print(f"  - {s[0]}")
else:
    print("✗ No medication-related schemas found")

# Check tables in ref schema
print("\n" + "=" * 60)
print("TABLES IN REF SCHEMA")
print("=" * 60)
try:
    conn.rollback()  # Clear any previous errors
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'ref'
        ORDER BY table_name
    """)
    tables = cur.fetchall()
    if tables:
        print(f"✓ Found {len(tables)} tables in ref schema:")
        for t in tables:
            print(f"  - {t[0]}")
        
        # Check data counts for NEW medication tables
        print("\n" + "=" * 60)
        print("NEW MEDICATION TABLES (Migration Status)")
        print("=" * 60)
        
        for table_name in ['unit', 'route', 'dosage_form', 'manufacturer', 'mnn', 'category_tag', 
                          'medication_product', 'medication_presentation', 'medication_price']:
            try:
                conn.rollback()
                cur.execute(f"SELECT COUNT(*) FROM ref.{table_name}")
                count = cur.fetchone()[0]
                print(f"  ✓ {table_name}: {count} rows")
            except Exception as e:
                print(f"  ✗ {table_name}: Table does not exist")
    else:
        print("✗ No tables found in ref schema")
except Exception as e:
    conn.rollback()
    print(f"✗ Error checking ref schema: {e}")

# Check staging schema
print("\n" + "=" * 60)
print("STAGING SCHEMA")
print("=" * 60)
try:
    conn.rollback()
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'staging'
        ORDER BY table_name
    """)
    staging_tables = cur.fetchall()
    if staging_tables:
        print(f"✓ Found {len(staging_tables)} tables in staging schema:")
        for t in staging_tables:
            print(f"  - {t[0]}")
            try:
                conn.rollback()
                cur.execute(f"SELECT COUNT(*) FROM staging.{t[0]}")
                count = cur.fetchone()[0]
                print(f"    ({count} rows)")
            except:
                pass
    else:
        print("✗ No tables found in staging schema")
except Exception as e:
    conn.rollback()
    print(f"✗ Staging schema check failed: {e}")

conn.close()
print("\n" + "=" * 60)

