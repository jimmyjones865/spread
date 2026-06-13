"""Tests for the tag-combination theme-sort machinery."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Book, Artist, Tag, TagCombination
from app.utils.combinations import (
    signature_for,
    signature_for_tags,
    ensure_combination,
)
from app.routers.public import list_books


def _fresh_db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


# ── signature_for ───────────────────────────────────────────────────────────

def test_signature_for_canonicalizes_order():
    assert signature_for([3, 1, 2]) == signature_for([1, 2, 3])
    assert signature_for([1, 2]) == "1\x002"

def test_signature_for_dedupes():
    assert signature_for([1, 1, 2]) == signature_for([1, 2])

def test_signature_for_empty():
    assert signature_for([]) == ""


# ── ensure_combination ──────────────────────────────────────────────────────

def test_ensure_creates_with_max_plus_10():
    db = _fresh_db()
    db.add(Tag(id=1, name="a"))
    db.add(Tag(id=2, name="b"))
    db.flush()
    c1 = ensure_combination(db, [1])
    db.commit()
    assert c1.sort_order == 10
    c2 = ensure_combination(db, [1, 2])
    db.commit()
    assert c2.sort_order == 20
    c3 = ensure_combination(db, [2])
    db.commit()
    assert c3.sort_order == 30

def test_ensure_is_idempotent():
    db = _fresh_db()
    db.add(Tag(id=1, name="a"))
    db.flush()
    a = ensure_combination(db, [1])
    db.commit()
    b = ensure_combination(db, [1])
    db.commit()
    assert a.id == b.id
    assert db.query(TagCombination).count() == 1

def test_ensure_empty_returns_none():
    db = _fresh_db()
    assert ensure_combination(db, []) is None


# ── theme sort via list_books ───────────────────────────────────────────────

def _seed_for_sort():
    db = _fresh_db()
    a1 = Artist(id=1, name="Wolf", slug="wolf")
    a2 = Artist(id=2, name="Samoylova", slug="samoylova")
    a3 = Artist(id=3, name="Suzuki", slug="suzuki")
    t_conflict = Tag(id=1, name="conflict")
    t_ukraine = Tag(id=2, name="ukraine")
    t_street = Tag(id=3, name="street")
    t_urban = Tag(id=4, name="urban")
    t_nature = Tag(id=5, name="nature")
    db.add_all([a1, a2, a3, t_conflict, t_ukraine, t_street, t_urban, t_nature])
    db.flush()

    b1 = Book(id=1, title="Tokyo Compression", slug="tc", artist_id=1, year=2009)
    b1.tags = [t_street, t_urban]
    b2 = Book(id=2, title="Tokyo Compression Revisited", slug="tcr", artist_id=1, year=2011)
    b2.tags = [t_street]
    b3 = Book(id=3, title="Siege of Mariupol", slug="som", artist_id=1, year=2022)
    b3.tags = [t_conflict, t_ukraine]
    b4 = Book(id=4, title="Flood Zone", slug="fz", artist_id=2, year=2019)
    b4.tags = [t_nature]
    b5 = Book(id=5, title="Sound of Waves", slug="sow", artist_id=3, year=2020)
    b5.tags = [t_street, t_ukraine]
    b6 = Book(id=6, title="Untitled", slug="u", artist_id=3, year=2021)
    # b6 has no tags
    db.add_all([b1, b2, b3, b4, b5, b6])
    db.flush()
    return db, {
        "nature": t_nature.id,
        "conflict_ukraine": (t_conflict.id, t_ukraine.id),
        "street": t_street.id,
        "street_urban": (t_street.id, t_urban.id),
        "street_ukraine": (t_street.id, t_ukraine.id),
    }


def test_theme_sort_uses_combination_order():
    db, ids = _seed_for_sort()

    # Set Carl's chosen order: nature(10), conflict+ukraine(20), street(30),
    # street+urban(40), street+ukraine(50).
    db.add(TagCombination(signature=str(ids["nature"]), sort_order=10))
    db.add(TagCombination(signature="1\x002", sort_order=20))
    db.add(TagCombination(signature=str(ids["street"]), sort_order=30))
    db.add(TagCombination(signature="3\x004", sort_order=40))
    db.add(TagCombination(signature="2\x003", sort_order=50))
    db.commit()

    class FakeReq:
        cookies = {}
    result = list_books(FakeReq(), sort="theme", order="asc", db=db)
    titles = [b["title"] for b in result]

    # nature, conflict+ukraine, street, street+urban, street+ukraine, untagged
    assert titles == [
        "Flood Zone",                  # nature
        "Siege of Mariupol",           # conflict+ukraine
        "Tokyo Compression Revisited", # street
        "Tokyo Compression",           # street+urban
        "Sound of Waves",              # street+ukraine
        "Untitled",                    # no tags, tail
    ]


def test_theme_sort_untagged_falls_to_tail_artist_sorted():
    db, ids = _seed_for_sort()
    # Don't create any combinations — every tagged book gets the
    # default 1_000_000 sort_order, all clustered together. Untagged
    # books (the (1, ...) key) sort after all tagged books (the (0, ...)
    # key) regardless of sort_order.
    class FakeReq:
        cookies = {}
    result = list_books(FakeReq(), sort="theme", order="asc", db=db)
    titles = [b["title"] for b in result]
    assert titles[-1] == "Untitled"  # tail


def test_legacy_sorts_still_work():
    db, ids = _seed_for_sort()
    class FakeReq:
        cookies = {}
    result = list_books(FakeReq(), sort="artist", order="asc", db=db)
    artists = [b["artist_name"] for b in result]
    assert artists == sorted(artists, key=str.lower)
    result = list_books(FakeReq(), sort="year", order="desc", db=db)
    years = [b["year"] for b in result]
    assert years == sorted(years, reverse=True)
