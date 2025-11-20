"""
Migration script to add all missing columns to user_settings table.
Run this script to add the missing columns to the database.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text

# Define all columns that should exist in user_settings table
COLUMNS_TO_ADD = [
    ("login_alerts", "BOOLEAN DEFAULT TRUE"),
    ("session_timeout", "INTEGER DEFAULT 30"),
    ("appointment_reminders", "BOOLEAN DEFAULT TRUE"),
    ("appointment_confirmations", "BOOLEAN DEFAULT TRUE"),
    ("appointment_cancellations", "BOOLEAN DEFAULT TRUE"),
    ("lab_results_ready", "BOOLEAN DEFAULT TRUE"),
    ("prescription_reminders", "BOOLEAN DEFAULT TRUE"),
    ("patient_messages", "BOOLEAN DEFAULT TRUE"),
    ("system_updates", "BOOLEAN DEFAULT TRUE"),
    ("marketing_emails", "BOOLEAN DEFAULT FALSE"),
    ("appointment_reminder_time", "VARCHAR(20) DEFAULT '1day'"),
    ("prescription_reminder_time", "VARCHAR(20) DEFAULT 'morning'"),
    ("require_password_change", "INTEGER DEFAULT 90"),
    ("available_for_appointments", "BOOLEAN DEFAULT TRUE"),
    ("available_for_emergency", "BOOLEAN DEFAULT TRUE"),
    ("working_days", "JSON"),
    ("working_hours_start", "VARCHAR(5) DEFAULT '09:00'"),
    ("working_hours_end", "VARCHAR(5) DEFAULT '17:00'"),
    ("lunch_break_enabled", "BOOLEAN DEFAULT TRUE"),
    ("lunch_break_start", "VARCHAR(5) DEFAULT '12:00'"),
    ("lunch_break_end", "VARCHAR(5) DEFAULT '13:00'"),
    ("consultation_duration", "INTEGER DEFAULT 30"),
    ("buffer_time", "INTEGER DEFAULT 10"),
    ("theme", "VARCHAR(20) DEFAULT 'light'"),
    ("sidebar_collapsed", "BOOLEAN DEFAULT FALSE"),
    ("font_size", "VARCHAR(20) DEFAULT 'medium'"),
    ("high_contrast", "BOOLEAN DEFAULT FALSE"),
    ("date_format", "VARCHAR(20) DEFAULT 'DD/MM/YYYY'"),
    ("time_format", "VARCHAR(2) DEFAULT '24'"),
    ("start_page", "VARCHAR(50) DEFAULT 'dashboard'"),
    ("items_per_page", "INTEGER DEFAULT 20"),
    ("dashboard_layout", "JSON"),
]

def add_user_settings_columns():
    """Add all missing columns to user_settings table."""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("User Settings Columns Migration")
        print("=" * 60)
        
        added_count = 0
        existing_count = 0
        
        for column_name, column_def in COLUMNS_TO_ADD:
            # Check if column exists
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'core' 
                AND table_name = 'user_settings' 
                AND column_name = :column_name
            """), {"column_name": column_name})
            
            if not result.first():
                print(f"Adding {column_name} column...")
                db.execute(text(f"""
                    ALTER TABLE core.user_settings 
                    ADD COLUMN {column_name} {column_def}
                """))
                print(f"✓ {column_name} column added")
                added_count += 1
            else:
                print(f"✓ {column_name} column already exists")
                existing_count += 1
        
        db.commit()
        print("\n" + "=" * 60)
        print(f"✅ Migration completed successfully!")
        print(f"   Added: {added_count} columns")
        print(f"   Already existed: {existing_count} columns")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("User Settings Columns Migration")
    print("=" * 60)
    add_user_settings_columns()

