"use client";

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
  | "tower_sign_out_started";

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
