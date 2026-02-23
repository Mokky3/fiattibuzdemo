#!/usr/bin/env python3
"""
Script to fix admin user password with correct hashing.
This updates the admin@example.com password to use pbkdf2_sha256 hashing.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.common.auth.auth_service import AuthService
from app.common.models.user import User

def fix_admin_password():
    """Update admin password with correct hashing."""
    db: Session = SessionLocal()
    
    try:
        # Find admin user
        admin_user = db.query(User).filter(User.email == "admin@example.com").first()
        
        if not admin_user:
            print("❌ Admin user with email 'admin@example.com' not found!")
            print("   Available users:")
            users = db.query(User).all()
            for user in users:
                print(f"   - {user.email} (role: {user.role})")
            return False
        
        # Set new password with correct hashing
        new_password = "Admin123!"
        password_hash = AuthService.get_password_hash(new_password)
        
        admin_user.password_hash = password_hash
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin password updated successfully!")
        print(f"   Email: admin@example.com")
        print(f"   Password: {new_password}")
        print(f"   Hash method: pbkdf2_sha256")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Fixing admin password...")
    success = fix_admin_password()
    sys.exit(0 if success else 1)

