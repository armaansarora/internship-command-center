import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_CONSENT_VERSION } from "./consent-version";

/**
 * R8 §7.3 — the load-bearing guard for cross-user networking features.
 *
 * A user is considered "consented" iff:
 *   - `networking_consent_at IS NOT NULL` AND
 *   - `networking_revoked_at IS NULL OR networking_revoked_at < networking_consent_at`
 *
 * i.e. the most recent action on file is consent, not revoke.
 *
 * R11.1 additionally gates on `networking_consent_version`: when the
 * stored version is below `CURRENT_CONSENT_VERSION`, the guard returns
 * 403 `consent-version-stale` so the UI can surface a re-consent
 * prompt.  Missing / null version is treated as an older version
 * (legacy row) and also yields `consent-version-stale`.
 *
 * Any cross-user endpoint MUST call `assertConsented(userId)` and return
 * the NextResponse it hands back when non-null.  R8 additionally
 * hard-codes a 403 "gated-red-team-pending" downstream of this guard so
 * that no cross-user DATA ships until the Red Team pass lands.
 */

export interface ConsentShape {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;
}

/** Pure evaluator — no I/O. Directly testable. */
export function isConsentedShape(row: ConsentShape): boolean {
  if (!row.networking_consent_at) return false;
  if (!row.networking_revoked_at) return true;
  return (
    new Date(row.networking_revoked_at).getTime() <
    new Date(row.networking_consent_at).getTime()
  );
}

export async function readConsent(userId: string): Promise<ConsentShape | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("user_profiles")
    .select(
      "networking_consent_at, networking_revoked_at, networking_consent_version",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as ConsentShape | null) ?? null;
}

/**
 * Returns null when consent is active AND on the current version;
 * returns a 403 NextResponse otherwise.  Callers `if (guard) return guard;`.
 *
 * Reasons:
 *   - `consent-required`       — missing row, never consented, or revoked
 *   - `consent-version-stale`  — consented, but on an older copy version
 */
export async function assertConsented(
  userId: string,
): Promise<NextResponse | null> {
  const row = await readConsent(userId);
  if (!row || !isConsentedShape(row)) {
    return NextResponse.json(
      { ok: false, reason: "consent-required" },
      { status: 403 },
    );
  }
  if ((row.networking_consent_version ?? 0) < CURRENT_CONSENT_VERSION) {
    return NextResponse.json(
      { ok: false, reason: "consent-version-stale" },
      { status: 403 },
    );
  }
  return null;
}
