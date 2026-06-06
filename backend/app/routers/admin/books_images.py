import io
import os
from pathlib import Path
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse, urljoin
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from PIL import Image as PILImage

from app.database import get_db
from app.auth import require_admin
from app.models import Book, BookImage, ImageRole
from app.schemas import BookImageOut, ReorderBody
from app.utils.images import sanitize_image, generate_variants
from app.utils.ssrf import is_safe_url

CDN_PARAMS = {
    "w", "h", "width", "height", "size", "quality", "q",
    "format", "fit", "crop", "auto", "fm", "cs", "bg", "dpr", "ar",
}
DOWNLOAD_TIMEOUT = 10.0
MAX_REDIRECTS = 5
IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _strip_cdn_params(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.query:
        return url
    qs = parse_qs(parsed.query, keep_blank_values=True)
    filtered = {k: v for k, v in qs.items() if k.lower() not in CDN_PARAMS}
    return urlunparse(parsed._replace(query=urlencode(filtered, doseq=True)))


class DownloadImageBody(BaseModel):
    url: str
    role: str = "spread"


router = APIRouter(prefix="/api/admin/books", dependencies=[Depends(require_admin)])


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
    generate_variants(clean, book_dir, filename[:-4])

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
        file_size=len(clean),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/{book_id}/images/{img_id}/rotate", response_model=BookImageOut)
def rotate_image(book_id: int, img_id: int, db: Session = Depends(get_db)):
    img = db.query(BookImage).filter(BookImage.id == img_id, BookImage.book_id == book_id).first()
    if not img:
        raise HTTPException(404)

    path = IMAGE_DIR / str(book_id) / img.filename
    if not path.exists():
        raise HTTPException(404, detail="Image file not found")

    pil = PILImage.open(io.BytesIO(path.read_bytes()))
    rotated = pil.rotate(-90, expand=True)

    out = io.BytesIO()
    rotated.save(out, format="JPEG", quality=92)
    clean = out.getvalue()

    path.write_bytes(clean)
    generate_variants(clean, path.parent, img.filename[:-4])

    img.width, img.height = rotated.size
    img.file_size = len(clean)
    db.commit()
    db.refresh(img)
    return img


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
    was_cover = img.role == ImageRole.cover
    path = IMAGE_DIR / str(book_id) / img.filename
    if path.exists():
        path.unlink()
    stem = img.filename[:-4]
    for suffix in ("_thumb", "_web", "_zoom"):
        for ext in (".jpg", ".webp"):
            variant = IMAGE_DIR / str(book_id) / f"{stem}{suffix}{ext}"
            if variant.exists():
                variant.unlink()
    db.delete(img)
    db.flush()
    if was_cover:
        next_img = (
            db.query(BookImage)
            .filter(BookImage.book_id == book_id)
            .order_by(BookImage.sort_order)
            .first()
        )
        if next_img:
            next_img.role = ImageRole.cover
    db.commit()
    return {"ok": True}


@router.post("/{book_id}/images/reorder")
def reorder_images(book_id: int, body: ReorderBody, db: Session = Depends(get_db)):
    for order, img_id in enumerate(body.ids):
        img = db.query(BookImage).filter(BookImage.id == img_id, BookImage.book_id == book_id).first()
        if img:
            img.sort_order = order
            img.role = ImageRole.cover if order == 0 else ImageRole.spread
    db.commit()
    return {"ok": True}


@router.post("/{book_id}/images/from-url", response_model=BookImageOut)
async def download_image_from_url(
    book_id: int,
    body: DownloadImageBody,
    db: Session = Depends(get_db),
):
    if not db.get(Book, book_id):
        raise HTTPException(404)

    original_url = body.url.strip()
    current_url = _strip_cdn_params(original_url)

    try:
        async with httpx.AsyncClient(timeout=DOWNLOAD_TIMEOUT) as client:
            resp = None
            for _ in range(MAX_REDIRECTS + 1):
                ok, result = is_safe_url(current_url)
                if not ok:
                    raise HTTPException(400, detail=f"Unsafe URL: {result}")

                resp = await client.get(current_url, follow_redirects=False)
                if resp.is_redirect:
                    location = resp.headers.get("location", "")
                    if not location:
                        raise HTTPException(502, detail="Redirect without Location header")
                    current_url = urljoin(current_url, location)
                    continue
                break
            else:
                raise HTTPException(502, detail="Too many redirects")

            ct = resp.headers.get("content-type", "")
            if not any(t in ct for t in ("image/jpeg", "image/png", "image/webp", "image/")):
                raise HTTPException(400, detail=f"Not an image (content-type: {ct or 'missing'})")

            data = b""
            async for chunk in resp.aiter_bytes(65536):
                data += chunk
                if len(data) > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, detail="Image too large (max 25MB)")

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(504, detail="Download timed out")
    except Exception as e:
        raise HTTPException(502, detail=f"Download failed: {e}")

    try:
        clean = sanitize_image(data)
    except Exception:
        raise HTTPException(400, detail="Invalid or unsafe image")

    img_role = ImageRole.cover if body.role == "cover" else ImageRole.spread

    if img_role == ImageRole.cover:
        db.query(BookImage).filter(
            BookImage.book_id == book_id,
            BookImage.role == ImageRole.cover,
        ).update({"role": ImageRole.spread})

    existing_imgs = db.query(BookImage).filter(BookImage.book_id == book_id).all()
    next_order = max((img.sort_order for img in existing_imgs), default=-1) + 1

    book_dir = IMAGE_DIR / str(book_id)
    book_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.jpg"
    (book_dir / filename).write_bytes(clean)
    generate_variants(clean, book_dir, filename[:-4])

    pil = PILImage.open(io.BytesIO(clean))
    width, height = pil.size

    record = BookImage(
        book_id=book_id,
        filename=filename,
        original_url=original_url,
        role=img_role,
        sort_order=next_order,
        width=width,
        height=height,
        file_size=len(clean),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
