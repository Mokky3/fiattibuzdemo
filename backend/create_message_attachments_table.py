#!/usr/bin/env python3
"""Create message_attachments table if it doesn't exist."""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import get_db
from sqlalchemy import text

def create_message_attachments_table():
    """Create message_attachments table."""
    db = next(get_db())
    try:
        # Create message_attachments table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS ehr.message_attachments (
            id VARCHAR(255) PRIMARY KEY,
            message_id VARCHAR(255) NOT NULL,
            file_name VARCHAR(500) NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            file_size INTEGER NOT NULL DEFAULT 0,
            file_url TEXT NOT NULL,
            description TEXT,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            fhir_binary_id VARCHAR(255)
        );
        """
        
        db.execute(text(create_table_sql))
        db.commit()
        print("✓ Created ehr.message_attachments table")
        
        # Create indexes
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON ehr.message_attachments(message_id);",
            "CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_at ON ehr.message_attachments(uploaded_at);"
        ]
        
        for index_sql in indexes_sql:
            db.execute(text(index_sql))
        
        db.commit()
        print("✓ Created indexes for ehr.message_attachments table")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error creating table: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_message_attachments_table()



