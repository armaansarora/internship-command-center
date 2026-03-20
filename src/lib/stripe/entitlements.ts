import { STRIPE_PLANS, type SubscriptionTier } from "./config";
import { getSubscriptionTier } from "./server";

export type EntitlementFeature = "agents" | "dailyBriefing";

/**
 * Check if a user's subscription tier allows a specific feature.
 */
export async function checkEntitlement(
  userId: string,
  feature: EntitlementFeature,
): Promise<boolean> {
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits[feature];
}

/**
 * Returns the maximum number of applications the user can create.
 * Returns Infinity for paid tiers.
 */
export async function getApplicationLimit(userId: string): Promise<number> {
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.applications;
}

/**
 * Returns true if the user's tier includes AI agent access.
 */
export async function canUseAgents(userId: string): Promise<boolean> {
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.agents;
}

/**
 * Returns the rate limit (requests per minute) for the user's tier.
 */
export async function getRateLimit(userId: string): Promise<number> {
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.rateLimit;
}

/**
 * Returns the subscription tier for a given user.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  return getSubscriptionTier(userId);
}
