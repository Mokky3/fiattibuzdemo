"""Staging Raw Tables

Revision ID: 007
Revises: 006
Create Date: 2024-01-01 00:00:06.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Note: Staging schema should already exist (created by admin)
    # If schema doesn't exist, table creation will fail with a clear error
    # We don't try to create it here because it requires admin privileges
    
    # Drug catalog raw staging
    op.create_table(
        'drug_catalog_raw',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('source_row', postgresql.JSONB(), nullable=False),
        sa.Column('src_file', sa.Text(), nullable=True),
        sa.Column('src_sheet', sa.Text(), nullable=True),
        sa.Column('imported_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        schema='staging'
    )
    
    # Price raw staging
    op.create_table(
        'price_raw',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('source_row', postgresql.JSONB(), nullable=False),
        sa.Column('src_file', sa.Text(), nullable=True),
        sa.Column('src_sheet', sa.Text(), nullable=True),
        sa.Column('imported_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        schema='staging'
    )


def downgrade():
    op.drop_table('price_raw', schema='staging')
    op.drop_table('drug_catalog_raw', schema='staging')

