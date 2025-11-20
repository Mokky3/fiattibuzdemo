#!/usr/bin/env python3
"""Mark migrations 007 and 008 as complete."""
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib")
if DATABASE_URL.startswith("postgresql+psycopg"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

print("Current migrations:")
cur.execute("SELECT version_num FROM ref.alembic_version ORDER BY version_num")
versions = cur.fetchall()
for v in versions:
    print(f"  - {v[0]}")

print("\nMarking migrations 007 and 008 as complete...")
cur.execute("""
    INSERT INTO ref.alembic_version (version_num) 
    VALUES ('007'), ('008') 
    ON CONFLICT DO NOTHING
""")
conn.commit()

print("\nUpdated migrations:")
cur.execute("SELECT version_num FROM ref.alembic_version ORDER BY version_num")
versions = cur.fetchall()
for v in versions:
    print(f"  - {v[0]}")

conn.close()
print("\n✓ Done!")

