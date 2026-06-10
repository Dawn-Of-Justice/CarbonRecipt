"""Per-client rate limiting for the public API.

The API runs on a public Cloud Run URL, and two endpoint groups call paid
services (Gemini): receipt parsing (`POST /receipts*`) and the coach
(`POST /coach`). A small in-memory sliding window per client IP keeps an
abusive client from running up the bill, with a much stricter budget for the
Gemini-backed endpoints — all dependency-free.

Counters are per instance (Cloud Run may run several); the hard cost ceiling
is the service's `--max-instances` setting. Configure via env:

    RATE_LIMIT_PER_MINUTE            default 120 — every endpoint, per IP
    RATE_LIMIT_EXPENSIVE_PER_MINUTE  default 10  — Gemini-backed endpoints

Set ``RATE_LIMIT_PER_MINUTE=0`` to disable entirely (the test suite does).
"""

from __future__ import annotations

import os
import threading
import time
from collections import deque
from typing import Deque, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

WINDOW_SECONDS = 60.0
# Paths whose POSTs reach Gemini — these get the strict budget.
EXPENSIVE_PATH_PREFIXES = ("/receipts", "/coach")
# Hard cap on tracked clients so the bookkeeping itself stays bounded.
MAX_TRACKED_CLIENTS = 10_000


class SlidingWindowLimiter:
    """Thread-safe sliding-window limiter: N events per key per window."""

    def __init__(self, limit: int, window_seconds: float = WINDOW_SECONDS) -> None:
        self.limit = limit
        self.window = window_seconds
        self._events: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, now: Optional[float] = None) -> bool:
        """Record a hit for `key`; return True while it stays within the limit."""
        ts = time.monotonic() if now is None else now
        with self._lock:
            queue = self._events.get(key)
            if queue is None:
                if len(self._events) >= MAX_TRACKED_CLIENTS:
                    self._prune(ts)
                queue = self._events[key] = deque()
            while queue and ts - queue[0] >= self.window:
                queue.popleft()
            if len(queue) >= self.limit:
                return False
            queue.append(ts)
            return True

    def _prune(self, now: float) -> None:
        """Drop clients whose whole window has expired (called under the lock)."""
        stale = [k for k, q in self._events.items() if not q or now - q[-1] >= self.window]
        for key in stale:
            del self._events[key]


def client_ip(request: Request) -> str:
    """Best-effort client identity.

    On Cloud Run the Google front end *appends* the real client IP to
    X-Forwarded-For, so the last entry is the trustworthy one (earlier entries
    are client-supplied and spoofable). Locally there is no XFF header and we
    fall back to the socket peer.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _is_expensive(request: Request) -> bool:
    return request.method == "POST" and request.url.path.startswith(EXPENSIVE_PATH_PREFIXES)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """429 with Retry-After once a client exceeds its per-minute budget."""

    def __init__(self, app, per_minute: int, expensive_per_minute: int) -> None:
        super().__init__(app)
        self.general = SlidingWindowLimiter(per_minute)
        self.expensive = SlidingWindowLimiter(expensive_per_minute)

    async def dispatch(self, request: Request, call_next):
        limiter = self.expensive if _is_expensive(request) else self.general
        if not limiter.allow(client_ip(request)):
            return JSONResponse(
                {"detail": "Too many requests — please slow down and retry in a minute."},
                status_code=429,
                headers={"Retry-After": str(int(WINDOW_SECONDS))},
            )
        return await call_next(request)


def configure_rate_limiting(app: FastAPI) -> None:
    """Attach the middleware using env-configured limits (0 disables)."""
    per_minute = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
    if per_minute <= 0:
        return
    expensive = int(os.getenv("RATE_LIMIT_EXPENSIVE_PER_MINUTE", "10"))
    app.add_middleware(RateLimitMiddleware, per_minute=per_minute, expensive_per_minute=expensive)
