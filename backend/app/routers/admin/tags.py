from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import Tag, BookTag
from app.schemas import TagCreate, TagUpdate, TagOut

router = APIRouter(prefix="/api/admin/tags", dependencies=[Depends(require_admin)])


@router.get("")
def list_tags(db: Session = Depends(get_db)):
    rows = (
        db.query(Tag, func.count(BookTag.book_id).label("book_count"))
        .outerjoin(BookTag, Tag.id == BookTag.tag_id)
        .group_by(Tag.id)
        .order_by(Tag.name)
        .all()
    )
    return [{"id": tag.id, "name": tag.name, "book_count": count} for tag, count in rows]


@router.post("", response_model=TagOut)
def create_tag(body: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == body.name).first()
    if existing:
        return existing
    tag = Tag(name=body.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, body: TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404)
    tag.name = body.name
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404)
    db.delete(tag)
    db.commit()
    return {"ok": True}
