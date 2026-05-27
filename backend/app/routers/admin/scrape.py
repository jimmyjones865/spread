import json
import re
from datetime import datetime
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import RawScrape

router = APIRouter(prefix="/api/admin/scrape", dependencies=[Depends(require_admin)])

JINA_BASE = "https://r.jina.ai/"
SCRAPE_TIMEOUT = 30.0

IMAGE_RE = re.compile(r'!\[.*?\]\((https?://[^\s)]+)\)')
IMG_EXT_RE = re.compile(
    r'(https?://[^\s)>"\]]+\.(?:jpg|jpeg|png|webp|gif))(?:[?#][^\s)>"\]]*)?',
    re.IGNORECASE,
)


class ScrapeRequest(BaseModel):
    url: str
    force: bool = False


def _base_url(u: str) -> str:
    return u.split("?")[0].split("#")[0]


def _parse_jina_markdown(content: str) -> dict:
    if "Markdown Content:" in content:
        content = content.split("Markdown Content:", 1)[1].strip()

    image_urls = []
    seen: set[str] = set()  # tracks base URLs to deduplicate
    for m in IMAGE_RE.finditer(content):
        u = m.group(1)
        base = _base_url(u)
        if base not in seen:
            image_urls.append(u)
            seen.add(base)
    for m in IMG_EXT_RE.finditer(content):
        u = m.group(1)
        base = _base_url(u)
        if base not in seen:
            image_urls.append(u)
            seen.add(base)

    text_content = IMAGE_RE.sub("", content)
    text_content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text_content)

    blocks = [b.strip() for b in re.split(r'\n{2,}', text_content)]
    text_blocks = [
        b for b in blocks
        if len(b) > 20 and not b.startswith("---") and not b.startswith("===")
    ]

    return {"text_blocks": text_blocks, "image_urls": image_urls}


@router.post("")
async def scrape(body: ScrapeRequest, db: Session = Depends(get_db)):
    url = body.url.strip()
    if not url:
        raise HTTPException(400, detail="URL required")

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(400, detail="URL must be http or https")

    if not body.force:
        existing = db.query(RawScrape).filter(RawScrape.url == url).first()
        if existing:
            data = json.loads(existing.content)
            return {
                **data,
                "scraped_at": existing.scraped_at.isoformat(),
                "from_cache": True,
            }

    jina_url = JINA_BASE + url
    try:
        async with httpx.AsyncClient(timeout=SCRAPE_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(jina_url, headers={"Accept": "text/markdown"})
            resp.raise_for_status()
            markdown = resp.text
    except httpx.TimeoutException:
        raise HTTPException(504, detail="Scrape timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, detail=f"Scrape failed: HTTP {e.response.status_code}")
    except Exception as e:
        raise HTTPException(502, detail=f"Scrape failed: {e}")

    parsed_data = _parse_jina_markdown(markdown)
    content_json = json.dumps(parsed_data)
    now = datetime.utcnow()

    existing = db.query(RawScrape).filter(RawScrape.url == url).first()
    if existing:
        existing.content = content_json
        existing.scraped_at = now
    else:
        db.add(RawScrape(url=url, scraped_at=now, content=content_json))
    db.commit()

    return {
        **parsed_data,
        "scraped_at": now.isoformat(),
        "from_cache": False,
    }
