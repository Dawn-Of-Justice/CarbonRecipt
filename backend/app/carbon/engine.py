"""Carbon lookup engine — the heart of Carbon Receipt.

For each parsed line item we resolve a CO2e value by falling through four tiers,
tagging every line with `source` and `confidence`:

    1. Open Food Facts  (real per-product number)         source="off"      high
    2. Climatiq          (category emission factors)        source="climatiq" medium
    3. Static table      (DEFRA/Agribalyse bundled json)    source="static"   medium
    4. Gemini estimate   (last resort, never primary)       source="gemini"   low

This module is PURE and unit-testable: the network/LLM tiers are injected as
callables (`off_lookup`, `climatiq_lookup`, `gemini_estimate`) so tests can mock
them without touching the web layer. The default callables wire up the real
clients lazily.

Quantity handling: the static table is "kg CO2e per kg of product". We convert
each line's quantity+unit into an approximate mass in kg and multiply.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable, Dict, List, Optional, TypeVar

from app.carbon.equivalence import equivalence_for
from app.models import (
    FootprintResponse,
    ItemFootprint,
    LineItem,
    Swap,
)

# --- static factor table (tier 3) -----------------------------------------
_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "emission_factors.json"


def _load_factors() -> dict:
    with open(_DATA_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


_FACTORS = _load_factors()
BY_KEYWORD: Dict[str, float] = _FACTORS["by_keyword"]
BY_CATEGORY_DEFAULT: Dict[str, float] = _FACTORS["by_category_default"]


# --- unit -> kg conversion -------------------------------------------------
def quantity_to_kg(quantity: float, unit: str) -> float:
    """Approximate the mass of a line in kilograms.

    Static factors are per-kg, so we need a sensible mass. Volumes are treated
    as ~water density. Discrete units (pc/pack/etc.) default to ~0.4 kg, a
    reasonable average grocery item weight.
    """
    q = float(quantity or 1)
    u = (unit or "pc").strip().lower()

    if u in ("kg", "kgs", "kilogram", "kilograms"):
        return q
    if u in ("g", "gm", "gms", "gram", "grams"):
        return q / 1000.0
    if u in ("l", "ltr", "litre", "litres", "liter", "liters"):
        return q  # ~1 kg per litre
    if u in ("ml", "millilitre", "milliliters"):
        return q / 1000.0
    # pc, pcs, pack, packet, unit, ea, "" ... -> assume ~0.4 kg each
    return q * 0.4


# --- tier 3: static lookup -------------------------------------------------
def static_factor(name: str, category: str) -> float:
    """kg CO2e per kg from the bundled table: keyword match, else category default."""
    lname = (name or "").lower()
    # Longest keyword wins so "soft drink" beats "drink"-style partials.
    best: Optional[str] = None
    for kw in BY_KEYWORD:
        if kw in lname and (best is None or len(kw) > len(best)):
            best = kw
    if best is not None:
        return BY_KEYWORD[best]
    return BY_CATEGORY_DEFAULT.get(category, BY_CATEGORY_DEFAULT["other"])


def _static_footprint(item: LineItem) -> ItemFootprint:
    per_kg = static_factor(item.name, item.category)
    mass = quantity_to_kg(item.quantity, item.unit)
    return ItemFootprint(
        **item.model_dump(),
        co2eKg=round(per_kg * mass, 3),
        source="static",
        confidence="medium",
        ecoScore=None,
        note="static factor x est. mass",
    )


# --- engine ---------------------------------------------------------------
# Type aliases for the injectable tier callables.
# off_lookup(item) -> Optional[ItemFootprint]
OffLookup = Callable[[LineItem], Optional[ItemFootprint]]
# climatiq_lookup(item) -> Optional[ItemFootprint]
ClimatiqLookup = Callable[[LineItem], Optional[ItemFootprint]]
# gemini_estimate(item) -> Optional[float]  (kg CO2e for the whole line)
GeminiEstimate = Callable[[LineItem], Optional[float]]

_T = TypeVar("_T")


def _try_tier(lookup: Optional[Callable[[LineItem], Optional[_T]]], item: LineItem) -> Optional[_T]:
    """Run one optional tier, treating any error as a miss.

    A flaky network source or LLM must never break the pipeline — on failure
    the next tier simply takes over.
    """
    if lookup is None:
        return None
    try:
        return lookup(item)
    except Exception:
        return None


class CarbonEngine:
    """Resolve CO2e per line item via the tiered hierarchy.

    Tiers are dependency-injected callables. Any of them may be None to skip
    that tier (e.g. no Climatiq key, or offline tests with no Gemini).
    """

    def __init__(
        self,
        off_lookup: Optional[OffLookup] = None,
        climatiq_lookup: Optional[ClimatiqLookup] = None,
        gemini_estimate: Optional[GeminiEstimate] = None,
    ) -> None:
        self.off_lookup = off_lookup
        self.climatiq_lookup = climatiq_lookup
        self.gemini_estimate = gemini_estimate

    def resolve_item(self, item: LineItem) -> ItemFootprint:
        """Resolve a single line item, falling through tiers 1->4."""
        # Tiers 1-2: real product data (OFF), then category factors (Climatiq).
        for lookup in (self.off_lookup, self.climatiq_lookup):
            fp = _try_tier(lookup, item)
            if fp is not None:
                return fp

        # Tier 3: static table — always available, deterministic.
        # We try this before Gemini so the LLM is truly the last resort.
        try:
            return _static_footprint(item)
        except Exception:
            pass

        # Tier 4: Gemini estimate — final fallback so the app never shows blank.
        estimate = _try_tier(self.gemini_estimate, item)
        if estimate is not None:
            return ItemFootprint(
                **item.model_dump(),
                co2eKg=round(float(estimate), 3),
                source="gemini",
                confidence="low",
                ecoScore=None,
                note="estimated by Gemini",
            )

        # Absolute safety net (should be unreachable given tier 3).
        return ItemFootprint(
            **item.model_dump(),
            co2eKg=0.0,
            source="static",
            confidence="low",
            ecoScore=None,
            note="no factor found",
        )

    def resolve_items(self, items: List[LineItem]) -> List[ItemFootprint]:
        return [self.resolve_item(it) for it in items]

    def compute(self, items: List[LineItem]) -> FootprintResponse:
        """Full footprint: per-item, total, category breakdown, equivalence, swaps."""
        resolved = self.resolve_items(items)
        total = round(sum(i.co2eKg for i in resolved), 3)
        breakdown = category_breakdown(resolved)
        equ = equivalence_for(total)
        swaps = top_swaps(resolved)
        return FootprintResponse(
            items=resolved,
            totalCo2eKg=total,
            categoryBreakdown=breakdown,
            equivalence=equ,
            topSwaps=swaps,
        )


def category_breakdown(items: List[ItemFootprint]) -> Dict[str, float]:
    """kg CO2e summed per category (zero categories omitted)."""
    out: Dict[str, float] = {}
    for it in items:
        out[it.category] = round(out.get(it.category, 0.0) + it.co2eKg, 3)
    return {k: v for k, v in out.items() if v > 0}


# --- "reduce": top-3 swap recommendations ---------------------------------
# Rule table: keyword in item name -> a lower-carbon suggestion + replacement
# per-kg factor used to estimate savings. Highest-savings swaps surface first.
_SWAP_RULES = [
    # (keyword, suggestion, replacement_per_kg, rationale)
    (
        "beef",
        "chicken or lentils",
        BY_KEYWORD["chicken"],
        "Beef is the single highest-carbon food; chicken or dal cut it dramatically.",
    ),
    (
        "mutton",
        "chicken",
        BY_KEYWORD["chicken"],
        "Red meat (mutton/goat) is far more carbon-intensive than poultry.",
    ),
    (
        "lamb",
        "chicken",
        BY_KEYWORD["chicken"],
        "Lamb is very carbon-intensive; poultry is a lighter protein.",
    ),
    (
        "goat",
        "chicken",
        BY_KEYWORD["chicken"],
        "Goat meat is carbon-intensive; chicken is a lighter protein.",
    ),
    (
        "pork",
        "chicken or lentils",
        BY_KEYWORD["chicken"],
        "Swapping pork for chicken or pulses lowers the footprint.",
    ),
    (
        "prawn",
        "fish or paneer",
        BY_KEYWORD["fish"],
        "Farmed prawns are emissions-heavy; fish or paneer is lighter.",
    ),
    (
        "cheese",
        "paneer",
        BY_KEYWORD["paneer"],
        "Paneer has a much lower footprint than aged cheese.",
    ),
    (
        "butter",
        "ghee in moderation or oil",
        BY_KEYWORD["oil"],
        "Dairy fats are carbon-heavy; use plant oil where you can.",
    ),
    ("coffee", "tea", BY_KEYWORD["tea"], "Coffee has a high footprint per kg; tea is lighter."),
    (
        "chocolate",
        "local fruit",
        BY_KEYWORD["fruit"],
        "Cocoa is land-intensive; fruit is a low-carbon sweet alternative.",
    ),
]


def top_swaps(items: List[ItemFootprint], limit: int = 3) -> List[Swap]:
    """Up to `limit` concrete lower-carbon swaps, highest savings first.

    Savings = (item's current kg) - (replacement_per_kg * same est. mass), only
    counting positive savings. Also flags poor Eco-Score (D/E) items.
    """
    candidates: List[Swap] = []
    seen: set = set()

    for it in items:
        lname = it.name.lower()
        for kw, suggestion, repl_per_kg, rationale in _SWAP_RULES:
            if kw in lname and it.name not in seen:
                mass = quantity_to_kg(it.quantity, it.unit)
                replacement_kg = repl_per_kg * mass
                saved = round(it.co2eKg - replacement_kg, 3)
                if saved > 0:
                    candidates.append(
                        Swap(
                            fromItem=it.name,
                            toSuggestion=suggestion,
                            co2eSavedKg=saved,
                            rationale=rationale,
                        )
                    )
                    seen.add(it.name)
                break  # one rule per item

    # Eco-Score D/E nudge for items not already covered by a rule.
    for it in items:
        if it.ecoScore in ("D", "E") and it.name not in seen:
            candidates.append(
                Swap(
                    fromItem=it.name,
                    toSuggestion="a higher Eco-Score (A/B) alternative",
                    co2eSavedKg=round(it.co2eKg * 0.4, 3),
                    rationale=f"This item scores Eco-Score {it.ecoScore}; "
                    "a greener brand cuts its footprint.",
                )
            )
            seen.add(it.name)

    candidates.sort(key=lambda s: s.co2eSavedKg, reverse=True)
    return candidates[:limit]


# --- default wiring (lazy real clients) -----------------------------------
def build_default_engine() -> "CarbonEngine":
    """Construct an engine wired to the real OFF / Climatiq / Gemini clients.

    Imports are local so importing the engine for unit tests doesn't pull in
    httpx/genai. Tiers self-disable when their config is absent.
    """
    from app.carbon.sources import climatiq_lookup, off_lookup
    from app.gemini.client import gemini_estimate

    climatiq = climatiq_lookup if os.getenv("CLIMATIQ_API_KEY") else None
    return CarbonEngine(
        off_lookup=off_lookup,
        climatiq_lookup=climatiq,
        gemini_estimate=gemini_estimate,
    )
