export type SubscriptionTier = "free" | "pro" | "team";

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
   *   1. Stripe Dashboard → Products → Pro (or Team) → Add another price
   *   2. Set the recurring interval to "Yearly" and the amount to
   *      LAUNCH_CONFIG.pricing.{tier}.yearlyPrice (in dollars)
   *   3. Copy the new price_* ID and replace the null below.
   *   4. Redeploy. Checkout, webhook tier-mapping, and the Settings
   *      PricingCards all pick it up automatically.
   */
  yearlyPriceId: string | null;
  name: string;
  price: number;
  yearlyPrice: number;
  limits: {
    applications: number;
    agents: boolean;
    dailyBriefing: boolean;
    rateLimit: number;
  };
}

export const STRIPE_PLANS: Record<SubscriptionTier, StripePlan> = {
  free: {
    productId: "prod_UPPzC30x0U1oLk",
    priceId: "price_1TQb9t0uey7yEjQoJ3cK4GrL",
    yearlyPriceId: null,
    name: "Free",
    price: 0,
    yearlyPrice: 0,
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
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 100,
    },
  },
  team: {
    productId: "prod_UPPzsV09jjQ9AT",
    priceId: "price_1TQb9v0uey7yEjQo9N5ogS4b",
    yearlyPriceId: "price_1TQb9v0uey7yEjQo527fmL8W",
    name: "Team",
    price: 79,
    yearlyPrice: 806,
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 200,
    },
  },
};
