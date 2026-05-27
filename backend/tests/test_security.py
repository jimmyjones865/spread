"""
Security-critical tests. These document the threat model, not just code coverage.
"""
import io
import pytest
from PIL import Image

from app.utils.images import sanitize_image
from app.utils.ssrf import is_safe_url


# ── Image sanitization ────────────────────────────────────────────────────────

def _make_jpeg(width=10, height=10) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png() -> bytes:
    img = Image.new("RGB", (10, 10), color=(50, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_sanitize_valid_jpeg():
    result = sanitize_image(_make_jpeg())
    assert result[:3] == b"\xff\xd8\xff"


def test_sanitize_valid_png():
    result = sanitize_image(_make_png())
    assert result[:3] == b"\xff\xd8\xff"  # re-encoded to JPEG


def test_sanitize_svg_rejected():
    svg = b"<svg xmlns='http://www.w3.org/2000/svg'><rect width='10' height='10'/></svg>"
    with pytest.raises(ValueError, match="Unsupported"):
        sanitize_image(svg)


def test_sanitize_corrupt_data_rejected():
    with pytest.raises(Exception):
        sanitize_image(b"\xff\xd8\xff" + b"\x00" * 20)


def test_sanitize_random_bytes_rejected():
    with pytest.raises(Exception):
        sanitize_image(b"not an image at all")


def test_decompression_bomb_guard():
    # Guard is set at module level — verify it's in place before any image opens
    assert Image.MAX_IMAGE_PIXELS == 100_000_000


# ── SSRF mitigation ───────────────────────────────────────────────────────────

def test_ssrf_public_url_allowed():
    ok, result = is_safe_url("https://www.example.com/page")
    assert ok

def test_ssrf_private_ipv4_10():
    ok, reason = is_safe_url("http://10.0.0.1/secret")
    assert not ok
    assert reason == "private"


def test_ssrf_private_ipv4_192168():
    ok, reason = is_safe_url("http://192.168.1.1/router")
    assert not ok
    assert reason == "private"


def test_ssrf_loopback():
    ok, reason = is_safe_url("http://127.0.0.1/internal")
    assert not ok
    assert reason == "private"


def test_ssrf_link_local():
    ok, reason = is_safe_url("http://169.254.169.254/metadata")
    assert not ok
    assert reason == "private"


def test_ssrf_ipv6_loopback():
    ok, reason = is_safe_url("http://[::1]/internal")
    assert not ok
    assert reason == "private"


def test_ssrf_bad_scheme():
    ok, reason = is_safe_url("file:///etc/passwd")
    assert not ok
    assert reason == "scheme"


def test_ssrf_ftp_scheme():
    ok, reason = is_safe_url("ftp://example.com/file")
    assert not ok
    assert reason == "scheme"


def test_ssrf_unspecified_ipv4():
    # 0.0.0.0 is not in any private CIDR but connects to localhost on Linux
    ok, reason = is_safe_url("http://0.0.0.0/internal")
    assert not ok
    assert reason == "private"


def test_ssrf_unspecified_ipv6():
    ok, reason = is_safe_url("http://[::]/internal")
    assert not ok
    assert reason == "private"
