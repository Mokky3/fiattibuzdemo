# PostgreSQL Migration Guide

This guide will help you migrate your Fiattib EHR system from SQLite to PostgreSQL.

## 🎯 Overview

The migration process includes:
- ✅ **SQLAlchemy Models**: Complete models for all existing tables
- ✅ **PostgreSQL Schemas**: Multi-schema architecture (core, ehr, ops, ref, financial)
- ✅ **Database Setup**: Automated PostgreSQL container setup
- ✅ **Data Migration**: Script to transfer all data from SQLite to PostgreSQL
- ✅ **Relationships**: Proper foreign key relationships and indexes

## 🚀 Quick Start

### 1. Setup PostgreSQL Database

```bash
# Run the setup script
python setup_postgres.py
```

This will:
- Start PostgreSQL container with Docker Compose
- Create the `fiattib` database
- Set up schemas (core, ehr, ops, ref, financial)
- Create application roles and permissions
- Run all schema creation scripts

### 2. Migrate Data from SQLite

```bash
# Run the migration script
python migrate_to_postgres.py
```

This will:
- Connect to your existing SQLite database
- Transfer all data to PostgreSQL
- Handle data type conversions
- Preserve relationships and constraints
- Provide progress reporting

### 3. Update Application Configuration

Update your environment variables:

```bash
# Set PostgreSQL as your database
export DATABASE_URL="postgresql+psycopg://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib"
```

## 📊 Database Architecture

### Schema Organization

- **`core`** - User management and authentication
- **`ehr`** - Electronic Health Records (patients, appointments, lab results, etc.)
- **`ops`** - Operations (audit logs, notifications, tasks, etc.)
- **`ref`** - Reference data (specialties, ICD codes, medications, etc.)
- **`financial`** - Billing and financial transactions

### Key Features

- **UUID Primary Keys**: All tables use UUID for better scalability
- **JSONB Support**: Native JSON storage for flexible data
- **Proper Indexing**: Optimized indexes for common queries
- **Foreign Key Constraints**: Maintains data integrity
- **Audit Trail**: Comprehensive audit logging
- **Multi-tenant Ready**: Schema-based separation

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

### 1. Start PostgreSQL Container

```bash
cd backend/database/db
docker compose -f docker-compose.db.yml up -d
```

### 2. Create Environment File

Create `backend/database/db/.env.db`:

```env
POSTGRES_DB=fiattib
POSTGRES_USER=postgres
POSTGRES_PASSWORD=NoGletcherGang52
DATABASE_URL=postgresql+psycopg://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib
PG_URL=postgresql://fiattib_owner:NoGletcherGang52@localhost:5432/fiattib
ENVIRONMENT=development
SQL_ECHO=true
```

### 3. Run Schema Scripts

```bash
# Connect to PostgreSQL and run schema files
psql -h localhost -U postgres -d fiattib -f backend/database/db/schema/core.sql
psql -h localhost -U postgres -d fiattib -f backend/database/db/schema/ehr.sql
psql -h localhost -U postgres -d fiattib -f backend/database/db/schema/ops.sql
psql -h localhost -U postgres -d fiattib -f backend/database/db/schema/ref.sql
psql -h localhost -U postgres -d fiattib -f backend/database/db/schema/financial.sql
```

## 📋 Migration Checklist

- [ ] PostgreSQL container is running
- [ ] Database and schemas are created
- [ ] Application roles have proper permissions
- [ ] All schema scripts have been executed
- [ ] Data migration completed successfully
- [ ] Application configuration updated
- [ ] Connection tested and verified
- [ ] Application tested with PostgreSQL

## 🔍 Verification

### Test Database Connection

```python
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='fiattib',
    user='fiattib_app_rw',
    password='change_me_app_rw'
)

cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM core.users")
user_count = cursor.fetchone()[0]
print(f"Users in database: {user_count}")

conn.close()
```

### Check Schema Tables

```sql
-- List all tables by schema
SELECT 
    schemaname,
    tablename,
    n_tup_ins as rows_inserted
FROM pg_stat_user_tables 
WHERE schemaname IN ('core', 'ehr', 'ops', 'ref', 'financial')
ORDER BY schemaname, tablename;
```

## 🛠️ Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check if port 5432 is already in use
   netstat -an | grep 5432
   
   # Stop existing PostgreSQL services
   sudo systemctl stop postgresql
   ```

2. **Permission denied**
   ```bash
   # Make sure the user has proper permissions
   psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fiattib TO fiattib_app_rw;"
   ```

3. **Migration fails**
   ```bash
   # Check SQLite database exists
   ls -la ehr.db
   
   # Verify PostgreSQL connection
   psql -h localhost -U fiattib_app_rw -d fiattib -c "SELECT 1;"
   ```

### Logs and Debugging

- **PostgreSQL logs**: `docker logs fiattib_postgres`
- **Application logs**: Check your application logs for connection errors
- **Migration logs**: The migration script provides detailed progress output

## 📈 Performance Considerations

### Indexing Strategy

The migration includes optimized indexes for:
- Primary keys (UUID)
- Foreign keys
- Common query patterns
- Date/time fields
- Status fields

### Connection Pooling

For production, consider:
- Using connection pooling (e.g., PgBouncer)
- Setting appropriate `pool_size` in SQLAlchemy
- Monitoring connection usage

## 🔐 Security

### Production Recommendations

1. **Change default passwords**
2. **Use SSL connections**
3. **Implement Row Level Security (RLS)**
4. **Regular security updates**
5. **Backup strategy**

### RLS Implementation

```sql
-- Example RLS policy
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_view ON core.users
  FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the migration logs
3. Verify your environment configuration
4. Test database connectivity manually

## 🎉 Next Steps

After successful migration:

1. **Update your application** to use PostgreSQL
2. **Test all functionality** thoroughly
3. **Set up monitoring** for the new database
4. **Plan backup strategy** for production
5. **Consider performance tuning** based on usage patterns

---

**Happy migrating! 🚀**
