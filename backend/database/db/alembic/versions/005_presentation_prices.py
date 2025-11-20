"""Presentation & Prices

Revision ID: 005
Revises: 004
Create Date: 2024-01-01 00:00:04.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Medication Presentation
    op.create_table(
        'medication_presentation',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pack_text', sa.Text(), nullable=True),
        sa.Column('items_per_pack', sa.Integer(), nullable=True),
        sa.Column('pack_size_value', sa.Numeric(), nullable=True),
        sa.Column('pack_size_unit_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('gtin', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['ref.medication_product.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pack_size_unit_id'], ['ref.unit.id'], ),
        schema='ref'
    )
    
    # Create unique constraint on (product_id, COALESCE(gtin,''), COALESCE(pack_text,''))
    op.execute("""
        CREATE UNIQUE INDEX uq_med_presentation_product_gtin_pack 
        ON ref.medication_presentation (product_id, COALESCE(gtin,''), COALESCE(pack_text,''))
    """)
    
    # Medication Price
    op.create_table(
        'medication_price',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('presentation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('price_type', sa.Text(), nullable=False, server_default='retail'),
        sa.Column('currency', sa.Text(), nullable=False),
        sa.Column('amount', sa.Numeric(), nullable=False),
        sa.Column('source', sa.Text(), nullable=True),
        sa.Column('noted_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['presentation_id'], ['ref.medication_presentation.id'], ondelete='CASCADE'),
        schema='ref'
    )
    
    op.create_index('idx_price_presentation', 'medication_price', ['presentation_id'], schema='ref')


def downgrade():
    op.drop_index('idx_price_presentation', table_name='medication_price', schema='ref')
    op.drop_table('medication_price', schema='ref')
    op.execute('DROP INDEX IF EXISTS ref.uq_med_presentation_product_gtin_pack')
    op.drop_table('medication_presentation', schema='ref')

