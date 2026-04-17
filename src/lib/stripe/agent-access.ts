import { canUseAgents } from "@/lib/stripe/entitlements";

/**
 * Gate AI agent routes behind paid tiers.
 */
export async function requireAgentAccess(userId: string): Promise<Response | null> {
  const allowed = await canUseAgents(userId);
  if (allowed) {
    return null;
  }

  return Response.json(
    {
      error: "Agent access requires a paid plan. Upgrade in Settings to continue.",
      code: "AGENT_ACCESS_DENIED",
    },
    { status: 403 },
  );
}
