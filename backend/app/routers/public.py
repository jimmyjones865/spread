import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, contains_eager, selectinload, joinedload

from app.database import get_db
from app.auth import SESSION_COOKIE, validate_session_token
from app.models import Book, Artist, Tag, TagCombination, BookImage, Page, FooterItem, ImageRole
from app.utils.combinations import signature_for_tags

router = APIRouter()

SITE_TITLE = os.getenv("SITE_TITLE", "Spread")
IMAGE_MAX_WIDTH = int(os.getenv("IMAGE_MAX_WIDTH", "900"))
DATA_DIR = Path("/data/images")
LADDER_WIDTHS = [400, 800, 1300, 1500, 2000, 3000, 4000]


def _is_admin(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE)
    return bool(token) and validate_session_token(token)


def _cover_image(book: Book):
    for img in book.images:
        if img.role == ImageRole.cover:
            return img
    return book.images[0] if book.images else None


def _ladder_urls(book_id: int, filename: str) -> dict:
    stem = filename[:-4]
    base = f"/images/{book_id}/{stem}"
    disk = DATA_DIR / str(book_id)
    result = {}
    for w in LADDER_WIDTHS:
        webp = disk / f"{stem}_{w}.webp"
        avif = disk / f"{stem}_{w}.avif"
        result[f"url_{w}"] = f"{base}_{w}.webp" if webp.exists() else None
        result[f"avif_{w}"] = f"{base}_{w}.avif" if avif.exists() else None
    return result


def _cover_urls(book_id: int, filename: str) -> dict:
    stem = filename[:-4]
    disk = DATA_DIR / str(book_id)
    base = f"/images/{book_id}/{stem}"
    result = {}
    for w in (400, 800):
        result[f"cover_webp_{w}"] = f"{base}_{w}.webp" if (disk / f"{stem}_{w}.webp").exists() else None
        result[f"cover_avif_{w}"] = f"{base}_{w}.avif" if (disk / f"{stem}_{w}.avif").exists() else None
    return result


def _book_list_item(book: Book, artist_name: str, artist_slug: str) -> dict:
    cover_img = _cover_image(book)
    cover_url = cover_webp_url = None
    cover_variants = {}
    if cover_img:
        stem = cover_img.filename[:-4]
        cover_url = f"/images/{book.id}/{stem}_400.webp"
        cover_webp_url = cover_url
        cover_variants = _cover_urls(book.id, cover_img.filename)
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
        "cover_url": cover_url,
        "cover_webp_url": cover_webp_url,
        **cover_variants,
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
    sort: str = "theme",
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

    books = query.all()

    if sort == "theme":
        # One dict lookup per book. Untagged books fall to the tail,
        # artist-sorted, by way of the (1, ...) prefix in the key.
        combo_order = {
            c.signature: c.sort_order
            for c in db.query(TagCombination).all()
        }

        def theme_key(b: Book):
            tag_ids = [t.id for t in b.tags]
            if not tag_ids:
                return (1, b.artist.name.lower(), b.title.lower())
            sig = signature_for_tags(b.tags)
            return (
                0,
                combo_order.get(sig, 1_000_000),
                b.artist.name.lower(),
                b.title.lower(),
            )

        books = sorted(books, key=theme_key)
    else:
        # Map sort key -> callable that returns the sortable attribute.
        # Coalesce nullable strings/ints to a stable fallback so untagged /
        # unpublished / undated books cluster at the head of the asc sort
        # (or tail of desc), not at random positions in the middle.
        def _key(b: Book):
            if sort == "artist":
                return (b.artist.name or "").lower()
            if sort == "title":
                return (b.title or "").lower()
            if sort == "year":
                return b.year or 0
            if sort == "publisher":
                return (b.publisher or "").lower()
            return (b.artist.name or "").lower()

        books = sorted(books, key=_key)
        if order == "desc":
            books = list(reversed(books))

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
        "edition_year": book.edition_year,
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
                **_ladder_urls(book.id, img.filename),
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
    return {"title": SITE_TITLE, "image_max_width": IMAGE_MAX_WIDTH}
