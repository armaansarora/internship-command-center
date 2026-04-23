import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getCompanyTier,
  normalizeCompany,
  tierWeight,
} from "./company-tiers";

describe("company-tiers", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  it("normalizeCompany lowercases, trims, and strips legal suffixes", () => {
    expect(normalizeCompany("  Stripe  ")).toBe("stripe");
    expect(normalizeCompany("Stripe, Inc.")).toBe("stripe");
    expect(normalizeCompany("RampCorp LLC")).toBe("rampcorp");
    expect(normalizeCompany("Anthropic   Labs")).toBe("anthropic labs");
  });

  it("getCompanyTier returns 1 for known top-tier names", () => {
    expect(getCompanyTier("Stripe")).toBe(1);
    expect(getCompanyTier("anthropic")).toBe(1);
    expect(getCompanyTier("Vercel")).toBe(1);
  });

  it("getCompanyTier returns 2 for strong-tier names", () => {
    expect(getCompanyTier("Supabase")).toBe(2);
    expect(getCompanyTier("Retool")).toBe(2);
  });

  it("getCompanyTier returns 5 for unknown companies", () => {
    expect(getCompanyTier("NoSuchCompanyEver123")).toBe(5);
  });

  it("tierWeight monotonically decreases from tier 1 down", () => {
    const weights = [1, 2, 3, 4, 5].map(tierWeight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    }
  });
});
