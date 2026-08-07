"""add_unique_index_single_value_fluids

Deduplicates pre-existing duplicate rows for single-value categories
('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL') keeping the most recent created_at
record before creating partial unique index uq_fluid_single_value_category.

Revision ID: 66bc6cda23d3
Revises: 7b798d5e9fbd
Create Date: 2026-08-06 16:38:39.758877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66bc6cda23d3'
down_revision: Union[str, Sequence[str], None] = '7b798d5e9fbd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and deduplicate pre-existing single-value fluid records."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("COMMIT"))
        op.execute(sa.text("ALTER TYPE fluidtype ADD VALUE IF NOT EXISTS 'SNE_SNG'"))
        op.execute(sa.text("ALTER TYPE fluidtype ADD VALUE IF NOT EXISTS 'OTHER_OUTPUT'"))
        op.execute(sa.text("COMMIT"))

    op.execute(
        """
        DELETE FROM fluid_records
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY patient_id, occurred_at, category
                    ORDER BY created_at DESC, id DESC
                ) as rnum
                FROM fluid_records
                WHERE category::text IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')
            ) t
            WHERE t.rnum > 1
        )
        """
    )

    op.create_index(
        'uq_fluid_single_value_category',
        'fluid_records',
        ['patient_id', 'occurred_at', 'category'],
        unique=True,
        postgresql_where=sa.text("category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')"),
        sqlite_where=sa.text("category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')")
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'uq_fluid_single_value_category',
        table_name='fluid_records',
        postgresql_where=sa.text("category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')"),
        sqlite_where=sa.text("category IN ('IV_HYDRATION', 'URINE', 'SNE_SNG', 'DRAIN', 'STOOL')")
    )
