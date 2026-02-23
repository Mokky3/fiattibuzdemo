#!/usr/bin/env python
"""Script to add organization column to user_profiles table."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal

def add_organization_column():
    """Add organization column to core.user_profiles table."""
    db = SessionLocal()
    try:
        # Check if column already exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'core' 
            AND table_name = 'user_profiles' 
            AND column_name = 'organization'
        """))
        
        if result.fetchone():
            print("Column 'organization' already exists in core.user_profiles")
            return
        
        # Add the column
        db.execute(text("""
            ALTER TABLE core.user_profiles 
            ADD COLUMN organization VARCHAR(200)
        """))
        
        # Add comment
        db.execute(text("""
            COMMENT ON COLUMN core.user_profiles.organization IS 
            'Organization/hospital name for medical staff'
        """))
        
        db.commit()
        print("Successfully added 'organization' column to core.user_profiles table")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding column: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_organization_column()



