"""
Script to create the user_invitations table in PostgreSQL
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

def create_user_invitations_table():
    """Create the user_invitations table"""
    try:
        # Get database connection details
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables")
            return False
        
        # Parse DATABASE_URL
        # Format: postgresql+psycopg://user:password@host:port/database or postgresql://user:password@host:port/database
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
        
        # Create the user_invitations table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS core.user_invitations (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            contact VARCHAR(255) NOT NULL,
            contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('EMAIL', 'PHONE')),
            invitation_token VARCHAR(255) NOT NULL UNIQUE,
            invitation_link TEXT,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            role VARCHAR(50) NOT NULL,
            organization_id UUID REFERENCES ref.hospitals(id),
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
            sent_at TIMESTAMP WITH TIME ZONE,
            accepted_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
            notification_type VARCHAR(50),
            notification_provider VARCHAR(100),
            notification_id VARCHAR(255),
            created_by UUID REFERENCES core.users(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        """
        
        print("📋 Creating user_invitations table...")
        cur.execute(create_table_sql)
        print("✅ user_invitations table created successfully")
        
        # Create indexes for better performance
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_contact ON core.user_invitations(contact);",
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON core.user_invitations(invitation_token);",
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON core.user_invitations(status);",
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_organization ON core.user_invitations(organization_id);",
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON core.user_invitations(expires_at);",
            "CREATE INDEX IF NOT EXISTS idx_user_invitations_created_by ON core.user_invitations(created_by);"
        ]
        
        print("📋 Creating indexes...")
        for index_sql in indexes_sql:
            cur.execute(index_sql)
        print("✅ Indexes created successfully")
        
        # Create a function to automatically update updated_at
        trigger_function_sql = """
        CREATE OR REPLACE FUNCTION core.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        """
        
        print("📋 Creating trigger function...")
        cur.execute(trigger_function_sql)
        
        # Create trigger for updated_at
        trigger_sql = """
        DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON core.user_invitations;
        CREATE TRIGGER update_user_invitations_updated_at
            BEFORE UPDATE ON core.user_invitations
            FOR EACH ROW
            EXECUTE FUNCTION core.update_updated_at_column();
        """
        
        print("📋 Creating trigger...")
        cur.execute(trigger_sql)
        print("✅ Trigger created successfully")
        
        # Close connection
        cur.close()
        conn.close()
        
        print("🎉 User invitations table setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating user_invitations table: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting user_invitations table creation...")
    success = create_user_invitations_table()
    if success:
        print("✅ User invitations table creation completed successfully!")
    else:
        print("❌ User invitations table creation failed!")
        sys.exit(1)
