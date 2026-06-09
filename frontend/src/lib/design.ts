import type { Category, Confidence, EcoScore, Source } from "./types";

// Eco-Score A..E -> green to red gradient
export const ECO_COLORS: Record<Exclude<EcoScore, null>, string> = {
  A: "#0a8d56",
  B: "#5bbf52",
  C: "#e6b800",
  D: "#ef7a30",
  E: "#d62828",
};

export const ECO_BADGE: Record<
  Exclude<EcoScore, null>,
  { bg: string; text: string; ring: string }
> = {
  A: { bg: "bg-leaf-100", text: "text-leaf-800", ring: "ring-leaf-300" },
  B: { bg: "bg-lime-100", text: "text-lime-800", ring: "ring-lime-300" },
  C: { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-300" },
  D: { bg: "bg-orange-100", text: "text-orange-800", ring: "ring-orange-300" },
  E: { bg: "bg-red-100", text: "text-red-800", ring: "ring-red-300" },
};

export const SOURCE_STYLE: Record<
  Source,
  { dot: string; label: string; bg: string; text: string }
> = {
  off: {
    dot: "bg-leaf-500",
    label: "OFF",
    bg: "bg-leaf-50",
    text: "text-leaf-800",
  },
  climatiq: {
    dot: "bg-sky-500",
    label: "Climatiq",
    bg: "bg-sky-50",
    text: "text-sky-800",
  },
  static: {
    dot: "bg-violet-500",
    label: "Static",
    bg: "bg-violet-50",
    text: "text-violet-800",
  },
  gemini: {
    dot: "bg-amber-500",
    label: "Gemini",
    bg: "bg-amber-50",
    text: "text-amber-800",
  },
};

export const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "text-leaf-700",
  medium: "text-amber-700",
  low: "text-orange-700",
};

// Distinct, accessible donut/bar palette per category (carbon-coded)
export const CATEGORY_COLORS: Record<Category, string> = {
  meat: "#b5341f",
  dairy: "#e08a2b",
  produce: "#0a8d56",
  grains: "#caa64a",
  packaged: "#7c6f9c",
  beverages: "#2f7fb0",
  household: "#5e7d77",
  personal_care: "#c0658c",
  other: "#94a3a0",
};
