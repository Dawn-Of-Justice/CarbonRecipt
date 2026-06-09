"""Budget endpoints: GET /budget and PUT /budget."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app import insights as insights_mod
from app.deps import get_repo
from app.models import Budget, BudgetUpdate
from app.store import DEFAULT_USER, Repository

router = APIRouter(prefix="/budget")


@router.get("", response_model=Budget)
def get_budget(
    userId: str = Query(DEFAULT_USER),
    repo: Repository = Depends(get_repo),
) -> Budget:
    target = repo.get_budget_target(userId)
    return insights_mod.compute_budget(repo.list_receipts(userId), target)


@router.put("", response_model=Budget)
def update_budget(
    body: BudgetUpdate,
    userId: str = Query(DEFAULT_USER),
    repo: Repository = Depends(get_repo),
) -> Budget:
    repo.set_budget_target(body.monthlyTargetKg, userId)
    return insights_mod.compute_budget(repo.list_receipts(userId), body.monthlyTargetKg)
