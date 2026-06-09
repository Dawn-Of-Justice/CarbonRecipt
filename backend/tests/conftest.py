"""Pytest fixtures. Ensures `backend/` is importable and tests run fully offline.

The carbon engine's tier-1/tier-4 callables hit the network and Vertex AI. For
deterministic, offline tests we override the engine dependency with a
static-only engine, so every footprint resolves via the bundled factor table.
"""

import os
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

# Make `app` importable when running pytest from anywhere.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Force offline-safe config for the whole test session.
os.environ.setdefault("USE_FIRESTORE", "false")
os.environ.pop("CLIMATIQ_API_KEY", None)


@pytest.fixture
def offline_engine():
    """An engine with no network/LLM tiers -> deterministic static results."""
    from app.carbon.engine import CarbonEngine

    return CarbonEngine(off_lookup=None, climatiq_lookup=None, gemini_estimate=None)


@pytest.fixture
def client(offline_engine) -> Iterator["object"]:
    """A FastAPI TestClient wired to the offline engine.

    Using the client as a context manager runs the lifespan, which seeds the
    demo receipts into the process-wide store.
    """
    from fastapi.testclient import TestClient

    from app.deps import get_engine
    from app.main import app

    app.dependency_overrides[get_engine] = lambda: offline_engine
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
