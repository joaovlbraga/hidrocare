"""add_developer_role

Revision ID: 391e0775e73b
Revises: cea4d1df4f61
Create Date: 2026-08-10 13:10:00.584036

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '391e0775e73b'
down_revision: Union[str, Sequence[str], None] = 'cea4d1df4f61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'DEVELOPER'")


def downgrade() -> None:
    """Downgrade schema."""
    # Cannot easily remove enum values in PostgreSQL without rebuilding the type,
    # so we leave it as-is in downgrade to ensure safety.
    pass
