// Types mirror docs/API_CONTRACT.md exactly. Do not drift.

export type Source = "off" | "climatiq" | "static" | "gemini";
export type Confidence = "high" | "medium" | "low";
export type EcoScore = "A" | "B" | "C" | "D" | "E" | null;
export type Category =
  | "meat"
  | "dairy"
  | "produce"
  | "grains"
  | "packaged"
  | "beverages"
  | "household"
  | "personal_care"
  | "other";

export interface LineItem {
  name: string;
  rawText: string;
  category: Category;
  quantity: number;
  unit: string;
}

export interface ItemFootprint extends LineItem {
  co2eKg: number;
  source: Source;
  confidence: Confidence;
  ecoScore: EcoScore;
  note?: string;
}

export interface Equivalence {
  kmDriven: number;
  phoneCharges: number;
  treesYear: number;
}

export interface Swap {
  fromItem: string;
  toSuggestion: string;
  co2eSavedKg: number;
  rationale: string;
}

export interface Receipt {
  id: string;
  createdAt: string;
  merchant: string | null;
  items: ItemFootprint[];
  totalCo2eKg: number;
  categoryBreakdown: Partial<Record<Category, number>>;
  equivalence: Equivalence;
  topSwaps: Swap[];
  imageUrl?: string | null;
}

export interface Budget {
  monthlyTargetKg: number;
  currentMonthKg: number;
  percentUsed: number;
  status: "ok" | "warning" | "over";
}

export interface TrendPoint {
  period: string; // "2026-W23" or "2026-06"
  co2eKg: number;
}

export interface Baseline {
  userKg: number;
  baselineKg: number;
  deltaPercent: number;
  label: string;
}

export interface FootprintResult {
  items: ItemFootprint[];
  totalCo2eKg: number;
  categoryBreakdown: Partial<Record<Category, number>>;
  equivalence: Equivalence;
  topSwaps: Swap[];
}

export interface ParseOnlyResult {
  items: LineItem[];
  merchant: string | null;
}

export interface CoachAnswer {
  answer: string;
}

// Equivalence constants (kept in sync with API_CONTRACT.md)
export const EQUIV = {
  KM_PER_KG: 5.56,
  CHARGES_PER_KG: 121.6,
  TREES_PER_KG: 0.0455,
} as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  meat: "Meat",
  dairy: "Dairy",
  produce: "Produce",
  grains: "Grains",
  packaged: "Packaged",
  beverages: "Beverages",
  household: "Household",
  personal_care: "Personal Care",
  other: "Other",
};

export const SOURCE_LABELS: Record<Source, string> = {
  off: "Open Food Facts",
  climatiq: "Climatiq",
  static: "Static factor",
  gemini: "Gemini estimate",
};
