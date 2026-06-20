#!/usr/bin/env python3
"""
One-shot catalog import. Run from backend/ directory:
    DATABASE_URL=sqlite:////data/spread.db python3 scripts/import_catalog.py ../catalog.md

Parses catalog.md and seeds the DB with artists + books.
Fields extracted: name, title, status, year.
Everything else (edition, signed, numbered, etc.) left null — fill via admin.
Idempotent: skips books whose slug already exists.
"""
import sys
import os
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Artist, Book, BookStatus
from app.utils.slugs import slugify, unique_slug
from scripts.catalog_parser import parse_status, parse_year


def parse_author(raw: str) -> str:
    """'Wolf, Michael' → 'Michael Wolf'. 'Banksy' → 'Banksy'."""
    parts = [p.strip() for p in raw.split(",", 1)]
    return f"{parts[1]} {parts[0]}" if len(parts) == 2 else parts[0]


def run(catalog_path: str, db_url: str) -> None:
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()

    lines = Path(catalog_path).read_text(encoding="utf-8").splitlines()

    created_books = 0
    skipped_books = 0

    for line in lines:
        line = line.strip()
        if not line.startswith("|") or line.startswith("| Autor") or line.startswith("|---"):
            continue

        cols = [c.strip() for c in line.strip("|").split("|")]
        if len(cols) < 2:
            continue

        raw_author = cols[0].strip()
        title = cols[1].strip()
        edition = cols[2].strip() if len(cols) > 2 else ""

        if not raw_author or not title:
            continue

        author_name = parse_author(raw_author)
        status_str = parse_status(edition)
        status = BookStatus.on_order if status_str == "on_order" else BookStatus.owned
        year = parse_year(edition)

        # Find or create artist
        artist_slug = slugify(author_name)
        artist = db.query(Artist).filter(Artist.slug == artist_slug).first()
        if not artist:
            artist = Artist(name=author_name, slug=artist_slug)
            db.add(artist)
            db.flush()

        # Check for an existing book by title+artist before minting a slug —
        # unique_slug() always returns a free slug by construction, so
        # checking *after* calling it can never find a match and re-running
        # this script would silently re-import every book as a duplicate.
        existing = (
            db.query(Book)
            .filter(Book.title == title, Book.artist_id == artist.id)
            .first()
        )
        if existing:
            skipped_books += 1
            continue

        book_slug = unique_slug(title, Book, db)

        book = Book(
            title=title,
            slug=book_slug,
            artist_id=artist.id,
            year=year,
            status=status,
        )
        db.add(book)
        created_books += 1

    db.commit()
    db.close()
    print(f"Done. Created {created_books} books, skipped {skipped_books} (already existed).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/import_catalog.py <catalog.md>")
        sys.exit(1)

    db_url = os.getenv("DATABASE_URL", "sqlite:////data/spread.db")
    run(sys.argv[1], db_url)
