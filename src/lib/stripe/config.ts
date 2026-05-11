/**
 * Stripe-side billing state.
 *
 * `SubscriptionTier` is the durable billing state recorded on
 * `user_profiles.subscription_tier` and emitted by the Stripe webhook
 * (`tierFromPriceId`). It is intentionally a superset of the SKUs surfaced
 * on /pricing — when the marketing tier shape moves (e.g., killing "Team"
 * for the Season Pass fork), legacy DB rows still need to map to a tier
 * that grants the right entitlements.
 *
 * - "free"       — no paid plan
 * - "pro"        — recurring monthly/annual Pro
 * - "seasonPass" — one-time Internship Season Pass (Aug → Apr coverage)
 * - "team"       — legacy Team subscription. Kept for back-compat with any
 *                  existing DB rows; not surfaced on /pricing. Removed from
 *                  STRIPE_PLANS below (commented placeholder for rollback).
 */
export type SubscriptionTier = "free" | "pro" | "seasonPass" | "team";

interface StripePlan {
  productId: string;
  /** Monthly priceId. Back-compat field — existing checkout/portal/webhook use this. */
  priceId: string;
  /**
   * Annual priceId. Null until you create the annual price in Stripe Dashboard
   * and paste the resulting `price_*` ID here. While null, the /pricing
   * annual toggle still renders informational pricing but the checkout flow
   * only accepts the monthly priceId.
   *
   * To enable annual billing end-to-end:
   *   1. Stripe Dashboard → Products → Pro → Add another price
   *   2. Set the recurring interval to "Yearly" and the amount to
   *      PRICING_CONFIG.tiers.{tier}.yearlyPrice (in dollars)
   *   3. Copy the new price_* ID and replace the null below.
   *   4. Redeploy. Checkout, webhook tier-mapping, and the Settings
   *      PricingCards all pick it up automatically.
   *
   * For `seasonPass`, `yearlyPriceId` is null on purpose — Season Pass is a
   * one-time SKU (Stripe `mode: "payment"`) so there is no "annual" dimension.
   * The runtime price id is read from `env().STRIPE_SEASON_PASS_PRICE_ID` —
   * see `src/app/api/stripe/checkout/route.ts`.
   */
  yearlyPriceId: string | null;
  name: string;
  price: number;
  yearlyPrice: number;
  /**
   * Stripe checkout mode. "subscription" for recurring plans, "payment"
   * for one-time SKUs (Season Pass). Used by the checkout route to branch.
   */
  mode: "subscription" | "payment";
  limits: {
    applications: number;
    agents: boolean;
    dailyBriefing: boolean;
    rateLimit: number;
  };
}

/**
 * STRIPE_PLANS exposes the SKUs that are *currently checkout-able* on /pricing.
 *
 * The `team` SubscriptionTier remains in the union (durable DB state, legacy
 * rows still entitled) but no plan row is exported for it — its commented
 * placeholder below documents how to re-introduce it if the council reverses
 * the kill decision. Legacy entitlements are served via LEGACY_TEAM_LIMITS.
 */
export const STRIPE_PLANS: Record<Exclude<SubscriptionTier, "team">, StripePlan> = {
  free: {
    productId: "prod_UPPzC30x0U1oLk",
    priceId: "price_1TQb9t0uey7yEjQoJ3cK4GrL",
    yearlyPriceId: null,
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    mode: "subscription",
    limits: {
      applications: 10,
      agents: false,
      dailyBriefing: false,
      rateLimit: 30,
    },
  },
  pro: {
    productId: "prod_UPPz7rUvNcosXJ",
    priceId: "price_1TQb9t0uey7yEjQosCsbrK3t",
    yearlyPriceId: "price_1TQb9u0uey7yEjQoW7qgKVfT",
    name: "Pro",
    price: 29,
    yearlyPrice: 296,
    mode: "subscription",
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 100,
    },
  },
  /**
   * Internship Season Pass — one-time $149 payment covering Aug 1 → Apr 30.
   *
   * `priceId` is populated at runtime from `env().STRIPE_SEASON_PASS_PRICE_ID`
   * — keep the constant empty so a missing env var fails loudly at the
   * checkout boundary (defensive null-check) rather than silently routing
   * Stripe to an undefined price.
   *
   * Run `scripts/stripe-bootstrap.sh` to create the Stripe product + price
   * and paste the resulting `price_*` into Vercel env.
   */
  seasonPass: {
    productId: "prod_season_pass_runtime",
    priceId: "",
    yearlyPriceId: null,
    name: "Season Pass",
    price: 149,
    yearlyPrice: 149,
    mode: "payment",
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 100,
    },
  },
  // ── Team — KILLED in the Season Pass council fork ────────────────────────
  // The Team SKU is replaced by "Campus / Career Center" (contact-sales, no
  // Stripe price). Kept as a commented-out placeholder so re-introduction is
  // a single un-comment + price-id paste away if we ever flip back.
  //
  // team: {
  //   productId: "prod_UPPzsV09jjQ9AT",
  //   priceId: "price_1TQb9v0uey7yEjQo9N5ogS4b",
  //   yearlyPriceId: "price_1TQb9v0uey7yEjQo527fmL8W",
  //   name: "Team",
  //   price: 79,
  //   yearlyPrice: 806,
  //   mode: "subscription",
  //   limits: {
  //     applications: Infinity,
  //     agents: true,
  //     dailyBriefing: true,
  //     rateLimit: 200,
  //   },
  // },
};

/**
 * Legacy entitlements for back-compat. Used ONLY by the entitlements layer
 * when an existing `user_profiles.subscription_tier === "team"` row hasn't
 * been migrated yet. Mirrors the pre-fork Team limits so seat-bearing users
 * don't lose access during the rollout.
 */
export const LEGACY_TEAM_LIMITS: StripePlan["limits"] = {
  applications: Infinity,
  agents: true,
  dailyBriefing: true,
  rateLimit: 200,
};
