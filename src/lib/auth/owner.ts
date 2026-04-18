import { env } from "@/lib/env";

/**
 * Returns true iff the given Supabase user UUID matches the configured
 * `OWNER_USER_ID` env var. Used to bypass every entitlement gate
 * (subscription tier, rate limit, application cap) for the project owner.
 *
 * Server-only — `OWNER_USER_ID` has no `NEXT_PUBLIC_` prefix so it never
 * reaches the client bundle. The mechanism is invisible to anyone who
 * doesn't already know the owner's UUID.
 */
export function isOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ownerId = env().OWNER_USER_ID;
  return Boolean(ownerId) && userId === ownerId;
}
