#!/usr/bin/env python3
"""Generate missing WebP variants for all existing JPEG image variants.

Run inside the container:
    docker exec spread-app-1 python3 scripts/generate_webp.py
"""
import io
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image

IMAGE_DIR = Path(os.getenv("IMAGE_DIR", "/data/images"))


def main():
    count = 0
    for book_dir in sorted(IMAGE_DIR.iterdir()):
        if not book_dir.is_dir():
            continue
        for suffix in ("_thumb", "_web", "_zoom"):
            for jpg_path in sorted(book_dir.glob(f"*{suffix}.jpg")):
                webp_path = jpg_path.with_suffix(".webp")
                if webp_path.exists():
                    continue
                try:
                    img = Image.open(jpg_path)
                    out = io.BytesIO()
                    img.save(out, format="WEBP", quality=85)
                    webp_path.write_bytes(out.getvalue())
                    print(f"  {webp_path.name}")
                    count += 1
                except Exception as e:
                    print(f"  ERROR {jpg_path}: {e}", file=sys.stderr)
    print(f"\nDone. Generated {count} WebP files.")


if __name__ == "__main__":
    main()
