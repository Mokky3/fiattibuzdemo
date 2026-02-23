"""Script to add 'staff_chat' to the message_threads thread_type check constraint."""
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal

def update_thread_type_constraint(db: Session):
    """Update the thread_type check constraint to include 'staff_chat'."""
    try:
        # First, drop the existing constraint
        drop_constraint_sql = text("""
            ALTER TABLE ehr.message_threads
            DROP CONSTRAINT IF EXISTS message_threads_thread_type_check
        """)
        db.execute(drop_constraint_sql)
        db.commit()
        print("Dropped existing thread_type check constraint")
        
        # Add the new constraint with 'staff_chat' included
        add_constraint_sql = text("""
            ALTER TABLE ehr.message_threads
            ADD CONSTRAINT message_threads_thread_type_check
            CHECK (thread_type IN ('patient_chat', 'case_room', 'staff_channel', 'staff_chat'))
        """)
        db.execute(add_constraint_sql)
        db.commit()
        print("Added new thread_type check constraint with 'staff_chat'")
        
        return True
        
    except Exception as e:
        print(f"Error updating thread_type constraint: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

def main():
    """Main function to update thread_type constraint."""
    db: Session = SessionLocal()
    
    try:
        print("\n--- Updating message_threads thread_type constraint ---")
        success = update_thread_type_constraint(db)
        
        if success:
            print("✓ Successfully updated thread_type constraint to include 'staff_chat'")
        else:
            print("✗ Failed to update thread_type constraint")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

