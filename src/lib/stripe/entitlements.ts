import { STRIPE_PLANS, type SubscriptionTier } from "./config";
import { getSubscriptionTier } from "./server";
import { isOwner } from "@/lib/auth/owner";

export type EntitlementFeature = "agents" | "dailyBriefing";

/**
 * Check if a user's subscription tier allows a specific feature.
 *
 * The configured OWNER_USER_ID always returns true — see `isOwner`.
 */
export async function checkEntitlement(
  userId: string,
  feature: EntitlementFeature,
): Promise<boolean> {
  if (isOwner(userId)) return true;
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits[feature];
}

/**
 * Returns the maximum number of applications the user can create.
 * Returns Infinity for paid tiers and for the configured OWNER_USER_ID.
 */
export async function getApplicationLimit(userId: string): Promise<number> {
  if (isOwner(userId)) return Infinity;
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.applications;
}

/**
 * Returns true if the user's tier includes AI agent access. Always true for
 * the configured OWNER_USER_ID.
 */
export async function canUseAgents(userId: string): Promise<boolean> {
  if (isOwner(userId)) return true;
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.agents;
}

/**
 * Returns the rate limit (requests per minute) for the user's tier.
 * Owner is uncapped (Infinity).
 */
export async function getRateLimit(userId: string): Promise<number> {
  if (isOwner(userId)) return Infinity;
  const tier = await getSubscriptionTier(userId);
  return STRIPE_PLANS[tier].limits.rateLimit;
}

/**
 * Returns the subscription tier for a given user. Owner is reported as
 * `team` (the highest declared tier) so any tier-comparison code that
 * doesn't know about the owner override still grants maximum permissions.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  if (isOwner(userId)) return "team";
  return getSubscriptionTier(userId);
}
