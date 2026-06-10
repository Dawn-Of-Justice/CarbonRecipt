"use client";

import { TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Baseline } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Compares the user's footprint against an average household basket. */
export function BaselineCard({ baseline }: { baseline: Baseline }) {
  const below = baseline.deltaPercent <= 0;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            below ? "bg-leaf-100 text-leaf-700" : "bg-orange-100 text-orange-700"
          )}
        >
          <TrendingUp className={cn("h-6 w-6", below && "rotate-180")} />
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-foreground">
            {Math.abs(baseline.deltaPercent).toFixed(0)}%{" "}
            {below ? "below" : "above"}
          </p>
          <p className="text-xs text-muted-foreground">{baseline.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
