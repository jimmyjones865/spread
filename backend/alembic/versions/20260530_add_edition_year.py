"""add edition_year to books

Revision ID: a1b2c3d4e5f6
Revises: 55663633686a
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '55663633686a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('books', sa.Column('edition_year', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('books', 'edition_year')
