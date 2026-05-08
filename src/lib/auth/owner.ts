import { env } from "@/lib/env";

function parseOwnerIds(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[\s,;]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

/**
 * Returns true iff the given Supabase user UUID matches the configured
 * `OWNER_USER_ID` / `OWNER_USER_IDS` env var. Used to bypass every entitlement gate
 * (subscription tier, rate limit, application cap) for the project owner.
 *
 * Server-only — `OWNER_USER_ID` has no `NEXT_PUBLIC_` prefix so it never
 * reaches the client bundle. The mechanism is invisible to anyone who
 * doesn't already know the owner's UUID.
 */
export function isOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const { OWNER_USER_ID, OWNER_USER_IDS } = env();
  return (
    (Boolean(OWNER_USER_ID) && userId === OWNER_USER_ID) ||
    parseOwnerIds(OWNER_USER_IDS).has(userId)
  );
}
