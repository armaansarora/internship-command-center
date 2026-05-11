"use client";

import { GATE_CONFIG } from "@/lib/config/gate-config";

type PlausiblePrimitive = string | number | boolean;
export type PlausibleProps = Record<string, PlausiblePrimitive | null | undefined>;

export type TowerPlausibleEvent =
  | "tower_auth_sign_in_started"
  | "tower_auth_sign_in_failed"
  | "tower_auth_sign_in_redirect"
  | "tower_onboarding_started"
  | "tower_onboarding_submitted"
  | "tower_onboarding_skipped"
  | "tower_onboarding_google_connect_started"
  | "tower_onboarding_google_connect_failed"
  | "tower_onboarding_bootstrap_requested"
  | "tower_onboarding_bootstrap_failed"
  | "tower_billing_portal_started"
  | "tower_billing_portal_failed"
  | "tower_billing_portal_redirect"
  | "tower_google_workspace_connect_started"
  | "tower_google_workspace_connect_failed"
  | "tower_google_workspace_connect_redirect"
  | "tower_google_workspace_sync_requested"
  | "tower_google_workspace_sync_failed"
  | "tower_google_workspace_disconnect_requested"
  | "tower_google_workspace_disconnect_failed"
  | "tower_sign_out_started"
  // Funnel — top-of-funnel CTA + waitlist conversion events (GTM PR).
  // Fired before sign-up to give the dashboard a real `landing_to_signin`
  // denominator that survives ad-blockers (Plausible) AND a server-side
  // mirror (engagement_events `marketing_view`).
  | "tower_waitlist_submit_started"
  | "tower_waitlist_submit_succeeded"
  | "tower_waitlist_submit_failed";

/**
 * Named conversion goals — kept short because Plausible truncates goal names
 * in the UI. These map 1:1 to the four GTM funnel beats the founder watches:
 *   waitlist_submit            — top-of-funnel waitlist conversion
 *   activate_complete          — first-run gauntlet closing beat
 *   season_pass_checkout_start — Season Pass checkout button clicked
 *   season_pass_purchased      — Stripe webhook landed `checkout.session.completed`
 *                                  (server-side write to engagement_events)
 *                                  AND/OR the post-purchase landing page loaded
 *                                  (client-side `trackGoal`).
 */
export type TowerPlausibleGoal =
  | "waitlist_submit"
  | "activate_complete"
  | "season_pass_checkout_start"
  | "season_pass_purchased";

const ALLOWED_PROP_KEYS = new Set([
  "action",
  "flow",
  "kind",
  "mode",
  "phase",
  "provider",
  "reason",
  "source",
  "status",
  "surface",
  "tier",
]);

const MAX_PROP_LENGTH = 80;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, PlausiblePrimitive> }) => void;
  }
}

function cleanPropValue(value: PlausiblePrimitive | null | undefined): PlausiblePrimitive | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > MAX_PROP_LENGTH
    ? trimmed.slice(0, MAX_PROP_LENGTH)
    : trimmed;
}

function sanitizeProps(props: PlausibleProps): Record<string, PlausiblePrimitive> {
  const out: Record<string, PlausiblePrimitive> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    const cleaned = cleanPropValue(value);
    if (cleaned != null) out[key] = cleaned;
  }
  return out;
}

export function trackPlausibleEvent(
  eventName: TowerPlausibleEvent,
  props: PlausibleProps = {},
): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;

  const sanitized = sanitizeProps(props);
  window.plausible(
    eventName,
    Object.keys(sanitized).length > 0 ? { props: sanitized } : undefined,
  );
}

// ---------------------------------------------------------------------------
// trackGoal — named conversion goal fire-and-forget helper
// ---------------------------------------------------------------------------

/**
 * Tight email regex — intentionally strict. Used to *refuse* sending props
 * whose value looks like an email address. False positives ("a@b.c") cost
 * us nothing (the goal fires without that prop); false negatives leak PII
 * into Plausible. We bias hard toward false positives.
 */
const PII_EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export type TrackGoalProps = Record<string, string | number>;

/**
 * Fire a named Plausible goal.
 *
 * Honors the same `plausibleEnabled` gate as the <script> tag itself, so
 * disabling the flag both removes the script AND silences `trackGoal`
 * calls (no console errors when Plausible isn't on the page).
 *
 * Strips PII from props at the boundary: any value matching an email
 * regex causes the entire call to be dropped with a single `console.warn`
 * (no network request, no goal fired). This is deliberately
 * fail-CLOSED — a leaked email is much worse than a missed goal.
 *
 * Browser-only — no-op on server-side renders.
 */
export function trackGoal(
  name: TowerPlausibleGoal,
  props: TrackGoalProps = {},
): void {
  if (typeof window === "undefined") return;
  // Explicit gate read — when the flag is off the script isn't even on the
  // page, but a stale call from a code path that ran before the flag was
  // toggled should still no-op silently.
  if (!GATE_CONFIG.flags.plausibleEnabled()) return;

  // PII guard: refuse to fire if any prop value looks like an email.
  // We bail entirely rather than stripping the offending prop — the calling
  // site is the bug, and the warn is the loudest non-throw signal.
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" && PII_EMAIL_RE.test(value)) {
      console.warn(
        `[plausible] trackGoal("${name}") refused — prop "${key}" looks like an email`,
      );
      return;
    }
  }

  if (typeof window.plausible !== "function") return;

  const cleaned: Record<string, PlausiblePrimitive> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "number") {
      if (Number.isFinite(value)) cleaned[key] = value;
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    cleaned[key] =
      trimmed.length > MAX_PROP_LENGTH
        ? trimmed.slice(0, MAX_PROP_LENGTH)
        : trimmed;
  }

  window.plausible(
    name,
    Object.keys(cleaned).length > 0 ? { props: cleaned } : undefined,
  );
}
