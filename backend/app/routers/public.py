import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, contains_eager, selectinload, joinedload

from app.database import get_db
from app.auth import SESSION_COOKIE, validate_session_token
from app.models import Book, Artist, Tag, BookImage, Page, FooterItem, ImageRole

router = APIRouter()

SITE_TITLE = os.getenv("SITE_TITLE", "Spread")


def _is_admin(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE)
    return bool(token) and validate_session_token(token)


def _cover_url(book: Book) -> str | None:
    for img in book.images:
        if img.role == ImageRole.cover:
            return f"/images/{book.id}/{img.filename}"
    if book.images:
        return f"/images/{book.id}/{book.images[0].filename}"
    return None


def _book_list_item(book: Book, artist_name: str, artist_slug: str) -> dict:
    return {
        "slug": book.slug,
        "title": book.title,
        "year": book.year,
        "publisher": book.publisher,
        "status": book.status,
        "signed": book.signed,
        "numbered": book.numbered,
        "language": book.language,
        "artist_name": artist_name,
        "artist_slug": artist_slug,
        "cover_url": _cover_url(book),
        "tags": [t.name for t in book.tags],
    }


@router.get("/api/books")
def list_books(
    request: Request,
    q: str | None = None,
    artist_id: int | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    language: str | None = None,
    tags: str | None = None,
    status: str | None = None,
    signed: bool | None = None,
    numbered: bool | None = None,
    sort: str = "artist",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    admin = _is_admin(request)

    query = (
        db.query(Book)
        .join(Artist, Book.artist_id == Artist.id)
        .options(
            contains_eager(Book.artist),
            selectinload(Book.images),
            selectinload(Book.tags),
        )
    )

    if not admin:
        query = query.filter(Book.hidden == False)  # noqa: E712

    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(Book.title.ilike(term), Artist.name.ilike(term), Book.publisher.ilike(term))
        )
    if artist_id:
        query = query.filter(Book.artist_id == artist_id)
    if year_from:
        query = query.filter(Book.year >= year_from)
    if year_to:
        query = query.filter(Book.year <= year_to)
    if language:
        query = query.filter(Book.language.ilike(f"%{language}%"))
    if status:
        query = query.filter(Book.status == status)
    if signed is not None:
        query = query.filter(Book.signed == signed)
    if numbered is not None:
        query = query.filter(Book.numbered == numbered)
    if tags:
        for tag_name in [t.strip() for t in tags.split(",") if t.strip()]:
            query = query.filter(Book.tags.any(Tag.name == tag_name))

    sort_col = {
        "artist": Artist.name,
        "title": Book.title,
        "year": Book.year,
        "publisher": Book.publisher,
    }.get(sort, Artist.name)

    query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())

    books = query.all()
    return [_book_list_item(b, b.artist.name, b.artist.slug) for b in books]


@router.get("/api/books/{slug}")
def get_book(slug: str, request: Request, db: Session = Depends(get_db)):
    admin = _is_admin(request)
    book = (
        db.query(Book)
        .options(
            joinedload(Book.artist),
            selectinload(Book.images),
            selectinload(Book.links),
            selectinload(Book.tags),
        )
        .filter(Book.slug == slug)
        .first()
    )
    if not book:
        raise HTTPException(404)
    if book.hidden and not admin:
        raise HTTPException(404)

    images = sorted(book.images, key=lambda i: (0 if i.role == ImageRole.cover else 1, i.sort_order))

    return {
        "slug": book.slug,
        "title": book.title,
        "year": book.year,
        "publisher": book.publisher,
        "edition": book.edition,
        "language": book.language,
        "isbn": book.isbn,
        "signed": book.signed,
        "numbered": book.numbered,
        "print_run": book.print_run,
        "copy_number": book.copy_number,
        "status": book.status,
        "description": book.description,
        "colophon": book.colophon,
        "artist": {
            "name": book.artist.name,
            "slug": book.artist.slug,
            "country": book.artist.country,
            "instagram": book.artist.instagram,
            "website": book.artist.website,
        },
        "images": [
            {
                "id": img.id,
                "filename": img.filename,
                "role": img.role,
                "sort_order": img.sort_order,
                "width": img.width,
                "height": img.height,
                "url": f"/images/{book.id}/{img.filename}",
            }
            for img in images
        ],
        "links": [{"url": lnk.url, "label": lnk.label} for lnk in book.links],
        "tags": [t.name for t in book.tags],
    }


@router.get("/api/artists")
def list_artists(db: Session = Depends(get_db)):
    artists = db.query(Artist).order_by(Artist.name).all()
    return [{"id": a.id, "name": a.name, "slug": a.slug} for a in artists]


@router.get("/api/artists/{slug}")
def get_artist(slug: str, request: Request, db: Session = Depends(get_db)):
    admin = _is_admin(request)
    artist = (
        db.query(Artist)
        .options(
            selectinload(Artist.books).options(
                selectinload(Book.images),
                selectinload(Book.tags),
            )
        )
        .filter(Artist.slug == slug)
        .first()
    )
    if not artist:
        raise HTTPException(404)

    books = sorted(
        [b for b in artist.books if not b.hidden or admin],
        key=lambda b: b.year or 0,
    )

    return {
        "name": artist.name,
        "slug": artist.slug,
        "country": artist.country,
        "instagram": artist.instagram,
        "website": artist.website,
        "bio": artist.bio,
        "books": [_book_list_item(b, artist.name, artist.slug) for b in books],
    }


@router.get("/api/tags")
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name).all()
    return [{"id": t.id, "name": t.name} for t in tags]


@router.get("/api/pages/{slug}")
def get_page(slug: str, db: Session = Depends(get_db)):
    page = db.query(Page).filter(Page.slug == slug).first()
    if not page:
        raise HTTPException(404)
    return {"slug": page.slug, "title": page.title, "body": page.body}


@router.get("/api/footer")
def get_footer(db: Session = Depends(get_db)):
    items = db.query(FooterItem).order_by(FooterItem.sort_order).all()
    return [{"type": i.type, "label": i.label, "url": i.url} for i in items]


@router.get("/api/config")
def get_config():
    return {"title": SITE_TITLE}
