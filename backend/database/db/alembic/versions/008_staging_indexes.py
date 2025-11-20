"""Staging Indexes

Revision ID: 008
Revises: 007
Create Date: 2024-01-01 00:00:07.000000

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    # Indexes on staging tables for faster lookups
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_stg_catalog_id 
        ON staging.drug_catalog_raw ((source_row->>'ID'))
    """))
    
    op.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_stg_price_reg 
        ON staging.price_raw ((source_row->>'Номер регистрации'))
    """))


def downgrade():
    op.drop_index('idx_stg_price_reg', table_name='price_raw', schema='staging')
    op.drop_index('idx_stg_catalog_id', table_name='drug_catalog_raw', schema='staging')

