#!/usr/bin/env python3
"""Create the radiology_worklist_assignments table if it doesn't exist."""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import text
from app.db.session import SessionLocal

def create_radiology_worklist_table():
    """Create the radiology_worklist_assignments table."""
    db = SessionLocal()
    
    try:
        print("Creating ehr.radiology_worklist_assignments table...")
        
        # Check if table exists
        check_query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'ehr' 
                AND table_name = 'radiology_worklist_assignments'
            );
        """)
        result = db.execute(check_query).scalar()
        
        if result:
            print("✅ Table ehr.radiology_worklist_assignments already exists.")
            return True
        
        # Create the table
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS ehr.radiology_worklist_assignments (
                id VARCHAR(36) NOT NULL,
                study_id VARCHAR(36) NOT NULL,
                assigned_radiologist_id VARCHAR(36),
                reading_status VARCHAR(20) NOT NULL DEFAULT 'unread',
                critical_flag BOOLEAN DEFAULT FALSE,
                tags JSON,
                preliminary_findings TEXT,
                image_count INTEGER DEFAULT 0,
                series_count INTEGER DEFAULT 0,
                study_size VARCHAR(50),
                protocol_name VARCHAR(200),
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                turnaround_time VARCHAR(50),
                estimated_read_time VARCHAR(50),
                PRIMARY KEY (id)
            );
        """)
        
        db.execute(create_table_query)
        
        # Add foreign key constraints if they don't exist
        try:
            fk_study_query = text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'radiology_worklist_assignments_study_id_fkey'
                    ) THEN
                        ALTER TABLE ehr.radiology_worklist_assignments 
                        ADD CONSTRAINT radiology_worklist_assignments_study_id_fkey 
                        FOREIGN KEY (study_id) REFERENCES ehr.radiology_studies(id);
                    END IF;
                END $$;
            """)
            db.execute(fk_study_query)
            
            fk_radiologist_query = text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'radiology_worklist_assignments_assigned_radiologist_id_fkey'
                    ) THEN
                        ALTER TABLE ehr.radiology_worklist_assignments 
                        ADD CONSTRAINT radiology_worklist_assignments_assigned_radiologist_id_fkey 
                        FOREIGN KEY (assigned_radiologist_id) REFERENCES core.users(id);
                    END IF;
                END $$;
            """)
            db.execute(fk_radiologist_query)
        except Exception as e:
            print(f"⚠️  Warning: Could not add foreign key constraints: {e}")
            print("   Table created, but foreign keys may need to be added manually.")
        
        # Create indexes
        try:
            index_queries = [
                text("CREATE INDEX IF NOT EXISTS idx_worklist_study_id ON ehr.radiology_worklist_assignments(study_id);"),
                text("CREATE INDEX IF NOT EXISTS idx_worklist_radiologist_id ON ehr.radiology_worklist_assignments(assigned_radiologist_id);"),
                text("CREATE INDEX IF NOT EXISTS idx_worklist_reading_status ON ehr.radiology_worklist_assignments(reading_status);"),
            ]
            
            for idx_query in index_queries:
                db.execute(idx_query)
        except Exception as e:
            print(f"⚠️  Warning: Could not create all indexes: {e}")
        
        db.commit()
        print("✅ Table ehr.radiology_worklist_assignments created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_radiology_worklist_table()
    sys.exit(0 if success else 1)

