"""Insights: trends bucketing, baseline comparison, and budget status."""

from datetime import datetime, timedelta, timezone

from app.insights import (
    AVG_INDIAN_HOUSEHOLD_KG_PER_MONTH,
    baseline,
    compute_budget,
    current_month_kg,
    trends,
)
from app.models import Equivalence, Receipt


def _receipt(days_ago: int, total: float, rid: str = "r") -> Receipt:
    dt = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    return Receipt(
        id=f"{rid}-{days_ago}",
        createdAt=dt,
        items=[],
        totalCo2eKg=total,
        categoryBreakdown={},
        equivalence=Equivalence(kmDriven=0, phoneCharges=0, treesYear=0),
    )


def test_trends_empty():
    assert trends([]) == []


def test_trends_weekly_buckets_and_sorted():
    pts = trends([_receipt(0, 5.0), _receipt(1, 3.0)], "weekly")
    # both within the same ISO week -> one bucket of 8.0
    assert len(pts) == 1
    assert pts[0].co2eKg == 8.0
    assert pts[0].period.startswith(str(datetime.now(timezone.utc).year))


def test_trends_monthly_separates_months():
    pts = trends([_receipt(0, 5.0), _receipt(40, 2.0)], "monthly")
    assert len(pts) == 2
    # sorted ascending by period string
    assert pts == sorted(pts, key=lambda p: p.period)


def test_current_month_kg_only_counts_this_month():
    val = current_month_kg([_receipt(0, 5.0), _receipt(40, 100.0)])
    assert val == 5.0


def test_baseline_zero_when_no_receipts():
    b = baseline([])
    assert b.userKg == 0.0
    assert b.baselineKg == AVG_INDIAN_HOUSEHOLD_KG_PER_MONTH
    assert b.deltaPercent == round((0 - b.baselineKg) / b.baselineKg * 100, 1)


def test_baseline_above_average_is_positive_delta():
    big = AVG_INDIAN_HOUSEHOLD_KG_PER_MONTH * 2
    b = baseline([_receipt(0, big)])
    assert b.deltaPercent > 0


def test_compute_budget_statuses():
    receipts = [_receipt(0, 50.0)]
    assert compute_budget(receipts, 100.0).status == "ok"  # 50%
    assert compute_budget(receipts, 60.0).status == "warning"  # ~83%
    assert compute_budget(receipts, 40.0).status == "over"  # 125%


def test_compute_budget_handles_zero_target():
    b = compute_budget([_receipt(0, 10.0)], 0.0)
    assert b.percentUsed == 0.0
    assert b.status == "ok"
