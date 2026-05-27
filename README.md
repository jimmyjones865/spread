# Spread

Self-hosted photobook gallery. FastAPI backend, React frontend, SQLite, Docker Compose.

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
    reverse_proxy localhost:8000
}
```

Caddy handles HTTPS automatically. Make sure `COOKIE_SECURE=true` in `.env` when running behind Caddy.

If the app is on a different host:

```caddyfile
spread.example.com {
    reverse_proxy 192.168.1.10:8000
}
```

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
