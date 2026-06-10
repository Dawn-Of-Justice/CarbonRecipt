"""Gemini (Vertex AI) integration: receipt vision parse, tier-4 carbon estimate,
and the conversational coach.

Uses the Google Gen AI SDK in Vertex mode. The client is created lazily and
cached so importing this module is cheap and offline-safe (tests mock the
public functions, never reaching Vertex).

All functions degrade gracefully: on any error / missing credentials they
return a safe fallback (empty parse, None estimate, or an apologetic coach
answer) so the rest of the pipeline keeps working.
"""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import List, Optional

from app.models import LineItem

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "promptwars-495213")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_ALLOWED_CATEGORIES = {
    "meat",
    "dairy",
    "produce",
    "grains",
    "packaged",
    "beverages",
    "household",
    "personal_care",
    "other",
}

PARSE_PROMPT = """You are a receipt parser for a carbon-footprint app focused on
Indian grocery shopping. Extract every purchasable line item from this receipt
image.

Return ONLY a JSON array (no prose, no markdown) where each element is:
{
  "name": string,        // normalized product name, e.g. "Amul Toned Milk"
  "rawText": string,     // the original text on that receipt line
  "category": string,    // EXACTLY one of: meat, dairy, produce, grains,
                         // packaged, beverages, household, personal_care, other
  "quantity": number,    // numeric quantity, default 1
  "unit": string         // one of: kg, g, l, ml, pc, pack
}

Rules:
- Skip totals, taxes, discounts, store metadata — only real products.
- If quantity/unit are unclear, use quantity 1 and unit "pc".
- Choose the single best category from the allowed list.
Return the JSON array only.
"""


@lru_cache(maxsize=1)
def _client():
    """Create (and cache) the Vertex Gen AI client. Raises if SDK/creds missing."""
    from google import genai

    return genai.Client(vertexai=True, project=PROJECT, location=LOCATION)


def _generate_text(contents: list, *, temperature: float, json_output: bool = False) -> str:
    """One Gemini call returning raw text ("" when the model returns none).

    Shared by all three public functions so the client/config wiring lives in
    exactly one place. Raises on SDK/network errors; callers handle fallback.
    """
    from google.genai import types

    config = types.GenerateContentConfig(
        temperature=temperature,
        response_mime_type="application/json" if json_output else None,
    )
    resp = _client().models.generate_content(model=MODEL, contents=contents, config=config)
    return resp.text or ""


def _extract_json(text: str):
    """Robustly pull a JSON value out of a model response (handles code fences)."""
    if not text:
        return None
    cleaned = text.strip()
    # strip ```json ... ``` fences if present
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        # last-ditch: grab the outermost [...] or {...}
        match = re.search(r"(\[.*\]|\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                return None
    return None


def _coerce_line_items(raw) -> List[LineItem]:
    """Validate/normalize the model's JSON into LineItem objects.

    Values are clamped to the LineItem field bounds (lengths, quantity range)
    so one oversized model answer can never invalidate the whole parse.
    """
    items: List[LineItem] = []
    if not isinstance(raw, list):
        return items
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()[:200]
        if not name:
            continue
        category = str(entry.get("category") or "other").strip().lower()
        if category not in _ALLOWED_CATEGORIES:
            category = "other"
        try:
            quantity = float(entry.get("quantity") or 1)
        except (TypeError, ValueError):
            quantity = 1.0
        quantity = min(max(quantity, 0.0), 10_000.0)
        unit = (str(entry.get("unit") or "pc").strip().lower() or "pc")[:20]
        items.append(
            LineItem(
                name=name,
                rawText=str(entry.get("rawText") or name)[:300],
                category=category,
                quantity=quantity,
                unit=unit,
            )
        )
    return items


def parse_receipt(image_bytes: bytes, mime_type: str = "image/jpeg") -> List[LineItem]:
    """Gemini multimodal: receipt image -> list of LineItem. [] on failure."""
    try:
        from google.genai import types

        image = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        text = _generate_text([image, PARSE_PROMPT], temperature=0.1, json_output=True)
        return _coerce_line_items(_extract_json(text))
    except Exception:
        # Never break the upload flow; an empty parse is handled by the router.
        return []


def gemini_estimate(item: LineItem) -> Optional[float]:
    """Tier-4 last resort: ask Gemini for kg CO2e for this whole line. None on fail."""
    prompt = (
        "Estimate the total cradle-to-retail carbon footprint in kilograms of "
        "CO2e for this grocery purchase line. Respond with ONLY a number "
        "(kg CO2e), no units, no text.\n"
        f"Item: {item.name}\nQuantity: {item.quantity} {item.unit}\n"
        f"Category: {item.category}"
    )
    try:
        match = re.search(r"[-+]?\d*\.?\d+", _generate_text([prompt], temperature=0.0))
        return float(match.group(0)) if match else None
    except Exception:
        return None


def coach_answer(question: str, context: str) -> str:
    """Conversational coach grounded in the user's own receipt history."""
    prompt = (
        "You are a friendly, concise carbon-footprint coach inside an Indian "
        "grocery app. Answer the user's question using ONLY the data below as "
        "grounding. Be specific, cite numbers in kg CO2e, and suggest one "
        "concrete action. Keep it under 120 words.\n"
        "Format for a small chat bubble: short sentences or a brief '-' "
        "bullet list. You may use **bold** for key numbers. No headings, "
        "tables, or nested lists.\n\n"
        f"=== USER DATA ===\n{context}\n\n"
        f"=== QUESTION ===\n{question}"
    )
    try:
        return _generate_text([prompt], temperature=0.4).strip() or _fallback_answer()
    except Exception:
        return _fallback_answer()


def _fallback_answer() -> str:
    return (
        "I couldn't reach the AI coach right now, but based on your history the "
        "biggest lever is usually red meat and cheese — swapping even one for "
        "chicken, paneer, or pulses noticeably lowers your weekly footprint."
    )
