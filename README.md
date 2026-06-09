# 🌱 Carbon Receipt

**Turn everyday shopping receipts into a real carbon footprint — then understand, track, and reduce it.**

Built for the **PromptWars Virtual** hackathon (theme: *help individuals understand, track,
and reduce their carbon footprint through simple actions and personalized insights*).

Snap a grocery receipt → Gemini reads every line → a tiered engine resolves a **real CO₂e
number** per item → see a tangible breakdown, track it against a budget, and get the
personalized swaps that cut the most carbon, with a Gemini coach to explain it all.

## Architecture

```
                ┌─────────────────────────── Frontend (Next.js + shadcn/ui, :3000) ──────────────────────────┐
   Receipt  →   │  Landing page  ·  Dashboard: upload → footprint → equivalences → breakdown                  │
   photo        │  → Eco-Score & source badges → trend chart → carbon budget → top-3 swaps → coach chat        │
                └───────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                             │ REST (API_CONTRACT.md)
                ┌────────────────────────────────────────────▼─────────────────────────── Backend (FastAPI, :8000) ┐
                │  POST /receipts → Gemini (Vertex AI) vision parse → Carbon engine → store → insights/budget/coach │
                │                                                                                                   │
                │  Carbon engine (tiered, every line tagged source + confidence):                                  │
                │    1) Open Food Facts (real per-product) → 2) Climatiq → 3) Static DEFRA/Agribalyse → 4) Gemini   │
                └───────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Quick start (Windows PowerShell)

**One command** (opens backend + frontend in two windows, installs on first run):
```powershell
./run-local.ps1
```
Then open **http://localhost:3000**. Stop with `./stop-local.ps1`.

<details><summary>Manual start</summary>

```powershell
# Backend  → http://localhost:8000
cd backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend → http://localhost:3000  (new terminal)
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```
</details>

### Prerequisites
- Python 3.10+, Node 20+, gcloud CLI.
- Vertex AI access: `gcloud auth application-default login` (project `gen-ai-academy-491804`,
  region `us-central1`). Default model: **`gemini-2.5-flash`**.
- The backend seeds 2 demo receipts on first run, so the dashboard is alive immediately —
  no upload required to demo.

## Tests
```powershell
# Backend unit tests (offline; Gemini + HTTP mocked)
backend/venv/Scripts/python.exe -m pytest backend/tests

# Contract tests against a running backend (start it first)
backend/venv/Scripts/python.exe -m pytest tests/contract_test.py
```
Sample receipt images: `fixtures/*.png` (regenerate with
`python fixtures/generate_receipts.py`).

## 60-second demo script
1. **Landing** (`/`) — one line: receipts → real carbon footprint, understand/track/reduce.
2. **Dashboard** (`/dashboard`) — a seeded receipt is already shown.
3. **Hero number + equivalences** — "42.3 kg CO₂e ≈ X km driven / Y phone charges / Z trees."
4. **Breakdown + item table** — point out the **Eco-Score** and the **source/confidence**
   badge on each line (real number, not a black box).
5. **Upload** a `fixtures/*.png` receipt → watch Gemini parse it live into a new footprint.
6. **Carbon budget** — progress bar vs the monthly target.
7. **Top-3 swaps** — "replace X with Y, save Z kg."
8. **Coach** — ask *"Why is my footprint high this week?"* → grounded, personalized answer.

## Deploy (Cloud Run)
```powershell
gcloud run deploy carbon-receipt-api --source backend --region us-central1 --allow-unauthenticated
gcloud run deploy carbon-receipt-web --source frontend --region us-central1 --allow-unauthenticated
# then set the web service's NEXT_PUBLIC_API_BASE_URL to the api service URL
```

## Project layout
```
backend/    FastAPI app — carbon engine, Gemini, routers, store, tests
frontend/   Next.js app — landing + dashboard, shadcn/ui, recharts
fixtures/   Sample Indian grocery receipt images + parsed line items
tests/      Cross-service API contract tests
docs/       API_CONTRACT.md (the shared interface spec)
```

## Data sources
Open Food Facts (ODbL) · Climatiq · DEFRA / Agribalyse static factors · Gemini (Vertex AI).
