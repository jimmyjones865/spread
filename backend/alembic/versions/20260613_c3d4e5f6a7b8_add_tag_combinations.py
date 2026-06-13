"""add tag_combinations table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if not conn.dialect.has_table(conn, 'tag_combinations'):
        op.create_table(
            'tag_combinations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('signature', sa.String(), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('signature'),
        )
        op.create_index('ix_tag_combinations_sort_order', 'tag_combinations', ['sort_order'])

    # Backfill: derive all existing tag combinations from book_tags join table.
    # Null-byte separator matches the app's SEP constant in utils/combinations.py.
    rows = conn.execute(sa.text(
        "SELECT book_id, tag_id FROM book_tags ORDER BY book_id, tag_id"
    )).fetchall()

    from collections import defaultdict
    book_tags: dict = defaultdict(list)
    for book_id, tag_id in rows:
        book_tags[book_id].append(tag_id)

    seen: set = set()
    sort_order = 0
    for tag_ids in book_tags.values():
        sig = "\x00".join(str(tid) for tid in sorted(set(tag_ids)))
        if sig in seen:
            continue
        seen.add(sig)
        existing = conn.execute(
            sa.text("SELECT id FROM tag_combinations WHERE signature = :sig"),
            {"sig": sig},
        ).fetchone()
        if not existing:
            conn.execute(
                sa.text("INSERT INTO tag_combinations (signature, sort_order) VALUES (:sig, :order)"),
                {"sig": sig, "order": sort_order},
            )
        sort_order += 10


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.has_table(conn, 'tag_combinations'):
        op.drop_index('ix_tag_combinations_sort_order', table_name='tag_combinations')
        op.drop_table('tag_combinations')
