"use client";

import { useEffect, useState } from "react";
import { Loader2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Budget } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

/** Visual treatment per budget status, applied to the bar and caption. */
const STATUS_STYLE: Record<
  Budget["status"],
  { bar: string; text: string; label: string }
> = {
  ok: { bar: "bg-primary", text: "text-leaf-700", label: "on track" },
  warning: {
    bar: "bg-orange-500",
    text: "text-orange-600",
    label: "approaching limit",
  },
  over: { bar: "bg-destructive", text: "text-destructive", label: "over budget" },
};

/**
 * Monthly carbon budget: animated progress toward the user's target, plus an
 * inline form to change the target.
 */
export function BudgetCard({
  budget,
  onSet,
}: {
  budget: Budget;
  onSet: (b: Budget) => void;
}) {
  const [target, setTarget] = useState(String(budget.monthlyTargetKg));
  const [saving, setSaving] = useState(false);
  const [fill, setFill] = useState(0);
  const pct = Math.min(100, budget.percentUsed);
  const style = STATUS_STYLE[budget.status];

  // Grow the bar from 0 to its value on mount / when the value changes.
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  async function save() {
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      onSet(await api.setBudget(n));
    } catch {
      /* keep prior */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Monthly carbon budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end justify-between text-sm">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {formatNumber(budget.currentMonthKg, 1)}
            </span>
            <span className="text-muted-foreground">
              / {formatNumber(budget.monthlyTargetKg, 0)} kg
            </span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(budget.percentUsed)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Monthly carbon budget: ${budget.percentUsed.toFixed(0)}% used, status ${budget.status}`}
          >
            <div
              className={cn(
                "relative h-full overflow-hidden rounded-full transition-[width] [transition-duration:900ms] ease-out-quint motion-reduce:transition-none",
                style.bar
              )}
              style={{ width: `${fill}%` }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/40 blur-[2px] animate-sheen motion-reduce:hidden"
              />
            </div>
          </div>
          <p className={cn("mt-2 text-xs font-medium", style.text)}>
            {budget.percentUsed.toFixed(0)}% used · {style.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9"
            aria-label="Monthly target kg"
          />
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
