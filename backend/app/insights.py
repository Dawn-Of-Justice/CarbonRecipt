"""Insights: trends, baseline comparison, and budget computation.

All functions take stored Receipts and derive the contract shapes. Pure-ish
(only depend on the receipts passed in), so easy to test.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import List

from app.models import Baseline, Budget, Receipt, TrendPoint

# Avg Indian household monthly grocery basket footprint (rough, India-relevant).
# Used as the baseline comparison constant.
AVG_INDIAN_HOUSEHOLD_KG_PER_MONTH = 90.0
BASELINE_LABEL = "Average Indian household basket"

# Budget status thresholds.
WARN_THRESHOLD = 80.0  # percentUsed >= 80 -> warning
OVER_THRESHOLD = 100.0  # percentUsed > 100 -> over


def _parse_dt(iso: str) -> datetime:
    """Parse an ISO timestamp, tolerating a trailing Z."""
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return datetime.utcnow()


def trends(receipts: List[Receipt], range_: str = "weekly") -> List[TrendPoint]:
    """Group receipt totals into ISO-week ("2026-W23") or month ("2026-06") buckets."""
    buckets: dict = defaultdict(float)
    for r in receipts:
        dt = _parse_dt(r.createdAt)
        if range_ == "monthly":
            period = dt.strftime("%Y-%m")
        else:
            iso_year, iso_week, _ = dt.isocalendar()
            period = f"{iso_year}-W{iso_week:02d}"
        buckets[period] += r.totalCo2eKg
    points = [TrendPoint(period=p, co2eKg=round(v, 3)) for p, v in buckets.items()]
    points.sort(key=lambda p: p.period)
    return points


def baseline(receipts: List[Receipt]) -> Baseline:
    """Compare the user's avg monthly footprint to the household baseline."""
    monthly = trends(receipts, "monthly")
    user_avg = round(sum(p.co2eKg for p in monthly) / len(monthly), 3) if monthly else 0.0
    base = AVG_INDIAN_HOUSEHOLD_KG_PER_MONTH
    delta = round(((user_avg - base) / base) * 100, 1) if base else 0.0
    return Baseline(
        userKg=user_avg,
        baselineKg=base,
        deltaPercent=delta,
        label=BASELINE_LABEL,
    )


def current_month_kg(receipts: List[Receipt]) -> float:
    """Sum of footprints for receipts in the current calendar month."""
    now = datetime.utcnow()
    total = 0.0
    for r in receipts:
        dt = _parse_dt(r.createdAt)
        if dt.year == now.year and dt.month == now.month:
            total += r.totalCo2eKg
    return round(total, 3)


def compute_budget(receipts: List[Receipt], target_kg: float) -> Budget:
    """Build the Budget view from the month's usage vs the target."""
    used = current_month_kg(receipts)
    target = float(target_kg) if target_kg else 0.0
    percent = round((used / target) * 100, 1) if target > 0 else 0.0
    if percent > OVER_THRESHOLD:
        status = "over"
    elif percent >= WARN_THRESHOLD:
        status = "warning"
    else:
        status = "ok"
    return Budget(
        monthlyTargetKg=target,
        currentMonthKg=used,
        percentUsed=percent,
        status=status,
    )
