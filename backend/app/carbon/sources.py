"""Real network tiers for the carbon engine: Open Food Facts (tier 1) and
Climatiq (tier 2).

Each function returns an `ItemFootprint` on success or `None` to fall through
to the next tier. They never raise to the caller for normal "miss"/timeout
cases — the engine also guards with try/except, but we keep these polite.
"""
from __future__ import annotations

import os
from typing import Optional

import httpx

from app.models import ItemFootprint, LineItem
from app.carbon.engine import quantity_to_kg  # safe: no circular use at import time

OFF_SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search"
OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}"
OFF_FIELDS = (
    "product_name,ecoscore_grade,carbon-footprint_100g,nutriments"
)
CLIMATIQ_URL = "https://api.climatiq.io/data/v1/estimate"
HTTP_TIMEOUT = 6.0


# --- helpers ---------------------------------------------------------------
def _eco_grade(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    g = str(raw).strip().upper()
    return g if g in ("A", "B", "C", "D", "E") else None


def _carbon_per_100g(product: dict) -> Optional[float]:
    """Pull a g CO2e / 100g value from an OFF product record, if present."""
    if not isinstance(product, dict):
        return None
    direct = product.get("carbon-footprint_100g")
    if direct not in (None, "", 0):
        try:
            return float(direct)
        except (TypeError, ValueError):
            pass
    nutr = product.get("nutriments") or {}
    for key in (
        "carbon-footprint_100g",
        "carbon-footprint-from-known-ingredients_100g",
    ):
        val = nutr.get(key)
        if val not in (None, "", 0):
            try:
                return float(val)
            except (TypeError, ValueError):
                continue
    return None


def _footprint_from_off(item: LineItem, product: dict) -> Optional[ItemFootprint]:
    """Build an ItemFootprint from an OFF product, or None if no carbon data."""
    per_100g = _carbon_per_100g(product)
    eco = _eco_grade(product.get("ecoscore_grade"))
    if per_100g is None:
        return None  # no real number -> fall through (Eco-Score alone isn't enough)

    mass_kg = quantity_to_kg(item.quantity, item.unit)
    # per_100g is grams CO2e per 100 g of product. Convert to kg CO2e for the line.
    # (g CO2e per 100 g) * (mass_kg * 1000 g / 100 g) / 1000 = per_100g * mass_kg / 100
    co2e_kg = per_100g * mass_kg / 100.0
    return ItemFootprint(
        **item.model_dump(),
        co2eKg=round(co2e_kg, 3),
        source="off",
        confidence="high",
        ecoScore=eco,
        note="Open Food Facts per-100g x qty",
    )


# --- tier 1: Open Food Facts ----------------------------------------------
def off_lookup(item: LineItem) -> Optional[ItemFootprint]:
    """Search OFF by product name; return a footprint if a carbon number exists."""
    params = {
        "search_terms": item.name,
        "fields": OFF_FIELDS,
        "page_size": 1,
    }
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            resp = client.get(OFF_SEARCH_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None
    products = data.get("products") or []
    if not products:
        return None
    return _footprint_from_off(item, products[0])


def off_barcode_lookup(barcode: str) -> Optional[ItemFootprint]:
    """Direct barcode lookup for the /barcode/{code} wow feature.

    Returns an ItemFootprint. If OFF has the product but no carbon number, we
    still surface the Eco-Score and fall back to a static-style note via the
    caller; here we return None on a hard miss.
    """
    url = OFF_PRODUCT_URL.format(barcode=barcode)
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            resp = client.get(url, params={"fields": OFF_FIELDS})
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None
    if data.get("status") != 1:
        return None
    product = data.get("product") or {}
    name = product.get("product_name") or f"Product {barcode}"
    item = LineItem(name=name, rawText=name, category="packaged", quantity=1, unit="pc")
    fp = _footprint_from_off(item, product)
    if fp is not None:
        return fp
    # Product exists but no carbon number: return Eco-Score-only with static fallback.
    from app.carbon.engine import static_factor

    eco = _eco_grade(product.get("ecoscore_grade"))
    per_kg = static_factor(name, "packaged")
    mass = quantity_to_kg(item.quantity, item.unit)
    return ItemFootprint(
        **item.model_dump(),
        co2eKg=round(per_kg * mass, 3),
        source="static",
        confidence="medium",
        ecoScore=eco,
        note="OFF Eco-Score; carbon via static factor",
    )


# --- tier 2: Climatiq ------------------------------------------------------
# Coarse mapping from our categories to Climatiq activity ids. The free dev
# tier covers these; if a key is absent the engine never calls this at all.
_CLIMATIQ_ACTIVITY = {
    "meat": "consumer_goods-type_meat_products_meat_fresh_frozen",
    "dairy": "consumer_goods-type_dairy_products",
    "produce": "agriculture-type_vegetables",
    "grains": "agriculture-type_cereal_grains_nec",
    "packaged": "consumer_goods-type_food_products_nec",
    "beverages": "consumer_goods-type_soft_drinks_mineral_waters",
    "household": "consumer_goods-type_other_chemical_products",
    "personal_care": "consumer_goods-type_soap_cleaning_preparations",
    "other": "consumer_goods-type_food_products_nec",
}


def climatiq_lookup(item: LineItem) -> Optional[ItemFootprint]:
    """Category-based emission factor via Climatiq. Requires CLIMATIQ_API_KEY."""
    api_key = os.getenv("CLIMATIQ_API_KEY")
    if not api_key:
        return None
    activity_id = _CLIMATIQ_ACTIVITY.get(item.category)
    if not activity_id:
        return None
    mass_kg = quantity_to_kg(item.quantity, item.unit)
    payload = {
        "emission_factor": {
            "activity_id": activity_id,
            "data_version": "^6",
        },
        "parameters": {"weight": mass_kg, "weight_unit": "kg"},
    }
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT) as client:
            resp = client.post(
                CLIMATIQ_URL,
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None
    co2e = data.get("co2e")
    if co2e is None:
        return None
    return ItemFootprint(
        **item.model_dump(),
        co2eKg=round(float(co2e), 3),
        source="climatiq",
        confidence="medium",
        ecoScore=None,
        note="Climatiq category factor",
    )
