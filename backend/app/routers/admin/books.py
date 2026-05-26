import io
import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from PIL import Image as PILImage

from app.database import get_db
from app.auth import require_admin
from app.models import Book, BookImage, BookLink, Tag, ImageRole
from app.schemas import (
    BookCreate, BookUpdate, BookOut,
    BookImageOut, BookLinkCreate, BookLinkUpdate, BookLinkOut,
    ReorderBody,
)
from app.utils.slugs import unique_slug
from app.utils.images import sanitize_image

IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

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


# ── Books ─────────────────────────────────────────────────────────────────────

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
            "cover": {"id": cover.id, "filename": cover.filename} if cover else None,
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


# ── Images ────────────────────────────────────────────────────────────────────

@router.post("/{book_id}/images", response_model=BookImageOut)
async def upload_image(
    book_id: int,
    role: str = Form("spread"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not db.get(Book, book_id):
        raise HTTPException(404)

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail="File too large (max 25MB)")

    try:
        clean = sanitize_image(data)
    except Exception:
        raise HTTPException(400, detail="Invalid or unsafe image")

    img_role = ImageRole.cover if role == "cover" else ImageRole.spread

    if img_role == ImageRole.cover:
        db.query(BookImage).filter(
            BookImage.book_id == book_id,
            BookImage.role == ImageRole.cover,
        ).update({"role": ImageRole.spread})

    existing = db.query(BookImage).filter(BookImage.book_id == book_id).all()
    next_order = max((img.sort_order for img in existing), default=-1) + 1

    book_dir = IMAGE_DIR / str(book_id)
    book_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.jpg"
    (book_dir / filename).write_bytes(clean)

    pil = PILImage.open(io.BytesIO(clean))
    width, height = pil.size

    record = BookImage(
        book_id=book_id,
        filename=filename,
        original_url=None,
        role=img_role,
        sort_order=next_order,
        width=width,
        height=height,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{book_id}/images/{img_id}", response_model=BookImageOut)
def update_image(book_id: int, img_id: int, role: str, db: Session = Depends(get_db)):
    img = db.query(BookImage).filter(BookImage.id == img_id, BookImage.book_id == book_id).first()
    if not img:
        raise HTTPException(404)

    new_role = ImageRole.cover if role == "cover" else ImageRole.spread
    if new_role == ImageRole.cover:
        db.query(BookImage).filter(
            BookImage.book_id == book_id,
            BookImage.role == ImageRole.cover,
        ).update({"role": ImageRole.spread})

    img.role = new_role
    db.commit()
    db.refresh(img)
    return img


@router.delete("/{book_id}/images/{img_id}")
def delete_image(book_id: int, img_id: int, db: Session = Depends(get_db)):
    img = db.query(BookImage).filter(BookImage.id == img_id, BookImage.book_id == book_id).first()
    if not img:
        raise HTTPException(404)
    path = IMAGE_DIR / str(book_id) / img.filename
    if path.exists():
        path.unlink()
    db.delete(img)
    db.commit()
    return {"ok": True}


@router.post("/{book_id}/images/reorder")
def reorder_images(book_id: int, body: ReorderBody, db: Session = Depends(get_db)):
    for order, img_id in enumerate(body.ids):
        img = db.query(BookImage).filter(BookImage.id == img_id, BookImage.book_id == book_id).first()
        if img:
            img.sort_order = order
    db.commit()
    return {"ok": True}


# ── Links ─────────────────────────────────────────────────────────────────────

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
