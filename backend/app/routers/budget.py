"""Budget endpoints: GET /budget and PUT /budget."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app import insights as insights_mod
from app.deps import UserIdQuery, get_seeded_repo
from app.models import Budget, BudgetUpdate
from app.store import Repository

router = APIRouter(prefix="/budget")


@router.get("", response_model=Budget)
def get_budget(
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_seeded_repo),
) -> Budget:
    target = repo.get_budget_target(userId)
    return insights_mod.compute_budget(repo.list_receipts(userId), target)


@router.put("", response_model=Budget)
def update_budget(
    body: BudgetUpdate,
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_seeded_repo),
) -> Budget:
    repo.set_budget_target(body.monthlyTargetKg, userId)
    return insights_mod.compute_budget(repo.list_receipts(userId), body.monthlyTargetKg)
