# Fix Missing Doctor Profiles

This guide explains how to fix the "Doctor access required" error by creating missing Doctor profiles for existing doctor users.

## Problem

The error occurs when:
- Users have `role='DOCTOR'` in the `core.users` table
- But they don't have corresponding records in the `ehr.doctors` table
- The `/doctor/patients` endpoint requires a Doctor profile to work

## Solution Options

### Option 1: Run SQL Script in Supabase (Recommended)

This is the easiest and most reliable method:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor** → **New Query**

2. **Copy and paste the SQL script**
   - Open `backend/scripts/fix_doctor_profiles.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

3. **Run the script**
   - Click **Run** or press `Ctrl+Enter`
   - Check the output for success messages

4. **Verify the fix**
   - The script will show a verification query at the end
   - All doctor users should show "✅ Has profile"

### Option 2: Run Python Script Locally (If you have database access)

If you can connect to the production database from your local machine:

```bash
cd backend
python scripts/fix_doctor_profiles.py
```

Make sure to set the `DATABASE_URL` environment variable:
```bash
DATABASE_URL="postgresql+psycopg2://user:pass@host:5432/db?sslmode=require" python scripts/fix_doctor_profiles.py
```

### Option 3: Run via Cloud Run (Advanced)

If you have access to Cloud Run, you could create a temporary admin endpoint that runs the fix. However, the SQL script is simpler and safer.

## What the Fix Does

For each doctor user without a Doctor profile, the script creates:

- **License Number**: `DOC-XXXXXXXX` (unique, based on user ID)
- **Primary Specialization**: "General Practice" (default)
- **License Issuer**: "Ministry of Health" (default)
- **Is Accepting Patients**: `TRUE` (default)

## After Running the Fix

1. **Test the doctor portal**
   - Log in as a doctor user
   - Try accessing `/doctor/patients`
   - The error should be resolved

2. **If still having issues**
   - Users may need to log out and log back in
   - Or refresh the page to get a new authentication token

## Prevention

The `seed_users.py` script has been updated to automatically create Doctor profiles when seeding new doctor users. This prevents the issue from happening again in the future.

## Troubleshooting

### "Permission denied" errors in SQL Editor
- Make sure you're logged in as a project owner or have admin privileges
- Check that the `ehr.doctors` table exists and you have INSERT permissions

### "Table does not exist" errors
- Verify that the database schema is properly set up
- Check that the `ehr` schema exists: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'ehr';`
- Check that the `doctors` table exists: `SELECT * FROM information_schema.tables WHERE table_schema = 'ehr' AND table_name = 'doctors';`

### Still getting "Doctor access required" after fix
- Verify the fix worked: Run the verification query at the end of the SQL script
- Check that the user's JWT token includes the correct role
- Try logging out and logging back in
- Check backend logs for more detailed error messages


