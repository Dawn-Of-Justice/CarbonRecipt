"""Rate limiting: the sliding-window core and the middleware behavior.

The main app fixture disables rate limiting (RATE_LIMIT_PER_MINUTE=0 in
conftest) so the rest of the suite is unaffected; here we build a tiny app
with the middleware attached at known-low limits.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ratelimit import RateLimitMiddleware, SlidingWindowLimiter


# --- limiter core ------------------------------------------------------------
def test_limiter_allows_up_to_limit_then_blocks():
    limiter = SlidingWindowLimiter(limit=3, window_seconds=60)
    assert all(limiter.allow("ip", now=float(i)) for i in range(3))
    assert limiter.allow("ip", now=3.0) is False


def test_limiter_window_slides():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert limiter.allow("ip", now=0.0) is True
    assert limiter.allow("ip", now=30.0) is False
    assert limiter.allow("ip", now=61.0) is True  # first hit aged out


def test_limiter_keys_are_independent():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert limiter.allow("a", now=0.0) is True
    assert limiter.allow("b", now=0.0) is True


# --- middleware --------------------------------------------------------------
def _make_client(per_minute: int = 3, expensive_per_minute: int = 1) -> TestClient:
    app = FastAPI()

    @app.get("/ping")
    def ping():
        return {"ok": True}

    @app.post("/coach")
    def coach():
        return {"answer": "hi"}

    app.add_middleware(
        RateLimitMiddleware,
        per_minute=per_minute,
        expensive_per_minute=expensive_per_minute,
    )
    return TestClient(app)


def test_general_endpoints_get_429_past_limit():
    client = _make_client(per_minute=3)
    for _ in range(3):
        assert client.get("/ping").status_code == 200
    blocked = client.get("/ping")
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "60"


def test_expensive_endpoints_have_stricter_budget():
    client = _make_client(per_minute=10, expensive_per_minute=1)
    assert client.post("/coach").status_code == 200
    assert client.post("/coach").status_code == 429
    # The general budget is untouched by the expensive one.
    assert client.get("/ping").status_code == 200


def test_trusts_last_forwarded_for_entry():
    # Cloud Run appends the real client IP last; spoofed prefixes are ignored.
    client = _make_client(per_minute=1)
    first = client.get("/ping", headers={"x-forwarded-for": "9.9.9.9, 1.1.1.1"})
    assert first.status_code == 200
    spoofed = client.get("/ping", headers={"x-forwarded-for": "8.8.8.8, 1.1.1.1"})
    assert spoofed.status_code == 429  # same real IP -> same bucket
