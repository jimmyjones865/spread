#!/usr/bin/env python3
"""Generates WebP+AVIF ladder variants for all existing images.
Run inside container: docker exec spread-app-1 python3 scripts/generate_ladder.py
"""
import sys
from pathlib import Path

sys.path.insert(0, "/app")

from app.database import SessionLocal
from app.models import BookImage
from app.utils.images import generate_variants

DATA_DIR = Path("/data/images")


def main():
    db = SessionLocal()
    images = db.query(BookImage).all()
    total = len(images)
    print(f"Processing {total} images...", flush=True)

    ok = skipped = errors = 0

    for i, img in enumerate(images, 1):
        src = DATA_DIR / str(img.book_id) / img.filename
        if not src.exists():
            print(f"  [{i}/{total}] SKIP {img.filename} (original not found)", flush=True)
            skipped += 1
            continue
        try:
            generate_variants(src.read_bytes(), DATA_DIR / str(img.book_id), img.filename[:-4])
            print(f"  [{i}/{total}] OK {img.filename}", flush=True)
            ok += 1
        except Exception as e:
            print(f"  [{i}/{total}] ERROR {img.filename}: {e}", flush=True)
            errors += 1

    db.close()
    print(f"\nDone: {ok} ok, {skipped} skipped, {errors} errors", flush=True)


if __name__ == "__main__":
    main()
