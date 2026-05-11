"use client";

import type { JSX } from "react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { TrustHeader } from "@/components/trust-console/TrustHeader";
import {
  ConsentTimeline,
  type ConsentTimelineProps,
} from "@/components/trust-console/ConsentTimeline";
import {
  AuditFeed,
  type AuditFeedEvent,
} from "@/components/trust-console/AuditFeed";
import type {
  AuditLogRow,
  RevokePreview,
  UserConsentState,
} from "@/lib/db/queries/trust-console-rest";

/**
 * Audit-history retention window surfaced in the concierge banner.
 *
 * Keep in sync with the durable retention SLA. Today there is no
 * dedicated audit-log retention column in the schema; this constant is
 * the single source of truth for the user-facing promise on
 * /settings/privacy. If a future migration adds a real audit-log sweep
 * column (e.g. `audit_logs_retention_days` or a config-config entry),
 * replace this constant with the imported value and remove the inline
 * comment.
 */
export const AUDIT_HISTORY_RETENTION_DAYS = 90;

/**
 * Poll cadence for the export-status endpoint after the user clicks
 * "Request data export". 4 seconds matches the cron tick budget
 * (5 minutes) at a granularity that feels responsive without flooding
 * the route. The component caps total polling at MAX_POLL_ATTEMPTS so
 * tabs left open overnight don't keep hitting the API.
 */
const EXPORT_POLL_INTERVAL_MS = 4_000;
const MAX_POLL_ATTEMPTS = 150; // ≈ 10 minutes — matches the "ten minutes"
// concierge copy in the Data Rights panel.

export interface ExportStatusResponse {
  status: "idle" | "queued" | "running" | "delivered" | "failed";
  requestedAtIso: string | null;
  deliveredAtIso: string | null;
  downloadUrl: string | null;
  downloadExpiresAtIso: string | null;
}

/**
 * Map a snake_case `audit_logs` REST row to the canonical camelCase
 * shape the Trust Console's `<AuditFeed />` consumes. The DB writer
 * (PR4-Backend) and the component (PR4-UI) intentionally disagree on
 * casing because each lives in its own domain — this single mapper is
 * where they meet.
 */
function rowToFeedEvent(row: AuditLogRow): AuditFeedEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    resourceType: row.resource_type ?? null,
    resourceId: row.resource_id ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: row.created_at,
  };
}
import {
  revokeNetworkingConsentAction,
  requestDataExportAction,
  requestDataDeleteAction,
} from "./actions";

/**
 * Trust Console client island.
 *
 * Composes the presentational components from `@/components/trust-console`
 * with three server-action wired affordances:
 *
 *   - Revoke networking consent (destructive — modal-gated)
 *   - Request a full data export
 *   - Request account deletion (destructive — email-retype gated)
 *
 * State is held locally with `useState` + `useTransition`; the server
 * actions `revalidatePath("/settings/privacy")` so the next navigation
 * re-renders against the source-of-truth consent state + audit feed.
 *
 * Layout: single column, `max-w-3xl`, comfortable line length on desktop
 * and full-bleed-with-padding at 375 px. The page intentionally has no
 * "floor" chrome (no FloorShell) — it's a utility surface, not a room.
 *
 * --- Component-contract notes for PR4-UI ---
 *
 * PR4-UI shipped `<TrustHeader />` and `<ConsentTimeline />` already. The
 * remaining UI primitives (`<RevokeButton>`, `<RevokeConfirmModal>`,
 * `<AuditFeed>`) are inlined here as minimal, accessible placeholders.
 * When PR4-UI ships polished versions, they should accept the same prop
 * shapes used below so the swap is a single import-line edit:
 *
 *   <RevokeButton
 *     disabled={boolean}            // true when state !== "opted_in"
 *     pending={boolean}             // mirrors useTransition isPending
 *     onClick={() => void}          // opens the confirm modal
 *   />
 *
 *   <RevokeConfirmModal
 *     open={boolean}
 *     pending={boolean}
 *     onCancel={() => void}
 *     onConfirm={() => Promise<void>}
 *   />
 *     // Modal MUST render the specific copy:
 *     // "This deletes all warm-intro graph data derived from your
 *     //  contacts. The action is logged in your audit timeline."
 *     // and a labelled "Revoke consent" confirm button + "Cancel".
 *
 *   <AuditFeed
 *     entries={AuditLogRow[]}
 *     emptyMessage={string}
 *   />
 *     // Reverse-chronological list. Each entry renders eventType,
 *     // created_at (relative + ISO tooltip), and a short human summary
 *     // derived from the metadata blob.
 */

interface Props {
  userEmail: string;
  consentState: UserConsentState;
  auditTimeline: AuditLogRow[];
  gmail: ConsentTimelineProps["gmail"];
  calendar: ConsentTimelineProps["calendar"];
  /** When true, the page is rendered behind the trust-console flag for
   * the project owner only. Surfaces a small "preview" badge so the
   * owner remembers the rest of the world cannot see this page yet. */
  flagPreview: boolean;
  /** When true, the TOWER_TRUST_CONSOLE env flag is on. Drives the
   * retention banner — we only render the "audit history kept ≤ 90 days"
   * promise once the page is publicly active so the flag-off page stays
   * a quiet preview surface. */
  flagOn: boolean;
  /** Count + tables-touched preview computed at request time so the
   * revoke confirm modal can show uncompromising real numbers ("This
   * will erase N items across M tables in ~60 seconds. Cannot be
   * undone."). The server action recomputes the actual counts on
   * commit. */
  revokePreview: RevokePreview;
}

type Banner =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function PrivacyClient({
  userEmail,
  consentState,
  auditTimeline,
  gmail,
  calendar,
  flagPreview,
  flagOn,
  revokePreview,
}: Props): JSX.Element {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeConfirmInput, setRevokeConfirmInput] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevokePending, startRevoke] = useTransition();
  const [isExportPending, startExport] = useTransition();
  const [isDeletePending, startDelete] = useTransition();
  const [exportStatus, setExportStatus] = useState<ExportStatusResponse>({
    status: "idle",
    requestedAtIso: null,
    deliveredAtIso: null,
    downloadUrl: null,
    downloadExpiresAtIso: null,
  });
  const auditAnchorRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef<number>(0);

  const revokeDisabled = consentState.networking.state !== "opted_in";

  // When the audit timeline length changes after a server action, scroll
  // the AuditFeed back into view so the user sees the new proof row
  // land at the top. Cheap, stable across renders, and the noop-on-mount
  // case is handled by the ref's null check.
  const prevTimelineLength = useRef<number>(auditTimeline.length);
  useEffect(() => {
    if (auditTimeline.length > prevTimelineLength.current) {
      prevTimelineLength.current = auditTimeline.length;
      const anchor = auditAnchorRef.current;
      if (anchor && typeof anchor.scrollIntoView === "function") {
        try {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
          // Some test environments (jsdom) treat scrollIntoView as a noop.
        }
      }
    } else {
      prevTimelineLength.current = auditTimeline.length;
    }
  }, [auditTimeline.length]);

  const closeRevokeModal = (): void => {
    setShowRevokeModal(false);
    setRevokeConfirmInput("");
    setRevokeError(null);
  };

  const handleRevoke = (): void => {
    setRevokeError(null);
    startRevoke(async () => {
      const result = await revokeNetworkingConsentAction();
      if (result.ok) {
        closeRevokeModal();
        setBanner({
          tone: "success",
          message: `Consent revoked. ${result.itemsErased} item${
            result.itemsErased === 1 ? "" : "s"
          } erased from the matching index.`,
        });
      } else {
        // Keep the modal open with a retryable in-modal error state so
        // the user can hit "Try again" without retyping REVOKE.
        setRevokeError(result.error);
      }
    });
  };

  const stopPolling = (): void => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollAttemptRef.current = 0;
  };

  // On mount: fetch the current status once so a user returning to the
  // page after the cron worker delivered sees the "Download archive"
  // button immediately. On unmount: cancel any in-flight poll so a
  // left-open tab does not keep calling the status endpoint forever.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/export/status", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as ExportStatusResponse;
        if (cancelled) return;
        setExportStatus(body);
      } catch {
        // Best-effort — no user-facing failure path.
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, []);

  const pollExportStatus = async (): Promise<void> => {
    pollAttemptRef.current += 1;
    try {
      const res = await fetch("/api/account/export/status", {
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as ExportStatusResponse;
        setExportStatus(body);
        if (body.status === "delivered" || body.status === "failed") {
          stopPolling();
          return;
        }
      }
    } catch {
      // Transient — try again on the next tick.
    }

    if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      return;
    }
    pollTimerRef.current = setTimeout(() => {
      void pollExportStatus();
    }, EXPORT_POLL_INTERVAL_MS);
  };

  const handleExport = (): void => {
    startExport(async () => {
      const result = await requestDataExportAction();
      if (result.ok) {
        setBanner({
          tone: "success",
          message:
            "Export queued. You will receive an email with a download link within 10 minutes.",
        });
        setExportStatus({
          status: "queued",
          requestedAtIso: new Date().toISOString(),
          deliveredAtIso: null,
          downloadUrl: null,
          downloadExpiresAtIso: null,
        });
        stopPolling();
        pollAttemptRef.current = 0;
        // Defer the first poll one tick so the in-flight server action
        // can commit before the status endpoint reads.
        pollTimerRef.current = setTimeout(() => {
          void pollExportStatus();
        }, EXPORT_POLL_INTERVAL_MS);
      } else {
        setBanner({
          tone: "error",
          message: `Export failed: ${result.error}.`,
        });
      }
    });
  };

  const handleDelete = (): void => {
    startDelete(async () => {
      const result = await requestDataDeleteAction({ confirmEmail });
      if (result.ok) {
        setShowDeleteModal(false);
        setConfirmEmail("");
        setBanner({
          tone: "success",
          message: `Account scheduled for deletion. You have until ${formatDate(
            result.scheduledDeletionAt,
          )} to cancel from Settings.`,
        });
      } else {
        setBanner({
          tone: "error",
          message:
            result.error === "email_mismatch"
              ? "Email did not match. Retype exactly to confirm."
              : `Delete request failed: ${result.error}.`,
        });
      }
    });
  };

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14"
      data-testid="trust-console"
      style={{
        fontFamily: "'Satoshi', system-ui, sans-serif",
        color: "#F4ECD8",
      }}
    >
      {flagPreview && <FlagPreviewBadge />}
      {flagOn && (
        <RetentionBanner days={AUDIT_HISTORY_RETENTION_DAYS} />
      )}

      <TrustHeader />

      <div className="mt-6 md:mt-8 space-y-6 md:space-y-8">
        <ConsentTimeline
          networking={consentState.networking}
          gmail={gmail}
          calendar={calendar}
        />

        <RevokePanel
          state={consentState.networking.state}
          disabled={revokeDisabled}
          pending={isRevokePending}
          onClick={() => setShowRevokeModal(true)}
        />

        <DataRightsPanel
          exportPending={isExportPending}
          deletePending={isDeletePending}
          exportStatus={exportStatus}
          onExport={handleExport}
          onDeleteRequest={() => setShowDeleteModal(true)}
        />

        <div ref={auditAnchorRef} data-testid="audit-feed-anchor">
          <AuditFeed events={auditTimeline.map(rowToFeedEvent)} />
        </div>
      </div>

      {/* aria-live region — single source for both revoke + export + delete
          status, so screen readers hear one message per action and the
          modal close doesn't steal focus. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="trust-console-live-region"
      >
        {banner ? banner.message : ""}
      </div>
      {banner && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm md:text-base shadow-lg"
          data-testid={`banner-${banner.tone}`}
          style={{
            background:
              banner.tone === "success"
                ? "rgba(201, 168, 76, 0.15)"
                : "rgba(196, 71, 71, 0.18)",
            color: banner.tone === "success" ? "#C9A84C" : "#F4D2D2",
            border:
              banner.tone === "success"
                ? "1px solid rgba(201, 168, 76, 0.45)"
                : "1px solid rgba(196, 71, 71, 0.55)",
            maxWidth: "calc(100% - 2rem)",
          }}
        >
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss message"
            className="ml-3 underline underline-offset-2"
            style={{ color: "inherit" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <RevokeConfirmModal
        open={showRevokeModal}
        pending={isRevokePending}
        preview={revokePreview}
        confirmInput={revokeConfirmInput}
        onConfirmInputChange={setRevokeConfirmInput}
        error={revokeError}
        onCancel={closeRevokeModal}
        onConfirm={handleRevoke}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        pending={isDeletePending}
        expectedEmail={userEmail}
        value={confirmEmail}
        onChange={setConfirmEmail}
        onCancel={() => {
          setShowDeleteModal(false);
          setConfirmEmail("");
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Placeholder UI components (PR4-UI ships polished versions later).
// Prop shapes are documented at the top of this file — keep them stable.
// ---------------------------------------------------------------------------

function FlagPreviewBadge(): JSX.Element {
  return (
    <p
      className="mb-4 inline-block rounded-full px-3 py-1 text-xs"
      data-testid="trust-console-flag-preview"
      style={{
        background: "rgba(201, 168, 76, 0.08)",
        border: "1px solid rgba(201, 168, 76, 0.4)",
        color: "#C9A84C",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.08em",
      }}
    >
      OWNER PREVIEW · TRUST_CONSOLE flag is off
    </p>
  );
}

interface RevokePanelProps {
  state: UserConsentState["networking"]["state"];
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}

function RevokePanel({
  state,
  disabled,
  pending,
  onClick,
}: RevokePanelProps): JSX.Element {
  const headline =
    state === "opted_in"
      ? "Take back warm-intro networking"
      : state === "revoked"
        ? "Warm-intro networking is currently revoked"
        : "You have not opted in to warm-intro networking";
  const body =
    state === "opted_in"
      ? "Revoking deletes every row derived from your contacts across the matching system within sixty seconds. Past intros already accepted remain."
      : state === "revoked"
        ? "Your name and applications are not in the match index. You can re-opt in from Settings → Networking."
        : "Nothing to revoke. Cross-user matching is off by default and only runs when you opt in.";

  return (
    <section
      aria-labelledby="revoke-panel-title"
      data-testid="revoke-panel"
      className="rounded-xl p-5 md:p-6"
      style={{
        background: "rgba(20, 22, 38, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <h2
        id="revoke-panel-title"
        className="text-lg md:text-xl font-semibold"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#F4ECD8",
        }}
      >
        {headline}
      </h2>
      <p
        className="mt-2 max-w-prose text-sm md:text-base leading-relaxed"
        style={{ color: "rgba(244, 236, 216, 0.72)" }}
      >
        {body}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        aria-label="Revoke warm-intro networking consent"
        data-testid="revoke-button"
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background:
            disabled || pending
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(224, 161, 88, 0.12)",
          color:
            disabled || pending ? "rgba(244, 236, 216, 0.45)" : "#E0A158",
          border:
            disabled || pending
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(224, 161, 88, 0.45)",
          cursor: disabled || pending ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "Revoking…" : "Revoke consent"}
      </button>
    </section>
  );
}

interface DataRightsPanelProps {
  exportPending: boolean;
  deletePending: boolean;
  exportStatus: ExportStatusResponse;
  onExport: () => void;
  onDeleteRequest: () => void;
}

function DataRightsPanel({
  exportPending,
  deletePending,
  exportStatus,
  onExport,
  onDeleteRequest,
}: DataRightsPanelProps): JSX.Element {
  const inFlight =
    exportStatus.status === "queued" || exportStatus.status === "running";
  const ready =
    exportStatus.status === "delivered" && exportStatus.downloadUrl !== null;
  const failed = exportStatus.status === "failed";

  const exportLabel = exportPending
    ? "Queuing…"
    : inFlight
      ? exportStatus.status === "queued"
        ? "Queued — preparing your archive"
        : "Building your archive…"
      : ready
        ? "Re-queue export"
        : "Request export";
  return (
    <section
      aria-labelledby="rights-panel-title"
      data-testid="rights-panel"
      className="rounded-xl p-5 md:p-6"
      style={{
        background: "rgba(20, 22, 38, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <h2
        id="rights-panel-title"
        className="text-lg md:text-xl font-semibold"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "#F4ECD8",
        }}
      >
        Your data, your call
      </h2>
      <ul className="mt-3 space-y-3 md:space-y-4">
        <li
          className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
          data-testid="export-row"
          data-export-status={exportStatus.status}
        >
          <div className="md:flex-1">
            <p
              className="text-sm md:text-base font-medium"
              style={{ color: "#F4ECD8" }}
            >
              Export everything
            </p>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: "rgba(244, 236, 216, 0.66)" }}
            >
              A zipped archive of your account, delivered by email within
              ten minutes for most accounts.
            </p>
            {inFlight && (
              <p
                data-testid="export-status-inflight"
                className="mt-2 text-xs"
                style={{
                  color: "rgba(244, 236, 216, 0.62)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.04em",
                }}
              >
                Status: {exportStatus.status} · checking again every 4 s
              </p>
            )}
            {failed && (
              <p
                data-testid="export-status-failed"
                role="alert"
                className="mt-2 text-xs"
                style={{ color: "#F4D2D2" }}
              >
                Export failed. Hit &ldquo;Request export&rdquo; to try
                again — your previous request is not retried automatically.
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 md:ml-4 md:items-end">
            <button
              type="button"
              onClick={onExport}
              disabled={exportPending || inFlight}
              aria-label="Request a full data export"
              data-testid="export-button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
              style={{
                background:
                  exportPending || inFlight
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(201, 168, 76, 0.12)",
                color:
                  exportPending || inFlight
                    ? "rgba(244, 236, 216, 0.45)"
                    : "#C9A84C",
                border: "1px solid rgba(201, 168, 76, 0.4)",
                cursor:
                  exportPending || inFlight ? "wait" : "pointer",
              }}
            >
              {exportLabel}
            </button>
            {ready && exportStatus.downloadUrl && (
              <a
                href={exportStatus.downloadUrl}
                download
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Download your data export archive"
                data-testid="export-download-link"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
                style={{
                  background: "rgba(201, 168, 76, 0.22)",
                  color: "#1A1A2E",
                  border: "1px solid #C9A84C",
                  textDecoration: "none",
                }}
              >
                Download archive
              </a>
            )}
          </div>
        </li>
        <li className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="md:flex-1">
            <p
              className="text-sm md:text-base font-medium"
              style={{ color: "#F4ECD8" }}
            >
              Delete your account
            </p>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: "rgba(244, 236, 216, 0.66)" }}
            >
              We soft-delete immediately and hard-purge after thirty days.
              You can cancel any time during the grace window from
              Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onDeleteRequest}
            disabled={deletePending}
            aria-label="Request account deletion"
            data-testid="delete-button"
            className="md:ml-4 inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: deletePending
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(196, 71, 71, 0.12)",
              color: deletePending
                ? "rgba(244, 236, 216, 0.45)"
                : "#E08383",
              border: "1px solid rgba(196, 71, 71, 0.45)",
              cursor: deletePending ? "wait" : "pointer",
            }}
          >
            {deletePending ? "Requesting…" : "Request deletion"}
          </button>
        </li>
      </ul>
    </section>
  );
}

/**
 * The exact string the user must type to confirm. Defined once so the
 * test suite and the component cannot drift. Case-sensitive on purpose —
 * uppercase REVOKE is the canonical pattern (mirrors GitHub's
 * delete-repo flow) and the case-insensitive variant would water down
 * the "are you sure?" gate.
 */
export const REVOKE_CONFIRM_WORD = "REVOKE";

/**
 * Map the sanitized error codes emitted by the RiskCompliance contract
 * (see `sanitizeErrorCode` in `@/lib/audit/consent-events`) to short
 * concierge-voice strings the modal can render without leaking schema
 * details. Default: a generic retry copy. Pass-through for the
 * `unauthenticated` and `email_mismatch` codes that escape the
 * sanitizer.
 */
function revokeErrorMessage(code: string): string {
  switch (code) {
    case "unauthenticated":
      return "Your session expired. Sign in again to revoke.";
    case "permission_denied":
      return "We could not authorize the revoke. Try signing out and back in.";
    case "timeout":
      return "The revoke took too long to complete. Try again.";
    case "network_error":
      return "We could not reach the database. Check your connection and try again.";
    case "constraint_violation":
      return "A database constraint blocked the revoke. Contact support.";
    case "not_found":
      return "Your account was not found. Contact support if this persists.";
    case "revoke_cascade_failed":
    case "cascade_failed":
      return "The revoke could not finish. Operator has been notified — try again.";
    default:
      return "Revoke failed. Try again or contact support.";
  }
}

interface RevokeConfirmModalProps {
  open: boolean;
  pending: boolean;
  preview: RevokePreview;
  confirmInput: string;
  onConfirmInputChange: (next: string) => void;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function RevokeConfirmModal({
  open,
  pending,
  preview,
  confirmInput,
  onConfirmInputChange,
  error,
  onCancel,
  onConfirm,
}: RevokeConfirmModalProps): JSX.Element | null {
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();
  if (!open) return null;

  const tableCount = preview.tablesTouched.length;
  const itemCount = preview.itemsToErase;
  const inputMatches = confirmInput === REVOKE_CONFIRM_WORD;
  const confirmDisabled = pending || !inputMatches;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-testid="revoke-modal"
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ background: "rgba(8, 9, 18, 0.7)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A2E",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#F4ECD8",
        }}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#F4ECD8",
          }}
        >
          Revoke warm-intro consent?
        </h2>
        <p
          id={bodyId}
          className="mt-2 text-sm leading-relaxed"
          data-testid="revoke-modal-impact"
          style={{ color: "rgba(244, 236, 216, 0.84)" }}
        >
          This will erase{" "}
          <strong style={{ color: "#F4ECD8" }}>
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </strong>{" "}
          across{" "}
          <strong style={{ color: "#F4ECD8" }}>
            {tableCount} table{tableCount === 1 ? "" : "s"}
          </strong>{" "}
          in ~60 seconds.{" "}
          <span style={{ color: "#E0A158" }}>Cannot be undone.</span>
        </p>
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: "rgba(244, 236, 216, 0.6)" }}
        >
          The action is logged in your audit timeline so you can see proof
          of the cascade.
        </p>
        <label
          className="mt-4 block text-xs"
          htmlFor={inputId}
          style={{
            color: "rgba(244, 236, 216, 0.62)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.04em",
          }}
        >
          Type {REVOKE_CONFIRM_WORD} to confirm
        </label>
        <input
          id={inputId}
          type="text"
          value={confirmInput}
          onChange={(e) => onConfirmInputChange(e.target.value)}
          disabled={pending}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Type ${REVOKE_CONFIRM_WORD} to confirm`}
          data-testid="revoke-modal-input"
          className="mt-1 w-full rounded-md px-3 py-2 text-sm"
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            color: "#F4ECD8",
            border: inputMatches
              ? "1px solid rgba(224, 161, 88, 0.55)"
              : "1px solid rgba(255, 255, 255, 0.12)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.06em",
          }}
        />
        {error && (
          <p
            role="alert"
            data-testid="revoke-modal-error"
            className="mt-3 rounded-md px-3 py-2 text-xs leading-relaxed"
            style={{
              background: "rgba(196, 71, 71, 0.12)",
              color: "#F4D2D2",
              border: "1px solid rgba(196, 71, 71, 0.45)",
            }}
          >
            {revokeErrorMessage(error)}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Cancel revoke"
            data-testid="revoke-modal-cancel"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "rgba(244, 236, 216, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            aria-label="Confirm revoke"
            data-testid="revoke-modal-confirm"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium"
            style={{
              background: confirmDisabled
                ? "rgba(224, 161, 88, 0.08)"
                : "rgba(224, 161, 88, 0.18)",
              color: confirmDisabled ? "rgba(244, 236, 216, 0.5)" : "#E0A158",
              border: "1px solid rgba(224, 161, 88, 0.6)",
              cursor: pending
                ? "wait"
                : confirmDisabled
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {pending
              ? "Revoking…"
              : error
                ? "Try again"
                : "Revoke consent"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  open: boolean;
  pending: boolean;
  expectedEmail: string;
  value: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({
  open,
  pending,
  expectedEmail,
  value,
  onChange,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps): JSX.Element | null {
  const titleId = useId();
  const bodyId = useId();
  if (!open) return null;
  const matches = value.trim() === expectedEmail;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-testid="delete-modal"
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      style={{ background: "rgba(8, 9, 18, 0.7)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A2E",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#F4ECD8",
        }}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "#F4ECD8",
          }}
        >
          Delete your account?
        </h2>
        <p
          id={bodyId}
          className="mt-2 text-sm leading-relaxed"
          style={{ color: "rgba(244, 236, 216, 0.78)" }}
        >
          We soft-delete now and hard-purge after thirty days. Retype your email to confirm.
        </p>
        <label
          className="mt-4 block text-xs"
          htmlFor="delete-email-confirm"
          style={{
            color: "rgba(244, 236, 216, 0.62)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.04em",
          }}
        >
          Confirm: {expectedEmail}
        </label>
        <input
          id="delete-email-confirm"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          autoComplete="off"
          spellCheck={false}
          aria-label="Type your email to confirm deletion"
          data-testid="delete-modal-email"
          className="mt-1 w-full rounded-md px-3 py-2 text-sm"
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            color: "#F4ECD8",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Cancel deletion"
            data-testid="delete-modal-cancel"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "rgba(244, 236, 216, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !matches}
            aria-label="Confirm deletion"
            data-testid="delete-modal-confirm"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium"
            style={{
              background:
                pending || !matches
                  ? "rgba(196, 71, 71, 0.08)"
                  : "rgba(196, 71, 71, 0.18)",
              color:
                pending || !matches
                  ? "rgba(244, 236, 216, 0.5)"
                  : "#F4D2D2",
              border: "1px solid rgba(196, 71, 71, 0.6)",
              cursor: pending || !matches ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Requesting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * RetentionBanner — concierge-voice promise pinned to the top of the
 * Trust Console when the env flag is on. The number is sourced from the
 * `AUDIT_HISTORY_RETENTION_DAYS` constant so the legal copy and the
 * surfaced number can never drift.
 *
 * Renders nothing when the flag is off so the page degrades cleanly to
 * a quiet preview shape for the owner.
 */
function RetentionBanner({ days }: { days: number }): JSX.Element {
  return (
    <p
      data-testid="retention-banner"
      className="mb-6 rounded-lg px-4 py-3 text-sm leading-relaxed"
      style={{
        background: "rgba(201, 168, 76, 0.08)",
        border: "1px solid rgba(201, 168, 76, 0.32)",
        color: "rgba(244, 236, 216, 0.84)",
        fontFamily: "'Satoshi', system-ui, sans-serif",
      }}
    >
      Tower keeps your audit history for{" "}
      <strong style={{ color: "#C9A84C" }}>
        ≤ {days} day{days === 1 ? "" : "s"}
      </strong>{" "}
      per the retention SLA. After that it&apos;s purge-swept.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Date helpers (the audit row → feed event title map lives in
// `@/components/trust-console/AuditFeed`).
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "the scheduled date";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "long",
    }).format(d);
  } catch {
    return iso;
  }
}
