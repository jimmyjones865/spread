#!/usr/bin/env python3
"""One-time script: generate _thumb/_web/_zoom variants for all existing images."""
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
        print(f"Processing {len(images)} images…")
        ok = skipped = errors = 0
        for img in images:
            path = IMAGE_DIR / str(img.book_id) / img.filename
            if not path.exists():
                print(f"  SKIP  {img.filename} (file not found)")
                skipped += 1
                continue
            try:
                generate_variants(path.read_bytes(), path.parent, img.filename[:-4])
                ok += 1
                if ok % 10 == 0:
                    print(f"  {ok}/{len(images)}…")
            except Exception as e:
                print(f"  ERROR {img.filename}: {e}")
                errors += 1
        print(f"Done. {ok} generated, {skipped} skipped, {errors} errors.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
