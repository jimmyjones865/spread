from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.auth import require_admin
from app.models import Book, Tag, TagCombination
from app.schemas import ReorderBody
from app.utils.combinations import SEP, signature_for_tags

router = APIRouter(prefix="/api/admin/combinations", dependencies=[Depends(require_admin)])


def _hydrate(db: Session, combos: list[TagCombination]) -> list[dict]:
    """Attach tag names + book counts to each combination row."""
    if not combos:
        return []
    all_ids: set[int] = set()
    for c in combos:
        for tid in c.signature.split(SEP):
            all_ids.add(int(tid))
    tag_map = {t.id: t.name for t in db.query(Tag).filter(Tag.id.in_(all_ids)).all()} if all_ids else {}
    sig_counts: Counter = Counter()
    for book in db.query(Book).options(selectinload(Book.tags)).all():
        if not book.tags:
            continue
        sig_counts[signature_for_tags(book.tags)] += 1

    out = []
    for c in combos:
        ids = [int(x) for x in c.signature.split(SEP)] if c.signature else []
        out.append({
            "id": c.id,
            "signature": c.signature,
            "tag_ids": ids,
            "tag_names": [tag_map[i] for i in ids if i in tag_map],
            "sort_order": c.sort_order,
            "book_count": sig_counts.get(c.signature, 0),
        })
    return out


@router.get("")
def list_combinations(db: Session = Depends(get_db)):
    rows = db.query(TagCombination).order_by(TagCombination.sort_order).all()
    hydrated = _hydrate(db, rows)

    stale_ids = {h["id"] for h in hydrated if h["book_count"] == 0}
    if stale_ids:
        db.query(TagCombination).filter(TagCombination.id.in_(stale_ids)).delete(synchronize_session=False)
        db.commit()
        hydrated = [h for h in hydrated if h["id"] not in stale_ids]

    return hydrated


@router.post("/reorder")
def reorder_combinations(body: ReorderBody, db: Session = Depends(get_db)):
    for order, combo_id in enumerate(body.ids):
        combo = db.get(TagCombination, combo_id)
        if combo:
            combo.sort_order = order
    db.commit()
    return {"ok": True}
