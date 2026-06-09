# API Contract — Carbon Receipt

Shared interface spec. **Frontend, backend, and testing agents all build against this.**
Do not change a field name or shape without updating this file.

- Backend base URL (local): `http://localhost:8000`
- Frontend (local): `http://localhost:3000`, reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)
- All request/response bodies are JSON unless noted. All CO2e values are **kg CO2e** (number).
- For the hackathon demo there is a single implicit user (`demo-user`); no auth. A `userId`
  query param may be accepted but defaults to `demo-user`.

## Data models (canonical shapes)

```ts
type Source = "off" | "climatiq" | "static" | "gemini";   // which tier resolved the number
type Confidence = "high" | "medium" | "low";
type EcoScore = "A" | "B" | "C" | "D" | "E" | null;
type Category =
  | "meat" | "dairy" | "produce" | "grains" | "packaged"
  | "beverages" | "household" | "personal_care" | "other";

interface LineItem {            // raw extraction from the receipt
  name: string;                 // normalized product name, e.g. "Amul Toned Milk"
  rawText: string;              // original text on the receipt line
  category: Category;
  quantity: number;             // numeric quantity (default 1)
  unit: string;                 // "kg" | "g" | "l" | "ml" | "pc" | "pack" ...
}

interface ItemFootprint extends LineItem {
  co2eKg: number;               // total CO2e for this line (quantity-adjusted)
  source: Source;
  confidence: Confidence;
  ecoScore: EcoScore;           // A–E if known (OFF), else null
  note?: string;                // e.g. "estimated by Gemini", "per-100g x qty"
}

interface Equivalence {         // tangible translations of a CO2e number
  kmDriven: number;             // km in an average petrol car
  phoneCharges: number;         // smartphone full charges
  treesYear: number;            // trees needed for a year to absorb it
}

interface Swap {                // a "reduce" recommendation
  fromItem: string;             // item name being replaced
  toSuggestion: string;         // lower-carbon alternative
  co2eSavedKg: number;
  rationale: string;            // one-line why
}

interface Receipt {
  id: string;
  createdAt: string;            // ISO 8601
  merchant: string | null;
  items: ItemFootprint[];
  totalCo2eKg: number;
  categoryBreakdown: Record<Category, number>;  // kg per category (omit zero cats ok)
  equivalence: Equivalence;
  topSwaps: Swap[];             // up to 3, highest savings first
  imageUrl?: string | null;
}

interface Budget {
  monthlyTargetKg: number;
  currentMonthKg: number;
  percentUsed: number;          // 0..100+ (can exceed 100)
  status: "ok" | "warning" | "over";  // ok <80, warning 80–100, over >100
}

interface TrendPoint { period: string; co2eKg: number; }  // period = "2026-W23" or "2026-06"
interface Baseline { userKg: number; baselineKg: number; deltaPercent: number; label: string; }
```

## Endpoints

### Receipts (hero flow)
- `POST /receipts` — **multipart/form-data**, field `file` = receipt image (jpg/png).
  Runs full pipeline: Gemini vision parse → tiered carbon lookup → store. Returns `Receipt`.
  Optional form field `merchant`.
- `GET /receipts` — list `Receipt[]`, newest first.
- `GET /receipts/{id}` — single `Receipt`.
- `DELETE /receipts/{id}` — remove one. Returns `{ "ok": true }`.
- `POST /receipts/parse-only` — same multipart input, returns `{ items: LineItem[], merchant }`
  WITHOUT storing (used for previews / what-if). Optional.

### Lookup engine (also usable standalone)
- `POST /footprint` — body `{ items: LineItem[] }` → returns
  `{ items: ItemFootprint[], totalCo2eKg, categoryBreakdown, equivalence, topSwaps }`.
  This is the tiered engine: OFF → Climatiq → static table → Gemini. Pure, no storage.
- `GET /barcode/{code}` — Open Food Facts lookup → `ItemFootprint` (wow feature).

### Insights
- `GET /insights/trends?range=weekly|monthly` → `TrendPoint[]`.
- `GET /insights/baseline` → `Baseline` (vs avg Indian household basket).
- `POST /coach` — body `{ question: string }` → `{ answer: string }`.
  Gemini answers using the user's stored receipt history as grounding context.

### Budget
- `GET /budget` → `Budget`.
- `PUT /budget` — body `{ monthlyTargetKg: number }` → updated `Budget`.

### Health
- `GET /health` → `{ "status": "ok" }`.

## Carbon lookup hierarchy (backend must implement, tag every line)
1. **Open Food Facts** — `https://world.openfoodfacts.org/api/v2/...` by name/barcode →
   real `carbon-footprint_100g` + `ecoscore_grade`. `source:"off"`, confidence `high`.
2. **Climatiq** — emission-factor API by category (needs `CLIMATIQ_API_KEY`).
   `source:"climatiq"`, confidence `medium`. Skip gracefully if no key.
3. **Static table** — `backend/app/data/emission_factors.json` (DEFRA/Agribalyse kg CO2e per kg).
   `source:"static"`, confidence `medium`.
4. **Gemini estimate** — final fallback only. `source:"gemini"`, confidence `low`,
   `note:"estimated by Gemini"`. Never the primary number source.

## Equivalence constants (use these so frontend/backend agree)
- 1 kg CO2e = **5.56 km** driven (avg petrol car ~0.18 kg/km)
- 1 kg CO2e = **121.6** smartphone charges (~0.00822 kg per charge)
- 1 kg CO2e ⇒ **0.0455** trees-year (a mature tree absorbs ~22 kg CO2e/year → trees = kg/22)

## Env vars
Backend (`backend/.env`):
```
GOOGLE_CLOUD_PROJECT=gen-ai-academy-491804
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.0-flash
CLIMATIQ_API_KEY=          # optional; engine skips tier 2 if empty
FIRESTORE_DATABASE=(default)
USE_FIRESTORE=false        # false = in-memory store for local dev/demo
```
Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
