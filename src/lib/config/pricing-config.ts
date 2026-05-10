import { z } from "zod/v4";

/**
 * REVENUE cadence — pricing experiments and quota tuning.
 *
 * THIS FILE OWNS: tier prices, yearly prices, free-tier hard caps, trial
 * mode, annual discount percentage, cost caps (AI quota, Firecrawl).
 *
 * Touch this file when:
 *   • you re-price a tier (must also update src/lib/stripe/config.ts
 *     priceIds — the cross-reference is intentional),
 *   • you change Free-tier limits,
 *   • you toggle the annual billing discount,
 *   • you tune AI quotas to defend against runaway model bills.
 *
 * NEVER put refund language, legal entity, or jurisdiction here.
 * Those belong in legal-config.ts — wrong cadence and wrong review path.
 *
 * Stripe priceIds in src/lib/stripe/config.ts must match these numbers.
 * If you change `tiers.pro.price` here, also create a new Stripe price
 * and update STRIPE_PLANS.pro.priceId.
 */
export type BillingPeriod = "monthly" | "annual";
export type TrialMode = "none" | "14-card" | "7-no-card";

const TierSchema = z.object({
  price: z.number().int().min(0),
  yearlyPrice: z.number().int().min(0),
  name: z.string().min(1),
}).strict();

export const PricingConfigSchema = z.object({
  tiers: z.object({
    free: TierSchema,
    pro: TierSchema,
    team: TierSchema,
  }).strict(),
  freeAppCap: z.number().int().positive(),
  freeAiCallsPerDay: z.number().int().positive(),
  trial: z.enum(["none", "14-card", "7-no-card"]),
  annualDiscountPct: z.number().int().min(0).max(100),
  costCaps: z.object({
    freeAiCallsPerDay: z.number().int().positive(),
    paidAiCallsPerDay: z.number().int().positive(),
    firecrawlMonthlyCredits: z.number().int().positive(),
  }).strict(),
  flags: z.object({
    pricingPublic: z.boolean(),
  }).strict(),
}).strict();

export const PRICING_CONFIG = {
  /**
   * USD/month and USD/year. Annual prices are 15% off the 12-month sum,
   * rounded to the nearest dollar. Stripe priceIds in
   * src/lib/stripe/config.ts must match these numbers.
   */
  tiers: {
    free: { price: 0,  yearlyPrice: 0,   name: "Free" },
    pro:  { price: 29, yearlyPrice: 296, name: "Pro"  }, // 29 * 12 * 0.85 = 295.80
    team: { price: 79, yearlyPrice: 806, name: "Team" }, // 79 * 12 * 0.85 = 805.80
  },
  /** Free tier hard-caps. Surfaced on /pricing. */
  freeAppCap: 10,
  freeAiCallsPerDay: 25,
  /** Trial: "none" means free tier IS the trial. */
  trial: "none" as TrialMode,
  /** Annual discount as a percentage. 0 disables the annual toggle. */
  annualDiscountPct: 15,
  /** Defense against runaway AI bills. */
  costCaps: {
    freeAiCallsPerDay: 25,
    paidAiCallsPerDay: 1000,
    firecrawlMonthlyCredits: 500,
  },
  flags: {
    /** Surface pricing page publicly. False until Stripe live mode is confirmed. */
    pricingPublic: true,
  },
} as const;

export type PricingConfig = typeof PRICING_CONFIG;
