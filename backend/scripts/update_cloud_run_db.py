#!/usr/bin/env python3
"""
Script to update Cloud Run service with Supabase DATABASE_URL.
This helps verify the connection string format and update the service.
"""
import subprocess
import sys
import urllib.parse

# Supabase connection details
SUPABASE_HOST = "db.baisgogpswdaapukljwl.supabase.co"
SUPABASE_PORT = "5432"
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = "Myfiattib1/"
SUPABASE_PROJECT = "fiattib"
SERVICE_NAME = "fiattib-backend"
REGION = "us-east4"  # Based on the error URL: fiattib-backend-677633413590.us-east4.run.app

# URL encode the password
encoded_password = urllib.parse.quote(SUPABASE_PASSWORD, safe='')

# Build connection string - SQLAlchemy format
# Note: SQLAlchemy uses postgresql:// but we can also use postgresql+psycopg2://
DATABASE_URL = f"postgresql+psycopg2://{SUPABASE_USER}:{encoded_password}@{SUPABASE_HOST}:{SUPABASE_PORT}/{SUPABASE_DB}?sslmode=require"

print("=" * 80)
print("Cloud Run DATABASE_URL Update Script")
print("=" * 80)
print(f"\nService: {SERVICE_NAME}")
print(f"Region: {REGION}")
print(f"Project: {SUPABASE_PROJECT}")
print(f"\nConnection String (first 50 chars): {DATABASE_URL[:50]}...")
print(f"Full Connection String: {DATABASE_URL}")
print("\n" + "=" * 80)

# Check current environment variables
print("\n1. Checking current Cloud Run environment variables...")
try:
    result = subprocess.run(
        [
            "gcloud", "run", "services", "describe", SERVICE_NAME,
            "--region", REGION,
            "--project", SUPABASE_PROJECT,
            "--format", "value(spec.template.spec.containers[0].env)"
        ],
        capture_output=True,
        text=True,
        check=False
    )
    
    if result.returncode == 0:
        print("Current environment variables:")
        print(result.stdout)
    else:
        print(f"Warning: Could not fetch current env vars: {result.stderr}")
except Exception as e:
    print(f"Error checking current env vars: {e}")

# Update command
print("\n2. Command to update DATABASE_URL:")
print("-" * 80)
update_cmd = [
    "gcloud", "run", "services", "update", SERVICE_NAME,
    "--region", REGION,
    "--update-env-vars", f"DATABASE_URL={DATABASE_URL}",
    "--project", SUPABASE_PROJECT
]

print(" ".join(update_cmd))
print("-" * 80)

# Ask for confirmation
response = input("\nDo you want to run this command now? (yes/no): ").strip().lower()
if response in ['yes', 'y']:
    print("\n3. Updating Cloud Run service...")
    try:
        result = subprocess.run(update_cmd, check=True)
        print("\n✅ Successfully updated Cloud Run service!")
        print("\n4. Verifying update...")
        
        # Verify the update
        verify_cmd = [
            "gcloud", "run", "services", "describe", SERVICE_NAME,
            "--region", REGION,
            "--project", SUPABASE_PROJECT,
            "--format", "get(spec.template.spec.containers[0].env)"
        ]
        verify_result = subprocess.run(verify_cmd, capture_output=True, text=True)
        if "DATABASE_URL" in verify_result.stdout:
            print("✅ DATABASE_URL is set in Cloud Run")
        else:
            print("⚠️  Warning: DATABASE_URL might not be visible in this output")
        
        print("\n5. Next steps:")
        print("   - Wait a few seconds for the new revision to deploy")
        print("   - Check Cloud Run logs to verify PostgreSQL connection:")
        print(f"     gcloud run services logs read {SERVICE_NAME} --region {REGION} --project {SUPABASE_PROJECT} --limit 50")
        print("   - Look for: '[DB] Using PostgreSQL: ...' in the logs")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error updating service: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure you're authenticated: gcloud auth login")
        print("2. Make sure you have permissions: gcloud projects get-iam-policy fiattib")
        print("3. Try setting it manually via Cloud Console")
        sys.exit(1)
else:
    print("\nSkipped. You can run the command manually or set it via Cloud Console.")
    print("\nAlternative: Set via Cloud Console")
    print("1. Go to: https://console.cloud.google.com/run")
    print(f"2. Select service: {SERVICE_NAME}")
    print("3. Click 'Edit & Deploy New Revision'")
    print("4. Go to 'Variables & Secrets' tab")
    print("5. Add/Update: DATABASE_URL")
    print(f"6. Value: {DATABASE_URL}")
    print("7. Click 'Deploy'")

print("\n" + "=" * 80)

