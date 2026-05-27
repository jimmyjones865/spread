import os
import logging
from pathlib import Path
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel

from app.auth import (
    verify_password, create_session_token, require_admin,
    SESSION_COOKIE, SESSION_MAX_AGE, log_login,
)
from app.routers.admin import artists, books, tags, pages, footer, scrape, image_meta
from app.routers import public

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Spread", docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.get("/api/auth/me")
async def me(_: None = Depends(require_admin)):
    return {"authenticated": True}


@app.get("/api/health")
async def health():
    return {"ok": True}


# SPA static assets and catch-all — must be last
STATIC_DIR = Path("static")

if (STATIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="spa-assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"error": "frontend not built"}
