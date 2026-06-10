"use client";

import { Leaf } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Swap } from "@/lib/types";

/** "Reduce" card: the top lower-carbon swaps for this basket, by impact. */
export function SwapsCard({ swaps }: { swaps: Swap[] }) {
  if (swaps.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" /> Top swaps to cut your
          footprint
        </CardTitle>
        <CardDescription>
          The highest-impact changes for this basket.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {swaps.map((s, i) => (
          <div
            key={s.fromItem}
            className="group animate-slide-up-fade rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow,border-color] duration-300 ease-out-quint hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground line-through decoration-destructive/50">
                {s.fromItem}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-primary">
              → {s.toSuggestion}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {s.rationale}
            </p>
            <p className="mt-3 inline-flex rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold text-leaf-800 transition-colors group-hover:bg-leaf-200">
              saves {s.co2eSavedKg.toFixed(1)} kg CO₂e
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
