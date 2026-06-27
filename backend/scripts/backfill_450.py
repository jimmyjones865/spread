#!/usr/bin/env python3
"""Backfill 450w WebP+AVIF variants for all existing images that don't have them."""
import io
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image
from app.database import SessionLocal
from app.models import BookImage

IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))
TARGET_W = 450
WEBP_Q = 70
AVIF_Q = 60


def main():
    db = SessionLocal()
    try:
        images = db.query(BookImage).all()
        total = len(images)
        print(f"Checking {total} images for missing {TARGET_W}w variants…", flush=True)
        ok = skipped = already = errors = 0
        for i, img in enumerate(images, 1):
            book_dir = IMAGE_DIR / str(img.book_id)
            stem = img.filename[:-4]
            orig = book_dir / img.filename
            avif_out = book_dir / f"{stem}_{TARGET_W}.avif"
            webp_out = book_dir / f"{stem}_{TARGET_W}.webp"

            if avif_out.exists() and webp_out.exists():
                already += 1
                continue

            if not orig.exists():
                print(f"  [{i}/{total}] SKIP {img.filename} (original not found)", flush=True)
                skipped += 1
                continue

            try:
                src = Image.open(orig)
                orig_w, orig_h = src.size
                if orig_w < TARGET_W:
                    print(f"  [{i}/{total}] SKIP {img.filename} (orig {orig_w}px < {TARGET_W}px)", flush=True)
                    skipped += 1
                    continue

                ratio = TARGET_W / orig_w
                scaled = src.resize((TARGET_W, round(orig_h * ratio)), Image.Resampling.LANCZOS)

                if not webp_out.exists():
                    buf = io.BytesIO()
                    scaled.save(buf, format="WEBP", quality=WEBP_Q)
                    webp_out.write_bytes(buf.getvalue())

                if not avif_out.exists():
                    buf = io.BytesIO()
                    scaled.save(buf, format="AVIF", quality=AVIF_Q)
                    avif_out.write_bytes(buf.getvalue())

                print(f"  [{i}/{total}] OK {img.filename}", flush=True)
                ok += 1
            except Exception as e:
                print(f"  [{i}/{total}] ERROR {img.filename}: {e}", flush=True)
                errors += 1

        print(f"\nDone: {ok} generated, {already} already existed, {skipped} skipped, {errors} errors", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
