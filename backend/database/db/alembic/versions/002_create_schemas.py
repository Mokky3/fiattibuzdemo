"""Create Schemas

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:01.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Schemas should already be created by database admin during initial setup
    # (see backend/database/db/init/010_schemas.sql)
    # Skipping schema creation here as it requires CREATE privileges
    # These schemas are required: ref, ops, staging
    pass


def downgrade():
    op.execute('DROP SCHEMA IF EXISTS staging CASCADE')
    op.execute('DROP SCHEMA IF EXISTS ops CASCADE')
    op.execute('DROP SCHEMA IF EXISTS ref CASCADE')

