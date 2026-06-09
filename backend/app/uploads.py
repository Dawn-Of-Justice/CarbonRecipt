"""Safe reading of uploaded receipt images.

The upload endpoints accept a user-supplied file and pass its bytes to Gemini.
Reading an unbounded upload into memory is a denial-of-service risk, and feeding
arbitrary bytes to the model wastes quota, so every upload is validated here:

  1. content-type must be an allowed image type,
  2. the body is read with a hard size cap (streamed, never fully buffering an
     oversized file), and
  3. the leading bytes must match a known image signature (defense in depth
     against a spoofed content-type).

Validation failures raise an HTTPException with a safe, non-leaking message.
"""

from __future__ import annotations

import os

from fastapi import HTTPException, UploadFile, status

# Allowed MIME types (phones commonly produce HEIC/HEIF; webp is common too).
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

# Hard ceiling on a single upload. Configurable, but capped so a misconfigured
# env can't disable the protection entirely.
_DEFAULT_MAX_MB = 10
_MAX_ALLOWED_MB = 25


def _max_upload_bytes() -> int:
    try:
        mb = int(os.getenv("MAX_UPLOAD_MB", str(_DEFAULT_MAX_MB)))
    except ValueError:
        mb = _DEFAULT_MAX_MB
    mb = max(1, min(mb, _MAX_ALLOWED_MB))
    return mb * 1024 * 1024


# Read in fixed chunks so we stop as soon as the cap is exceeded.
_CHUNK = 64 * 1024


def _looks_like_image(head: bytes) -> bool:
    """Lenient magic-byte sniff covering the allowed image families."""
    if len(head) < 12:
        return False
    if head[:3] == b"\xff\xd8\xff":  # JPEG
        return True
    if head[:8] == b"\x89PNG\r\n\x1a\n":  # PNG
        return True
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":  # WebP
        return True
    # HEIC/HEIF and other ISO-BMFF: "ftyp" box at offset 4.
    if head[4:8] == b"ftyp":  # noqa: SIM103 - explicit for readability
        return True
    return False


async def read_image_upload(file: UploadFile) -> bytes:
    """Validate and read an uploaded image, enforcing type and size limits.

    Returns the raw bytes on success. Raises HTTPException (415/413/400) on a
    type mismatch, oversize body, or non-image content.
    """
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Upload a JPEG, PNG, WebP, or HEIC image.",
        )

    max_bytes = _max_upload_bytes()
    buf = bytearray()
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image too large. The maximum size is {max_bytes // (1024 * 1024)} MB.",
            )

    if not buf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )
    if not _looks_like_image(bytes(buf[:16])):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The uploaded file does not appear to be a valid image.",
        )
    return bytes(buf)
