"""Carbon Receipt backend — FastAPI app entrypoint.

Wires the routers, CORS, health check, and the demo seed. Run with:

    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Load .env early so all modules see env vars (Gemini project, USE_FIRESTORE, ...).
load_dotenv()

from app.ratelimit import configure_rate_limiting  # noqa: E402
from app.routers import barcode, budget, footprint, receipts  # noqa: E402
from app.routers.insights import coach_router  # noqa: E402
from app.routers.insights import router as insights_router  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402
from app.store import repo  # noqa: E402


def _allowed_origins() -> list[str]:
    """Origins permitted by CORS, from FRONTEND_ORIGIN (comma-separated)."""
    raw = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    origins.append("http://localhost:3000")  # always allow local dev
    return list(dict.fromkeys(origins))


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add conservative security headers to every response.

    This is a JSON API behind a separate frontend, so the headers are about
    hardening the API surface itself (no framing, no MIME sniffing, minimal
    referrer leakage) rather than rendering HTML.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")  # responses are per-user data
        # Cloud Run serves HTTPS only; pin browsers to it.
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
        # The API never needs powerful browser features.
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed demo receipts on startup if the store is empty (deterministic).
    try:
        seed_if_empty(repo)
    except Exception:
        # Never block startup on seeding (e.g. transient Firestore issue).
        pass
    yield


app = FastAPI(
    title="Carbon Receipt API",
    description="Turn shopping receipts into a real carbon footprint.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)

# Per-IP rate limiting (the public URL must not be able to run up a Gemini
# bill). Added before CORS so 429 responses still carry CORS headers.
configure_rate_limiting(app)

# CORS: explicit origin allowlist (never "*" while credentials are allowed).
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Routers
app.include_router(receipts.router)
app.include_router(footprint.router)
app.include_router(insights_router)
app.include_router(coach_router)
app.include_router(budget.router)
app.include_router(barcode.router)
