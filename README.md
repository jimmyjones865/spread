# Spread

Self-hosted photobook gallery. FastAPI backend, React frontend, SQLite, Docker Compose.

- **Image ladder** — AVIF + WebP at 7 widths (400–4000px), quality-tuned per rung, no upscaling. Browser picks the sharpest variant it can actually display.
- **Lightbox racing** — cards prefetch on approach; BookDetail prefetches adjacent books immediately; lightbox loads at exact DPR-aware display size, not a larger rung.
- **BookDetail scroll** — two-column layout where scrolling anywhere (including dead space) drives the image column. No Safari rubber band.
- **Theme sort** — gallery order is defined by tag combinations, not by individual book fields. Reorderable in admin; changes take effect immediately.
- **Scraper** — Jina + parallel raw HTML + Shopify product JSON, deduplicates across CDN size variants and cross-domain mirrors.

---

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- `ADMIN_PASSWORD_HASH` — generate with the command below
- `SESSION_SECRET` — random string, 32+ characters
- `COOKIE_SECURE` — `false` for local dev (HTTP), `true` when served over HTTPS
- `SITE_TITLE` — gallery title shown in the public frontend

### 2. Set admin password

```bash
docker compose run --rm app python3 scripts/hash_password.py
```

Copy the printed hash into `.env` wrapped in single quotes:

```
ADMIN_PASSWORD_HASH='$2b$12$...'
```

Single quotes are required — the `$` characters would be interpreted by the shell otherwise.

To change the password later: run the same command, paste the new hash, restart the container (`docker compose up -d --force-recreate`). Changing `SESSION_SECRET` invalidates all existing sessions immediately.

Restrict `.env` permissions on the server — it contains the password hash and session secret:

```bash
chmod 600 .env
```

### 3. Build and start

```bash
docker compose up -d --build
```

The app runs on port 8000. Admin panel is at `/admin`.

### 4. Import catalog

Put your `catalog.md` in the project root (see format below), then:

```bash
docker compose exec app python3 scripts/import_catalog.py ../catalog.md
```

The import is idempotent — safe to run again if you add rows. Books whose slug already exists are skipped.

---

## Catalog format

The catalog is a Markdown table with three columns: `Autor`, `Titel`, `Edition`.

```markdown
# Photo Book Catalog

| Autor | Titel | Edition |
|---|---|---|
| Wolf, Michael | Tokyo Compression | 1st |
| Wolf, Michael | Tokyo Compression Revisited | 1st |
| Brodie, Mike | A Period of Juvenile Prosperity | 5th signed |
| Samoylova, Anastasia | Flood Zone | 1st 2019 |
| Suzuki, Tatsuo | The Sound of Waves | ordered |
| Maloletka, Evgeny | The Siege of Mariupol | preorder 2026 |
```

**Autor** — last name first, comma-separated: `Wolf, Michael` → stored as `Michael Wolf`. Single-name artists (e.g. `Banksy`) work as-is.

**Edition** — free text. The importer extracts:
- **Year** — any four-digit year (`2019`, `1st 2019 signed` → 2019)
- **Status** — `owned` by default; `ordered` or `preorder` anywhere in the field → `on_order`

Everything else (edition label, signed, numbered, print run, ISBN, description, images) is filled in via the admin panel after import.

---

## Caddy reverse proxy

```caddyfile
spread.example.com {
    encode zstd gzip
    reverse_proxy localhost:8000 {
        header_up X-Real-IP {remote_host}
    }
}
```

Caddy handles HTTPS automatically. Make sure `COOKIE_SECURE=true` in `.env` when running behind Caddy.

`header_up X-Real-IP {remote_host}` passes the real client IP to the app so per-IP rate limiting works correctly. Without it, the login rate limit would treat all visitors as a single client (the Docker bridge IP).

---

## Data

Images and the database are stored in a Docker volume (`data`). Back it up with:

```bash
docker run --rm -v spread_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/spread-backup.tar.gz /data
```

Restore:

```bash
docker run --rm -v spread_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/spread-backup.tar.gz -C /
```

To reset everything (wipes all data):

```bash
docker compose down -v
docker compose up -d --build
```
