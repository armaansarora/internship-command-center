import { env } from "@/lib/env";
import { LAUNCH_CONFIG } from "@/lib/launch-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

interface WaitlistInviteRow {
  id: string;
  invited_at: string | null;
  invited_user_id: string | null;
}

interface BetaGateOptions {
  userId?: string | null;
}

export function parseAllowedEmails(raw: string | null | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Closed/private beta admission check for post-OAuth callbacks.
 *
 * Production private beta is fail-closed:
 * - LAUNCH_CONFIG.beta.mode === "open" admits any Google email.
 * - ALLOWED_EMAILS is the emergency/admin key list.
 * - waitlist_signups rows are admitted only after invited_at is set.
 *
 * Local dev/test can stay usable without service-role env by failing open only
 * when no explicit ALLOWED_EMAILS gate has been configured.
 */
export async function isEmailAllowedForBeta(
  email: string | null | undefined,
  options: BetaGateOptions = {},
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  if (LAUNCH_CONFIG.beta.mode === "open") return true;

  const environment = env();
  const isProduction = environment.NODE_ENV === "production";
  const allowed = parseAllowedEmails(environment.ALLOWED_EMAILS);

  if (allowed.has(normalizedEmail)) return true;

  if (allowed.has("*")) {
    if (!isProduction) return true;
    log.warn("auth.beta_gate.production_wildcard_ignored", {
      mode: LAUNCH_CONFIG.beta.mode,
    });
  }

  if (!isProduction && !environment.SUPABASE_SERVICE_ROLE_KEY) {
    return allowed.size === 0;
  }

  return await hasInvitedWaitlistRow(normalizedEmail, options.userId ?? null);
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

async function hasInvitedWaitlistRow(
  normalizedEmail: string,
  userId: string | null,
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("id, invited_at, invited_user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      log.warn("auth.beta_gate.invite_lookup_failed", {
        code: error.code ?? "unknown",
      });
      return false;
    }

    const invite = data as WaitlistInviteRow | null;
    if (!invite?.invited_at) return false;
    if (!userId) return false;
    if (invite.invited_user_id && invite.invited_user_id !== userId) {
      log.warn("auth.beta_gate.invite_claimed_by_different_user", {
        inviteId: invite.id,
      });
      return false;
    }

    if (!invite.invited_user_id) {
      await claimWaitlistInvite(invite.id, userId);
    }

    return true;
  } catch (err) {
    log.warn("auth.beta_gate.invite_lookup_unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

async function claimWaitlistInvite(inviteId: string, userId: string): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("waitlist_signups")
      .update({ invited_user_id: userId })
      .eq("id", inviteId)
      .is("invited_user_id", null);

    if (error) {
      log.warn("auth.beta_gate.invite_claim_failed", {
        inviteId,
        code: error.code ?? "unknown",
      });
    }
  } catch (err) {
    log.warn("auth.beta_gate.invite_claim_unavailable", {
      inviteId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
