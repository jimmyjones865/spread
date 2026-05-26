from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import Page
from app.schemas import PageCreate, PageUpdate, PageOut

router = APIRouter(prefix="/api/admin/pages", dependencies=[Depends(require_admin)])


@router.get("", response_model=list[PageOut])
def list_pages(db: Session = Depends(get_db)):
    return db.query(Page).order_by(Page.title).all()


@router.post("", response_model=PageOut)
def create_page(body: PageCreate, db: Session = Depends(get_db)):
    if db.query(Page).filter(Page.slug == body.slug).first():
        raise HTTPException(400, detail="Slug already exists")
    page = Page(**body.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.get("/{page_id}", response_model=PageOut)
def get_page(page_id: int, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(404)
    return page


@router.put("/{page_id}", response_model=PageOut)
def update_page(page_id: int, body: PageUpdate, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(404)
    conflict = db.query(Page).filter(Page.slug == body.slug, Page.id != page_id).first()
    if conflict:
        raise HTTPException(400, detail="Slug already exists")
    for k, v in body.model_dump().items():
        setattr(page, k, v)
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db)):
    page = db.get(Page, page_id)
    if not page:
        raise HTTPException(404)
    db.delete(page)
    db.commit()
    return {"ok": True}
