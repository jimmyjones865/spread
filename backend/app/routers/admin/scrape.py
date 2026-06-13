import asyncio
import json
import re
from datetime import datetime
from html.parser import HTMLParser as _HTMLParser
from urllib.parse import urlparse, urljoin

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import RawScrape
from app.utils.ssrf import is_safe_url

router = APIRouter(prefix="/api/admin/scrape", dependencies=[Depends(require_admin)])

JINA_BASE = "https://r.jina.ai/"
SCRAPE_TIMEOUT = 30.0
MAX_REDIRECTS = 5

IMAGE_RE = re.compile(r'!\[.*?\]\((https?://[^\s)]+)\)')
IMG_EXT_RE = re.compile(
    r'(https?://[^\s)>"\]]+\.(?:jpg|jpeg|png|webp|gif))(?:[?#][^\s)>"\]]*)?',
    re.IGNORECASE,
)

# Matches http(s):// or protocol-relative // image URLs
_HTML_IMG_RE = re.compile(
    r'^(?:https?:)?//[^\s"\'<>{}]+\.(?:jpg|jpeg|png|webp|gif)(?:[?#][^\s"\'<>]*)?$',
    re.IGNORECASE,
)
_DATA_ATTRS = {
    "data-src", "data-zoom", "data-large", "data-original",
    "data-full", "data-lazy-src", "data-hi-res", "data-image",
}

_SIZE_SUFFIX_RE = re.compile(r'[-_](\d+)x\d*(?:[-_][a-z]+)*\.', re.IGNORECASE)  # _300x.jpg, -400x300.jpg, _160x160_crop_center.jpg
_WIDTH_PARAM_RE = re.compile(r'[?&]width=\d+', re.IGNORECASE)
_SRCSET_ENTRY_RE = re.compile(r'(?:https?:)?//[^\s,]+\.(?:jpg|jpeg|png|webp|gif)(?:[?#][^\s,]*)?', re.IGNORECASE)


def _shopify_filename_stem(url: str) -> str | None:
    """
    If url is from a Shopify CDN (shop domain /cdn/shop/files/ or global cdn.shopify.com),
    return a normalized key using just the filename stem — so the same image served from
    both CDN origins deduplicates correctly.
    """
    base = url.split("?")[0].split("#")[0]
    if "/cdn/shop/files/" not in base and "//cdn.shopify.com/s/files/" not in base:
        return None
    filename = base.rsplit("/", 1)[-1]
    return "shopify:" + _SIZE_SUFFIX_RE.sub(".", filename).lower()


def _canonical_base(url: str) -> str:
    """Strip CDN size suffix and query/fragment for dedup grouping."""
    shopify = _shopify_filename_stem(url)
    if shopify:
        return shopify
    base = url.split("?")[0].split("#")[0]
    return _SIZE_SUFFIX_RE.sub('.', base)


def _size_dim(url: str) -> int:
    """Return the dimension from a CDN size suffix, or 999999 (preferred) if absent."""
    base = url.split("?")[0].split("#")[0]
    m = _SIZE_SUFFIX_RE.search(base)
    return int(m.group(1)) if m else 999999


def _pick_best_variants(urls: list[str]) -> list[str]:
    """
    For each group of CDN size variants (same canonical base), keep the largest.
    Drops ?width= query-param resize URLs entirely (display hints, not file variants).
    Preserves original ordering of first occurrence.
    """
    filtered = [u for u in urls if not _WIDTH_PARAM_RE.search(u)]
    order: list[str] = []
    best: dict[str, tuple[int, str]] = {}  # canonical → (dim, url)
    for url in filtered:
        canon = _canonical_base(url)
        dim = _size_dim(url)
        if canon not in best:
            order.append(canon)
            best[canon] = (dim, url)
        elif dim > best[canon][0]:
            best[canon] = (dim, url)
    return [best[c][1] for c in order]


def _normalize_url(url: str) -> str:
    """Normalize protocol-relative URLs to https."""
    return url if url.startswith("http") else "https:" + url


class _ImageLinkParser(_HTMLParser):
    """Extracts full-res image URLs that Jina's markdown conversion misses:
    - <a href="full.jpg"><img...> lightbox anchor patterns
    - data-src / data-zoom / data-original etc. lazy-load attributes
    - Image URLs embedded in <script> JSON blobs (e.g. Shopify product data)

    Filters out Shopify _{width}x template placeholders and CDN resize variants.
    """

    def __init__(self, base_url: str = ""):
        super().__init__()
        self.urls: list[str] = []
        self.dims: dict[str, tuple[int, int]] = {}  # url → (w, h) from <img> attrs
        self._a_href: str | None = None
        self._in_script = False
        self._script_chunks: list[str] = []
        self._base_url = base_url

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == "a":
            href = attr_dict.get("href") or ""
            if href and _HTML_IMG_RE.match(href) and "{" not in href and not _WIDTH_PARAM_RE.search(href):
                self._a_href = _normalize_url(href)
            else:
                self._a_href = None
        elif tag in ("img", "source"):
            if self._a_href:
                self.urls.append(self._a_href)
            # Plain src — absolute or root-relative
            src = attr_dict.get("src") or ""
            if src and not src.startswith("data:"):
                if src.startswith("//") or src.startswith("http"):
                    u = _normalize_url(src)
                elif self._base_url and src.startswith("/"):
                    p = urlparse(self._base_url)
                    u = f"{p.scheme}://{p.netloc}{src}"
                else:
                    u = None
                if u and _HTML_IMG_RE.match(u) and "{" not in u and not _WIDTH_PARAM_RE.search(u):
                    self.urls.append(u)
                    w_attr = attr_dict.get("width", "")
                    h_attr = attr_dict.get("height", "")
                    if w_attr.isdigit() and h_attr.isdigit():
                        self.dims[u] = (int(w_attr), int(h_attr))
            # srcset — WordPress responsive images
            srcset = attr_dict.get("srcset") or ""
            for m in _SRCSET_ENTRY_RE.finditer(srcset):
                u = m.group(0)
                if "{" not in u and not _WIDTH_PARAM_RE.search(u):
                    self.urls.append(_normalize_url(u))
            for attr in _DATA_ATTRS:
                val = attr_dict.get(attr) or ""
                if val and _HTML_IMG_RE.match(val) and "{" not in val and not _WIDTH_PARAM_RE.search(val):
                    self.urls.append(_normalize_url(val))
        elif tag == "script":
            self._in_script = True
            self._script_chunks = []

    def handle_data(self, data):
        if self._in_script:
            self._script_chunks.append(data)

    def handle_endtag(self, tag):
        if tag == "a":
            self._a_href = None
        elif tag == "script":
            self._in_script = False
            script_text = "".join(self._script_chunks).replace("\\/", "/")
            # Extract image URLs embedded in JSON/JS (e.g. Shopify product media array)
            for m in re.finditer(
                r'(?:https?:)?(//([\w.-]+)/[^\s"\'<>{}]+\.(?:jpg|jpeg|png|webp|gif))(?:[?#][^\s"\'<>]*)?',
                script_text, re.IGNORECASE,
            ):
                url = _normalize_url(m.group(0))
                if "{" not in url and not _WIDTH_PARAM_RE.search(url):
                    self.urls.append(url)
            self._script_chunks = []


def _extract_html_image_urls(html_text: str, base_url: str = "") -> tuple[list[str], dict[str, tuple[int, int]]]:
    parser = _ImageLinkParser(base_url=base_url)
    try:
        parser.feed(html_text)
    except Exception:
        pass
    return parser.urls, parser.dims


async def _fetch_html_safe(client: httpx.AsyncClient, url: str) -> httpx.Response | None:
    """Fetch raw HTML following redirects, re-checking SSRF on each hop."""
    current_url = url
    for _ in range(MAX_REDIRECTS + 1):
        ok, _ = is_safe_url(current_url)
        if not ok:
            return None
        resp = await client.get(
            current_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible)", "Accept": "text/html,*/*"},
            follow_redirects=False,
        )
        if resp.is_redirect:
            location = resp.headers.get("location", "")
            if not location:
                return None
            current_url = urljoin(current_url, location)
            continue
        return resp
    return None


async def _try_shopify_product_json(client: httpx.AsyncClient, url: str) -> list[str]:
    """Fetch Shopify product JSON endpoint (/products/handle.js) for full-res images."""
    parsed = urlparse(url)
    if "/products/" not in parsed.path:
        return []
    js_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}.js"
    ok, _ = is_safe_url(js_url)
    if not ok:
        return []
    try:
        resp = await client.get(
            js_url,
            headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible)"},
            follow_redirects=True,
            timeout=15.0,
        )
        if not resp.is_success:
            return []
        data = resp.json()
    except Exception:
        return []

    def _norm(u):
        if not isinstance(u, str) or not u:
            return None
        if u.startswith("http"):
            return u
        if u.startswith("//"):
            return "https:" + u
        return None

    urls = []
    for img in data.get("images", []):
        u = _norm(img)
        if u:
            urls.append(u)
    for item in data.get("media", []):
        u = _norm((item.get("src") or "").strip())
        if u:
            urls.append(u)
    u = _norm(data.get("featured_image") or "")
    if u:
        urls.append(u)
    return urls


class ScrapeRequest(BaseModel):
    url: str
    force: bool = False
    book_id: int | None = None


def _base_url(u: str) -> str:
    return u.split("?")[0].split("#")[0]


def _parse_jina_markdown(content: str) -> dict:
    if "Markdown Content:" in content:
        content = content.split("Markdown Content:", 1)[1].strip()

    image_urls = []
    seen: set[str] = set()  # tracks base URLs to deduplicate
    for m in IMAGE_RE.finditer(content):
        u = m.group(1)
        if "{" in u or "%7b" in u.lower():  # skip Shopify _{width}x template placeholders
            continue
        base = _base_url(u)
        if base not in seen:
            image_urls.append(u)
            seen.add(base)
    for m in IMG_EXT_RE.finditer(content):
        u = m.group(1)
        if "{" in u or "%7b" in u.lower():
            continue
        base = _base_url(u)
        if base not in seen:
            image_urls.append(u)
            seen.add(base)

    text_content = IMAGE_RE.sub("", content)
    text_content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text_content)
    text_content = re.sub(r'\*\*(.+?)\*\*', r'\1', text_content)
    text_content = re.sub(r'__(.+?)__', r'\1', text_content)
    text_content = re.sub(r'\*(.+?)\*', r'\1', text_content)
    text_content = re.sub(r'_(.+?)_', r'\1', text_content)

    blocks = [b.strip() for b in re.split(r'\n{2,}', text_content)]
    text_blocks = [
        b for b in blocks
        if len(b) > 20 and not b.startswith("---") and not b.startswith("===")
    ]

    return {"text_blocks": text_blocks, "image_urls": image_urls}


@router.get("")
def list_book_scrapes(book_id: int, db: Session = Depends(get_db)):
    scrapes = (
        db.query(RawScrape)
        .filter(RawScrape.book_id == book_id)
        .order_by(RawScrape.scraped_at.desc())
        .all()
    )
    return [
        {
            "url": s.url,
            "scraped_at": s.scraped_at.isoformat(),
            "image_count": len(json.loads(s.content).get("image_urls", [])),
        }
        for s in scrapes
    ]


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
            if body.book_id is not None and existing.book_id != body.book_id:
                existing.book_id = body.book_id
                db.commit()
            data = json.loads(existing.content)
            return {
                **data,
                "scraped_at": existing.scraped_at.isoformat(),
                "from_cache": True,
            }

    safe, reason = is_safe_url(url)
    if not safe:
        raise HTTPException(400, detail=f"URL not allowed: {reason}")

    jina_url = JINA_BASE + url
    try:
        async with httpx.AsyncClient(timeout=SCRAPE_TIMEOUT) as client:
            jina_resp, html_resp, shopify_urls = await asyncio.gather(
                client.get(jina_url, headers={"Accept": "text/markdown"}, follow_redirects=True),
                _fetch_html_safe(client, url),
                _try_shopify_product_json(client, url),
                return_exceptions=True,
            )
    except Exception as e:
        raise HTTPException(502, detail=f"Scrape failed: {e}")

    if isinstance(jina_resp, Exception):
        if isinstance(jina_resp, httpx.TimeoutException):
            raise HTTPException(504, detail="Scrape timed out")
        raise HTTPException(502, detail=f"Scrape failed: {jina_resp}")
    try:
        jina_resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, detail=f"Scrape failed: HTTP {e.response.status_code}")

    markdown = jina_resp.text
    parsed_data = _parse_jina_markdown(markdown)

    # Collect additional URLs from raw HTML and Shopify product JSON, then
    # deduplicate across all sources keeping the largest CDN size variant per image.
    html_urls = []
    html_dims: dict[str, tuple[int, int]] = {}
    if html_resp is not None and not isinstance(html_resp, Exception) and html_resp.is_success:
        html_urls, html_dims = _extract_html_image_urls(html_resp.text, url)

    extra_shopify = shopify_urls if isinstance(shopify_urls, list) else []

    all_urls = parsed_data["image_urls"] + html_urls + extra_shopify
    parsed_data["image_urls"] = _pick_best_variants(all_urls)

    image_dims = {}
    for u in parsed_data["image_urls"]:
        if u in html_dims:
            w, h = html_dims[u]
            image_dims[u] = {"w": w, "h": h}
    parsed_data["image_dims"] = image_dims

    content_json = json.dumps(parsed_data)
    now = datetime.utcnow()

    existing = db.query(RawScrape).filter(RawScrape.url == url).first()
    if existing:
        existing.content = content_json
        existing.scraped_at = now
        if body.book_id is not None:
            existing.book_id = body.book_id
    else:
        db.add(RawScrape(url=url, scraped_at=now, content=content_json, book_id=body.book_id))
    db.commit()

    return {
        **parsed_data,
        "scraped_at": now.isoformat(),
        "from_cache": False,
    }
