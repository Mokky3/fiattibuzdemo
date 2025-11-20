"""Reference Tables (Units, Routes, Dosage Forms, Manufacturers, MNN, Categories)

Revision ID: 003
Revises: 002
Create Date: 2024-01-01 00:00:02.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Units
    op.create_table(
        'unit',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('code', sa.Text(), nullable=False, unique=True),
        sa.Column('name', sa.Text(), nullable=False),
        schema='ref'
    )
    
    # Routes
    op.create_table(
        'route',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('code', sa.Text(), nullable=False, unique=True),
        sa.Column('name', sa.Text(), nullable=False),
        schema='ref'
    )
    
    # Dosage form
    op.create_table(
        'dosage_form',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('code', sa.Text(), nullable=True, unique=True),
        sa.Column('name', sa.Text(), nullable=False, unique=True),
        schema='ref'
    )
    
    # Manufacturers (using TEXT instead of CITEXT since extension may not exist)
    op.execute("""
        CREATE TABLE IF NOT EXISTS ref.manufacturer (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            country TEXT
        )
    """)
    # Create unique index for (name, country) where NULLs are treated as equal
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_manufacturer_name_country 
        ON ref.manufacturer (LOWER(name), COALESCE(country, ''))
    """)
    
    # MNN (international nonproprietary name)
    op.execute("""
        CREATE TABLE IF NOT EXISTS ref.mnn (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT UNIQUE NOT NULL
        )
    """)
    # Create case-insensitive unique index
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mnn_name_ci ON ref.mnn (LOWER(name))
    """)
    
    # Category tags
    op.execute("""
        CREATE TABLE IF NOT EXISTS ref.category_tag (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT UNIQUE NOT NULL
        )
    """)
    # Create case-insensitive unique index
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_category_tag_name_ci ON ref.category_tag (LOWER(name))
    """)


def downgrade():
    op.execute('DROP TABLE IF EXISTS ref.category_tag CASCADE')
    op.execute('DROP TABLE IF EXISTS ref.mnn CASCADE')
    op.execute('DROP TABLE IF EXISTS ref.manufacturer CASCADE')
    op.drop_table('dosage_form', schema='ref')
    op.drop_table('route', schema='ref')
    op.drop_table('unit', schema='ref')

