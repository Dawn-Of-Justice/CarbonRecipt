"""Insights endpoints: trends, baseline, and the Gemini coach."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app import insights as insights_mod
from app.deps import get_repo
from app.gemini.client import coach_answer
from app.models import Baseline, CoachRequest, CoachResponse, TrendPoint
from app.store import DEFAULT_USER, Repository

router = APIRouter(prefix="/insights")


@router.get("/trends", response_model=List[TrendPoint])
def trends(
    range: str = Query("weekly", pattern="^(weekly|monthly)$"),
    userId: str = Query(DEFAULT_USER),
    repo: Repository = Depends(get_repo),
) -> List[TrendPoint]:
    return insights_mod.trends(repo.list_receipts(userId), range)


@router.get("/baseline", response_model=Baseline)
def baseline(
    userId: str = Query(DEFAULT_USER),
    repo: Repository = Depends(get_repo),
) -> Baseline:
    return insights_mod.baseline(repo.list_receipts(userId))


def _coach_context(receipts) -> str:
    """Compact text summary of the user's receipts to ground the coach."""
    if not receipts:
        return "The user has no stored receipts yet."
    lines = []
    for r in receipts[:10]:
        cats = ", ".join(f"{k}:{v}kg" for k, v in r.categoryBreakdown.items())
        top = r.items and max(r.items, key=lambda i: i.co2eKg)
        top_str = f" top item: {top.name} ({top.co2eKg}kg)" if top else ""
        lines.append(
            f"- {r.createdAt[:10]} {r.merchant or 'receipt'}: "
            f"{r.totalCo2eKg}kg CO2e [{cats}].{top_str}"
        )
    return "Recent receipts (newest first):\n" + "\n".join(lines)


# /coach is a root-level path in the contract, so it gets its own router here.
coach_router = APIRouter()


@coach_router.post("/coach", response_model=CoachResponse)
def coach(
    body: CoachRequest,
    userId: str = Query(DEFAULT_USER),
    repo: Repository = Depends(get_repo),
) -> CoachResponse:
    """Gemini answers a question grounded in the user's stored receipts."""
    receipts = repo.list_receipts(userId)
    context = _coach_context(receipts)
    return CoachResponse(answer=coach_answer(body.question, context))
