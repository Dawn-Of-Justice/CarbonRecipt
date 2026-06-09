"""Pytest fixtures. Ensures `backend/` is importable and tests run offline."""
import os
import sys
from pathlib import Path

# Make `app` importable when running pytest from anywhere.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Force offline-safe config for the whole test session.
os.environ.setdefault("USE_FIRESTORE", "false")
os.environ.pop("CLIMATIQ_API_KEY", None)
