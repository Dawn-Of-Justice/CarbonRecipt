"""GET /barcode/{code} — Open Food Facts barcode lookup (wow feature).

Returns an ItemFootprint. Falls back to the static factor if OFF has the
product but no carbon number, and to a plain static estimate if OFF is
unreachable, so the demo never errors out.
"""

from __future__ import annotations

from fastapi import APIRouter, Path

from app.carbon.engine import _static_footprint
from app.carbon.sources import off_barcode_lookup
from app.models import ItemFootprint, LineItem

router = APIRouter()


@router.get("/barcode/{code}", response_model=ItemFootprint)
def barcode(code: str = Path(pattern=r"^\d{1,14}$")) -> ItemFootprint:
    """Barcodes are digits only (EAN/UPC); the pattern also keeps the value
    safe to interpolate into the Open Food Facts URL."""
    fp = off_barcode_lookup(code)
    if fp is not None:
        return fp
    # OFF miss/unreachable: degrade to a static estimate rather than 404,
    # so the scan feature always returns something usable for the demo.
    item = LineItem(
        name=f"Product {code}", rawText=code, category="packaged", quantity=1, unit="pc"
    )
    return _static_footprint(item)
