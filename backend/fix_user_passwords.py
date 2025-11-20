"""Fix user passwords in database - convert SHA-256 hashes to proper passlib hashes.

This script updates existing users' passwords that were created with SHA-256
to use proper passlib password hashing (pbkdf2_sha256) for compatibility with
the authentication system.
"""
import os
import sys
from pathlib import Path
import sqlite3

# Add backend to path to import app modules
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.common.models.user import User

# Password hashing - must match AuthService schemes
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt_sha256__truncate_error=False,
)

# Known passwords for test users
KNOWN_PASSWORDS = {
    "admin@example.com": "Admin123!",
    "doctor@example.com": "Doctor123!",
    "nurse@example.com": "Nurse123!",
    "reception@example.com": "Reception123!",
    "lab@example.com": "Lab123!",
    "radiology@example.com": "Radiology123!",
    "patient@example.com": "Patient123!",
}


def fix_user_password_sqlite(db_path: str):
    """Fix passwords in SQLite database directly."""
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON")
        
        print("Fixing user passwords in SQLite database...")
        fixed_count = 0
        
        # Determine column name by checking table schema
        cur.execute("PRAGMA table_info(users)")
        columns = {row[1]: row[0] for row in cur.fetchall()}
        
        if "password_hash" in columns:
            column_name = "password_hash"
        elif "hashed_password" in columns:
            column_name = "hashed_password"
        else:
            print("❌ Error: Could not find password column in users table")
            return
        
        print(f"  Using column: {column_name}")
        
        for email, password in KNOWN_PASSWORDS.items():
            # Check if user exists
            cur.execute(f"SELECT id, {column_name} FROM users WHERE email = ?", (email,))
            row = cur.fetchone()
            
            if not row:
                print(f"  ⚠️  User {email} not found, skipping...")
                continue
            
            user_id, old_hash = row
            
            # Check if password is already a passlib hash (starts with $)
            if old_hash and old_hash.startswith("$"):
                print(f"  ✓ {email} already has proper password hash, skipping...")
                continue
            
            # Hash password with proper method
            new_hash = pwd_context.hash(password, scheme="pbkdf2_sha256")
            
            # Update password
            cur.execute(
                f"UPDATE users SET {column_name} = ? WHERE email = ?",
                (new_hash, email)
            )
            print(f"  ✓ Fixed password for {email}")
            fixed_count += 1
        
        conn.commit()
        print(f"\n✅ Fixed {fixed_count} user password(s)")
        
    except Exception as e:
        print(f"❌ Error fixing passwords: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def fix_user_password_orm():
    """Fix passwords using ORM (for PostgreSQL or other databases)."""
    db: Session = SessionLocal()
    try:
        print("Fixing user passwords using ORM...")
        fixed_count = 0
        
        for email, password in KNOWN_PASSWORDS.items():
            user = db.query(User).filter(User.email == email).first()
            if not user:
                print(f"  ⚠️  User {email} not found, skipping...")
                continue
            
            # Check if password is already a passlib hash (starts with $)
            if user.password_hash and user.password_hash.startswith("$"):
                print(f"  ✓ {email} already has proper password hash, skipping...")
                continue
            
            # Hash password with proper method
            user.password_hash = pwd_context.hash(password, scheme="pbkdf2_sha256")
            from datetime import datetime, timezone
            user.password_changed_at = datetime.now(timezone.utc)
            
            print(f"  ✓ Fixed password for {email}")
            fixed_count += 1
        
        db.commit()
        print(f"\n✅ Fixed {fixed_count} user password(s)")
        
    except Exception as e:
        print(f"❌ Error fixing passwords: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main function to fix user passwords."""
    # Try SQLite first
    db_path = os.path.join(os.path.dirname(__file__), "ehr.db")
    if os.path.exists(db_path):
        print(f"Found SQLite database at {db_path}")
        fix_user_password_sqlite(db_path)
    else:
        print("SQLite database not found, trying ORM method...")
        fix_user_password_orm()


if __name__ == "__main__":
    main()

