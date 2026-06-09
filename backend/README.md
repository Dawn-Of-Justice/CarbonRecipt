# Carbon Receipt — Backend

Python **FastAPI** service: receipt parsing (Gemini on Vertex AI), the tiered
carbon-lookup engine, insights, budget, and the Gemini coach. Implements
`../docs/API_CONTRACT.md`.

## Run locally (Windows PowerShell)

```powershell
cd backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env            # runs out-of-the-box with defaults
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000  ·  interactive docs: http://localhost:8000/docs
- On startup it **seeds 2 demo receipts** so the app looks alive immediately.

## Carbon lookup hierarchy (every line is tagged `source` + `confidence`)
1. **Open Food Facts** — real per-product CO₂e + Eco-Score (`source: off`, high).
2. **Climatiq** — category emission factors; only if `CLIMATIQ_API_KEY` set (`climatiq`, medium).
3. **Static table** — `app/data/emission_factors.json`, DEFRA/Agribalyse (`static`, medium).
4. **Gemini estimate** — last resort so it's never blank (`gemini`, low).

## Gemini / Vertex AI
- Auth via Application Default Credentials: `gcloud auth application-default login`.
- Model is set by `GEMINI_MODEL` (default **`gemini-2.5-flash`** — verified available on
  project `gen-ai-academy-491804` in `us-central1`). `gemini-2.0-flash` is NOT enabled there.

## Environment (`.env`)
See `.env.example`. `USE_FIRESTORE=false` uses an in-memory store (zero setup);
set `true` to persist to Firestore.

## Tests
```powershell
./venv/Scripts/python.exe -m pytest        # unit tests (Gemini + HTTP mocked, offline)
```
Integration/contract tests live in `../tests/contract_test.py` (run against a live server).

## Deploy (Cloud Run)
```powershell
gcloud run deploy carbon-receipt-api --source . --region us-central1 `
  --allow-unauthenticated --set-env-vars GEMINI_MODEL=gemini-2.5-flash
```
