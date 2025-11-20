"""Script to link nurse@example.com user to the nurses table."""
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
from app.common.models.nurse import Nurse

def link_nurse_to_user(db: Session, email: str):
    """Link a nurse user account to the nurses table."""
    try:
        # Get user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"User with email {email} not found")
            return False
        
        # Check if nurse profile exists using raw SQL
        check_sql = text("""
            SELECT id, user_id
            FROM ehr.nurses
            WHERE user_id = CAST(:user_id AS UUID)
            LIMIT 1
        """)
        nurse_result = db.execute(check_sql, {"user_id": str(user.id)}).fetchone()
        
        if nurse_result:
            print(f"Nurse profile already linked to {email} (nurse_id: {nurse_result[0]})")
            return True
        
        # Try to find a nurse profile without user_id using raw SQL
        find_sql = text("""
            SELECT id
            FROM ehr.nurses
            WHERE user_id IS NULL
            LIMIT 1
        """)
        nurse_result = db.execute(find_sql).fetchone()
        
        if not nurse_result:
            # Try to find any existing nurse record to update
            find_any_sql = text("""
                SELECT id
                FROM ehr.nurses
                LIMIT 1
            """)
            any_nurse = db.execute(find_any_sql).fetchone()
            
            if any_nurse:
                # Update existing nurse record
                nurse_id = any_nurse[0]
                update_sql = text("""
                    UPDATE ehr.nurses
                    SET user_id = CAST(:user_id AS UUID)
                    WHERE id = CAST(:nurse_id AS UUID)
                """)
                
                db.execute(update_sql, {
                    "user_id": str(user.id),
                    "nurse_id": str(nurse_id)
                })
                db.commit()
                
                print(f"Linked existing nurse profile to {email} (nurse_id: {nurse_id})")
                return True
            else:
                print(f"No existing nurse profile found to link. Please create a nurse profile first.")
                return False
        else:
            # Update existing nurse profile
            nurse_id = nurse_result[0]
            update_sql = text("""
                UPDATE ehr.nurses
                SET user_id = CAST(:user_id AS UUID)
                WHERE id = CAST(:nurse_id AS UUID)
            """)
            
            db.execute(update_sql, {
                "user_id": str(user.id),
                "nurse_id": str(nurse_id)
            })
            db.commit()
            
            print(f"Linked existing nurse profile to {email} (nurse_id: {nurse_id})")
            return True
        
    except Exception as e:
        print(f"Error linking nurse to user: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

def main():
    """Main function to link nurse to user."""
    db: Session = SessionLocal()
    
    try:
        # Link nurse@example.com
        print("\n--- Linking nurse@example.com ---")
        nurse_linked = link_nurse_to_user(db, "nurse@example.com")
        
        # Summary
        print("\n--- Summary ---")
        if nurse_linked:
            print("✓ nurse@example.com linked to nurses table")
        else:
            print("✗ Failed to link nurse@example.com")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

