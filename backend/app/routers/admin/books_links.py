from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import Book, BookLink
from app.schemas import BookLinkCreate, BookLinkUpdate, BookLinkOut

router = APIRouter(prefix="/api/admin/books", dependencies=[Depends(require_admin)])


@router.post("/{book_id}/links", response_model=BookLinkOut)
def add_link(book_id: int, body: BookLinkCreate, db: Session = Depends(get_db)):
    if not db.get(Book, book_id):
        raise HTTPException(404)
    link = BookLink(**body.model_dump(), book_id=book_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.put("/{book_id}/links/{link_id}", response_model=BookLinkOut)
def update_link(book_id: int, link_id: int, body: BookLinkUpdate, db: Session = Depends(get_db)):
    link = db.query(BookLink).filter(BookLink.id == link_id, BookLink.book_id == book_id).first()
    if not link:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(link, k, v)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{book_id}/links/{link_id}")
def delete_link(book_id: int, link_id: int, db: Session = Depends(get_db)):
    link = db.query(BookLink).filter(BookLink.id == link_id, BookLink.book_id == book_id).first()
    if not link:
        raise HTTPException(404)
    db.delete(link)
    db.commit()
    return {"ok": True}
