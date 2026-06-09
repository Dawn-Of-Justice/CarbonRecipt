"""Upload validation — the security boundary for user-supplied files."""

import asyncio
import io

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile

from app.uploads import read_image_upload

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _upload(data: bytes, content_type: str = "image/png") -> UploadFile:
    return UploadFile(
        file=io.BytesIO(data),
        filename="receipt.png",
        headers=Headers({"content-type": content_type}),
    )


def _read(upload: UploadFile) -> bytes:
    return asyncio.run(read_image_upload(upload))


def test_valid_png_passes():
    data = PNG_MAGIC + b"\x00" * 32
    assert _read(_upload(data)) == data


def test_rejects_disallowed_content_type():
    with pytest.raises(HTTPException) as exc:
        _read(_upload(b"%PDF-1.4", content_type="application/pdf"))
    assert exc.value.status_code == 415


def test_rejects_empty_file():
    with pytest.raises(HTTPException) as exc:
        _read(_upload(b""))
    assert exc.value.status_code == 400


def test_rejects_non_image_bytes_despite_image_content_type():
    # Spoofed content-type: claims PNG but body is HTML.
    body = b"<html><script>alert(1)</script></html>" + b" " * 16
    with pytest.raises(HTTPException) as exc:
        _read(_upload(body, content_type="image/png"))
    assert exc.value.status_code == 415


def test_rejects_oversize_file(monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    data = PNG_MAGIC + b"\x00" * (2 * 1024 * 1024)  # 2 MB > 1 MB cap
    with pytest.raises(HTTPException) as exc:
        _read(_upload(data))
    assert exc.value.status_code == 413


def test_max_upload_clamped_to_floor(monkeypatch):
    # A bogus 0/negative env can't disable the cap; it clamps to >= 1 MB.
    monkeypatch.setenv("MAX_UPLOAD_MB", "0")
    from app.uploads import _max_upload_bytes

    assert _max_upload_bytes() >= 1 * 1024 * 1024
