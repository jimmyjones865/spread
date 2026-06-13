from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import Book, Tag, TagCombination
from app.schemas import ReorderBody
from app.utils.combinations import SEP, ensure_combination, signature_for_tags

router = APIRouter(prefix="/api/admin/combinations", dependencies=[Depends(require_admin)])


def _hydrate(db: Session, combos: list[TagCombination]) -> list[dict]:
    """Attach tag names + book counts to each combination row."""
    if not combos:
        return []
    # Look up tag names by id.
    all_ids: set[int] = set()
    for c in combos:
        for tid in c.signature.split(SEP):
            all_ids.add(int(tid))
    tag_map = {t.id: t.name for t in db.query(Tag).filter(Tag.id.in_(all_ids)).all()} if all_ids else {}
    # Walk every book once and tally per signature. Cheap for a personal
    # library (<500 books); avoids a join through book_tags.
    sig_counts: Counter = Counter()
    for book in db.query(Book).options(Book.tags).all():
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
    return _hydrate(db, rows)


@router.post("/reorder")
def reorder_combinations(body: ReorderBody, db: Session = Depends(get_db)):
    for order, combo_id in enumerate(body.ids):
        combo = db.get(TagCombination, combo_id)
        if combo:
            combo.sort_order = order
    db.commit()
    return {"ok": True}


@router.post("/ensure")
def ensure_combination_endpoint(body: dict, db: Session = Depends(get_db)):
    """Manually ensure a combination exists for a given list of tag ids.
    Idempotent — returns the existing row if present, else creates one
    with sort_order = max + 10. Body: {"tag_ids": [1, 2, 3]}"""
    tag_ids = body.get("tag_ids") or []
    if not isinstance(tag_ids, list) or not all(isinstance(x, int) for x in tag_ids):
        raise HTTPException(400, detail="tag_ids must be a list of integers")
    combo = ensure_combination(db, tag_ids)
    if not combo:
        raise HTTPException(400, detail="tag_ids must not be empty")
    db.commit()
    return _hydrate(db, [combo])[0]
