"""Glue between the carbon engine and the stored Receipt shape.

Builds a full Receipt (id, totals, breakdown, equivalence, swaps) from raw
line items, using a CarbonEngine. Kept separate so both the upload router and
the demo seeder share one code path.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.carbon.engine import CarbonEngine
from app.models import LineItem, Receipt


def build_receipt(
    engine: CarbonEngine,
    items: List[LineItem],
    merchant: Optional[str] = None,
    created_at: Optional[str] = None,
    receipt_id: Optional[str] = None,
    image_url: Optional[str] = None,
) -> Receipt:
    """Resolve footprints for `items` and assemble a complete Receipt."""
    fp = engine.compute(items)
    return Receipt(
        id=receipt_id or uuid.uuid4().hex[:12],
        createdAt=created_at or datetime.now(timezone.utc).isoformat(),
        merchant=merchant,
        items=fp.items,
        totalCo2eKg=fp.totalCo2eKg,
        categoryBreakdown=fp.categoryBreakdown,
        equivalence=fp.equivalence,
        topSwaps=fp.topSwaps,
        imageUrl=image_url,
    )
