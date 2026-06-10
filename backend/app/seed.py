"""Demo seed data.

On startup, if the store is empty, we seed two realistic Indian grocery
receipts so the frontend looks alive on first load. Seeding is deterministic:
fixed ids, fixed dates, and footprints computed offline via the static tier
(no network), so the demo never depends on OFF/Gemini being reachable.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.carbon.engine import CarbonEngine
from app.models import LineItem
from app.pipeline import build_receipt
from app.store import DEFAULT_USER, Repository

# Serializes the check-then-seed so concurrent first-load requests for the same
# new user (the dashboard fires several at once) seed exactly once.
_seed_lock = threading.Lock()


@dataclass(frozen=True)
class _Basket:
    """A fixed demo basket. Typed so the seed data stays self-documenting."""

    id: str
    merchant: str
    days_ago: int
    items: list[LineItem] = field(default_factory=list)


# Two fixed sample baskets. Dates are set at seed time relative to "now" so
# trends/budget always show recent activity.
_SEED_BASKETS: list[_Basket] = [
    _Basket(
        id="seed-bigbasket-01",
        merchant="BigBasket",
        days_ago=3,
        items=[
            LineItem(
                name="Amul Toned Milk",
                rawText="AMUL TONED MILK 1L",
                category="dairy",
                quantity=2,
                unit="l",
            ),
            LineItem(
                name="Mutton (Goat)",
                rawText="FRESH MUTTON 500G",
                category="meat",
                quantity=0.5,
                unit="kg",
            ),
            LineItem(
                name="Basmati Rice",
                rawText="INDIA GATE BASMATI 5KG",
                category="grains",
                quantity=5,
                unit="kg",
            ),
            LineItem(
                name="Toor Dal",
                rawText="TOOR DAL 1KG",
                category="grains",
                quantity=1,
                unit="kg",
            ),
            LineItem(
                name="Amul Cheese",
                rawText="AMUL CHEESE CUBES 200G",
                category="dairy",
                quantity=0.2,
                unit="kg",
            ),
            LineItem(
                name="Tomatoes",
                rawText="TOMATO 1KG",
                category="produce",
                quantity=1,
                unit="kg",
            ),
            LineItem(
                name="Onions",
                rawText="ONION 2KG",
                category="produce",
                quantity=2,
                unit="kg",
            ),
        ],
    ),
    _Basket(
        id="seed-dmart-02",
        merchant="DMart",
        days_ago=10,
        items=[
            LineItem(
                name="Chicken Breast",
                rawText="FRESH CHICKEN 1KG",
                category="meat",
                quantity=1,
                unit="kg",
            ),
            LineItem(
                name="Paneer",
                rawText="PANEER 200G",
                category="dairy",
                quantity=0.2,
                unit="kg",
            ),
            LineItem(
                name="Aashirvaad Atta",
                rawText="AASHIRVAAD ATTA 5KG",
                category="grains",
                quantity=5,
                unit="kg",
            ),
            LineItem(
                name="Refined Oil",
                rawText="FORTUNE OIL 1L",
                category="packaged",
                quantity=1,
                unit="l",
            ),
            LineItem(
                name="Bananas",
                rawText="BANANA 1 DOZEN",
                category="produce",
                quantity=1,
                unit="kg",
            ),
            LineItem(
                name="Tata Salt",
                rawText="TATA SALT 1KG",
                category="packaged",
                quantity=1,
                unit="kg",
            ),
            LineItem(
                name="Detergent Powder",
                rawText="SURF EXCEL 1KG",
                category="household",
                quantity=1,
                unit="kg",
            ),
        ],
    ),
]


def _seed_engine() -> CarbonEngine:
    """Engine with no network tiers -> deterministic static-only footprints."""
    return CarbonEngine(off_lookup=None, climatiq_lookup=None, gemini_estimate=None)


def seed_if_empty(repository: Repository, user_id: str = DEFAULT_USER) -> int:
    """Seed demo receipts for a user if their store is empty. Returns count seeded.

    Idempotent and race-safe. Only called for the shared demo identity (see
    `deps.get_seeded_repo`); real anonymous users start with an empty history.
    """
    # Fast path: already seeded -> no lock contention on the common case.
    if not repository.is_empty(user_id):
        return 0

    with _seed_lock:
        # Re-check under the lock (another request may have just seeded).
        if not repository.is_empty(user_id):
            return 0

        engine = _seed_engine()
        now = datetime.now(timezone.utc)
        seeded = 0
        for basket in _SEED_BASKETS:
            created = (now - timedelta(days=basket.days_ago)).isoformat()
            receipt = build_receipt(
                engine,
                basket.items,
                merchant=basket.merchant,
                created_at=created,
                receipt_id=basket.id,
            )
            repository.add_receipt(receipt, user_id)
            seeded += 1
        return seeded
