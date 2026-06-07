#!/usr/bin/env python3
"""One-time script: generate WebP+AVIF ladder variants for all existing images."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import BookImage
from app.utils.images import generate_variants

IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))


def main():
    db = SessionLocal()
    try:
        images = db.query(BookImage).all()
        total = len(images)
        print(f"Processing {total} images…", flush=True)
        ok = skipped = errors = 0
        for i, img in enumerate(images, 1):
            path = IMAGE_DIR / str(img.book_id) / img.filename
            if not path.exists():
                print(f"  [{i}/{total}] SKIP {img.filename} (file not found)", flush=True)
                skipped += 1
                continue
            try:
                generate_variants(path.read_bytes(), path.parent, img.filename[:-4])
                print(f"  [{i}/{total}] OK {img.filename}", flush=True)
                ok += 1
            except Exception as e:
                print(f"  [{i}/{total}] ERROR {img.filename}: {e}", flush=True)
                errors += 1
        print(f"\nDone: {ok} ok, {skipped} skipped, {errors} errors", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
