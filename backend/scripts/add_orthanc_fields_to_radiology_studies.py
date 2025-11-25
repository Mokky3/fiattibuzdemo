#!/usr/bin/env python3
"""
Add Orthanc/DICOM fields to radiology_studies table.
Run this script to add the necessary columns for DICOM upload functionality.
"""

import sys
from pathlib import Path

backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import text
from app.db.session import SessionLocal

def add_orthanc_fields():
    """Add Orthanc fields to radiology_studies table."""
    db = SessionLocal()
    
    try:
        print("Adding Orthanc fields to ehr.radiology_studies table...")
        
        # Check if columns already exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'ehr' 
            AND table_name = 'radiology_studies'
            AND column_name IN ('orthanc_study_id', 'study_instance_uid', 'source', 'study_date', 'uploaded_by', 'uploaded_at');
        """)
        existing_columns = {row[0] for row in db.execute(check_query).fetchall()}
        
        # Add columns if they don't exist
        columns_to_add = []
        
        if 'orthanc_study_id' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN orthanc_study_id VARCHAR(255);
                CREATE INDEX IF NOT EXISTS idx_radiology_studies_orthanc_study_id 
                ON ehr.radiology_studies(orthanc_study_id);
            """)
        
        if 'study_instance_uid' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN study_instance_uid VARCHAR(255);
                CREATE INDEX IF NOT EXISTS idx_radiology_studies_study_instance_uid 
                ON ehr.radiology_studies(study_instance_uid);
            """)
        
        if 'source' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN source VARCHAR(50);
            """)
        
        if 'study_date' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN study_date DATE;
            """)
        
        if 'uploaded_by' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN uploaded_by UUID REFERENCES core.users(id);
            """)
        
        if 'uploaded_at' not in existing_columns:
            columns_to_add.append("""
                ALTER TABLE ehr.radiology_studies 
                ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now();
            """)
        
        # Execute all column additions
        for sql in columns_to_add:
            try:
                db.execute(text(sql))
                print(f"✅ Added column(s)")
            except Exception as e:
                print(f"⚠️  Warning: {e}")
        
        # Update status column to allow 'IMPORTED_NO_REPORT' if needed
        try:
            # Check current status values
            db.execute(text("""
                DO $$
                BEGIN
                    -- This will fail if constraint doesn't exist, which is fine
                    ALTER TABLE ehr.radiology_studies 
                    DROP CONSTRAINT IF EXISTS radiology_studies_status_check;
                END $$;
            """))
            
            # Add new constraint with IMPORTED_NO_REPORT
            db.execute(text("""
                ALTER TABLE ehr.radiology_studies 
                ADD CONSTRAINT radiology_studies_status_check 
                CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'IMPORTED_NO_REPORT', 'PRELIMINARY_REPORT', 'FINAL_REPORT'));
            """))
            print("✅ Updated status constraint")
        except Exception as e:
            print(f"⚠️  Status constraint update: {e}")
        
        # Make orthanc fields NOT NULL for new records (but allow NULL for existing)
        # We'll do this carefully to avoid breaking existing data
        try:
            # First, set default values for any NULL orthanc_study_id
            db.execute(text("""
                UPDATE ehr.radiology_studies 
                SET orthanc_study_id = 'MIGRATED_' || id::text 
                WHERE orthanc_study_id IS NULL;
            """))
            
            db.execute(text("""
                UPDATE ehr.radiology_studies 
                SET study_instance_uid = 'MIGRATED_' || id::text 
                WHERE study_instance_uid IS NULL;
            """))
            
            # Now make them NOT NULL
            db.execute(text("""
                ALTER TABLE ehr.radiology_studies 
                ALTER COLUMN orthanc_study_id SET NOT NULL;
            """))
            
            db.execute(text("""
                ALTER TABLE ehr.radiology_studies 
                ALTER COLUMN study_instance_uid SET NOT NULL;
            """))
            print("✅ Set orthanc fields to NOT NULL")
        except Exception as e:
            print(f"⚠️  Could not set NOT NULL constraint: {e}")
            print("   This is okay if you have existing data without Orthanc IDs")
        
        db.commit()
        print("\n✅ Migration complete!")
        print("\nNote: If you have existing studies without Orthanc data,")
        print("      they were given placeholder values. Update them as needed.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = add_orthanc_fields()
    sys.exit(0 if success else 1)

