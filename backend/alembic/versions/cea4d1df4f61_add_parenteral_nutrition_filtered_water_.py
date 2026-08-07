"""add_parenteral_nutrition_filtered_water_drain_stool_multi_item

Revision ID: cea4d1df4f61
Revises: a3f7c9d1e452
Create Date: 2026-08-07 15:10:17.116209

Changes:
  1. Add PARENTERAL_NUTRITION and FILTERED_WATER to the fluidtype PostgreSQL enum.
  2. Drop the old partial unique index (which covered DRAIN/STOOL) and recreate
     it covering only IV_HYDRATION, URINE, SNE_SNG — DRAIN and STOOL now support
     multiple entries per hour (multi-item behaviour).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cea4d1df4f61'
down_revision: Union[str, Sequence[str], None] = 'a3f7c9d1e452'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extend the PostgreSQL enum with two new values.
    op.execute("ALTER TYPE fluidtype ADD VALUE IF NOT EXISTS 'PARENTERAL_NUTRITION'")
    op.execute("ALTER TYPE fluidtype ADD VALUE IF NOT EXISTS 'FILTERED_WATER'")

    # 2. Drop the old partial unique index that incorrectly covered DRAIN/STOOL.
    op.execute("DROP INDEX IF EXISTS uq_fluid_single_value_category")

    # 3. Recreate the index covering only IV_HYDRATION, URINE, SNE_SNG.
    op.execute("""
        CREATE UNIQUE INDEX uq_fluid_single_value_category
        ON fluid_records (patient_id, occurred_at, category)
        WHERE category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG')
    """)


def downgrade() -> None:
    # Reverse the index change (enum values cannot be removed from PG enums).
    op.execute("DROP INDEX IF EXISTS uq_fluid_single_value_category")
    op.execute("""
        CREATE UNIQUE INDEX uq_fluid_single_value_category
        ON fluid_records (patient_id, occurred_at, category)
        WHERE category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')
    """)
