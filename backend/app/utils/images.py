import io
from pathlib import Path
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 100_000_000

MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG": "png",
    b"RIFF": "webp",
}

LADDER = {400: (70, 60), 800: (78, 68), 1300: (82, 72), 1500: (82, 72), 2000: (85, 75), 3000: (85, 75), 4000: (85, 75)}


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
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def generate_variants(clean_bytes: bytes, book_dir: Path, stem: str) -> None:
    img = Image.open(io.BytesIO(clean_bytes))
    orig_w, orig_h = img.size

    for target_w, (webp_q, avif_q) in LADDER.items():
        if orig_w < target_w:
            continue
        if orig_w == target_w:
            scaled = img
        else:
            ratio = target_w / orig_w
            new_h = round(orig_h * ratio)
            scaled = img.resize((target_w, new_h), Image.Resampling.LANCZOS)
        out_webp = io.BytesIO()
        scaled.save(out_webp, format="WEBP", quality=webp_q)
        (book_dir / f"{stem}_{target_w}.webp").write_bytes(out_webp.getvalue())
        out_avif = io.BytesIO()
        scaled.save(out_avif, format="AVIF", quality=avif_q)
        (book_dir / f"{stem}_{target_w}.avif").write_bytes(out_avif.getvalue())
