"""add file_size to book_images

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {col['name'] for col in inspector.get_columns('book_images')}
    if 'file_size' not in existing:
        op.add_column('book_images', sa.Column('file_size', sa.Integer(), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing = {col['name'] for col in inspector.get_columns('book_images')}
    if 'file_size' in existing:
        op.drop_column('book_images', 'file_size')
