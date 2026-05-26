from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import require_admin
from app.models import FooterItem
from app.schemas import FooterItemCreate, FooterItemUpdate, FooterItemOut, ReorderBody

router = APIRouter(prefix="/api/admin/footer", dependencies=[Depends(require_admin)])


@router.get("", response_model=list[FooterItemOut])
def list_footer(db: Session = Depends(get_db)):
    return db.query(FooterItem).order_by(FooterItem.sort_order).all()


@router.post("", response_model=FooterItemOut)
def create_footer_item(body: FooterItemCreate, db: Session = Depends(get_db)):
    item = FooterItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=FooterItemOut)
def update_footer_item(item_id: int, body: FooterItemUpdate, db: Session = Depends(get_db)):
    item = db.get(FooterItem, item_id)
    if not item:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_footer_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(FooterItem, item_id)
    if not item:
        raise HTTPException(404)
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder_footer(body: ReorderBody, db: Session = Depends(get_db)):
    for order, item_id in enumerate(body.ids):
        item = db.get(FooterItem, item_id)
        if item:
            item.sort_order = order
    db.commit()
    return {"ok": True}
