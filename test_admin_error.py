#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.db.session import SessionLocal
from app.crud.admin import admin

def test_admin_crud():
    try:
        db = SessionLocal()
        print("Testing admin CRUD functions...")

        # Test get_system_stats
        print("\n1. Testing get_system_stats...")
        stats = admin.get_system_stats(db=db)
        print(f"Stats: {stats}")

        # Test get_system_alerts
        print("\n2. Testing get_system_alerts...")
        alerts = admin.get_system_alerts(db=db, limit=5)
        print(f"Alerts count: {len(alerts)}")

        # Test get_system_health
        print("\n3. Testing get_system_health...")
        health = admin.get_system_health(db=db)
        print(f"Health: {health}")

        print("\nAll tests passed!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        db.close()

if __name__ == "__main__":
    test_admin_crud()
















