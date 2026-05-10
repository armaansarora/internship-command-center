import { describe, it, expect } from "vitest";
import { PRICING_CONFIG, PricingConfigSchema } from "./pricing-config";

/**
 * Pricing cadence guardrails:
 *   - Zod parses the config.
 *   - Top-level keys match a frozen whitelist.
 *   - Cross-config invariant: freeAiCallsPerDay (top-level) === costCaps mirror.
 *   - Annual discount math holds: yearly ≈ monthly × 12 × (1 - pct/100) ± $1.
 *   - Locked-value spot checks for tier prices (Stripe priceIds depend on these).
 *   - .strict() rejects unknown keys.
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
        "flags",
      ].sort(),
    );
  });

  it("locks tier prices (Stripe priceIds depend on these)", () => {
    expect(PRICING_CONFIG.tiers.free.price).toBe(0);
    expect(PRICING_CONFIG.tiers.free.yearlyPrice).toBe(0);
    expect(PRICING_CONFIG.tiers.free.name).toBe("Free");

    expect(PRICING_CONFIG.tiers.pro.price).toBe(29);
    expect(PRICING_CONFIG.tiers.pro.yearlyPrice).toBe(296);
    expect(PRICING_CONFIG.tiers.pro.name).toBe("Pro");

    expect(PRICING_CONFIG.tiers.team.price).toBe(79);
    expect(PRICING_CONFIG.tiers.team.yearlyPrice).toBe(806);
    expect(PRICING_CONFIG.tiers.team.name).toBe("Team");
  });

  it("annual discount math holds: pro yearly ≈ 29 × 12 × 0.85 ± $1", () => {
    const expected = Math.round(
      PRICING_CONFIG.tiers.pro.price *
        12 *
        (1 - PRICING_CONFIG.annualDiscountPct / 100),
    );
    expect(Math.abs(PRICING_CONFIG.tiers.pro.yearlyPrice - expected)).toBeLessThanOrEqual(1);
  });

  it("annual discount math holds: team yearly ≈ 79 × 12 × 0.85 ± $1", () => {
    const expected = Math.round(
      PRICING_CONFIG.tiers.team.price *
        12 *
        (1 - PRICING_CONFIG.annualDiscountPct / 100),
    );
    expect(Math.abs(PRICING_CONFIG.tiers.team.yearlyPrice - expected)).toBeLessThanOrEqual(1);
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
});
