import { describe, it, expect } from "vitest";
import { PRICING_CONFIG, PricingConfigSchema } from "./pricing-config";

/**
 * Pricing cadence guardrails:
 *   - Zod parses the config.
 *   - Top-level keys match a frozen whitelist (now includes `seasonPass`).
 *   - Cross-config invariant: freeAiCallsPerDay (top-level) === costCaps mirror.
 *   - Annual discount math holds: yearly ≈ monthly × 12 × (1 - pct/100) ± $1.
 *   - Season Pass invariant: price === yearlyPrice (semantically one-time).
 *   - Campus is contact-sales: price and yearlyPrice are zero.
 *   - Locked-value spot checks for tier prices (Stripe priceIds depend on these).
 *   - .strict() rejects unknown keys and rejects re-introducing `team`.
 */
describe("PRICING_CONFIG", () => {
  it("parses cleanly through PricingConfigSchema", () => {
    const parsed = PricingConfigSchema.safeParse(PRICING_CONFIG);
    if (!parsed.success) {
      throw new Error(
        `PricingConfig failed strict parse: ${JSON.stringify(parsed.error.issues, null, 2)}`,
      );
    }
    expect(parsed.success).toBe(true);
  });

  it("exposes exactly the whitelisted top-level keys", () => {
    expect(Object.keys(PRICING_CONFIG).sort()).toEqual(
      [
        "tiers",
        "freeAppCap",
        "freeAiCallsPerDay",
        "trial",
        "annualDiscountPct",
        "costCaps",
        "seasonPass",
        "flags",
      ].sort(),
    );
  });

  it("exposes exactly the whitelisted tier keys (team killed, campus + seasonPass added)", () => {
    expect(Object.keys(PRICING_CONFIG.tiers).sort()).toEqual(
      ["free", "pro", "campus", "seasonPass"].sort(),
    );
  });

  it("locks Free + Pro tier prices (Stripe priceIds depend on these)", () => {
    expect(PRICING_CONFIG.tiers.free.price).toBe(0);
    expect(PRICING_CONFIG.tiers.free.yearlyPrice).toBe(0);
    expect(PRICING_CONFIG.tiers.free.name).toBe("Free");

    expect(PRICING_CONFIG.tiers.pro.price).toBe(29);
    expect(PRICING_CONFIG.tiers.pro.yearlyPrice).toBe(296);
    expect(PRICING_CONFIG.tiers.pro.name).toBe("Pro");
  });

  it("Campus tier is contact-sales (price 0, name Campus)", () => {
    expect(PRICING_CONFIG.tiers.campus.price).toBe(0);
    expect(PRICING_CONFIG.tiers.campus.yearlyPrice).toBe(0);
    expect(PRICING_CONFIG.tiers.campus.name).toBe("Campus");
  });

  it("Season Pass tier is one-time $149 (price === yearlyPrice)", () => {
    expect(PRICING_CONFIG.tiers.seasonPass.price).toBe(149);
    expect(PRICING_CONFIG.tiers.seasonPass.yearlyPrice).toBe(149);
    expect(PRICING_CONFIG.tiers.seasonPass.name).toBe("Season Pass");
    // Hard invariant: one-time means yearly === monthly. If someone tries to
    // introduce a "discount" on a one-time SKU, this test fires first.
    expect(PRICING_CONFIG.tiers.seasonPass.yearlyPrice).toBe(
      PRICING_CONFIG.tiers.seasonPass.price,
    );
  });

  it("Season Pass window covers Aug → Apr", () => {
    expect(PRICING_CONFIG.seasonPass.startMonth).toBe(8);
    expect(PRICING_CONFIG.seasonPass.endMonth).toBe(4);
    expect(PRICING_CONFIG.seasonPass.label).toBe("Aug → Apr");
  });

  it("annual discount math holds: pro yearly ≈ 29 × 12 × 0.85 ± $1", () => {
    const expected = Math.round(
      PRICING_CONFIG.tiers.pro.price *
        12 *
        (1 - PRICING_CONFIG.annualDiscountPct / 100),
    );
    expect(Math.abs(PRICING_CONFIG.tiers.pro.yearlyPrice - expected)).toBeLessThanOrEqual(1);
  });

  it("CROSS-CONFIG INVARIANT: freeAiCallsPerDay top-level === costCaps mirror (drift prevention)", () => {
    expect(PRICING_CONFIG.freeAiCallsPerDay).toBe(
      PRICING_CONFIG.costCaps.freeAiCallsPerDay,
    );
  });

  it("locks free-tier caps and trial mode", () => {
    expect(PRICING_CONFIG.freeAppCap).toBe(10);
    expect(PRICING_CONFIG.freeAiCallsPerDay).toBe(25);
    expect(PRICING_CONFIG.trial).toBe("none");
    expect(PRICING_CONFIG.annualDiscountPct).toBe(15);
  });

  it("locks cost caps", () => {
    expect(PRICING_CONFIG.costCaps.freeAiCallsPerDay).toBe(25);
    expect(PRICING_CONFIG.costCaps.paidAiCallsPerDay).toBe(1000);
    expect(PRICING_CONFIG.costCaps.firecrawlMonthlyCredits).toBe(500);
  });

  it("exposes pricingPublic flag", () => {
    expect(PRICING_CONFIG.flags.pricingPublic).toBe(true);
  });

  it("does NOT expose a `team` tier (killed in the season-pass council fork)", () => {
    expect("team" in PRICING_CONFIG.tiers).toBe(false);
  });

  it("rejects an unknown top-level key under .strict()", () => {
    const bad = { ...PRICING_CONFIG, mystery: true };
    expect(PricingConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown nested tier key under .strict()", () => {
    const bad = {
      ...PRICING_CONFIG,
      tiers: {
        ...PRICING_CONFIG.tiers,
        pro: { ...PRICING_CONFIG.tiers.pro, ghost: 1 },
      },
    };
    expect(PricingConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects re-introducing the legacy `team` tier (would fail .strict())", () => {
    const bad = {
      ...PRICING_CONFIG,
      tiers: {
        ...PRICING_CONFIG.tiers,
        team: { price: 79, yearlyPrice: 806, name: "Team" },
      },
    };
    expect(PricingConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown nested seasonPass key under .strict()", () => {
    const bad = {
      ...PRICING_CONFIG,
      seasonPass: { ...PRICING_CONFIG.seasonPass, mystery: true },
    };
    expect(PricingConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("trial enum rejects invalid value", () => {
    expect(
      PricingConfigSchema.safeParse({ ...PRICING_CONFIG, trial: "30-day" }).success,
    ).toBe(false);
  });

  it("annualDiscountPct must be 0–100", () => {
    expect(
      PricingConfigSchema.safeParse({ ...PRICING_CONFIG, annualDiscountPct: 150 }).success,
    ).toBe(false);
  });

  it("seasonPass.startMonth and endMonth must be in [1, 12]", () => {
    expect(
      PricingConfigSchema.safeParse({
        ...PRICING_CONFIG,
        seasonPass: { ...PRICING_CONFIG.seasonPass, startMonth: 13 },
      }).success,
    ).toBe(false);
    expect(
      PricingConfigSchema.safeParse({
        ...PRICING_CONFIG,
        seasonPass: { ...PRICING_CONFIG.seasonPass, endMonth: 0 },
      }).success,
    ).toBe(false);
  });
});
