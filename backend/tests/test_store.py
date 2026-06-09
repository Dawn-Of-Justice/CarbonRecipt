"""In-memory repository: CRUD, ordering, isolation, and budget persistence."""

from app.models import Equivalence, Receipt
from app.store import DEFAULT_MONTHLY_TARGET_KG, InMemoryRepository


def _receipt(rid: str, created: str, total: float = 1.0) -> Receipt:
    return Receipt(
        id=rid,
        createdAt=created,
        items=[],
        totalCo2eKg=total,
        categoryBreakdown={},
        equivalence=Equivalence(kmDriven=0, phoneCharges=0, treesYear=0),
    )


def test_add_and_list_newest_first():
    repo = InMemoryRepository()
    repo.add_receipt(_receipt("a", "2026-01-01T00:00:00+00:00"))
    repo.add_receipt(_receipt("b", "2026-02-01T00:00:00+00:00"))
    listed = repo.list_receipts()
    assert [r.id for r in listed] == ["b", "a"]  # newest first


def test_get_and_delete():
    repo = InMemoryRepository()
    repo.add_receipt(_receipt("x", "2026-01-01T00:00:00+00:00"))
    assert repo.get_receipt("x") is not None
    assert repo.delete_receipt("x") is True
    assert repo.get_receipt("x") is None
    assert repo.delete_receipt("x") is False  # already gone


def test_is_empty():
    repo = InMemoryRepository()
    assert repo.is_empty() is True
    repo.add_receipt(_receipt("x", "2026-01-01T00:00:00+00:00"))
    assert repo.is_empty() is False


def test_users_are_isolated():
    repo = InMemoryRepository()
    repo.add_receipt(_receipt("a", "2026-01-01T00:00:00+00:00"), user_id="alice")
    assert repo.list_receipts("alice")
    assert repo.list_receipts("bob") == []


def test_budget_default_and_set():
    repo = InMemoryRepository()
    assert repo.get_budget_target() == DEFAULT_MONTHLY_TARGET_KG
    assert repo.set_budget_target(42.0) == 42.0
    assert repo.get_budget_target() == 42.0
