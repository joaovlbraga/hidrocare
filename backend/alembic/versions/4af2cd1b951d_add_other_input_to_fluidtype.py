"""add_other_input_to_fluidtype

Revision ID: 4af2cd1b951d
Revises: 391e0775e73b
Create Date: 2026-08-10 14:58:05.341155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4af2cd1b951d'
down_revision: Union[str, Sequence[str], None] = '391e0775e73b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE fluidtype ADD VALUE IF NOT EXISTS 'OTHER_INPUT'")


def downgrade() -> None:
    """Downgrade schema."""
    # Removing an enum value is not supported in PostgreSQL without recreating the type.
    pass
