export const STRIPE_PLANS = {
  free: {
    productId: "prod_UBV0Ra2wpzYrcW",
    priceId: "price_1TD80i10OAbyunOKStviLCWm",
    name: "Free",
    price: 0,
    limits: {
      applications: 10,
      agents: false,
      dailyBriefing: false,
      rateLimit: 30,
    },
  },
  pro: {
    productId: "prod_UBV066SmTMPUfl",
    priceId: "price_1TD80m10OAbyunOKTDU8aa6e",
    name: "Pro",
    price: 29,
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 100,
    },
  },
  team: {
    productId: "prod_UBV0XnNh2HlQrz",
    priceId: "price_1TD80i10OAbyunOKUqtkiFeY",
    name: "Team",
    price: 79,
    limits: {
      applications: Infinity,
      agents: true,
      dailyBriefing: true,
      rateLimit: 200,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PLANS;
