"""Core Extensions & Helpers

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Extensions should already be created by database admin during initial setup
    # (see backend/database/db/init/000_extensions.sql)
    # Skipping extension creation here as it requires superuser privileges
    # These extensions are required: uuid-ossp, pg_trgm, citext, btree_gin
    pass


def downgrade():
    op.execute('DROP EXTENSION IF EXISTS btree_gin')
    op.execute('DROP EXTENSION IF EXISTS citext')
    op.execute('DROP EXTENSION IF EXISTS pg_trgm')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')

