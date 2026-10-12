import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "./amount";

describe("formatAmount", () => {
  it("groups INR the Indian way", () => {
    expect(formatAmount(1000000000, "INR")).toBe("1,00,00,00,000");
    expect(formatAmount(1850000, "INR")).toBe("18,50,000");
  });

  it("groups other currencies in thousands", () => {
    expect(formatAmount(1850000, "USD")).toBe("1,850,000");
    expect(formatAmount(95000, "GBP")).toBe("95,000");
  });

  it("is empty when there is no value", () => {
    expect(formatAmount(undefined, "INR")).toBe("");
  });
});

describe("parseAmount", () => {
  it("strips separators and anything that is not a digit", () => {
    expect(parseAmount("18,50,000")).toBe(1850000);
    expect(parseAmount("₹ 1,200.50")).toBe(120050);
    expect(parseAmount("abc")).toBeUndefined();
    expect(parseAmount("")).toBeUndefined();
  });

  it("caps the length so the number stays safe", () => {
    expect(parseAmount("9".repeat(20))).toBe(999999999999);
  });
});
