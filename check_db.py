#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.db.session import engine
from app.db.base_class import Base
from sqlalchemy import inspect

def check_database():
    try:
        # Create tables if they don't exist (checkfirst=True)
        print("Creating tables if they don't exist...")
        Base.metadata.create_all(bind=engine, checkfirst=True)

        # Get inspector to check existing tables
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        print(f"\nExisting tables: {existing_tables}")
        print(f"Total tables: {len(existing_tables)}")

        # Check if required admin tables exist
        required_tables = [
            'admin_activities',
            'system_alerts',
            'system_configs',
            'system_logs',
            'audit_trail',
            'users',
            'hospitals'
        ]

        print("\nRequired tables status:")
        for table in required_tables:
            exists = table in existing_tables
            print(f"  {table}: {'✓' if exists else '✗'}")

        return True

    except Exception as e:
        print(f"Error checking database: {e}")
        return False

if __name__ == "__main__":
    check_database()
















