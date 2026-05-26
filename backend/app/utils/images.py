import io
from PIL import Image

Image.MAX_IMAGE_PIXELS = 100_000_000

MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG": "png",
    b"RIFF": "webp",
}


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
    img = img.convert("RGB")

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=92)
    return out.getvalue()
