"use client";

import { Receipt as ReceiptIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Receipt } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

/** Past receipts; clicking one makes it the selected receipt in the main column. */
export function HistoryCard({
  receipts,
  selectedId,
  onSelect,
}: {
  receipts: Receipt[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptIcon className="h-4 w-4 text-primary" /> History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {receipts.length === 0 && (
          <p className="text-sm text-muted-foreground">No receipts yet.</p>
        )}
        {receipts.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
              r.id === selectedId
                ? "border-primary/40 bg-leaf-50"
                : "border-transparent hover:bg-secondary/50"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {r.merchant ?? "Receipt"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatShortDate(r.createdAt)} · {r.items.length} items
              </p>
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-primary">
              {r.totalCo2eKg.toFixed(1)}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
