import { describe, expect, it } from "vitest";
import { formatMoney, fromMinor, minorUnitFactor, toMinor } from "@/lib/money";

describe("money", () => {
  it("treats zero-decimal currencies as whole units", () => {
    expect(minorUnitFactor("JPY")).toBe(1);
    expect(toMinor(1200, "JPY")).toBe(1200);
    expect(fromMinor(1200, "JPY")).toBe(1200);
  });

  it("converts decimal currencies without float drift", () => {
    expect(toMinor(12.55, "USD")).toBe(1255);
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(fromMinor(1255, "USD")).toBe(12.55);
  });

  it("formats in the currency of the amount", () => {
    expect(formatMoney(1250000, "USD", "en-US")).toContain("12,500");
    expect(formatMoney(1200, "JPY", "en-US")).toContain("1,200");
  });
});
