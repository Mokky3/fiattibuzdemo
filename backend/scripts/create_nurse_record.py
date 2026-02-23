"""Script to create a nurse record for nurse@example.com."""
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal
from app.common.models.user import User
from uuid import uuid4

def create_nurse_record(db: Session, email: str):
    """Create a nurse record linked to a user account."""
    try:
        # Get user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"User with email {email} not found")
            return False
        
        # Check if nurse profile already exists
        check_sql = text("""
            SELECT id, user_id
            FROM ehr.nurses
            WHERE user_id = CAST(:user_id AS UUID)
            LIMIT 1
        """)
        nurse_result = db.execute(check_sql, {"user_id": str(user.id)}).fetchone()
        
        if nurse_result:
            print(f"Nurse profile already exists for {email} (nurse_id: {nurse_result[0]})")
            return True
        
        # Create a new nurse record with all required fields
        nurse_id = uuid4()
        license_number = f"NURSE-{user.id.hex[:8].upper()}"
        
        insert_sql = text("""
            INSERT INTO ehr.nurses (
                id, 
                user_id, 
                license_number, 
                primary_specialty, 
                role,
                can_work_nights,
                can_work_weekends,
                can_float,
                rating_count,
                created_at
            )
            VALUES (
                CAST(:nurse_id AS UUID), 
                CAST(:user_id AS UUID), 
                :license_number, 
                :primary_specialty, 
                :role,
                :can_work_nights,
                :can_work_weekends,
                :can_float,
                :rating_count,
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET user_id = CAST(:user_id AS UUID)
        """)
        
        db.execute(insert_sql, {
            "nurse_id": str(nurse_id),
            "user_id": str(user.id),
            "license_number": license_number,
            "primary_specialty": "general",  # From NurseSpecialty enum
            "role": "staff_nurse",  # From NurseRole enum
            "can_work_nights": True,
            "can_work_weekends": True,
            "can_float": True,
            "rating_count": 0
        })
        db.commit()
        
        print(f"Created nurse profile for {email} (nurse_id: {nurse_id}, license: {license_number})")
        return True
        
    except Exception as e:
        print(f"Error creating nurse record: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

def main():
    """Main function to create nurse record."""
    db: Session = SessionLocal()
    
    try:
        # Create nurse record for nurse@example.com
        print("\n--- Creating nurse record for nurse@example.com ---")
        nurse_created = create_nurse_record(db, "nurse@example.com")
        
        # Summary
        print("\n--- Summary ---")
        if nurse_created:
            print("✓ nurse@example.com nurse record created")
        else:
            print("✗ Failed to create nurse record for nurse@example.com")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

