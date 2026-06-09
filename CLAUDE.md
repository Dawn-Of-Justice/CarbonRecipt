# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project: Carbon Receipt — footprint tracker for PromptWars Virtual

A web app that turns everyday **shopping receipts (and bills) into a real carbon
footprint**, then helps users understand, track, and reduce it through personalized
insights. Built for the **PromptWars Virtual** hackathon (Challenge theme: *"Design a
solution that helps individuals understand, track, and reduce their carbon footprint
through simple actions and personalized insights."*).

### Core user loop
```
Snap a receipt  →  parse line items  →  look up real CO2e per item
              →  total + category breakdown + history
              →  top personalized swaps ("reduce")  →  Gemini coach Q&A
```
The app must hit all three theme verbs explicitly: **understand / track / reduce.**

## Hackathon constraints (PromptWars Virtual)
- **Must build with Google Antigravity** (intent-driven / prompt-driven development).
- ~**14-day** cycle. Submission by **Day 13**: code + live preview + technical blog + LinkedIn post.
- Judged on a **functional app with a live preview demo** — optimize for a clean 60-second demo.
- Region: India-only registration. Keep examples/baselines India-relevant where possible.

## Architecture

```
Receipt photo
  → Gemini (Vertex AI, multimodal): extract line items as JSON {name, category, quantity, unit}
  → Carbon lookup engine (tiered, see below)
  → Aggregate: total CO2e, per-category breakdown, history
  → Insights: top emitters + personalized swaps + Gemini coach
```

### Carbon lookup hierarchy (most important design decision)
For each parsed item, resolve a CO2e value by falling through these tiers and
**tag every line with the source + a confidence level**:

1. **Open Food Facts** — real per-product carbon footprint (g CO2e/100g) + Eco/Green-Score
   (A–E), matched by name/barcode. Best, real number. Free, no key. ODbL license.
2. **Climatiq API** — activity/category-based emission factors (DEFRA/EPA sourced) for
   items not in OFF (generic categories, non-food, electricity, fuel, transport). Free dev tier.
3. **Static factor table** — bundled DEFRA / Agribalyse / EPA values. Always available, offline.
4. **Gemini estimate (final fallback only)** — if all above fail, ask Gemini to estimate
   CO2e for the item. Lowest confidence; clearly flag as estimated.

> Prefer deterministic sources (1–3) for trustworthy, reproducible numbers. Gemini is the
> last resort so the app never shows a blank — never the primary number source.

### Tech notes
- Use **Gemini on Vertex AI** for vision/extraction (and only as the tier-4 number fallback).
  GCP/Vertex credits are available — full access to current Vertex AI + GCP services.
- Persist receipt history (e.g. Firestore) for trends.
- Pre-seed a couple of clean sample receipts so the live demo looks alive on first load.

## Features

### Must-have (theme-required)
- **Receipt parsing** (Gemini multimodal) → structured line items.
- **Real-number lookup** via the tiered hierarchy above.
- **Track:** saved history, weekly/monthly trend chart, per-category breakdown.
- **Baseline comparison:** "X% above/below an average household basket."
- **Reduce:** top-3 emitters each with a concrete lower-carbon swap + kg CO2e saved.
- **Eco-Score per item** (A–E) surfaced for at-a-glance good/bad choices.
- **Equivalence translator** (*understand*) — show every footprint as something tangible:
  "= X km driven / Y phone charges / Z trees needed." Tiny conversion table on a number we
  already have; highest demo impact per hour of work. **Committed.**
- **Carbon budget** (*track + reduce*) — user sets a monthly CO2e target; progress bar +
  alert as they approach it. Reframes the app from passive log to active goal. Builds on
  stored history. **Committed.**

### Wow-factor
- **Gemini conversational coach** — answers "why is my footprint high this week?" using the
  user's own data. This is the "personalized insights" judging criterion.
- **Barcode scan** — instant carbon + Eco-Score via Open Food Facts, no receipt needed.
- **"What if" simulator** — toggle swaps, watch the total drop live.

### Stretch / roadmap (mention, don't necessarily build)
- Utility/electricity bill upload → CO2e (Carbon Interface API).
- Gamified badges / streaks / leaderboard (fits the PromptWars credit vibe).
- Shareable monthly "carbon card" image (reuse for the required LinkedIn post).
- **Digital/Gmail receipt auto-import** — deferred: Gmail OAuth + email-format parsing is a
  time sink for a 14-day build; photo→Gemini already covers the hero flow.
- Household / per-capita mode; pre-shop planner; verified offset links; recurring-purchase
  detection + annual projection. Good blog/LinkedIn material, not demo-critical.

## Data sources & APIs
- **Open Food Facts** — https://openfoodfacts.github.io/openfoodfacts-server/api/ (free, ODbL).
- **Climatiq** — emission-factor API, free dev tier. Confirm current free-tier limits before committing.
- **Carbon Interface** — electricity/flights/vehicles/shipping; for the bill stretch feature.
- **Static datasets** — DEFRA & EPA emission factors, **Agribalyse** food LCA (basis of Eco-Score).

## Scope discipline
- **Hero flow = grocery receipts.** Don't build receipts + bills + delivery parsers at once —
  depth on one beats shallow on three. Bills/utilities are roadmap.
- Don't build every feature; the winning arc is:
  **parse → real numbers → breakdown + history → top-3 swaps → Gemini coach.**

## Status
- Stack not yet chosen / scaffolded. Next step: lock stack, then build the carbon lookup
  engine (tiers 1→4) as the core, then the parsing + UI around it.
