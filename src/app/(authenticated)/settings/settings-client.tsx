"use client";

import { useCallback, useState, type CSSProperties, type JSX } from "react";
import { PricingCards } from "@/components/pricing/PricingCards";
import { STRIPE_PLANS, type SubscriptionTier } from "@/lib/stripe/config";
import { NetworkingConsent } from "@/components/settings/NetworkingConsent";
import {
  NetworkingAudit,
  type MatchEvent,
} from "@/components/settings/NetworkingAudit";
import { trackPlausibleEvent } from "@/lib/analytics/plausible";
import type { ProductionHealthSummary } from "@/lib/observability/production-health";

interface SettingsClientProps {
  userName: string | null;
  userEmail: string;
  avatarUrl?: string | null;
  provider: string;
  subscriptionTier: SubscriptionTier;
  appsUsed: number;
  /**
   * `user_profiles.deleted_at` as ISO string (or null). Drives
   * whether the Data section shows "Delete Account" or "Cancel Deletion".
   */
  deletedAt: string | null;
  /** R8 — Warm Intro Network opt-in state. */
  networkingConsentAt?: string | null;
  networkingRevokedAt?: string | null;
  /** Whether Gmail + Calendar OAuth has been connected. */
  hasGoogleIntegration?: boolean;
  /**
   * Rejection autopsy preference (Settings → Analytics →
   * 'Rejection reflection prompts'). Default ON. Seeded server-side from
   * `user_profiles.preferences.rejectionReflections.enabled`.
   */
  rejectionReflectionsEnabled?: boolean;
  /**
   * CEO voice read-aloud preference (Settings → Analytics →
   * 'CEO voice'). Default OFF. Seeded server-side from
   * `user_profiles.preferences.ceoVoice.enabled`. Consumed by the
   * CEOVoicePlayButton rendered inside the NegotiationDraftPanel —
   * Layer 1 of the three-layer voice gate.
   */
  ceoVoiceEnabled?: boolean;
  /**
   * last 20 `match_events` rows for this user (already transformed
   * into the camelCase shape consumed by `NetworkingAudit`). Empty array
   * when the user has never been surfaced a warm-intro candidate. The
   * parent page component performs the REST fetch so this client stays
   * presentational.
   */
  matchEvents?: MatchEvent[];
  /** Owner-only production launch health summary. Null for normal users. */
  productionHealth?: ProductionHealthSummary | null;
}

/**
 * Local UI state for the Export Data flow.
 * - "idle"     — resting; CTA visible.
 * - "queueing" — network call in flight; CTA disabled.
 * - "queued"   — POST returned 200; show "sealing archive" note.
 * - "rate"     — POST returned 429; show cooldown copy.
 * - "error"    — anything else; show generic failure note with retry.
 */
type ExportUiState = "idle" | "queueing" | "queued" | "rate" | "error";

/**
 * Local UI state for the Delete Account flow.
 * - "idle"       — resting; Delete Account CTA visible.
 * - "confirming" — modal open; user retyping email.
 * - "deleting"   — POST in flight.
 * - "scheduled"  — POST returned 200; show scheduled-deletion banner.
 * - "error"      — POST failed; inline error in modal.
 */
type DeleteUiState = "idle" | "confirming" | "deleting" | "scheduled" | "error";

/** Local UI state for the Cancel Deletion flow. */
type CancelUiState = "idle" | "cancelling" | "cancelled" | "error";

const GRACE_WINDOW_DAYS = 30;
const BILLING_PORTAL_ERROR =
  "The billing desk did not answer. Try again in a moment.";

function formatDeletionDate(deletedAtIso: string): string {
  const scheduled = new Date(
    new Date(deletedAtIso).getTime() + GRACE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  return scheduled.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatHealthTime(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * SettingsClient — account management and preferences.
 *
 * Sections:
 * 1. Profile overview (name, email, provider)
 * 2. Appearance (theme toggle — BUG-011)
 * 3. Account actions (sign out — BUG-005, data export placeholder)
 *
 * Theme is currently stored in localStorage only. When user_profiles
 * table gets a preferences column, migrate to server-persisted preference.
 */
export function SettingsClient({
  userName,
  userEmail,
  avatarUrl,
  provider,
  subscriptionTier,
  appsUsed,
  deletedAt,
  networkingConsentAt = null,
  networkingRevokedAt = null,
  hasGoogleIntegration = false,
  rejectionReflectionsEnabled = true,
  ceoVoiceEnabled = false,
  matchEvents = [],
  productionHealth = null,
}: SettingsClientProps): JSX.Element {
  const displayName = userName ?? userEmail.split("@")[0];
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [exportUi, setExportUi] = useState<ExportUiState>("idle");
  const [deleteUi, setDeleteUi] = useState<DeleteUiState>(
    deletedAt ? "scheduled" : "idle",
  );
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelUi, setCancelUi] = useState<CancelUiState>("idle");
  const [googleConnectState, setGoogleConnectState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [googleDisconnectState, setGoogleDisconnectState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [effectiveGoogleIntegration, setEffectiveGoogleIntegration] =
    useState<boolean>(hasGoogleIntegration);
  const [syncState, setSyncState] = useState<
    "idle" | "gmail" | "calendar" | "done" | "error"
  >("idle");
  const [syncDetail, setSyncDetail] = useState<string | null>(null);
  const [effectiveDeletedAt, setEffectiveDeletedAt] = useState<string | null>(
    deletedAt,
  );

  // Rejection autopsy toggle. Optimistic-update state + tiny error
  // surface; the backing fetch hits the generic /api/profile/preferences
  // merge endpoint.
  const [reflectionsEnabled, setReflectionsEnabled] = useState<boolean>(
    rejectionReflectionsEnabled,
  );
  const [reflectionsSaving, setReflectionsSaving] = useState(false);
  const [reflectionsError, setReflectionsError] = useState<string | null>(null);

  const handleToggleReflections = useCallback(
    async (next: boolean) => {
      const previous = reflectionsEnabled;
      setReflectionsEnabled(next);
      setReflectionsSaving(true);
      setReflectionsError(null);
      try {
        const response = await fetch("/api/profile/preferences", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key: "rejectionReflections",
            value: { enabled: next },
          }),
        });
        if (!response.ok) {
          setReflectionsEnabled(previous);
          setReflectionsError("Couldn't save. Try again.");
          return;
        }
      } catch {
        setReflectionsEnabled(previous);
        setReflectionsError("Network error. Try again.");
      } finally {
        setReflectionsSaving(false);
      }
    },
    [reflectionsEnabled],
  );

  // CEO voice toggle (default OFF). Shares the reflections
  // optimistic-update pattern: flip state immediately, POST, roll back on
  // failure. The button this gates lives inside the Negotiation Parlor.
  const [ceoVoiceOn, setCeoVoiceOn] = useState<boolean>(ceoVoiceEnabled);
  const [ceoVoiceSaving, setCeoVoiceSaving] = useState(false);
  const [ceoVoiceError, setCeoVoiceError] = useState<string | null>(null);

  const handleToggleCeoVoice = useCallback(
    async (next: boolean) => {
      const previous = ceoVoiceOn;
      setCeoVoiceOn(next);
      setCeoVoiceSaving(true);
      setCeoVoiceError(null);
      try {
        const response = await fetch("/api/profile/preferences", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key: "ceoVoice",
            value: { enabled: next },
          }),
        });
        if (!response.ok) {
          setCeoVoiceOn(previous);
          setCeoVoiceError("Couldn't save. Try again.");
          return;
        }
      } catch {
        setCeoVoiceOn(previous);
        setCeoVoiceError("Network error. Try again.");
      } finally {
        setCeoVoiceSaving(false);
      }
    },
    [ceoVoiceOn],
  );

  const handleExport = useCallback(async () => {
    setExportUi("queueing");
    try {
      const response = await fetch("/api/account/export", { method: "POST" });
      if (response.status === 429) {
        setExportUi("rate");
        return;
      }
      if (!response.ok) {
        setExportUi("error");
        return;
      }
      setExportUi("queued");
    } catch {
      setExportUi("error");
    }
  }, []);

  const openDeleteModal = useCallback(() => {
    setDeleteError(null);
    setDeleteConfirmEmail("");
    setDeleteUi("confirming");
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleteUi === "deleting") return; // block close mid-flight
    setDeleteUi(effectiveDeletedAt ? "scheduled" : "idle");
    setDeleteError(null);
    setDeleteConfirmEmail("");
  }, [deleteUi, effectiveDeletedAt]);

  const handleDelete = useCallback(async () => {
    if (deleteConfirmEmail !== userEmail) {
      setDeleteError("That doesn't match your email. Type it exactly.");
      return;
    }
    setDeleteUi("deleting");
    setDeleteError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteConfirmEmail }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setDeleteError(
          body.error === "email_mismatch"
            ? "Email didn't match. Try again."
            : "Something went wrong. Try again in a moment.",
        );
        setDeleteUi("error");
        return;
      }
      const body = (await response.json()) as { scheduledDeletionAt?: string };
      // The server returns the purge timestamp, but we only need `deletedAt`
      // (now) to drive the UI. Stamp it now so the banner shows today's
      // 30-day-from-now reading.
      setEffectiveDeletedAt(new Date().toISOString());
      setDeleteUi("scheduled");
      setDeleteError(null);
      setDeleteConfirmEmail("");
      // Hint: if the server's scheduledDeletionAt is present, trust it in
      // future iterations — for now formatDeletionDate derives from now().
      void body;
    } catch {
      setDeleteError("Network error. Try again.");
      setDeleteUi("error");
    }
  }, [deleteConfirmEmail, userEmail]);

  const handleCancelDeletion = useCallback(async () => {
    setCancelUi("cancelling");
    try {
      const response = await fetch("/api/account/delete/cancel", {
        method: "POST",
      });
      if (!response.ok) {
        setCancelUi("error");
        return;
      }
      setCancelUi("cancelled");
      setEffectiveDeletedAt(null);
      setDeleteUi("idle");
    } catch {
      setCancelUi("error");
    }
  }, []);

  const handleSignOut = useCallback(() => {
    trackPlausibleEvent("tower_sign_out_started", {
      surface: "settings",
      action: "sign_out",
    });
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }, []);

  const handleConnectGoogle = useCallback(async () => {
    setGoogleConnectState("loading");
    setGoogleDisconnectState("idle");
    trackPlausibleEvent("tower_google_workspace_connect_started", {
      surface: "settings",
      provider: "google",
    });
    try {
      const response = await fetch("/api/gmail/auth?next=/settings", {
        method: "GET",
      });
      if (!response.ok) {
        trackPlausibleEvent("tower_google_workspace_connect_failed", {
          surface: "settings",
          provider: "google",
          status: "error",
          reason: String(response.status),
        });
        setGoogleConnectState("error");
        return;
      }
      const body = (await response.json()) as { authUrl?: string };
      if (!body.authUrl) {
        trackPlausibleEvent("tower_google_workspace_connect_failed", {
          surface: "settings",
          provider: "google",
          status: "missing_url",
        });
        setGoogleConnectState("error");
        return;
      }
      trackPlausibleEvent("tower_google_workspace_connect_redirect", {
        surface: "settings",
        provider: "google",
      });
      window.location.href = body.authUrl;
    } catch {
      trackPlausibleEvent("tower_google_workspace_connect_failed", {
        surface: "settings",
        provider: "google",
        status: "network_error",
      });
      setGoogleConnectState("error");
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setGoogleDisconnectState("loading");
    trackPlausibleEvent("tower_google_workspace_disconnect_requested", {
      surface: "settings",
      provider: "google",
    });
    try {
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        trackPlausibleEvent("tower_google_workspace_disconnect_failed", {
          surface: "settings",
          provider: "google",
          status: "error",
          reason: String(response.status),
        });
        setGoogleDisconnectState("error");
        return;
      }
      setEffectiveGoogleIntegration(false);
      setSyncState("idle");
      setSyncDetail(null);
      setGoogleDisconnectState("idle");
      setGoogleConnectState("idle");
    } catch {
      trackPlausibleEvent("tower_google_workspace_disconnect_failed", {
        surface: "settings",
        provider: "google",
        status: "network_error",
      });
      setGoogleDisconnectState("error");
    }
  }, []);

  const handleSyncGoogle = useCallback(
    async (kind: "gmail" | "calendar") => {
      setSyncState(kind);
      setSyncDetail(null);
      trackPlausibleEvent("tower_google_workspace_sync_requested", {
        surface: "settings",
        provider: "google",
        kind,
      });
      try {
        const response = await fetch(
          kind === "gmail" ? "/api/gmail/sync" : "/api/calendar/sync",
          { method: "POST" },
        );
        const body = (await response.json().catch(() => ({}))) as {
          synced?: number;
          classified?: number;
          failed?: number;
          error?: string;
          code?: string;
        };
        if (!response.ok) {
          trackPlausibleEvent("tower_google_workspace_sync_failed", {
            surface: "settings",
            provider: "google",
            kind,
            status: "error",
            reason: String(response.status),
          });
          setSyncDetail(
            body.code === "GOOGLE_NOT_CONNECTED"
              ? "Google workspace is not connected. Reconnect Gmail and Calendar."
              : body.code === "GOOGLE_API_DISABLED"
                ? "Tower's Google API access is not fully enabled yet. The owner needs to enable Gmail and Calendar APIs in Google Cloud."
              : body.error ?? "The connection desk did not answer. Try again in a moment.",
          );
          setSyncState("error");
          return;
        }
        const synced = body.synced ?? 0;
        const suffix =
          kind === "gmail"
            ? `, ${body.classified ?? 0} job-search signal${(body.classified ?? 0) === 1 ? "" : "s"} classified${body.failed ? `, ${body.failed} failed` : ""}`
            : "";
        setSyncDetail(
          `${kind === "gmail" ? "Gmail" : "Calendar"} sync complete: ${synced} item${synced === 1 ? "" : "s"} updated${suffix}.`,
        );
        setSyncState("done");
      } catch {
        trackPlausibleEvent("tower_google_workspace_sync_failed", {
          surface: "settings",
          provider: "google",
          kind,
          status: "network_error",
        });
        setSyncDetail("Network error. Try again in a moment.");
        setSyncState("error");
      }
    },
    [],
  );

  const handleBillingPortal = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    trackPlausibleEvent("tower_billing_portal_started", {
      surface: "settings",
      tier: subscriptionTier,
    });
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      if (!response.ok) {
        trackPlausibleEvent("tower_billing_portal_failed", {
          surface: "settings",
          tier: subscriptionTier,
          status: "error",
          reason: String(response.status),
        });
        setBillingError(BILLING_PORTAL_ERROR);
        setBillingLoading(false);
        return;
      }
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        trackPlausibleEvent("tower_billing_portal_redirect", {
          surface: "settings",
          tier: subscriptionTier,
        });
        window.location.href = data.url;
      } else {
        trackPlausibleEvent("tower_billing_portal_failed", {
          surface: "settings",
          tier: subscriptionTier,
          status: "missing_url",
        });
        setBillingError(BILLING_PORTAL_ERROR);
        setBillingLoading(false);
      }
    } catch {
      trackPlausibleEvent("tower_billing_portal_failed", {
        surface: "settings",
        tier: subscriptionTier,
        status: "network_error",
      });
      setBillingError(BILLING_PORTAL_ERROR);
      setBillingLoading(false);
    }
  }, [subscriptionTier]);

  return (
    <div
      className="relative flex min-h-dvh flex-col items-start gap-8 p-8 md:p-12 max-w-3xl mx-auto"
      style={{
        "--text-primary": "#F8F1E4",
        "--text-secondary": "rgba(248, 241, 228, 0.82)",
        "--text-muted": "rgba(248, 241, 228, 0.68)",
        color: "#F8F1E4",
      } as CSSProperties}
    >
      {/* Page header */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "var(--gold)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Account
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Settings
        </h1>
      </div>

      <a
        href="/milestones"
        className="w-full rounded-lg px-5 py-4 transition-colors duration-150"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: "rgba(10, 12, 25, 0.78)",
          border: "1px solid rgba(201, 168, 76, 0.2)",
          textDecoration: "none",
        }}
      >
        <span>
          <span
            style={{
              display: "block",
              fontFamily: "'Playfair Display', serif",
              fontSize: "19px",
              color: "var(--text-primary)",
            }}
          >
            Milestones
          </span>
          <span
            style={{
              display: "block",
              marginTop: "4px",
              color: "var(--text-muted)",
              fontSize: "13px",
              lineHeight: 1.45,
            }}
          >
            View every unlock threshold and current account progress.
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            color: "#C9A84C",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "18px",
          }}
        >
          -&gt;
        </span>
      </a>

      {productionHealth && (
        <section className="w-full" aria-labelledby="section-production-health">
          <h2
            id="section-production-health"
            className="mb-4"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "var(--gold)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Production health
          </h2>
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(10, 12, 25, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border:
                productionHealth.status === "attention"
                  ? "1px solid rgba(220, 80, 80, 0.35)"
                  : "1px solid rgba(201, 168, 76, 0.1)",
              boxShadow:
                "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "18px",
                    fontWeight: 700,
                    color:
                      productionHealth.status === "attention"
                        ? "rgba(248, 113, 113, 0.95)"
                        : "var(--text-primary)",
                  }}
                >
                  {productionHealth.status === "attention"
                    ? "Needs attention"
                    : "All clear"}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    lineHeight: 1.45,
                  }}
                >
                  {productionHealth.cron.configuredJobs} scheduled jobs tracked.
                  {productionHealth.stripe.failedRecent.length > 0
                    ? ` ${productionHealth.stripe.failedRecent.length} Stripe webhook failure${productionHealth.stripe.failedRecent.length === 1 ? "" : "s"} need review.`
                    : " No failed Stripe webhooks in the recent window."}
                </div>
              </div>
            </div>

            {(productionHealth.cron.failingJobs.length > 0 ||
              productionHealth.cron.staleJobs.length > 0) && (
              <div className="mt-4 grid gap-2">
                {[
                  ...productionHealth.cron.failingJobs,
                  ...productionHealth.cron.staleJobs,
                ]
                  .slice(0, 6)
                  .map((job) => (
                    <div
                      key={`${job.jobName}-${job.startedAt ?? "missing"}`}
                      className="flex items-start justify-between gap-4 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(220, 80, 80, 0.08)",
                        border: "1px solid rgba(220, 80, 80, 0.14)",
                      }}
                    >
                      <div className="min-w-0">
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {job.jobName}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Satoshi', sans-serif",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {job.errorMessage ??
                            (job.stale
                              ? "No recent successful run recorded."
                              : "Cron failed.")}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatHealthTime(job.startedAt)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {productionHealth.stripe.failedRecent.length > 0 && (
              <div className="mt-4 grid gap-2">
                {productionHealth.stripe.failedRecent.slice(0, 4).map((event) => (
                  <div
                    key={event.eventId}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: "rgba(201, 168, 76, 0.07)",
                      border: "1px solid rgba(201, 168, 76, 0.14)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                        color: "var(--text-primary)",
                      }}
                    >
                      Stripe webhook failure · {event.type}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Satoshi', sans-serif",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        lineHeight: 1.45,
                        marginTop: "2px",
                      }}
                    >
                      {event.error ?? "No handler error recorded."} ·{" "}
                      {formatHealthTime(event.receivedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 1: Profile ── */}
      <section className="w-full" aria-labelledby="section-profile">
        <h2
          id="section-profile"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Profile
        </h2>
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{
                width: "52px",
                height: "52px",
                background: avatarUrl
                  ? "transparent"
                  : "rgba(201, 168, 76, 0.12)",
                border: "2px solid rgba(201, 168, 76, 0.2)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--gold)",
                  }}
                >
                  {initial}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.02em",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail}
              </div>
              <div
                className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                style={{
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.12)",
                }}
              >
                {/* Provider icon */}
                {provider === "google" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "capitalize",
                  }}
                >
                  {provider}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Subscription ── */}
      <section className="w-full" aria-labelledby="section-subscription">
        <h2
          id="section-subscription"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Subscription
        </h2>

        {/* Current plan summary */}
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {/* Legacy "team" tier rows still exist in DB even though the
                      Team SKU was killed in the Season Pass council fork.
                      Render the legacy name verbatim — entitlements still
                      flow via LEGACY_TEAM_LIMITS in entitlements.ts. */}
                  {subscriptionTier === "team"
                    ? "Team"
                    : STRIPE_PLANS[subscriptionTier].name} Plan
                </span>
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    background: "rgba(201, 168, 76, 0.12)",
                    border: "1px solid rgba(201, 168, 76, 0.25)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    color: "#C9A84C",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Active
                </span>
              </div>
              {/* App usage */}
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Applications used
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color:
                        subscriptionTier === "free" && appsUsed >= 10
                          ? "#ef4444"
                          : "var(--text-muted)",
                    }}
                  >
                    {appsUsed}
                    {subscriptionTier === "free" ? " / 10" : " / ∞"}
                  </span>
                </div>
                {subscriptionTier === "free" && (
                  <div
                    className="w-48 rounded-full overflow-hidden"
                    style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}
                    role="progressbar"
                    aria-valuenow={appsUsed}
                    aria-valuemin={0}
                    aria-valuemax={10}
                    aria-label="Applications used"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (appsUsed / 10) * 100)}%`,
                        background:
                          appsUsed >= 10
                            ? "#ef4444"
                            : appsUsed >= 8
                            ? "#f59e0b"
                            : "#C9A84C",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Manage billing button — only shown for paid tiers */}
            {subscriptionTier !== "free" && (
              <button
                type="button"
                disabled={billingLoading}
                onClick={() => void handleBillingPortal()}
                className="rounded-lg px-4 py-2 transition-all duration-150"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#C9A84C",
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.2)",
                  cursor: billingLoading ? "wait" : "pointer",
                  opacity: billingLoading ? 0.7 : 1,
                }}
                aria-label="Manage billing in Stripe portal"
              >
                {billingLoading ? "Loading..." : "Manage Billing"}
              </button>
            )}
          </div>
        </div>

        {billingError && (
          <div
            role="alert"
            className="mb-4 rounded-lg px-4 py-3"
            style={{
              background: "rgba(220, 60, 60, 0.06)",
              border: "1px solid rgba(220, 60, 60, 0.18)",
              fontFamily: "'Satoshi', sans-serif",
              fontSize: "12px",
              color: "rgba(220, 80, 80, 0.85)",
            }}
          >
            {billingError}
          </div>
        )}

        {/* Pricing cards */}
        <PricingCards
          currentTier={subscriptionTier}
          appsUsed={appsUsed}
          billingLoading={billingLoading}
          onManageBilling={handleBillingPortal}
        />
      </section>

      {/* ── Section 3: Security ── */}
      <section className="w-full" aria-labelledby="section-security">
        <h2
          id="section-security"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Security
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="pr-4">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Google account security
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Sign-in is handled by Google. Use your Google Account to manage MFA,
                passkeys, and recovery settings.
              </div>
            </div>
            <span
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#C9A84C",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "rgba(201, 168, 76, 0.08)",
                border: "1px solid rgba(201, 168, 76, 0.2)",
              }}
            >
              Protected
            </span>
          </div>
        </div>
      </section>

      {/* ── R8 — Warm Intro Network (consent surface) ── */}
      <section className="w-full" aria-labelledby="section-networking">
        <h2
          id="section-networking"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Networking
        </h2>
        <NetworkingConsent
          initialConsentAt={networkingConsentAt}
          initialRevokedAt={networkingRevokedAt}
          onOptIn={async () => {
            await fetch("/api/networking/opt-in", { method: "POST" });
          }}
          onRevoke={async () => {
            await fetch("/api/networking/revoke", { method: "POST" });
          }}
        />
        <NetworkingAudit events={matchEvents} />
      </section>

      {/* ── Section 3.5: Analytics (R9.6 — rejection reflections) ── */}
      <section className="w-full" aria-labelledby="section-analytics">
        <h2
          id="section-analytics"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Analytics
        </h2>
        <div
          className="rounded-xl p-5"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          <label
            className="flex min-h-11 cursor-pointer select-none items-start gap-3"
            style={{ alignItems: "flex-start" }}
          >
            <input
              type="checkbox"
              checked={reflectionsEnabled}
              disabled={reflectionsSaving}
              onChange={(e) => {
                void handleToggleReflections(e.target.checked);
              }}
              aria-describedby="rejection-reflections-help"
              style={{
                width: "16px",
                height: "16px",
                marginTop: "2px",
                accentColor: "var(--gold)",
                cursor: reflectionsSaving ? "wait" : "pointer",
              }}
            />
            <span className="min-w-0">
              <span
                style={{
                  display: "block",
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Rejection reflection prompts
              </span>
              <span
                id="rejection-reflections-help"
                style={{
                  display: "block",
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                  marginTop: "4px",
                }}
              >
                More reflections = better pattern insights from CFO. You can
                turn this off anytime.
              </span>
              {reflectionsError && (
                <span
                  role="alert"
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#DC3C3C",
                    marginTop: "6px",
                  }}
                >
                  {reflectionsError}
                </span>
              )}
            </span>
          </label>

          {/* R10.11 — CEO voice toggle. Three-layer gate Layer 1. Default
              OFF. The button this unlocks lives in the Negotiation Parlor
              under each revealed draft. */}
          <label
            className="flex min-h-11 cursor-pointer select-none items-start gap-3"
            style={{ alignItems: "flex-start", marginTop: "16px" }}
          >
            <input
              type="checkbox"
              checked={ceoVoiceOn}
              disabled={ceoVoiceSaving}
              onChange={(e) => {
                void handleToggleCeoVoice(e.target.checked);
              }}
              aria-describedby="ceo-voice-help"
              data-testid="ceo-voice-toggle"
              style={{
                width: "16px",
                height: "16px",
                marginTop: "2px",
                accentColor: "var(--gold)",
                cursor: ceoVoiceSaving ? "wait" : "pointer",
              }}
            />
            <span className="min-w-0">
              <span
                style={{
                  display: "block",
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                CEO voice — reads negotiation drafts aloud
              </span>
              <span
                id="ceo-voice-help"
                style={{
                  display: "block",
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                  marginTop: "4px",
                }}
              >
                Hear your CEO read drafts before you send them. You can
                turn this off anytime.
              </span>
              {ceoVoiceError && (
                <span
                  role="alert"
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#DC3C3C",
                    marginTop: "6px",
                  }}
                >
                  {ceoVoiceError}
                </span>
              )}
            </span>
          </label>
        </div>
      </section>

      {/* ── Section 4: Account Actions ── */}
      <section className="w-full" aria-labelledby="section-account">
        <h2
          id="section-account"
          className="mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "var(--gold)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Account
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(10, 12, 25, 0.65)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(201, 168, 76, 0.1)",
            boxShadow:
              "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
          }}
        >
          {/* Data export — queues a zip, emails a 7-day signed URL (R0.6) */}
          <div
            className="flex items-center justify-between px-5 py-4 gap-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div className="min-w-0">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Export Data
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                {exportUi === "queued"
                  ? "Sealing your archive. You'll receive an email when it's ready."
                  : exportUi === "rate"
                    ? "You've already requested recently; please wait a bit."
                    : exportUi === "error"
                      ? "Something went wrong. Try again in a moment."
                      : "Download all your Tower data as a zip (emailed as a 7-day link)."}
              </div>
            </div>
            <button
              type="button"
              disabled={exportUi === "queueing" || exportUi === "queued"}
              onClick={() => void handleExport()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:
                  exportUi === "queueing" || exportUi === "queued"
                    ? "var(--text-muted)"
                    : "#C9A84C",
                background:
                  exportUi === "queueing" || exportUi === "queued"
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(201, 168, 76, 0.08)",
                border:
                  exportUi === "queueing" || exportUi === "queued"
                    ? "1px solid rgba(255, 255, 255, 0.06)"
                    : "1px solid rgba(201, 168, 76, 0.2)",
                cursor:
                  exportUi === "queueing"
                    ? "wait"
                    : exportUi === "queued"
                      ? "default"
                      : "pointer",
                opacity: exportUi === "queueing" ? 0.7 : 1,
              }}
              aria-label={
                exportUi === "queued"
                  ? "Export queued"
                  : "Request data export"
              }
            >
              {exportUi === "queueing"
                ? "Queuing..."
                : exportUi === "queued"
                  ? "Queued"
                  : exportUi === "rate"
                    ? "Rate limited"
                    : exportUi === "error"
                      ? "Retry"
                      : "Export"}
            </button>
          </div>

          {/* R0.7 — Delete Account / Cancel Deletion row.
              effectiveDeletedAt !== null → show banner + Cancel button.
              effectiveDeletedAt === null → show Delete Account CTA that
              opens the email-retype modal. */}
          <div
            className="flex items-center justify-between px-5 py-4 gap-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div className="min-w-0">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {effectiveDeletedAt ? "Account scheduled for deletion" : "Delete Account"}
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                {effectiveDeletedAt
                  ? cancelUi === "error"
                    ? "Couldn't cancel. Try again."
                    : cancelUi === "cancelled"
                      ? "Deletion cancelled. Your account is safe."
                      : `Your account will be permanently deleted on ${formatDeletionDate(effectiveDeletedAt)}.`
                  : "Permanently delete your account after a 30-day grace window."}
              </div>
            </div>
            {effectiveDeletedAt ? (
              <button
                type="button"
                disabled={cancelUi === "cancelling"}
                onClick={() => void handleCancelDeletion()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#C9A84C",
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.2)",
                  cursor: cancelUi === "cancelling" ? "wait" : "pointer",
                  opacity: cancelUi === "cancelling" ? 0.7 : 1,
                }}
                aria-label="Cancel scheduled deletion"
              >
                {cancelUi === "cancelling" ? "Cancelling..." : "Cancel Deletion"}
              </button>
            ) : (
              <button
                type="button"
                onClick={openDeleteModal}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(220, 80, 80, 0.85)",
                  background: "rgba(220, 60, 60, 0.06)",
                  border: "1px solid rgba(220, 60, 60, 0.18)",
                  cursor: "pointer",
                }}
                aria-label="Delete account"
              >
                Delete Account
              </button>
            )}
          </div>

          {/* Notification preferences placeholder */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Notifications
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Critical Tower updates are delivered by email and in-app alerts.
              </div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Managed
            </span>
          </div>

          {/* Concierge intake is replayable so users can revise their search
              profile after skipping or rushing through the first visit. */}
          <div
            className="flex items-center justify-between px-5 py-4 gap-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div className="min-w-0 pr-4">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Career intake
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Update your target roles, locations, timeline, resume status, and constraints.
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <a
                href="/lobby/onboarding"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "#C9A84C",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.2)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                aria-label="Redo intake with Otis"
              >
                Redo intake
              </a>
              <a
                href="/lobby/onboarding"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "rgba(245, 238, 225, 0.68)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
                aria-label="Resume saved intake with Otis"
              >
                Resume intake
              </a>
            </div>
          </div>

          {/* Connected services */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
          >
            <div className="min-w-0 pr-4">
              <div
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                Gmail & Calendar
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                {effectiveGoogleIntegration
                  ? "Google workspace is connected. Sync pulls new mail and calendar changes into the Situation Room."
                  : "Connect Gmail and Calendar so COO can surface replies, interview invites, and schedule conflicts."}
              </div>
              {(googleConnectState === "error" ||
                googleDisconnectState === "error" ||
                syncState === "error") && (
                <div
                  role="alert"
                  className="mt-1"
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "12px",
                    color: "rgba(220, 80, 80, 0.85)",
                  }}
                >
                  {syncState === "error" && syncDetail
                    ? syncDetail
                    : "The connection desk did not answer. Try again in a moment."}
                </div>
              )}
              {syncState === "done" && (
                <div
                  role="status"
                  className="mt-1"
                  style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: "12px",
                    color: "#C9A84C",
                  }}
                >
                  {syncDetail ?? "Sync complete. The Situation Room is up to date."}
                </div>
              )}
            </div>
            {effectiveGoogleIntegration ? (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    syncState === "gmail" ||
                    syncState === "calendar" ||
                    googleDisconnectState === "loading"
                  }
                  onClick={() => void handleSyncGoogle("gmail")}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#C9A84C",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "rgba(201, 168, 76, 0.08)",
                    border: "1px solid rgba(201, 168, 76, 0.2)",
                    cursor: syncState === "gmail" ? "wait" : "pointer",
                    opacity: syncState === "gmail" ? 0.7 : 1,
                  }}
                  aria-label="Sync Gmail now"
                >
                  {syncState === "gmail" ? "Syncing..." : "Sync Gmail"}
                </button>
                <button
                  type="button"
                  disabled={
                    syncState === "gmail" ||
                    syncState === "calendar" ||
                    googleDisconnectState === "loading"
                  }
                  onClick={() => void handleSyncGoogle("calendar")}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#C9A84C",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "rgba(201, 168, 76, 0.08)",
                    border: "1px solid rgba(201, 168, 76, 0.2)",
                    cursor: syncState === "calendar" ? "wait" : "pointer",
                    opacity: syncState === "calendar" ? 0.7 : 1,
                  }}
                  aria-label="Sync Google Calendar now"
                >
                  {syncState === "calendar" ? "Syncing..." : "Sync Calendar"}
                </button>
                <button
                  type="button"
                  disabled={
                    googleDisconnectState === "loading" ||
                    syncState === "gmail" ||
                    syncState === "calendar"
                  }
                  onClick={() => void handleDisconnectGoogle()}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "rgba(220, 80, 80, 0.85)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "rgba(220, 60, 60, 0.06)",
                    border: "1px solid rgba(220, 60, 60, 0.18)",
                    cursor:
                      googleDisconnectState === "loading" ? "wait" : "pointer",
                    opacity: googleDisconnectState === "loading" ? 0.7 : 1,
                  }}
                  aria-label="Disconnect Gmail and Google Calendar"
                >
                  {googleDisconnectState === "loading"
                    ? "Disconnecting..."
                    : "Disconnect"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={googleConnectState === "loading"}
                onClick={() => void handleConnectGoogle()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3.5 py-1.5 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "#C9A84C",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: "rgba(201, 168, 76, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.2)",
                  cursor: googleConnectState === "loading" ? "wait" : "pointer",
                  opacity: googleConnectState === "loading" ? 0.7 : 1,
                }}
                aria-label="Connect Gmail and Google Calendar"
              >
                {googleConnectState === "loading" ? "Opening..." : "Connect"}
              </button>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-5 py-4 text-left transition-colors duration-150"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(220, 60, 60, 0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M6 14H3.33C2.6 14 2 13.4 2 12.67V3.33C2 2.6 2.6 2 3.33 2H6M10.67 11.33L14 8L10.67 4.67M14 8H6"
                stroke="rgba(220, 80, 80, 0.8)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(220, 80, 80, 0.85)",
              }}
            >
              Sign Out
            </span>
          </button>
        </div>
      </section>

      {/* Bottom spacer for mobile nav bar */}
      <div className="h-20 md:h-8" aria-hidden="true" />

      {/* R0.7 — Delete Account confirmation modal.
          Requires typing the account email exactly; server re-checks the
          match and rate-limits at tier C. */}
      {(deleteUi === "confirming" ||
        deleteUi === "deleting" ||
        deleteUi === "error") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{ background: "rgba(0, 0, 0, 0.75)" }}
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(10, 12, 25, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(220, 60, 60, 0.25)",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            }}
          >
            <h3
              id="delete-modal-title"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                marginBottom: "8px",
              }}
            >
              Delete your account?
            </h3>
            <p
              style={{
                fontFamily: "'Satoshi', sans-serif",
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                marginBottom: "20px",
              }}
            >
              Your account will be scheduled for deletion in 30 days. You
              can cancel any time before then by returning to this page. To
              confirm, retype your email address:{" "}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-primary)",
                }}
              >
                {userEmail}
              </span>
            </p>
            <label
              htmlFor="delete-confirm-email"
              className="sr-only"
            >
              Confirm your email address
            </label>
            <input
              id="delete-confirm-email"
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              disabled={deleteUi === "deleting"}
              autoFocus
              placeholder={userEmail}
              className="w-full rounded-lg px-3 py-2 mb-3"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                color: "var(--text-primary)",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                outline: "none",
              }}
            />
            {deleteError && (
              <div
                role="alert"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "12px",
                  color: "rgba(220, 80, 80, 0.85)",
                  marginBottom: "12px",
                }}
              >
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteUi === "deleting"}
                className="rounded-lg px-4 py-2 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: deleteUi === "deleting" ? "wait" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={
                  deleteUi === "deleting" || deleteConfirmEmail.length === 0
                }
                className="rounded-lg px-4 py-2 transition-all duration-150"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255, 220, 220, 0.95)",
                  background: "rgba(220, 60, 60, 0.22)",
                  border: "1px solid rgba(220, 60, 60, 0.4)",
                  cursor:
                    deleteUi === "deleting" || deleteConfirmEmail.length === 0
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    deleteUi === "deleting" || deleteConfirmEmail.length === 0
                      ? 0.6
                      : 1,
                }}
                aria-label="Confirm account deletion"
              >
                {deleteUi === "deleting" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
