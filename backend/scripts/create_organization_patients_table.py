"""Migration script to create organization_patients junction table."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.db.session import engine
from app.db.base_class import Base

def create_organization_patients_table():
    """Create the organization_patients junction table."""
    with engine.connect() as conn:
        # Check if table already exists
        check_query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'ehr' 
                AND table_name = 'organization_patients'
            );
        """)
        result = conn.execute(check_query)
        exists = result.scalar()
        
        if exists:
            print("Table 'ehr.organization_patients' already exists. Skipping creation.")
            return
        
        # Create the table
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS ehr.organization_patients (
                organization_id UUID NOT NULL REFERENCES ref.hospitals(id) ON DELETE CASCADE,
                patient_id UUID NOT NULL REFERENCES ehr.patients(patient_id) ON DELETE CASCADE,
                
                -- Clinic-specific fields
                local_mrn VARCHAR(50),
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_seen_at TIMESTAMPTZ,
                consent_share BOOLEAN NOT NULL DEFAULT FALSE,
                notes TEXT,
                
                -- Timestamps
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ,
                
                PRIMARY KEY (organization_id, patient_id)
            );
            
            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_organization_patients_organization_id 
                ON ehr.organization_patients(organization_id);
            
            CREATE INDEX IF NOT EXISTS idx_organization_patients_patient_id 
                ON ehr.organization_patients(patient_id);
            
            CREATE INDEX IF NOT EXISTS idx_organization_patients_status 
                ON ehr.organization_patients(status);
            
            -- Add comment
            COMMENT ON TABLE ehr.organization_patients IS 
                'Many-to-many relationship between patients and organizations. Allows patients to be seen at multiple clinics.';
        """)
        
        conn.execute(create_table_query)
        conn.commit()
        print("Successfully created 'ehr.organization_patients' table with indexes.")
        
        # Migrate existing data (if patients have organization_id via User)
        migrate_query = text("""
            INSERT INTO ehr.organization_patients (organization_id, patient_id, status, first_seen_at, created_at)
            SELECT DISTINCT
                u.organization_id,
                p.patient_id,
                'active'::VARCHAR(20),
                COALESCE(p.created_at, NOW()),
                COALESCE(p.created_at, NOW())
            FROM ehr.patients p
            INNER JOIN core.users u ON p.user_id = u.id
            WHERE u.organization_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM ehr.organization_patients op
                WHERE op.organization_id = u.organization_id
                AND op.patient_id = p.patient_id
            );
        """)
        
        result = conn.execute(migrate_query)
        migrated_count = result.rowcount
        conn.commit()
        
        if migrated_count > 0:
            print(f"Migrated {migrated_count} existing patient-organization relationships.")
        else:
            print("No existing data to migrate.")

if __name__ == "__main__":
    try:
        create_organization_patients_table()
        print("\nMigration completed successfully!")
    except Exception as e:
        print(f"\nError during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


