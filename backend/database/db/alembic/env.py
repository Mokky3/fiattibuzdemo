from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, text
from alembic import context
import os
import sys

# Add the backend directory to Python path
# env.py is at: backend/database/db/alembic/env.py
# Need to get to backend/ which is 3 levels up
backend_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
sys.path.insert(0, backend_dir)

# Also add backend to path explicitly
if 'backend' not in sys.path:
    backend_path = os.path.abspath(os.path.join(backend_dir, 'backend'))
    if os.path.exists(backend_path):
        sys.path.insert(0, backend_path)
    else:
        # If backend doesn't exist, use backend_dir directly
        sys.path.insert(0, backend_dir)

from app.db.base_class import Base  # Base must import model modules

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    url = os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    cfg = config.get_section(config.config_ini_section) or {}
    url = os.environ.get("DATABASE_URL", cfg.get("sqlalchemy.url"))
    # Set search_path via connect_args so schema is visible to DDL operations
    connectable = engine_from_config(
        {**cfg, "sqlalchemy.url": url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"options": "-csearch_path=public,staging,ref,ops,ehr,core,financial"}
    )
    with connectable.connect() as connection:
        # Set version table to ref schema where user has permissions
        context.configure(
            connection=connection, 
            target_metadata=target_metadata, 
            compare_type=True,
            version_table_schema='ref',  # Use ref schema for version table
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
