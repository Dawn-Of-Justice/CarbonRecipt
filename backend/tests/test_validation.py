"""Input validation at the API edge.

Every externally supplied value (user ids, request bodies, path params) is
bounded and shape-checked before it reaches the engine, Gemini, or Firestore.
"""

from app.seed import seed_if_empty
from app.store import InMemoryRepository


# --- userId (used as a Firestore document path) ------------------------------
def test_rejects_user_id_with_path_characters(client):
    r = client.get("/receipts", params={"userId": "../../etc/passwd"})
    assert r.status_code == 422


def test_rejects_overlong_user_id(client):
    assert client.get("/receipts", params={"userId": "x" * 65}).status_code == 422


def test_accepts_uuid_shaped_user_id(client):
    r = client.get("/receipts", params={"userId": "15660128-7411-4c57-9a3f-11f18cf39fb3"})
    assert r.status_code == 200


# --- request bodies -----------------------------------------------------------
def test_budget_rejects_non_positive_target(client):
    assert client.put("/budget", json={"monthlyTargetKg": 0}).status_code == 422
    assert client.put("/budget", json={"monthlyTargetKg": -5}).status_code == 422


def test_budget_rejects_absurd_target(client):
    assert client.put("/budget", json={"monthlyTargetKg": 10_000_000}).status_code == 422


def test_coach_rejects_empty_and_overlong_question(client):
    assert client.post("/coach", json={"question": ""}).status_code == 422
    assert client.post("/coach", json={"question": "x" * 501}).status_code == 422


def test_footprint_caps_item_count(client):
    items = [{"name": f"Item {i}", "category": "other"} for i in range(201)]
    assert client.post("/footprint", json={"items": items}).status_code == 422


def test_footprint_rejects_out_of_range_quantity(client):
    items = [{"name": "Rice", "category": "grains", "quantity": 99_999, "unit": "kg"}]
    assert client.post("/footprint", json={"items": items}).status_code == 422


# --- barcode path param --------------------------------------------------------
def test_barcode_rejects_non_numeric_code(client):
    assert client.get("/barcode/not-a-barcode").status_code == 422


# --- seeding stays idempotent ---------------------------------------------------
def test_seed_is_idempotent():
    repo = InMemoryRepository()
    assert seed_if_empty(repo, "someone") == 2
    assert seed_if_empty(repo, "someone") == 0  # second call is a no-op
    assert len(repo.list_receipts("someone")) == 2
