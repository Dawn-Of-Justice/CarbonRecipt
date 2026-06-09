"""End-to-end API tests via FastAPI TestClient.

The `client` fixture (see conftest) overrides the engine with an offline
static-only engine and runs the app lifespan, which seeds the demo receipts.
Gemini-backed endpoints are monkeypatched so nothing reaches Vertex AI.
"""

import io

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


# --- health & security headers ---------------------------------------------
def test_health_ok_with_security_headers(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "no-referrer"


# --- footprint -------------------------------------------------------------
def test_footprint_is_deterministic_static(client):
    body = {"items": [{"name": "Beef", "category": "meat", "quantity": 1, "unit": "kg"}]}
    r = client.post("/footprint", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["items"][0]["source"] == "static"
    assert data["totalCo2eKg"] == 60.0
    assert data["equivalence"]["kmDriven"] > 0


def test_footprint_rejects_malformed_body(client):
    r = client.post("/footprint", json={"items": [{"category": "meat"}]})  # no name
    assert r.status_code == 422


# --- seeded receipts -------------------------------------------------------
def test_seeded_receipts_present(client):
    r = client.get("/receipts")
    assert r.status_code == 200
    receipts = r.json()
    assert len(receipts) >= 2
    ids = {x["id"] for x in receipts}
    assert "seed-bigbasket-01" in ids


def test_get_single_and_404(client):
    ok = client.get("/receipts/seed-bigbasket-01")
    assert ok.status_code == 200
    assert ok.json()["merchant"] == "BigBasket"
    missing = client.get("/receipts/does-not-exist")
    assert missing.status_code == 404


# --- upload flow (Gemini parse monkeypatched) ------------------------------
def test_upload_receipt_happy_path(client, monkeypatch):
    from app import models
    from app.routers import receipts as receipts_router

    def fake_parse(image_bytes, mime_type="image/jpeg"):
        assert image_bytes.startswith(PNG_MAGIC)  # validated bytes reached parser
        return [models.LineItem(name="Chicken", category="meat", quantity=1, unit="kg")]

    monkeypatch.setattr(receipts_router, "parse_receipt", fake_parse)
    files = {"file": ("r.png", io.BytesIO(PNG_MAGIC + b"\x00" * 32), "image/png")}
    r = client.post("/receipts", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["items"][0]["name"] == "Chicken"
    assert body["totalCo2eKg"] > 0
    # cleanup so the store doesn't accumulate across tests
    client.delete(f"/receipts/{body['id']}")


def test_upload_rejects_non_image(client):
    files = {"file": ("r.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    r = client.post("/receipts", files=files)
    assert r.status_code == 415


def test_upload_empty_parse_returns_422(client, monkeypatch):
    from app.routers import receipts as receipts_router

    monkeypatch.setattr(receipts_router, "parse_receipt", lambda b, m="image/jpeg": [])
    files = {"file": ("r.png", io.BytesIO(PNG_MAGIC + b"\x00" * 32), "image/png")}
    r = client.post("/receipts", files=files)
    assert r.status_code == 422


# --- budget ----------------------------------------------------------------
def test_budget_get_and_update(client):
    r = client.get("/budget")
    assert r.status_code == 200
    assert "monthlyTargetKg" in r.json()

    updated = client.put("/budget", json={"monthlyTargetKg": 75.0})
    assert updated.status_code == 200
    assert updated.json()["monthlyTargetKg"] == 75.0
    assert updated.json()["status"] in {"ok", "warning", "over"}


# --- insights --------------------------------------------------------------
def test_trends_validates_range(client):
    assert client.get("/insights/trends?range=weekly").status_code == 200
    assert client.get("/insights/trends?range=monthly").status_code == 200
    assert client.get("/insights/trends?range=daily").status_code == 422  # bad enum


def test_baseline_shape(client):
    r = client.get("/insights/baseline")
    assert r.status_code == 200
    body = r.json()
    assert {"userKg", "baselineKg", "deltaPercent", "label"} <= set(body)


# --- barcode (OFF monkeypatched) -------------------------------------------
def test_barcode_falls_back_to_static_on_miss(client, monkeypatch):
    from app.routers import barcode as barcode_router

    monkeypatch.setattr(barcode_router, "off_barcode_lookup", lambda code: None)
    r = client.get("/barcode/0000000000000")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "static"  # degrades gracefully, never 404s
    assert body["co2eKg"] >= 0


def test_barcode_returns_off_hit(client, monkeypatch):
    from app.models import ItemFootprint
    from app.routers import barcode as barcode_router

    def fake_lookup(code):
        return ItemFootprint(
            name="Found Product",
            category="packaged",
            co2eKg=1.5,
            source="off",
            confidence="high",
            ecoScore="B",
        )

    monkeypatch.setattr(barcode_router, "off_barcode_lookup", fake_lookup)
    r = client.get("/barcode/12345")
    assert r.status_code == 200
    assert r.json()["source"] == "off"
    assert r.json()["ecoScore"] == "B"


# --- coach (Gemini monkeypatched) ------------------------------------------
def test_coach_grounded_answer(client, monkeypatch):
    from app.routers import insights as insights_router

    captured = {}

    def fake_coach(question, context):
        captured["question"] = question
        captured["context"] = context
        return "Your biggest lever is red meat. Swap for chicken to save ~9 kg."

    monkeypatch.setattr(insights_router, "coach_answer", fake_coach)
    r = client.post("/coach", json={"question": "Why is my footprint high?"})
    assert r.status_code == 200
    assert "red meat" in r.json()["answer"]
    # grounded: the seeded receipts were summarized into the context
    assert "receipt" in captured["context"].lower()
