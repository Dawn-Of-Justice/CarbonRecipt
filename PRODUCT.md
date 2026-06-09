# PRODUCT.md — Carbon Receipt

**register:** mixed — the landing page is `brand` (design is the product), the dashboard is `product` (design serves the task).

## What it is
A web app that turns a shopping receipt into a real carbon footprint, then helps
people understand, track, and reduce it. Snap a receipt → Gemini reads the lines →
a tiered engine resolves a real CO₂e number per item → breakdown, history, budget,
top-3 swaps, and a Gemini coach. Built for the PromptWars Virtual hackathon; judged
on a functional app with a 60-second live demo.

## Who uses it & where
Hackathon judges and everyday shoppers, on a laptop or phone, in normal indoor light,
exploring quickly. The demo must feel alive on first load (receipts are pre-seeded).
India-relevant examples.

## Voice
Trustworthy and specific, not preachy. Every carbon number is sourced and tagged with a
confidence level — never a black box. Plain language over eco-jargon.

## Design system (already established — preserve)
- **Color:** warm "receipt paper" canvas (`--background` 50 30% 98%), forest-green ink,
  a `leaf` brand scale (50–950), green `--primary` (156 86% 24%). Dark mode defined.
- **Type:** Sora (display) + Inter (body) + mono for numbers. `tabular-nums` on figures.
- **Shape:** generous radius (`--radius: 0.9rem`), soft green-tinted shadows, dashed
  receipt dividers, a `receipt-edge` mask, subtle `grain` texture.
- **Motion tokens:** `fade-up` / `fade-in` / `shimmer` keyframes, ease-out-quint curve
  `cubic-bezier(0.22,1,0.36,1)`, `prefers-reduced-motion` guard in `globals.css`.

## Motion intent
Motion conveys state and rewards exploration without slowing the task. Landing: a few
earned scroll reveals + a signature hero, not fade-on-every-section. Dashboard:
150–300ms feedback and entrance, no page-load choreography that makes judges wait.
Reduced motion always has a calm fallback.
