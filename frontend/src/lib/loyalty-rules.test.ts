import { describe, expect, it } from "vitest";
import { earnPoints, pointsToRupees } from "@/lib/loyalty-rules";
import { defaultLoyaltySettings } from "@/lib/loyalty-settings";

/** Mirrors server InvoiceService.EarnPoints — see bussines.md § Loyalty & POS */
describe("loyalty earn (POS settings)", () => {
  const rule = defaultLoyaltySettings();

  it("earns 0 below min spend", () => {
    expect(earnPoints(400, rule)).toBe(0);
  });

  it("earns 5 pts on ₹500 taxable", () => {
    expect(earnPoints(500, rule)).toBe(5);
  });

  it("earns 10 pts on ₹1000 taxable", () => {
    expect(earnPoints(1000, rule)).toBe(10);
  });

  it("redeems 1 pt = ₹1", () => {
    expect(pointsToRupees(10, rule)).toBe(10);
  });
});
