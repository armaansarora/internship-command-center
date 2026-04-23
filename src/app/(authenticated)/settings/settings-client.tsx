"use client";

import { useCallback, useState, type JSX } from "react";
import { PricingCards } from "@/components/pricing/PricingCards";
import { STRIPE_PLANS, type SubscriptionTier } from "@/lib/stripe/config";
import { NetworkingConsent } from "@/components/settings/NetworkingConsent";

interface SettingsClientProps {
  userName: string | null;
  userEmail: string;
  avatarUrl?: string | null;
  provider: string;
  subscriptionTier: SubscriptionTier;
  appsUsed: number;
  /**
   * R0.7 — `user_profiles.deleted_at` as ISO string (or null). Drives
   * whether the Data section shows "Delete Account" or "Cancel Deletion".
   */
  deletedAt: string | null;
  /** R8 — Warm Intro Network opt-in state. */
  networkingConsentAt?: string | null;
  networkingRevokedAt?: string | null;
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
}: SettingsClientProps): JSX.Element {
  const displayName = userName ?? userEmail.split("@")[0];
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const [billingLoading, setBillingLoading] = useState(false);
  const [exportUi, setExportUi] = useState<ExportUiState>("idle");
  const [deleteUi, setDeleteUi] = useState<DeleteUiState>(
    deletedAt ? "scheduled" : "idle",
  );
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelUi, setCancelUi] = useState<CancelUiState>("idle");
  const [effectiveDeletedAt, setEffectiveDeletedAt] = useState<string | null>(
    deletedAt,
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
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }, []);

  const handleBillingPortal = useCallback(async () => {
    setBillingLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      if (!response.ok) {
        setBillingLoading(false);
        return;
      }
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingLoading(false);
      }
    } catch {
      setBillingLoading(false);
    }
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-start gap-8 p-8 md:p-12 max-w-2xl mx-auto">
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
                  {STRIPE_PLANS[subscriptionTier].name} Plan
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

        {/* Pricing cards */}
        <PricingCards
          currentTier={subscriptionTier}
          appsUsed={appsUsed}
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
                Two-factor authentication
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Arriving with the Security Office in a future wave.
              </div>
            </div>
            <button
              type="button"
              aria-disabled="true"
              tabIndex={-1}
              aria-label="Two-factor authentication — not yet available"
              className="rounded-lg px-3.5 py-1.5 shrink-0"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                cursor: "not-allowed",
                opacity: 0.55,
                pointerEvents: "none",
              }}
            >
              Unavailable
            </button>
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
              className="rounded-lg px-3.5 py-1.5 shrink-0 transition-all duration-150"
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
                className="rounded-lg px-3.5 py-1.5 shrink-0 transition-all duration-150"
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
                className="rounded-lg px-3.5 py-1.5 shrink-0 transition-all duration-150"
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
                Configure email and in-app notification preferences
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
              Coming Soon
            </span>
          </div>

          {/* Connected services placeholder */}
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
                Connected Services
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Gmail, Google Calendar, and other integrations
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
              Coming Soon
            </span>
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
