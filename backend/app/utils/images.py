import io
from pathlib import Path
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 100_000_000

MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG": "png",
    b"RIFF": "webp",
}

VARIANTS = {"thumb": 400, "web": 1400, "zoom": 3000}


def _detect_type(data: bytes) -> str | None:
    for magic, fmt in MAGIC.items():
        if data[:len(magic)] == magic:
            if fmt == "webp" and data[8:12] != b"WEBP":
                return None
            return fmt
    return None


def sanitize_image(data: bytes) -> bytes:
    if _detect_type(data) is None:
        raise ValueError("Unsupported or unsafe image format")

    img = Image.open(io.BytesIO(data))
    img.verify()
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=92)
    return out.getvalue()


def generate_variants(clean_bytes: bytes, book_dir: Path, stem: str) -> None:
    img = Image.open(io.BytesIO(clean_bytes))
    orig_w, orig_h = img.size
    for suffix, target_w in VARIANTS.items():
        dest = book_dir / f"{stem}_{suffix}.jpg"
        if orig_w <= target_w:
            dest.write_bytes(clean_bytes)
        else:
            ratio = target_w / orig_w
            new_h = round(orig_h * ratio)
            resized = img.resize((target_w, new_h), Image.Resampling.LANCZOS)
            out = io.BytesIO()
            resized.save(out, format="JPEG", quality=85)
            dest.write_bytes(out.getvalue())
