"""Seed Basic Units/Routes

Revision ID: 006
Revises: 005
Create Date: 2024-01-01 00:00:05.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Seed units
    units_data = [
        ('mg', 'milligram'),
        ('g', 'gram'),
        ('ml', 'milliliter'),
        ('mcg', 'microgram'),
        ('%', 'percent'),
        ('IU', 'International Unit'),
        ('tab', 'tablet'),
        ('cap', 'capsule'),
        ('amp', 'ampoule'),
        ('vial', 'vial'),
    ]
    
    for code, name in units_data:
        op.execute(
            text(f"""
                INSERT INTO ref.unit (code, name)
                VALUES ('{code}', '{name}')
                ON CONFLICT (code) DO NOTHING
            """)
        )
    
    # Seed routes
    routes_data = [
        ('oral', 'oral'),
        ('topical', 'topical'),
        ('parenteral', 'parenteral'),
        ('intravenous', 'intravenous'),
        ('intramuscular', 'intramuscular'),
        ('irrigation', 'irrigation'),
        ('nasal_or_topical', 'nasal or topical'),
    ]
    
    for code, name in routes_data:
        op.execute(
            text(f"""
                INSERT INTO ref.route (code, name)
                VALUES ('{code}', '{name}')
                ON CONFLICT (code) DO NOTHING
            """)
        )


def downgrade():
    # Remove seeded data
    op.execute(text("DELETE FROM ref.route WHERE code IN ('oral', 'topical', 'parenteral', 'intravenous', 'intramuscular', 'irrigation', 'nasal_or_topical')"))
    op.execute(text("DELETE FROM ref.unit WHERE code IN ('mg', 'g', 'ml', 'mcg', '%', 'IU', 'tab', 'cap', 'amp', 'vial')"))

