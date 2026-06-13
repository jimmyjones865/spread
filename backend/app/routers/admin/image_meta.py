import asyncio

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_admin
from app.utils.ssrf import is_safe_url

router = APIRouter(prefix="/api/admin/image-meta", dependencies=[Depends(require_admin)])

HEAD_TIMEOUT = 5.0


class ImageMetaRequest(BaseModel):
    urls: list[str]


_CONFIRMED_GONE = {404, 410, 451}


async def _head_one(client: httpx.AsyncClient, url: str) -> dict:
    safe, _ = is_safe_url(url)
    if not safe:
        return {"url": url, "content_length": None, "reachable": False}
    try:
        r = await client.head(url, follow_redirects=True)
        if r.is_success:
            cl = r.headers.get("content-length")
            return {
                "url": url,
                "content_length": int(cl) if cl and cl.isdigit() else None,
                "reachable": True,
            }
        # 404/410/451 = confirmed gone; 403/401/429/5xx = can't probe but may exist
        if r.status_code in _CONFIRMED_GONE:
            return {"url": url, "content_length": None, "reachable": False}
        return {"url": url, "content_length": None, "reachable": True}
    except Exception:
        return {"url": url, "content_length": None, "reachable": False}


@router.post("")
async def image_meta(body: ImageMetaRequest):
    urls = body.urls[:50]
    async with httpx.AsyncClient(timeout=HEAD_TIMEOUT) as client:
        results = await asyncio.gather(*[_head_one(client, u) for u in urls])
    return {"sizes": results}
