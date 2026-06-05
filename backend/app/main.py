import mimetypes
import os
import logging
from pathlib import Path

mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel


def _real_ip(request: Request) -> str:
    # Caddy sets X-Real-IP to the actual client IP. Falls back to socket peer
    # address when running without a proxy (local dev).
    return request.headers.get("X-Real-IP") or get_remote_address(request)

from app.auth import (
    verify_password, create_session_token, require_admin,
    SESSION_COOKIE, SESSION_MAX_AGE, log_login,
)
from app.routers.admin import artists, books, tags, pages, footer, scrape, image_meta
from app.routers import public

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

limiter = Limiter(key_func=_real_ip)

_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' https: data: blob:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "object-src 'none';"
)

app = FastAPI(title="Spread", docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = _CSP
    path = request.url.path
    if path.startswith("/images/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    elif path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path in ("/api/config", "/api/tags", "/api/footer", "/api/artists") or path.startswith("/api/pages/"):
        response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=86400"
    elif path.startswith("/api/books") or path.startswith("/api/artists/"):
        # private: response varies by admin session (hidden books)
        response.headers["Cache-Control"] = "private, max-age=30, stale-while-revalidate=86400"
    return response

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() != "false"

app.include_router(artists.router)
app.include_router(books.router)
app.include_router(tags.router)
app.include_router(pages.router)
app.include_router(footer.router)
app.include_router(scrape.router)
app.include_router(image_meta.router)
app.include_router(public.router)
IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(IMAGE_DIR)), name="images")


class LoginRequest(BaseModel):
    password: str


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginRequest):
    ip = request.client.host if request.client else "unknown"
    password_hash = os.getenv("ADMIN_PASSWORD_HASH", "")
    ok = bool(password_hash) and verify_password(body.password, password_hash)
    log_login(ip, ok)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_session_token()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
    )
    return {"ok": True}


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        SESSION_COOKIE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
    )
    return {"ok": True}


@app.get("/api/auth/me")
async def me(_: None = Depends(require_admin)):
    return {"authenticated": True}


@app.get("/api/health")
async def health():
    return {"ok": True}


STATIC_DIR = Path("static")


@app.get("/{full_path:path}")
async def spa(full_path: str):
    # Serve real files (favicon, fonts, assets) when they exist; fall back to
    # index.html so React Router handles all client-side routes (e.g. /admin).
    # Resolve + bounds-check prevents path traversal (e.g. /../app/main.py).
    if STATIC_DIR.exists():
        static_root = STATIC_DIR.resolve()
        candidate = (STATIC_DIR / full_path).resolve()
        try:
            candidate.relative_to(static_root)
            if candidate.is_file():
                return FileResponse(str(candidate))
        except ValueError:
            pass
        index = STATIC_DIR / "index.html"
        if index.exists():
            resp = FileResponse(str(index))
            resp.headers["Cache-Control"] = "no-cache"
            return resp
    raise HTTPException(404)
