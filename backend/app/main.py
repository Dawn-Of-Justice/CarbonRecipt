"""Carbon Receipt backend — FastAPI app entrypoint.

Wires the routers, CORS, health check, and the demo seed. Run with:

    uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env early so all modules see env vars (Gemini project, USE_FIRESTORE, ...).
load_dotenv()

from app.routers import barcode, budget, footprint, receipts  # noqa: E402
from app.routers.insights import router as insights_router, coach_router  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402
from app.store import repo  # noqa: E402


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

# CORS for the local Next.js frontend.
_origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
