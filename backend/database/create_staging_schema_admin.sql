-- Run this script as database administrator to create staging schema
-- Usage: psql -U postgres -d fiattib -f create_staging_schema_admin.sql

CREATE SCHEMA IF NOT EXISTS staging;
GRANT USAGE ON SCHEMA staging TO fiattib_app_rw;
GRANT CREATE ON SCHEMA staging TO fiattib_app_rw;

