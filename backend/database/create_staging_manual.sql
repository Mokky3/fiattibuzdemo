-- Create staging schema manually
-- Run this through pgAdmin (http://localhost:8081) or psql with admin privileges
-- Login: admin@fiattib.local / admin123

-- If using pgAdmin, connect to the database and run this SQL:
CREATE SCHEMA IF NOT EXISTS staging;
GRANT USAGE ON SCHEMA staging TO fiattib_app_rw;
GRANT CREATE ON SCHEMA staging TO fiattib_app_rw;

-- After running this, migrations should complete successfully

