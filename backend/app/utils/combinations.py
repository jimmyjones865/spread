"""Tag-combination helpers for theme sort.

A "combination" is the canonical, order-independent set of tags on a single
book. Books with the same combination share a position in the theme-sort
sequence. Combinations are auto-created on book save and reordered manually
in the admin UI.
"""
from typing import Iterable

from sqlalchemy.orm import Session

from app.models import Tag, TagCombination


# Null-byte separator: tag names can contain spaces, slashes, plus signs —
# none of them are safe. A null byte can't appear in a user-entered tag name.
SEP = "\x00"


def signature_for(tag_ids: Iterable[int]) -> str:
    """Canonical signature for a set of tag ids, e.g. SEP.join(sorted(set(ids)))."""
    return SEP.join(str(tid) for tid in sorted(set(tag_ids)))


def signature_for_tags(tags: Iterable[Tag]) -> str:
    return signature_for(t.id for t in tags)


def ensure_combination(db: Session, tag_ids: list[int]) -> TagCombination | None:
    """Get the combination for the given tag ids, creating it (with
    sort_order = max + 10) if it doesn't exist yet. Returns None for empty
    tag lists — untagged books don't belong to any combination.
    """
    if not tag_ids:
        return None
    sig = signature_for(tag_ids)
    existing = db.query(TagCombination).filter(TagCombination.signature == sig).first()
    if existing:
        return existing
    max_order = db.query(TagCombination).with_entities(TagCombination.sort_order).order_by(
        TagCombination.sort_order.desc()
    ).first()
    new_order = (max_order[0] if max_order else 0) + 10
    combo = TagCombination(signature=sig, sort_order=new_order)
    db.add(combo)
    db.flush()
    return combo
