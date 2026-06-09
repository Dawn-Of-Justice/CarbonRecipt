import { Car, Smartphone, TreePine } from "lucide-react";
import type { Equivalence } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { CountUp } from "./count-up";

const items = (e: Equivalence) => [
  {
    icon: Car,
    value: e.kmDriven,
    decimals: 1,
    unit: "km driven",
    sub: "in an average petrol car",
  },
  {
    icon: Smartphone,
    value: e.phoneCharges,
    decimals: 0,
    unit: "phone charges",
    sub: "full smartphone charges",
  },
  {
    icon: TreePine,
    value: e.treesYear,
    decimals: 2,
    unit: "tree-years",
    sub: "to absorb this CO₂e",
  },
];

export function EquivalenceCard({ equivalence }: { equivalence: Equivalence }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items(equivalence).map((it, i) => (
        <div
          key={it.unit}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:bg-accent/40"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf-100 text-leaf-700">
            <it.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl font-semibold leading-tight text-foreground">
              {it.decimals === 0 ? (
                formatNumber(it.value)
              ) : (
                <CountUp value={it.value} decimals={it.decimals} />
              )}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                {it.unit}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
