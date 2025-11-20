"""
Script to create the admin_activities table in PostgreSQL
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv(backend_dir / ".env")

def create_admin_activities_table():
    """Create the admin_activities table"""
    try:
        # Get database connection details
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables")
            return False
        
        # Parse DATABASE_URL
        if database_url.startswith("postgresql://") or database_url.startswith("postgresql+psycopg://"):
            # Remove postgresql:// or postgresql+psycopg:// prefix
            if database_url.startswith("postgresql+psycopg://"):
                url_part = database_url[21:]  # Remove postgresql+psycopg:// (21 characters)
            else:
                url_part = database_url[12:]  # Remove postgresql:// (12 characters)
            
            print(f"🔍 Parsing URL part: {url_part}")
            
            if "@" in url_part:
                user_pass, host_db = url_part.split("@", 1)
                print(f"🔍 User/Pass: {user_pass}, Host/DB: {host_db}")
                
                if ":" in user_pass:
                    user, password = user_pass.split(":", 1)
                else:
                    user = user_pass
                    password = ""
                
                if "/" in host_db:
                    host_port, database = host_db.split("/", 1)
                    if ":" in host_port:
                        host, port = host_port.split(":", 1)
                        port = int(port)
                    else:
                        host = host_port
                        port = 5432
                else:
                    host = host_db
                    port = 5432
                    database = "fiattib"
            else:
                print("❌ Invalid DATABASE_URL format - no @ found")
                return False
        else:
            print("❌ DATABASE_URL must start with postgresql://")
            return False
        
        print(f"🔗 Connecting to PostgreSQL: {host}:{port}/{database}")
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        print("✅ Connected to PostgreSQL successfully")
        
        # Create the admin_activities table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS ops.admin_activities (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id UUID REFERENCES core.users(id),
            organization_id UUID REFERENCES ref.hospitals(id),
            activity_type VARCHAR(50) NOT NULL,
            category VARCHAR(50),
            action VARCHAR(255) NOT NULL,
            resource_type VARCHAR(50),
            resource_id VARCHAR(36),
            resource_name VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
        
        print("📋 Creating admin_activities table...")
        cur.execute(create_table_sql)
        print("✅ admin_activities table created successfully")
        
        # Create indexes for better performance
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_user_id ON ops.admin_activities(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_organization_id ON ops.admin_activities(organization_id);",
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_activity_type ON ops.admin_activities(activity_type);",
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_status ON ops.admin_activities(status);",
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_performed_at ON ops.admin_activities(performed_at);",
            "CREATE INDEX IF NOT EXISTS idx_admin_activities_resource_type ON ops.admin_activities(resource_type);"
        ]
        
        print("📋 Creating indexes...")
        for index_sql in indexes_sql:
            cur.execute(index_sql)
        print("✅ Indexes created successfully")
        
        # Create a function to automatically update created_at
        trigger_function_sql = """
        CREATE OR REPLACE FUNCTION ops.update_admin_activities_created_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.created_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        """
        
        print("📋 Creating trigger function...")
        cur.execute(trigger_function_sql)
        
        # Create trigger for created_at
        trigger_sql = """
        DROP TRIGGER IF EXISTS update_admin_activities_created_at ON ops.admin_activities;
        CREATE TRIGGER update_admin_activities_created_at
            BEFORE INSERT ON ops.admin_activities
            FOR EACH ROW
            EXECUTE FUNCTION ops.update_admin_activities_created_at();
        """
        
        print("📋 Creating trigger...")
        cur.execute(trigger_sql)
        print("✅ Trigger created successfully")
        
        # Close connection
        cur.close()
        conn.close()
        
        print("🎉 Admin activities table setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin_activities table: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting admin_activities table creation...")
    success = create_admin_activities_table()
    if success:
        print("✅ Admin activities table creation completed successfully!")
    else:
        print("❌ Admin activities table creation failed!")
        sys.exit(1)
