import {
  STRIPE_PLANS,
  LEGACY_TEAM_LIMITS,
  type SubscriptionTier,
} from "./config";
import { getSubscriptionTier } from "./server";
import { isOwner } from "@/lib/auth/owner";

export type EntitlementFeature = "agents" | "dailyBriefing";

type StripePlanLimits = (typeof STRIPE_PLANS)["pro"]["limits"];

/**
 * Resolve the entitlement limits row for a given tier.
 *
 * `team` is no longer surfaced on /pricing (replaced by the contact-sales
 * Campus tier in the Season Pass council fork), but the durable
 * `subscription_tier` column may still hold legacy "team" rows. Fall back
 * to LEGACY_TEAM_LIMITS so those seats keep their entitlements until they
 * migrate.
 */
function limitsForTier(tier: SubscriptionTier): StripePlanLimits {
  if (tier === "team") return LEGACY_TEAM_LIMITS;
  return STRIPE_PLANS[tier].limits;
}

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
  return limitsForTier(tier)[feature];
}

/**
 * Returns the maximum number of applications the user can create.
 * Returns Infinity for paid tiers and for the configured OWNER_USER_ID.
 */
export async function getApplicationLimit(userId: string): Promise<number> {
  if (isOwner(userId)) return Infinity;
  const tier = await getSubscriptionTier(userId);
  return limitsForTier(tier).applications;
}

/**
 * Returns true if the user's tier includes AI agent access. Always true for
 * the configured OWNER_USER_ID.
 */
export async function canUseAgents(userId: string): Promise<boolean> {
  if (isOwner(userId)) return true;
  const tier = await getSubscriptionTier(userId);
  return limitsForTier(tier).agents;
}

/**
 * Returns the rate limit (requests per minute) for the user's tier.
 * Owner is uncapped (Infinity).
 */
export async function getRateLimit(userId: string): Promise<number> {
  if (isOwner(userId)) return Infinity;
  const tier = await getSubscriptionTier(userId);
  return limitsForTier(tier).rateLimit;
}

/**
 * Returns the subscription tier for a given user. Owner is reported as
 * `pro` (the highest declared tier surfaced on /pricing) so any
 * tier-comparison code that doesn't know about the owner override still
 * grants maximum permissions.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  if (isOwner(userId)) return "pro";
  return getSubscriptionTier(userId);
}
