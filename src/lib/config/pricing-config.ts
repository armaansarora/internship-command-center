import { z } from "zod/v4";

/**
 * REVENUE cadence — pricing experiments and quota tuning.
 *
 * THIS FILE OWNS: tier prices, yearly prices, free-tier hard caps, trial
 * mode, annual discount percentage, cost caps (AI quota, Firecrawl),
 * the Internship Season Pass window (Aug → Apr).
 *
 * Touch this file when:
 *   • you re-price a tier (must also update src/lib/stripe/config.ts
 *     priceIds — the cross-reference is intentional),
 *   • you change Free-tier limits,
 *   • you toggle the annual billing discount,
 *   • you tune AI quotas to defend against runaway model bills,
 *   • you shift the Internship Season Pass coverage window.
 *
 * NEVER put refund language, legal entity, or jurisdiction here.
 * Those belong in legal-config.ts — wrong cadence and wrong review path.
 *
 * Stripe priceIds in src/lib/stripe/config.ts must match these numbers.
 * If you change `tiers.pro.price` here, also create a new Stripe price
 * and update STRIPE_PLANS.pro.priceId. Likewise for `tiers.seasonPass.price`.
 *
 * The `seasonPassEnabled` feature flag lives in gate-config.ts (operational
 * cadence) — not here — because surfacing the SKU is a launch decision, not
 * a pricing one.
 */
export type BillingPeriod = "monthly" | "annual";
export type TrialMode = "none" | "14-card" | "7-no-card";

const TierSchema = z.object({
  price: z.number().int().min(0),
  yearlyPrice: z.number().int().min(0),
  name: z.string().min(1),
}).strict();

const SeasonPassWindowSchema = z.object({
  /** 1-indexed month the season starts (e.g., 8 = August). */
  startMonth: z.number().int().min(1).max(12),
  /** 1-indexed month the season ends (e.g., 4 = April, inclusive). */
  endMonth: z.number().int().min(1).max(12),
  /** Human-readable label rendered on /pricing and /season-pass. */
  label: z.string().min(1),
}).strict();

export const PricingConfigSchema = z.object({
  tiers: z.object({
    free: TierSchema,
    pro: TierSchema,
    /**
     * Campus / Career Center — contact-sales only. Price lives in the sales
     * conversation, not in Stripe. Surfaced on /pricing as a "Talk to us"
     * CTA. Replaces the killed `team` SKU.
     */
    campus: TierSchema,
    /**
     * Internship Season Pass — one-time payment, semantically a season-long
     * pass covering Aug 1 → Apr 30. `price` and `yearlyPrice` are equal
     * because there is no recurring billing dimension.
     */
    seasonPass: TierSchema,
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
  /**
   * Internship Season Pass coverage window. Declarative so /pricing and
   * /season-pass render the same window without anyone re-typing "Aug → Apr".
   */
  seasonPass: SeasonPassWindowSchema,
  flags: z.object({
    pricingPublic: z.boolean(),
  }).strict(),
}).strict();

export const PRICING_CONFIG = {
  /**
   * USD/month and USD/year for recurring tiers. Annual prices are 15% off
   * the 12-month sum, rounded to the nearest dollar. `seasonPass` is a
   * one-time payment so its yearlyPrice mirrors its price.
   *
   * Stripe priceIds in src/lib/stripe/config.ts must match these numbers.
   */
  tiers: {
    free:       { price: 0,   yearlyPrice: 0,   name: "Free"        },
    pro:        { price: 29,  yearlyPrice: 296, name: "Pro"         }, // 29 * 12 * 0.85 = 295.80
    campus:     { price: 0,   yearlyPrice: 0,   name: "Campus"      }, // contact-sales; pricing lives in sales conversations
    seasonPass: { price: 149, yearlyPrice: 149, name: "Season Pass" }, // one-time payment; yearlyPrice == price
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
  /**
   * Internship Season Pass window. Aug 1 → Apr 30 (inclusive) — covers a
   * full US fall-recruiting cycle. Adjust here if the season ever shifts;
   * /pricing and /season-pass read the label directly.
   */
  seasonPass: {
    startMonth: 8,
    endMonth: 4,
    label: "Aug → Apr",
  },
  flags: {
    /** Surface pricing page publicly. False until Stripe live mode is confirmed. */
    pricingPublic: true,
  },
} as const;

export type PricingConfig = typeof PRICING_CONFIG;
