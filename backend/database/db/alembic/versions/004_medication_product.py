"""Medication Product Core

Revision ID: 004
Revises: 003
Create Date: 2024-01-01 00:00:03.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Medication Product
    op.execute("""
        CREATE TABLE IF NOT EXISTS ref.medication_product (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            pharm_id TEXT,
            brand_name TEXT NOT NULL,
            brand_name_normalized TEXT GENERATED ALWAYS AS (regexp_replace(lower(brand_name), '\\s+', ' ', 'g')) STORED,
            registration_number TEXT,
            mnn_id UUID REFERENCES ref.mnn(id),
            dosage_form_id UUID REFERENCES ref.dosage_form(id),
            route_id UUID REFERENCES ref.route(id),
            strength_value NUMERIC,
            strength_unit_id UUID REFERENCES ref.unit(id),
            manufacturer_id UUID REFERENCES ref.manufacturer(id),
            country_of_origin TEXT,
            rx_required BOOLEAN,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    
    # Create indexes
    # Note: trigram index requires pg_trgm extension which may not be available
    # Using regular index instead - fuzzy matching can use ILIKE
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_med_prod_brand_norm 
        ON ref.medication_product(LOWER(brand_name_normalized))
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_med_prod_regnum 
        ON ref.medication_product(registration_number)
    """)
    
    # Synonyms
    op.create_table(
        'medication_product_synonym',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('lang', sa.Text(), nullable=True, server_default='ru'),
        sa.ForeignKeyConstraint(['product_id'], ['ref.medication_product.id'], ondelete='CASCADE'),
        schema='ref'
    )
    
    # Product-category m2m
    op.create_table(
        'medication_product_category',
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['ref.medication_product.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['ref.category_tag.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('product_id', 'category_id'),
        schema='ref'
    )


def downgrade():
    op.drop_table('medication_product_category', schema='ref')
    op.drop_table('medication_product_synonym', schema='ref')
    op.drop_index('idx_med_prod_regnum', table_name='medication_product', schema='ref')
    op.execute('DROP INDEX IF EXISTS ref.idx_med_prod_brand_norm_trgm')
    op.drop_table('medication_product', schema='ref')

