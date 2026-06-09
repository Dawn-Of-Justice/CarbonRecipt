"""The tiered carbon engine — the heart of the app.

Covers unit conversion, the static factor lookup, tier fallthrough order
(OFF -> Climatiq -> static -> Gemini), error resilience, aggregation, and the
top-swap recommendations.
"""

import pytest

from app.carbon.engine import (
    CarbonEngine,
    category_breakdown,
    quantity_to_kg,
    static_factor,
    top_swaps,
)
from app.models import ItemFootprint, LineItem


# --- unit conversion -------------------------------------------------------
@pytest.mark.parametrize(
    "qty,unit,expected",
    [
        (2, "kg", 2.0),
        (500, "g", 0.5),
        (1, "l", 1.0),
        (250, "ml", 0.25),
        (3, "pc", 1.2),  # discrete -> ~0.4 kg each
        (1, "", 0.4),  # empty unit defaults to discrete
    ],
)
def test_quantity_to_kg(qty, unit, expected):
    assert quantity_to_kg(qty, unit) == pytest.approx(expected)


def test_quantity_to_kg_handles_none_quantity():
    assert quantity_to_kg(None, "kg") == 1.0  # type: ignore[arg-type]


# --- static factor ---------------------------------------------------------
def test_static_factor_keyword_match():
    assert static_factor("Fresh Beef Mince", "meat") == 60.0


def test_static_factor_longest_keyword_wins():
    # "soft drink" (0.5) should beat a shorter partial if both matched.
    assert static_factor("Diet Soft Drink Can", "beverages") == 0.5


def test_static_factor_category_default_when_no_keyword():
    assert static_factor("Mystery Item", "household") == 1.7


def test_static_factor_unknown_category_falls_to_other():
    assert static_factor("Mystery Item", "not_a_category") == 2.0


# --- tier fallthrough ------------------------------------------------------
def _line(name="Rice", category="grains", quantity=1, unit="kg"):
    return LineItem(name=name, category=category, quantity=quantity, unit=unit)


def _off_fp(item):
    return ItemFootprint(**item.model_dump(), co2eKg=1.111, source="off", confidence="high")


def test_tier1_off_wins_when_available():
    engine = CarbonEngine(off_lookup=_off_fp)
    fp = engine.resolve_item(_line())
    assert fp.source == "off"
    assert fp.co2eKg == 1.111


def test_tier2_climatiq_used_when_off_misses():
    def climatiq(item):
        return ItemFootprint(
            **item.model_dump(), co2eKg=2.2, source="climatiq", confidence="medium"
        )

    engine = CarbonEngine(off_lookup=lambda i: None, climatiq_lookup=climatiq)
    fp = engine.resolve_item(_line())
    assert fp.source == "climatiq"


def test_tier3_static_used_when_network_tiers_miss():
    engine = CarbonEngine(off_lookup=lambda i: None, climatiq_lookup=lambda i: None)
    fp = engine.resolve_item(_line(name="Basmati Rice", quantity=5, unit="kg"))
    assert fp.source == "static"
    assert fp.co2eKg == pytest.approx(20.0)  # rice 4.0 * 5kg


def test_gemini_is_truly_last_resort_not_called_when_static_succeeds():
    calls = []

    def gemini(item):
        calls.append(item.name)
        return 99.0

    engine = CarbonEngine(off_lookup=lambda i: None, climatiq_lookup=None, gemini_estimate=gemini)
    fp = engine.resolve_item(_line())
    assert fp.source == "static"
    assert calls == []  # static always wins before the LLM


def test_engine_resilient_to_tier_exceptions():
    def boom(item):
        raise RuntimeError("network down")

    engine = CarbonEngine(off_lookup=boom, climatiq_lookup=boom)
    fp = engine.resolve_item(_line())
    assert fp.source == "static"  # falls through despite raises


# --- aggregation -----------------------------------------------------------
def test_compute_totals_breakdown_and_swaps():
    engine = CarbonEngine()  # static-only
    items = [
        _line(name="Beef", category="meat", quantity=1, unit="kg"),
        _line(name="Milk", category="dairy", quantity=2, unit="l"),
    ]
    resp = engine.compute(items)
    assert resp.totalCo2eKg == pytest.approx(round(60.0 + 1.4 * 2, 3))
    assert resp.categoryBreakdown["meat"] == pytest.approx(60.0)
    assert resp.categoryBreakdown["dairy"] == pytest.approx(2.8)
    assert resp.equivalence.kmDriven > 0
    # beef should generate a swap suggestion
    assert any(s.fromItem == "Beef" for s in resp.topSwaps)


def test_category_breakdown_omits_zeroes():
    items = [
        ItemFootprint(name="A", category="meat", co2eKg=0.0, source="static", confidence="low"),
        ItemFootprint(name="B", category="dairy", co2eKg=1.0, source="static", confidence="medium"),
    ]
    bd = category_breakdown(items)
    assert "meat" not in bd
    assert bd["dairy"] == 1.0


# --- swaps -----------------------------------------------------------------
def test_top_swaps_sorted_by_savings_and_capped():
    items = [
        ItemFootprint(
            name="Beef Steak", category="meat", co2eKg=60.0, source="static", confidence="medium"
        ),
        ItemFootprint(
            name="Mutton Curry", category="meat", co2eKg=12.0, source="static", confidence="medium"
        ),
        ItemFootprint(
            name="Cheese Block", category="dairy", co2eKg=4.2, source="static", confidence="medium"
        ),
        ItemFootprint(
            name="Coffee Beans",
            category="beverages",
            co2eKg=3.3,
            source="static",
            confidence="medium",
        ),
    ]
    swaps = top_swaps(items, limit=3)
    assert len(swaps) == 3
    savings = [s.co2eSavedKg for s in swaps]
    assert savings == sorted(savings, reverse=True)


def test_top_swaps_flags_poor_ecoscore():
    items = [
        ItemFootprint(
            name="Sugary Cereal",
            category="packaged",
            co2eKg=2.0,
            source="off",
            confidence="high",
            ecoScore="E",
        ),
    ]
    swaps = top_swaps(items)
    assert len(swaps) == 1
    assert "Eco-Score" in swaps[0].rationale


def test_top_swaps_empty_for_already_green_basket():
    items = [
        ItemFootprint(
            name="Spinach",
            category="produce",
            co2eKg=0.2,
            source="static",
            confidence="medium",
            ecoScore="A",
        ),
    ]
    assert top_swaps(items) == []
