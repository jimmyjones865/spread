"""add book_id to raw_scrapes

Revision ID: a1b2c3d4e5f6
Revises: 55663633686a
Create Date: 2026-05-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "55663633686a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    bind = op.get_bind()
    cols = [c["name"] for c in inspect(bind).get_columns("raw_scrapes")]
    if "book_id" not in cols:
        op.add_column(
            "raw_scrapes",
            sa.Column("book_id", sa.Integer(), sa.ForeignKey("books.id", ondelete="SET NULL"), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("raw_scrapes", "book_id")
