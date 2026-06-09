"""Network tiers (OFF + Climatiq) with httpx fully mocked — never hits the wire."""

import contextlib

import pytest

from app.carbon import sources
from app.carbon.sources import (
    _carbon_per_100g,
    _eco_grade,
    _footprint_from_off,
    climatiq_lookup,
    off_lookup,
)
from app.models import LineItem


# --- pure helpers ----------------------------------------------------------
@pytest.mark.parametrize(
    "raw,expected",
    [("a", "A"), ("E", "E"), ("e", "E"), ("unknown", None), (None, None), ("", None)],
)
def test_eco_grade(raw, expected):
    assert _eco_grade(raw) == expected


def test_carbon_per_100g_direct_field():
    assert _carbon_per_100g({"carbon-footprint_100g": "42.5"}) == 42.5


def test_carbon_per_100g_from_nutriments():
    product = {"nutriments": {"carbon-footprint_100g": 30}}
    assert _carbon_per_100g(product) == 30.0


def test_carbon_per_100g_missing_returns_none():
    assert _carbon_per_100g({"product_name": "x"}) is None
    assert _carbon_per_100g("not a dict") is None  # type: ignore[arg-type]


def test_footprint_from_off_math():
    item = LineItem(name="Milk", category="dairy", quantity=1, unit="kg")
    product = {"carbon-footprint_100g": 100.0, "ecoscore_grade": "b"}
    fp = _footprint_from_off(item, product)
    assert fp is not None
    # 100 g/100g * 1kg -> 100 * 1 / 100 = 1.0 kg
    assert fp.co2eKg == pytest.approx(1.0)
    assert fp.source == "off"
    assert fp.confidence == "high"
    assert fp.ecoScore == "B"


def test_footprint_from_off_none_without_carbon_number():
    item = LineItem(name="Milk", category="dairy")
    assert _footprint_from_off(item, {"ecoscore_grade": "a"}) is None


# --- mocked HTTP -----------------------------------------------------------
class _FakeResp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeClient:
    """Minimal httpx.Client stand-in with a scripted response."""

    def __init__(self, payload):
        self._payload = payload

    def __call__(self, *args, **kwargs):  # httpx.Client(timeout=...)
        return self

    @contextlib.contextmanager
    def _ctx(self):
        yield self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def get(self, *args, **kwargs):
        return _FakeResp(self._payload)

    def post(self, *args, **kwargs):
        return _FakeResp(self._payload)


def test_off_lookup_success(monkeypatch):
    payload = {"products": [{"carbon-footprint_100g": 50.0, "ecoscore_grade": "C"}]}
    monkeypatch.setattr(sources.httpx, "Client", _FakeClient(payload))
    fp = off_lookup(LineItem(name="Test", category="dairy", quantity=1, unit="kg"))
    assert fp is not None
    assert fp.source == "off"
    assert fp.co2eKg == pytest.approx(0.5)  # 50 * 1 / 100


def test_off_lookup_no_products_returns_none(monkeypatch):
    monkeypatch.setattr(sources.httpx, "Client", _FakeClient({"products": []}))
    assert off_lookup(LineItem(name="Test")) is None


def test_off_lookup_swallows_network_error(monkeypatch):
    class _Boom:
        def __call__(self, *a, **k):
            raise RuntimeError("dns fail")

    monkeypatch.setattr(sources.httpx, "Client", _Boom())
    assert off_lookup(LineItem(name="Test")) is None


def test_climatiq_skips_without_key(monkeypatch):
    monkeypatch.delenv("CLIMATIQ_API_KEY", raising=False)
    assert climatiq_lookup(LineItem(name="Test", category="meat")) is None


def test_climatiq_success_with_key(monkeypatch):
    monkeypatch.setenv("CLIMATIQ_API_KEY", "test-key")
    monkeypatch.setattr(sources.httpx, "Client", _FakeClient({"co2e": 3.14}))
    fp = climatiq_lookup(LineItem(name="Test", category="meat", quantity=1, unit="kg"))
    assert fp is not None
    assert fp.source == "climatiq"
    assert fp.co2eKg == pytest.approx(3.14)
