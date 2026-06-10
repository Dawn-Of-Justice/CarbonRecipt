"""Pydantic models — the canonical wire shapes from docs/API_CONTRACT.md.

Field names and structures here are the contract. Frontend and tests build
against these exact shapes, so do not rename a field without updating the
contract doc.
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

# --- enums (kept as Literal so they serialize as plain strings) ---
Source = Literal["off", "climatiq", "static", "gemini"]
Confidence = Literal["high", "medium", "low"]
EcoScore = Optional[Literal["A", "B", "C", "D", "E"]]
Category = Literal[
    "meat",
    "dairy",
    "produce",
    "grains",
    "packaged",
    "beverages",
    "household",
    "personal_care",
    "other",
]


class LineItem(BaseModel):
    """Raw extraction from a receipt line.

    Field bounds guard against malformed or adversarial payloads reaching the
    engine and the store (the Gemini parser clamps to these same limits).
    """

    name: str = Field(min_length=1, max_length=200)
    rawText: str = Field(default="", max_length=300)
    category: Category = "other"
    quantity: float = Field(default=1, ge=0, le=10_000)
    unit: str = Field(default="pc", max_length=20)


class ItemFootprint(LineItem):
    """A line item enriched with its resolved carbon number + provenance."""

    co2eKg: float
    source: Source
    confidence: Confidence
    ecoScore: EcoScore = None
    note: Optional[str] = None


class Equivalence(BaseModel):
    kmDriven: float
    phoneCharges: float
    treesYear: float


class Swap(BaseModel):
    fromItem: str
    toSuggestion: str
    co2eSavedKg: float
    rationale: str


class Receipt(BaseModel):
    id: str
    createdAt: str
    merchant: Optional[str] = None
    items: List[ItemFootprint]
    totalCo2eKg: float
    categoryBreakdown: Dict[str, float]
    equivalence: Equivalence
    topSwaps: List[Swap] = Field(default_factory=list)
    imageUrl: Optional[str] = None


class Budget(BaseModel):
    monthlyTargetKg: float
    currentMonthKg: float
    percentUsed: float
    status: Literal["ok", "warning", "over"]


class TrendPoint(BaseModel):
    period: str
    co2eKg: float


class Baseline(BaseModel):
    userKg: float
    baselineKg: float
    deltaPercent: float
    label: str


# --- request bodies ---
class FootprintRequest(BaseModel):
    items: List[LineItem] = Field(max_length=200)


class FootprintResponse(BaseModel):
    items: List[ItemFootprint]
    totalCo2eKg: float
    categoryBreakdown: Dict[str, float]
    equivalence: Equivalence
    topSwaps: List[Swap]


class ParseOnlyResponse(BaseModel):
    items: List[LineItem]
    merchant: Optional[str] = None


class CoachRequest(BaseModel):
    # Bounded so a single request can't feed an arbitrarily large prompt to Gemini.
    question: str = Field(min_length=1, max_length=500)


class CoachResponse(BaseModel):
    answer: str


class BudgetUpdate(BaseModel):
    monthlyTargetKg: float = Field(gt=0, le=1_000_000)
