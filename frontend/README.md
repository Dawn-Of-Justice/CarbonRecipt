# Carbon Receipt — Frontend

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. Talks to the FastAPI
backend via `NEXT_PUBLIC_API_BASE_URL`.

## Run locally (Windows PowerShell)

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local   # defaults to http://localhost:8000
npm run dev                                 # http://localhost:3000
```

Start the backend first (see `../backend/README.md`) so the dashboard has data.

## Routes
- `/` — landing page (hero, how-it-works, features, data sources, CTA).
- `/dashboard` — the app: upload a receipt, footprint + equivalences, category
  breakdown, item table with Eco-Score & source/confidence badges, top-3 swaps,
  carbon budget, trend chart, baseline, and the Gemini coach chat.

## Build / deploy
```powershell
npm run build      # production build (used by Dockerfile)
```
Deploy to Cloud Run with the included `Dockerfile`.
