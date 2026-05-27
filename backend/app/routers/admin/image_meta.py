import asyncio
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_admin
from app.utils.ssrf import is_safe_url

router = APIRouter(prefix="/api/admin/image-meta", dependencies=[Depends(require_admin)])

HEAD_TIMEOUT = 5.0


class ImageMetaRequest(BaseModel):
    urls: list[str]


async def _head_one(client: httpx.AsyncClient, url: str) -> dict:
    safe, resolved = is_safe_url(url)
    if not safe:
        return {"url": url, "content_length": None}
    try:
        parsed = urlparse(url)
        target = url.replace(parsed.netloc, resolved, 1)
        r = await client.head(target, headers={"Host": parsed.netloc}, follow_redirects=False)
        cl = r.headers.get("content-length")
        return {"url": url, "content_length": int(cl) if cl and cl.isdigit() else None}
    except Exception:
        return {"url": url, "content_length": None}


@router.post("")
async def image_meta(body: ImageMetaRequest, _: None = Depends(require_admin)):
    urls = body.urls[:50]
    async with httpx.AsyncClient(timeout=HEAD_TIMEOUT) as client:
        results = await asyncio.gather(*[_head_one(client, u) for u in urls])
    return {"sizes": results}
