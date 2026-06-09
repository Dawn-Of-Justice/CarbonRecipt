"""POST /footprint — the tiered carbon engine exposed standalone (no storage)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.carbon.engine import CarbonEngine
from app.deps import get_engine
from app.models import FootprintRequest, FootprintResponse

router = APIRouter()


@router.post("/footprint", response_model=FootprintResponse)
def footprint(
    body: FootprintRequest, engine: CarbonEngine = Depends(get_engine)
) -> FootprintResponse:
    """Resolve CO2e for a list of line items via OFF -> Climatiq -> static -> Gemini."""
    return engine.compute(body.items)
