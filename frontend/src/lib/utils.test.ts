import { describe, expect, it } from "vitest";

import { cn, formatDate, formatKg, formatNumber } from "./utils";

describe("cn", () => {
  it("merges class names and dedupes conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4"); // tailwind-merge keeps the last
    expect(cn("text-sm", false, undefined, "font-bold")).toBe(
      "text-sm font-bold"
    );
  });
});

describe("formatKg", () => {
  it("formats kilograms to the requested precision", () => {
    expect(formatKg(1.2345)).toBe("1.23");
    expect(formatKg(1.2345, 1)).toBe("1.2");
  });

  it("switches to tonnes at or above 1000 kg", () => {
    expect(formatKg(1500)).toBe("1.5t");
  });

  it("guards against missing / NaN values", () => {
    // @ts-expect-error testing runtime guard against null
    expect(formatKg(null)).toBe("—");
    expect(formatKg(NaN)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });

  it("respects the digits argument", () => {
    expect(formatNumber(3.14159, 2)).toBe("3.14");
  });

  it("guards against NaN", () => {
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("formatDate", () => {
  it("renders a readable date", () => {
    expect(formatDate("2026-06-09T00:00:00Z")).toMatch(/2026/);
  });

  it("returns the input unchanged when unparseable", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
