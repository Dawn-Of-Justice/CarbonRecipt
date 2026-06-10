"use client";

import { EcoScoreBadge, SourceBadge } from "@/components/dashboard/badges";
import { CATEGORY_LABELS, type ItemFootprint } from "@/lib/types";

/**
 * Line-item table for one receipt: every row shows the item, its Eco-Score,
 * the data source/confidence, and its CO2e — highest emitters first.
 */
export function ItemsTable({ items }: { items: ItemFootprint[] }) {
  const sorted = [...items].sort((a, b) => b.co2eKg - a.co2eKg);
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Line items in this receipt with their Eco-Score, data source, and
          CO₂e in kilograms, sorted highest first.
        </caption>
        <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Item
            </th>
            <th scope="col" className="px-2 py-2.5 text-center font-medium">
              Eco
            </th>
            <th
              scope="col"
              className="hidden px-2 py-2.5 font-medium sm:table-cell"
            >
              Source
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              CO₂e
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((it, i) => (
            <tr
              key={`${it.name}-${i}`}
              className="animate-slide-up-fade transition-colors hover:bg-secondary/30"
              style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
            >
              <td className="px-4 py-2.5">
                <div className="font-medium text-foreground">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  {it.quantity} {it.unit} · {CATEGORY_LABELS[it.category]}
                </div>
              </td>
              <td className="px-2 py-2.5 text-center">
                <EcoScoreBadge score={it.ecoScore} size="sm" />
              </td>
              <td className="hidden px-2 py-2.5 sm:table-cell">
                <SourceBadge source={it.source} confidence={it.confidence} />
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                {it.co2eKg.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
