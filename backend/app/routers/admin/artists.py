from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import Artist, Book
from app.schemas import ArtistCreate, ArtistUpdate, ArtistOut, ArtistListOut
from app.utils.slugs import unique_slug

router = APIRouter(prefix="/api/admin/artists", dependencies=[Depends(require_admin)])


@router.get("", response_model=list[ArtistListOut])
def list_artists(db: Session = Depends(get_db)):
    counts = dict(
        db.query(Book.artist_id, func.count(Book.id)).group_by(Book.artist_id).all()
    )
    artists = db.query(Artist).order_by(Artist.name).all()
    for a in artists:
        a.book_count = counts.get(a.id, 0)
    return artists


@router.post("", response_model=ArtistOut)
def create_artist(body: ArtistCreate, db: Session = Depends(get_db)):
    slug = unique_slug(body.name, Artist, db)
    artist = Artist(**body.model_dump(), slug=slug)
    db.add(artist)
    db.commit()
    db.refresh(artist)
    return artist


@router.get("/{artist_id}", response_model=ArtistOut)
def get_artist(artist_id: int, db: Session = Depends(get_db)):
    artist = db.get(Artist, artist_id)
    if not artist:
        raise HTTPException(404)
    return artist


@router.put("/{artist_id}", response_model=ArtistOut)
def update_artist(artist_id: int, body: ArtistUpdate, db: Session = Depends(get_db)):
    artist = db.get(Artist, artist_id)
    if not artist:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(artist, k, v)
    db.commit()
    db.refresh(artist)
    return artist


@router.delete("/{artist_id}")
def delete_artist(artist_id: int, db: Session = Depends(get_db)):
    artist = db.get(Artist, artist_id)
    if not artist:
        raise HTTPException(404)
    if artist.books:
        raise HTTPException(400, detail="Artist has books — reassign or delete them first")
    db.delete(artist)
    db.commit()
    return {"ok": True}
