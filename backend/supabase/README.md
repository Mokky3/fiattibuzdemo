# Supabase Migration Guide

This directory contains scripts and migrations for transferring your database schemas to Supabase.

## Generated Files

- `migrations/20251121071748_initial_schema.sql` - Complete database schema generated from SQLAlchemy models

## Quick Start

### Option 1: Apply via Script (Recommended)

```powershell
cd backend
python scripts/apply_supabase_migration.py
```

This script will:
1. Connect to your Supabase database
2. Find the latest migration file
3. Apply it transactionally
4. Verify schemas and tables were created

### Option 2: Manual Application

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/20251121071748_initial_schema.sql`
3. Paste and execute in the SQL Editor

## What Was Generated

- **6 Schemas**: `core`, `ehr`, `ref`, `ops`, `financial`, `staging`
- **127 Tables**: All your SQLAlchemy models converted to PostgreSQL DDL
- **All Foreign Keys**: Relationships between tables preserved
- **All Constraints**: Primary keys, unique constraints, etc.

## Connection String

Your Supabase connection string is configured in `scripts/apply_supabase_migration.py`:
```
postgresql+psycopg2://postgres:[PASSWORD]@db.baisgogpswdaapukljwl.supabase.co:5432/postgres?sslmode=require
```

## Regenerating Schema

If you make changes to your SQLAlchemy models, regenerate the schema:

```powershell
python backend/scripts/generate_supabase_schema.py
```

This will create a new timestamped migration file in `migrations/`.

## Notes

- **Legacy Lab Tables**: The legacy lab tables (`lab_orders_legacy`, etc.) were skipped due to foreign key reference issues. If needed, create them manually.
- **Indexes**: Most indexes are created automatically by PostgreSQL for primary keys and unique constraints. Additional indexes can be added manually if needed.
- **Data Migration**: This only creates the schema structure. To migrate data, you'll need to export from your current database and import to Supabase separately.

## Troubleshooting

### Connection Issues
- Verify your Supabase password is correct
- Check that your IP is allowed in Supabase dashboard (Settings → Database → Connection Pooling)

### Migration Errors
- Some tables may already exist - the script will show warnings but continue
- Check Supabase logs for detailed error messages
- You can run individual SQL statements from the migration file if needed

## Next Steps

1. ✅ Apply the migration to Supabase
2. Update your `DATABASE_URL` environment variable to point to Supabase
3. Test your application with the new database
4. Migrate existing data (if applicable)

