"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_TOOLTIP_STYLE } from "@/components/dashboard/chart-theme";
import { CATEGORY_COLORS } from "@/lib/design";
import { CATEGORY_LABELS, type Category, type Receipt } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface BreakdownSlice {
  category: Category;
  name: string;
  value: number;
}

/** Non-zero category totals, largest first, ready for the donut + legend. */
function toSlices(receipt: Receipt): BreakdownSlice[] {
  return Object.entries(receipt.categoryBreakdown)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => ({
      category: k as Category,
      name: CATEGORY_LABELS[k as Category],
      value: Number(v),
    }))
    .sort((a, b) => b.value - a.value);
}

/** Donut chart of a receipt's CO2e per category, with a textual legend. */
export function CategoryBreakdown({ receipt }: { receipt: Receipt }) {
  const slices = toSlices(receipt);
  return (
    <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
      <div
        className="relative h-[200px]"
        role="img"
        aria-label={
          "Category breakdown: " +
          slices.map((d) => `${d.name} ${d.value.toFixed(1)} kg`).join(", ")
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
              strokeWidth={0}
            >
              {slices.map((d) => (
                <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(2)} kg`, "CO₂e"]}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold">
            {formatNumber(receipt.totalCo2eKg, 1)}
          </span>
          <span className="text-[10px] uppercase text-muted-foreground">
            kg total
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {slices.map((d) => (
          <div key={d.category} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
            />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {d.value.toFixed(1)} kg
            </span>
            <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {((d.value / receipt.totalCo2eKg) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
