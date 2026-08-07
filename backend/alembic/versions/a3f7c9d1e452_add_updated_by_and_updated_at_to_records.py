"""add_updated_by_and_updated_at_to_records

Adds nullable updated_by_id (FK to users.id) and updated_at (timestamptz)
audit columns to both fluid_records and vital_sign_records tables.

Revision ID: a3f7c9d1e452
Revises: 66bc6cda23d3
Create Date: 2026-08-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7c9d1e452'
down_revision: Union[str, Sequence[str], None] = '66bc6cda23d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add audit columns to fluid_records and vital_sign_records."""
    op.add_column('fluid_records', sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('fluid_records', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))

    op.add_column('vital_sign_records', sa.Column('updated_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('vital_sign_records', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove audit columns from fluid_records and vital_sign_records."""
    op.drop_column('vital_sign_records', 'updated_at')
    op.drop_column('vital_sign_records', 'updated_by_id')

    op.drop_column('fluid_records', 'updated_at')
    op.drop_column('fluid_records', 'updated_by_id')
