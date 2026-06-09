import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a kg CO2e number for display. */
export function formatKg(kg: number, digits = 2): string {
  if (kg == null || Number.isNaN(kg)) return "—";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(digits)}`;
}

export function formatNumber(n: number, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatDate(iso: string): string {
  // new Date(badInput) yields an Invalid Date object (it does not throw), so
  // guard explicitly rather than relying on try/catch.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
