#!/usr/bin/env python3
"""
Script to list all users from the PostgreSQL database.
Works with the current database session configuration.
"""
import sys
from pathlib import Path

# Add the backend directory to the path so we can import app modules
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.common.models.user import User, UserRole, UserStatus


def main():
    """List all users from the database."""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("USERS IN DATABASE")
        print("=" * 80)
        print()
        
        # Get all users
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        if not users:
            print("No users found in the database.")
            return
        
        print(f"Total users: {len(users)}\n")
        print("-" * 80)
        print(f"{'ID':<38} {'Email':<30} {'Role':<20} {'Status':<12} {'Active':<8}")
        print("-" * 80)
        
        for user in users:
            user_id = str(user.id)
            email = user.email or "N/A"
            role = user.role.value if user.role else "N/A"
            status = user.status.value if user.status else "N/A"
            is_active = "Yes" if user.is_active else "No"
            
            print(f"{user_id:<38} {email:<30} {role:<20} {status:<12} {is_active:<8}")
        
        print("-" * 80)
        print()
        
        # Show detailed information
        print("\n" + "=" * 80)
        print("DETAILED USER INFORMATION")
        print("=" * 80)
        print()
        
        for user in users:
            print(f"User ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Username: {user.username or 'N/A'}")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Phone: {user.phone or 'N/A'}")
            print(f"  Role: {user.role.value if user.role else 'N/A'}")
            print(f"  Status: {user.status.value if user.status else 'N/A'}")
            print(f"  Active: {user.is_active}")
            print(f"  Email Verified: {user.email_verified}")
            print(f"  Phone Verified: {user.phone_verified}")
            print(f"  Created At: {user.created_at}")
            print(f"  Last Login: {user.last_login or 'Never'}")
            if user.organization_id:
                print(f"  Organization ID: {user.organization_id}")
            print("-" * 80)
        
        # Summary by role
        print("\n" + "=" * 80)
        print("SUMMARY BY ROLE")
        print("=" * 80)
        print()
        
        role_counts = {}
        for user in users:
            role = user.role.value if user.role else "UNKNOWN"
            role_counts[role] = role_counts.get(role, 0) + 1
        
        for role, count in sorted(role_counts.items()):
            print(f"  {role}: {count}")
        
        # Summary by status
        print("\n" + "=" * 80)
        print("SUMMARY BY STATUS")
        print("=" * 80)
        print()
        
        status_counts = {}
        for user in users:
            status = user.status.value if user.status else "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in sorted(status_counts.items()):
            print(f"  {status}: {count}")
        
    except Exception as e:
        print(f"Error querying users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
