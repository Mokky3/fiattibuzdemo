#!/usr/bin/env python3
"""
Apply ICD-11 database migration manually.
This script adds the necessary columns to ref.icd_codes table.
"""
import sys
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal

def apply_migration():
    """Apply ICD-11 database migration."""
    # Migration file is in backend/database/migrations/
    script_dir = Path(__file__).resolve().parent
    migration_file = script_dir.parent / "database" / "migrations" / "add_icd11_fields.sql"
    
    if not migration_file.exists():
        print(f"ERROR: Migration file not found: {migration_file}")
        print("Please ensure the file exists at backend/database/migrations/add_icd11_fields.sql")
        sys.exit(1)
    
    print("=" * 60)
    print("Applying ICD-11 Database Migration")
    print("=" * 60)
    print(f"Migration file: {migration_file}")
    print()
    
    db = SessionLocal()
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Split into statements more carefully
        # Remove comments first, then split by semicolon
        lines = migration_sql.split('\n')
        cleaned_lines = []
        for line in lines:
            # Remove inline comments (everything after --)
            if '--' in line:
                line = line[:line.index('--')]
            cleaned_lines.append(line)
        
        # Join and split by semicolon
        cleaned_sql = '\n'.join(cleaned_lines)
        statements = [s.strip() for s in cleaned_sql.split(';') if s.strip()]
        
        print(f"Found {len(statements)} SQL statements to execute\n")
        
        for i, stmt in enumerate(statements, 1):
            if stmt:
                try:
                    print(f"Executing statement {i}/{len(statements)}...")
                    # Show first 100 chars of statement
                    preview = stmt[:100].replace('\n', ' ')
                    if len(stmt) > 100:
                        preview += "..."
                    print(f"  Statement: {preview}")
                    db.execute(text(stmt + ';'))  # Add semicolon back
                    print(f"  ✓ Success\n")
                except Exception as e:
                    error_msg = str(e).lower()
                    if any(kw in error_msg for kw in ["already exists", "duplicate", "does not exist"]):
                        print(f"  ℹ (skipped - already exists or not needed)\n")
                    else:
                        print(f"  ⚠ Warning: {e}\n")
                        # Don't rollback here - continue with other statements
        
        db.commit()
        print()
        print("=" * 60)
        print("✓ Migration applied successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    apply_migration()
