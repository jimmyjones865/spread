import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.auth import require_admin
from app.models import Book, BookImage, Tag, ImageRole
from app.schemas import BookCreate, BookUpdate, BookOut
from app.utils.slugs import unique_slug

IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))

router = APIRouter(prefix="/api/admin/books", dependencies=[Depends(require_admin)])


def _get_book_or_404(book_id: int, db: Session) -> Book:
    book = db.query(Book).options(
        joinedload(Book.artist),
        joinedload(Book.images),
        joinedload(Book.links),
        joinedload(Book.tags),
    ).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404)
    return book


def _sync_tags(book: Book, tag_ids: list[int], db: Session) -> None:
    book.tags.clear()
    for tag_id in tag_ids:
        tag = db.get(Tag, tag_id)
        if tag:
            book.tags.append(tag)


@router.get("")
def list_books(db: Session = Depends(get_db)):
    books = db.query(Book).options(
        joinedload(Book.artist),
        joinedload(Book.images),
    ).order_by(Book.created_at.desc()).all()
    result = []
    for book in books:
        cover = next((img for img in book.images if img.role == ImageRole.cover), None)
        result.append({
            "id": book.id,
            "title": book.title,
            "slug": book.slug,
            "status": book.status,
            "hidden": book.hidden,
            "year": book.year,
            "artist": {"id": book.artist.id, "name": book.artist.name},
            "cover": {"id": cover.id, "filename": cover.filename, "thumb_url": f"/images/{book.id}/{cover.filename[:-4]}_400.webp"} if cover else None,
        })
    return result


@router.post("", response_model=BookOut)
def create_book(body: BookCreate, db: Session = Depends(get_db)):
    slug = unique_slug(body.title, Book, db)
    data = body.model_dump(exclude={"tag_ids"})
    book = Book(**data, slug=slug)
    db.add(book)
    db.flush()
    _sync_tags(book, body.tag_ids, db)
    db.commit()
    return _get_book_or_404(book.id, db)


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    return _get_book_or_404(book_id, db)


@router.put("/{book_id}", response_model=BookOut)
def update_book(book_id: int, body: BookUpdate, db: Session = Depends(get_db)):
    book = _get_book_or_404(book_id, db)
    for k, v in body.model_dump(exclude={"tag_ids"}).items():
        setattr(book, k, v)
    _sync_tags(book, body.tag_ids, db)
    db.commit()
    return _get_book_or_404(book_id, db)


@router.delete("/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(404)
    book_dir = IMAGE_DIR / str(book_id)
    if book_dir.exists():
        shutil.rmtree(book_dir)
    db.delete(book)
    db.commit()
    return {"ok": True}
