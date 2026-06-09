"""Storage layer.

A single repository interface backs the whole app. By default it's an
in-memory store so the app runs with zero setup (great for local dev and the
demo). Set USE_FIRESTORE=true to persist to google-cloud-firestore instead.

The implicit single demo user is "demo-user"; a userId may be passed but
defaults to that.
"""

from __future__ import annotations

import os
import threading
from typing import Dict, List, Optional

from app.models import Receipt

DEFAULT_USER = "demo-user"
DEFAULT_MONTHLY_TARGET_KG = 120.0


class Repository:
    """Abstract repository interface (the contract both backends honor)."""

    def add_receipt(self, receipt: Receipt, user_id: str = DEFAULT_USER) -> Receipt:
        raise NotImplementedError

    def list_receipts(self, user_id: str = DEFAULT_USER) -> List[Receipt]:
        raise NotImplementedError

    def get_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> Optional[Receipt]:
        raise NotImplementedError

    def delete_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> bool:
        raise NotImplementedError

    def get_budget_target(self, user_id: str = DEFAULT_USER) -> float:
        raise NotImplementedError

    def set_budget_target(self, target_kg: float, user_id: str = DEFAULT_USER) -> float:
        raise NotImplementedError

    def is_empty(self, user_id: str = DEFAULT_USER) -> bool:
        return len(self.list_receipts(user_id)) == 0


class InMemoryRepository(Repository):
    """Thread-safe in-memory store. Newest-first ordering on read."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._receipts: Dict[str, List[Receipt]] = {}
        self._targets: Dict[str, float] = {}

    def add_receipt(self, receipt: Receipt, user_id: str = DEFAULT_USER) -> Receipt:
        with self._lock:
            self._receipts.setdefault(user_id, []).append(receipt)
        return receipt

    def list_receipts(self, user_id: str = DEFAULT_USER) -> List[Receipt]:
        with self._lock:
            items = list(self._receipts.get(user_id, []))
        return sorted(items, key=lambda r: r.createdAt, reverse=True)

    def get_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> Optional[Receipt]:
        with self._lock:
            for r in self._receipts.get(user_id, []):
                if r.id == receipt_id:
                    return r
        return None

    def delete_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> bool:
        with self._lock:
            items = self._receipts.get(user_id, [])
            for i, r in enumerate(items):
                if r.id == receipt_id:
                    items.pop(i)
                    return True
        return False

    def get_budget_target(self, user_id: str = DEFAULT_USER) -> float:
        with self._lock:
            return self._targets.get(user_id, DEFAULT_MONTHLY_TARGET_KG)

    def set_budget_target(self, target_kg: float, user_id: str = DEFAULT_USER) -> float:
        with self._lock:
            self._targets[user_id] = float(target_kg)
        return float(target_kg)


class FirestoreRepository(Repository):
    """Firestore-backed store. Collections:

    users/{user}/receipts/{id}   -> receipt doc
    users/{user}                 -> { monthlyTargetKg }
    """

    def __init__(self) -> None:
        from google.cloud import firestore

        database = os.getenv("FIRESTORE_DATABASE", "(default)")
        project = os.getenv("GOOGLE_CLOUD_PROJECT")
        # firestore.Client treats "(default)" as the default DB.
        if database and database != "(default)":
            self._db = firestore.Client(project=project, database=database)
        else:
            self._db = firestore.Client(project=project)

    def _receipts_col(self, user_id: str):
        return self._db.collection("users").document(user_id).collection("receipts")

    def add_receipt(self, receipt: Receipt, user_id: str = DEFAULT_USER) -> Receipt:
        self._receipts_col(user_id).document(receipt.id).set(receipt.model_dump())
        return receipt

    def list_receipts(self, user_id: str = DEFAULT_USER) -> List[Receipt]:
        docs = self._receipts_col(user_id).stream()
        receipts = [Receipt(**d.to_dict()) for d in docs]
        return sorted(receipts, key=lambda r: r.createdAt, reverse=True)

    def get_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> Optional[Receipt]:
        doc = self._receipts_col(user_id).document(receipt_id).get()
        return Receipt(**doc.to_dict()) if doc.exists else None

    def delete_receipt(self, receipt_id: str, user_id: str = DEFAULT_USER) -> bool:
        ref = self._receipts_col(user_id).document(receipt_id)
        if ref.get().exists:
            ref.delete()
            return True
        return False

    def get_budget_target(self, user_id: str = DEFAULT_USER) -> float:
        doc = self._db.collection("users").document(user_id).get()
        if doc.exists and doc.to_dict().get("monthlyTargetKg") is not None:
            return float(doc.to_dict()["monthlyTargetKg"])
        return DEFAULT_MONTHLY_TARGET_KG

    def set_budget_target(self, target_kg: float, user_id: str = DEFAULT_USER) -> float:
        self._db.collection("users").document(user_id).set(
            {"monthlyTargetKg": float(target_kg)}, merge=True
        )
        return float(target_kg)


def build_repository() -> Repository:
    """Pick a backend from USE_FIRESTORE (default in-memory)."""
    if os.getenv("USE_FIRESTORE", "false").strip().lower() == "true":
        return FirestoreRepository()
    return InMemoryRepository()


# Process-wide singleton repository.
repo: Repository = build_repository()
