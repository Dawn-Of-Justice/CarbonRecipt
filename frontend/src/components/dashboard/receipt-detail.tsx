"use client";

import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CountUp } from "@/components/dashboard/count-up";
import { EquivalenceCard } from "@/components/dashboard/equivalence-card";
import { ItemsTable } from "@/components/dashboard/items-table";
import { SwapsCard } from "@/components/dashboard/swaps-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Receipt } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

/**
 * Main column for one selected receipt: hero total with equivalences, the
 * category breakdown + line items, and the top swap suggestions.
 */
export function ReceiptDetail({ receipt }: { receipt: Receipt }) {
  return (
    <>
      <ReceiptTotalCard receipt={receipt} />
      <Card>
        <CardHeader>
          <CardTitle>Where your carbon comes from</CardTitle>
          <CardDescription>
            Category breakdown and every line, with its data source &amp;
            confidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown receipt={receipt} />
          <ItemsTable items={receipt.items} />
        </CardContent>
      </Card>
      <SwapsCard swaps={receipt.topSwaps} />
    </>
  );
}

/** Hero card: animated total CO2e plus the tangible-equivalence strip. */
function ReceiptTotalCard({ receipt }: { receipt: Receipt }) {
  return (
    <Card className="overflow-hidden">
      <div className="receipt-edge h-2 bg-primary" />
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {receipt.merchant ?? "Receipt"} ·{" "}
              {formatShortDate(receipt.createdAt)}
            </p>
            <div className="mt-1 font-display text-5xl font-bold text-primary">
              <CountUp value={receipt.totalCo2eKg} decimals={1} />
              <span className="ml-2 text-xl font-medium text-muted-foreground">
                kg CO₂e
              </span>
            </div>
          </div>
          <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-medium text-leaf-800">
            {receipt.items.length} items
          </span>
        </div>
        <div className="mt-6">
          <EquivalenceCard equivalence={receipt.equivalence} />
        </div>
      </CardContent>
    </Card>
  );
}
