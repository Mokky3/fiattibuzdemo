#!/usr/bin/env python3
"""
Script to check Cloud Run logs and verify database connection.
"""
import subprocess
import sys

SERVICE_NAME = "fiattib-backend"
REGION = "us-east4"
PROJECT = "fiattib"

print("=" * 80)
print("Cloud Run Database Connection Check")
print("=" * 80)

# Check environment variables
print("\n1. Checking environment variables...")
try:
    result = subprocess.run(
        [
            "gcloud", "run", "services", "describe", SERVICE_NAME,
            "--region", REGION,
            "--project", PROJECT,
            "--format", "yaml(spec.template.spec.containers[0].env)"
        ],
        capture_output=True,
        text=True,
        check=True
    )
    
    print(result.stdout)
    
    if "DATABASE_URL" in result.stdout:
        print("\n✅ DATABASE_URL is set")
    else:
        print("\n❌ DATABASE_URL is NOT set - this is the problem!")
        print("   Run: python scripts/update_cloud_run_db.py")
        
except subprocess.CalledProcessError as e:
    print(f"Error: {e.stderr}")
    sys.exit(1)

# Check recent logs
print("\n2. Checking recent logs for database connection...")
print("-" * 80)
try:
    result = subprocess.run(
        [
            "gcloud", "run", "services", "logs", "read", SERVICE_NAME,
            "--region", REGION,
            "--project", PROJECT,
            "--limit", "100"
        ],
        capture_output=True,
        text=True,
        check=True
    )
    
    logs = result.stdout
    
    # Look for database-related messages
    if "[DB] Using PostgreSQL" in logs:
        print("✅ Found PostgreSQL connection in logs")
        for line in logs.split('\n'):
            if "[DB] Using PostgreSQL" in line or "[DB] Using SQLite" in line:
                print(f"   {line}")
    elif "[DB] Using SQLite" in logs:
        print("❌ Backend is using SQLite instead of PostgreSQL!")
        print("   This means DATABASE_URL is not set or not working")
        for line in logs.split('\n'):
            if "[DB] Using SQLite" in line:
                print(f"   {line}")
    else:
        print("⚠️  No database connection messages found in recent logs")
        print("   Showing last 20 lines:")
        print("\n".join(logs.split('\n')[-20:]))
        
except subprocess.CalledProcessError as e:
    print(f"Error reading logs: {e.stderr}")
    print("\nTroubleshooting:")
    print("1. Make sure you're authenticated: gcloud auth login")
    print("2. Check service exists: gcloud run services list --project fiattib")

print("\n" + "=" * 80)

