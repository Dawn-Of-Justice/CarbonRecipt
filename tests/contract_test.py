"""
Contract test suite for the Carbon Receipt backend.

Hits a RUNNING backend at http://localhost:8000 and asserts every endpoint returns
the EXACT shapes defined in docs/API_CONTRACT.md. If the backend is not reachable,
the whole module is skipped with a friendly message (so CI / a teammate without the
server up gets a clean "skipped", not a wall of errors).

Run:
    # 1. start the backend (see run-local.ps1), then:
    python -m pytest tests/contract_test.py -v

Optional env vars:
    API_BASE_URL   override backend URL (default http://localhost:8000)
    RUN_LIVE_AI    set to "1" to also run Gemini-dependent tests
                   (POST /receipts image upload, GET /barcode, POST /coach).
                   Those are skipped by default because they need live Gemini/OFF.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

try:
    import httpx
except ImportError:  # pragma: no cover
    import requests as _requests  # noqa: F401
    httpx = None
import requests

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000").rstrip("/")
RUN_LIVE_AI = os.environ.get("RUN_LIVE_AI", "") in ("1", "true", "True")

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
SAMPLE_ITEMS_PATH = FIXTURES / "sample_line_items.json"

# ---- canonical enums from API_CONTRACT.md -----------------------------------
SOURCES = {"off", "climatiq", "static", "gemini"}
CONFIDENCES = {"high", "medium", "low"}
ECO_SCORES = {"A", "B", "C", "D", "E", None}
CATEGORIES = {
    "meat", "dairy", "produce", "grains", "packaged",
    "beverages", "household", "personal_care", "other",
}
BUDGET_STATUS = {"ok", "warning", "over"}

# ---- equivalence constants (must match contract exactly) --------------------
KM_PER_KG = 5.56
PHONE_CHARGES_PER_KG = 121.6
TREES_YEAR_PER_KG = 0.0455
TOL = 0.02  # 2% relative tolerance on derived equivalence numbers


# ---- connectivity gate ------------------------------------------------------
def _backend_up() -> bool:
    try:
        r = requests.get(f"{API_BASE_URL}/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _backend_up(),
    reason=(
        f"Backend not reachable at {API_BASE_URL}. "
        "Start it with run-local.ps1 (or `uvicorn app.main:app` in backend/), "
        "then re-run. Skipping contract tests."
    ),
)


# ---- helpers ----------------------------------------------------------------
def get(path, **kw):
    return requests.get(f"{API_BASE_URL}{path}", timeout=30, **kw)


def post(path, **kw):
    return requests.post(f"{API_BASE_URL}{path}", timeout=60, **kw)


def put(path, **kw):
    return requests.put(f"{API_BASE_URL}{path}", timeout=30, **kw)


def load_sample_items():
    data = json.loads(SAMPLE_ITEMS_PATH.read_text(encoding="utf-8"))
    return data["items"]


def assert_number(val, name):
    assert isinstance(val, (int, float)) and not isinstance(val, bool), (
        f"{name} should be a number, got {type(val).__name__}: {val!r}"
    )


def assert_equivalence(eq, total_kg):
    """Validate Equivalence shape and that values match the contract constants."""
    assert isinstance(eq, dict), "equivalence must be an object"
    for k in ("kmDriven", "phoneCharges", "treesYear"):
        assert k in eq, f"equivalence missing '{k}'"
        assert_number(eq[k], f"equivalence.{k}")
    if total_kg > 0:
        _approx(eq["kmDriven"], total_kg * KM_PER_KG, "kmDriven")
        _approx(eq["phoneCharges"], total_kg * PHONE_CHARGES_PER_KG, "phoneCharges")
        _approx(eq["treesYear"], total_kg * TREES_YEAR_PER_KG, "treesYear")


def _approx(actual, expected, name):
    if expected == 0:
        assert abs(actual) < 1e-6, f"{name}: expected ~0, got {actual}"
        return
    rel = abs(actual - expected) / abs(expected)
    assert rel <= TOL, (
        f"{name}: {actual} differs from contract-derived {expected:.4f} "
        f"by {rel*100:.1f}% (> {TOL*100:.0f}% tol). "
        "Check equivalence constants in API_CONTRACT.md."
    )


def assert_item_footprint(item):
    """Validate one ItemFootprint (extends LineItem)."""
    # LineItem fields
    assert isinstance(item.get("name"), str) and item["name"], "item.name"
    assert "rawText" in item, "item.rawText missing"
    assert item["category"] in CATEGORIES, f"bad category: {item.get('category')}"
    assert_number(item["quantity"], "item.quantity")
    assert isinstance(item.get("unit"), str), "item.unit must be str"
    # ItemFootprint extras
    assert_number(item["co2eKg"], "item.co2eKg")
    assert item["co2eKg"] >= 0, "co2eKg must be >= 0"
    assert item["source"] in SOURCES, f"bad source: {item.get('source')}"
    assert item["confidence"] in CONFIDENCES, f"bad confidence: {item.get('confidence')}"
    assert item.get("ecoScore") in ECO_SCORES, f"bad ecoScore: {item.get('ecoScore')}"


# ============================================================================
# Tests
# ============================================================================
def test_health():
    r = get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok", f"/health body: {body}"


def test_footprint_full_shape():
    items = load_sample_items()
    r = post("/footprint", json={"items": items})
    assert r.status_code == 200, f"/footprint -> {r.status_code}: {r.text[:300]}"
    body = r.json()

    # top-level keys
    for k in ("items", "totalCo2eKg", "categoryBreakdown", "equivalence", "topSwaps"):
        assert k in body, f"/footprint response missing '{k}'"

    # items: same count, every one a valid ItemFootprint
    assert isinstance(body["items"], list) and body["items"], "items must be non-empty list"
    assert len(body["items"]) == len(items), (
        f"expected {len(items)} items back, got {len(body['items'])}"
    )
    for it in body["items"]:
        assert_item_footprint(it)

    # totals add up (within rounding)
    total = body["totalCo2eKg"]
    assert_number(total, "totalCo2eKg")
    summed = sum(it["co2eKg"] for it in body["items"])
    assert abs(total - summed) <= max(0.05, 0.01 * summed), (
        f"totalCo2eKg {total} != sum of item co2eKg {summed}"
    )
    assert total > 0, "a real grocery basket should have total > 0"

    # categoryBreakdown: keys are valid categories, values numbers, sum ~ total
    cb = body["categoryBreakdown"]
    assert isinstance(cb, dict), "categoryBreakdown must be an object"
    for cat, val in cb.items():
        assert cat in CATEGORIES, f"categoryBreakdown bad category: {cat}"
        assert_number(val, f"categoryBreakdown[{cat}]")
    cb_sum = sum(cb.values())
    assert abs(cb_sum - total) <= max(0.05, 0.01 * total), (
        f"categoryBreakdown sums to {cb_sum}, total is {total}"
    )

    # equivalence present and matches constants
    assert_equivalence(body["equivalence"], total)

    # topSwaps: up to 3, each a valid Swap, sorted by savings desc
    swaps = body["topSwaps"]
    assert isinstance(swaps, list), "topSwaps must be a list"
    assert len(swaps) <= 3, "topSwaps should be at most 3"
    prev = None
    for s in swaps:
        assert isinstance(s.get("fromItem"), str) and s["fromItem"], "swap.fromItem"
        assert isinstance(s.get("toSuggestion"), str) and s["toSuggestion"], "swap.toSuggestion"
        assert_number(s["co2eSavedKg"], "swap.co2eSavedKg")
        assert isinstance(s.get("rationale"), str), "swap.rationale"
        if prev is not None:
            assert s["co2eSavedKg"] <= prev + 1e-6, "topSwaps not sorted by savings desc"
        prev = s["co2eSavedKg"]


def test_footprint_meat_has_high_emission():
    """Sanity: the chicken/meat line should resolve to a non-trivial number."""
    items = load_sample_items()
    r = post("/footprint", json={"items": items})
    body = r.json()
    meat = [it for it in body["items"] if it["category"] == "meat"]
    assert meat, "expected at least one meat line in the sample basket"
    assert any(it["co2eKg"] > 1.0 for it in meat), "meat should carry meaningful CO2e"


def test_get_receipts_list_shape():
    r = get("/receipts")
    assert r.status_code == 200, f"/receipts -> {r.status_code}"
    body = r.json()
    assert isinstance(body, list), "/receipts must return a list"
    for rec in body:
        assert isinstance(rec.get("id"), str), "receipt.id"
        assert "createdAt" in rec, "receipt.createdAt"
        assert "merchant" in rec, "receipt.merchant (may be null)"
        assert isinstance(rec.get("items"), list), "receipt.items"
        assert_number(rec["totalCo2eKg"], "receipt.totalCo2eKg")
        assert isinstance(rec.get("categoryBreakdown"), dict), "receipt.categoryBreakdown"
        assert_equivalence(rec["equivalence"], rec["totalCo2eKg"])
        assert isinstance(rec.get("topSwaps"), list), "receipt.topSwaps"
        for it in rec["items"]:
            assert_item_footprint(it)


def test_insights_trends_weekly():
    r = get("/insights/trends", params={"range": "weekly"})
    assert r.status_code == 200, f"/insights/trends -> {r.status_code}"
    body = r.json()
    assert isinstance(body, list), "trends must be a list"
    for pt in body:
        assert isinstance(pt.get("period"), str) and pt["period"], "trend.period"
        assert_number(pt["co2eKg"], "trend.co2eKg")


def test_insights_trends_monthly():
    r = get("/insights/trends", params={"range": "monthly"})
    assert r.status_code == 200
    for pt in r.json():
        assert isinstance(pt.get("period"), str), "trend.period"
        assert_number(pt["co2eKg"], "trend.co2eKg")


def test_insights_baseline():
    r = get("/insights/baseline")
    assert r.status_code == 200, f"/insights/baseline -> {r.status_code}"
    body = r.json()
    assert_number(body["userKg"], "baseline.userKg")
    assert_number(body["baselineKg"], "baseline.baselineKg")
    assert_number(body["deltaPercent"], "baseline.deltaPercent")
    assert isinstance(body.get("label"), str) and body["label"], "baseline.label"


def test_budget_get_shape():
    r = get("/budget")
    assert r.status_code == 200, f"/budget -> {r.status_code}"
    b = r.json()
    assert_number(b["monthlyTargetKg"], "budget.monthlyTargetKg")
    assert_number(b["currentMonthKg"], "budget.currentMonthKg")
    assert_number(b["percentUsed"], "budget.percentUsed")
    assert b["status"] in BUDGET_STATUS, f"bad budget.status: {b.get('status')}"


def test_budget_put_updates_and_status_logic():
    target = 120.0
    r = put("/budget", json={"monthlyTargetKg": target})
    assert r.status_code == 200, f"PUT /budget -> {r.status_code}: {r.text[:200]}"
    b = r.json()
    assert abs(b["monthlyTargetKg"] - target) < 1e-6, "target not persisted"
    assert b["status"] in BUDGET_STATUS
    # status must be internally consistent with percentUsed thresholds
    pu = b["percentUsed"]
    if pu < 80:
        assert b["status"] == "ok", f"percentUsed {pu} should be ok"
    elif pu <= 100:
        assert b["status"] == "warning", f"percentUsed {pu} should be warning"
    else:
        assert b["status"] == "over", f"percentUsed {pu} should be over"


# ---- Gemini / external-API dependent: skipped unless RUN_LIVE_AI=1 ----------
@pytest.mark.skipif(not RUN_LIVE_AI, reason="needs live Gemini; set RUN_LIVE_AI=1 to run")
def test_coach():
    r = post("/coach", json={"question": "Why is my footprint high this week?"})
    assert r.status_code == 200, f"/coach -> {r.status_code}"
    body = r.json()
    assert isinstance(body.get("answer"), str) and body["answer"].strip(), "coach.answer"


@pytest.mark.skipif(not RUN_LIVE_AI, reason="needs live Gemini vision; set RUN_LIVE_AI=1 to run")
def test_post_receipt_image_upload():
    img = FIXTURES / "receipt_bigbazaar.png"
    assert img.exists(), f"fixture image missing: {img} (run fixtures/generate_receipts.py)"
    with img.open("rb") as fh:
        r = post("/receipts", files={"file": ("receipt.png", fh, "image/png")})
    assert r.status_code == 200, f"POST /receipts -> {r.status_code}: {r.text[:300]}"
    rec = r.json()
    assert isinstance(rec.get("id"), str), "receipt.id"
    assert isinstance(rec.get("items"), list) and rec["items"], "receipt.items non-empty"
    for it in rec["items"]:
        assert_item_footprint(it)
    assert_equivalence(rec["equivalence"], rec["totalCo2eKg"])


@pytest.mark.skipif(not RUN_LIVE_AI, reason="needs live Open Food Facts; set RUN_LIVE_AI=1 to run")
def test_barcode_lookup():
    # Amul / common Indian product barcode; OFF may or may not have carbon data.
    r = get("/barcode/8901491100015")
    assert r.status_code in (200, 404), f"/barcode -> {r.status_code}"
    if r.status_code == 200:
        assert_item_footprint(r.json())
