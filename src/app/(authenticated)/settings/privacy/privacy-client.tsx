"use client";

import type { JSX } from "react";
import { useId, useState, useTransition } from "react";
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
  UserConsentState,
} from "@/lib/db/queries/trust-console-rest";

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
}: Props): JSX.Element {
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [isRevokePending, startRevoke] = useTransition();
  const [isExportPending, startExport] = useTransition();
  const [isDeletePending, startDelete] = useTransition();

  const revokeDisabled = consentState.networking.state !== "opted_in";

  const handleRevoke = (): void => {
    startRevoke(async () => {
      const result = await revokeNetworkingConsentAction();
      setShowRevokeModal(false);
      if (result.ok) {
        setBanner({
          tone: "success",
          message: `Consent revoked. ${result.itemsErased} item${
            result.itemsErased === 1 ? "" : "s"
          } erased from the matching index.`,
        });
      } else {
        setBanner({
          tone: "error",
          message: `Revoke failed: ${result.error}. Try again or contact support.`,
        });
      }
    });
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
          onExport={handleExport}
          onDeleteRequest={() => setShowDeleteModal(true)}
        />

        <AuditFeed events={auditTimeline.map(rowToFeedEvent)} />
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
        onCancel={() => setShowRevokeModal(false)}
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
  onExport: () => void;
  onDeleteRequest: () => void;
}

function DataRightsPanel({
  exportPending,
  deletePending,
  onExport,
  onDeleteRequest,
}: DataRightsPanelProps): JSX.Element {
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
        <li className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
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
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={exportPending}
            aria-label="Request a full data export"
            data-testid="export-button"
            className="md:ml-4 inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: exportPending
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(201, 168, 76, 0.12)",
              color: exportPending
                ? "rgba(244, 236, 216, 0.45)"
                : "#C9A84C",
              border: "1px solid rgba(201, 168, 76, 0.4)",
              cursor: exportPending ? "wait" : "pointer",
            }}
          >
            {exportPending ? "Queuing…" : "Request export"}
          </button>
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

interface RevokeConfirmModalProps {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function RevokeConfirmModal({
  open,
  pending,
  onCancel,
  onConfirm,
}: RevokeConfirmModalProps): JSX.Element | null {
  const titleId = useId();
  const bodyId = useId();
  if (!open) return null;
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
          style={{ color: "rgba(244, 236, 216, 0.78)" }}
        >
          This deletes all warm-intro graph data derived from your contacts. The action is logged in your audit timeline.
        </p>
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
            disabled={pending}
            aria-label="Confirm revoke"
            data-testid="revoke-modal-confirm"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium"
            style={{
              background: pending
                ? "rgba(224, 161, 88, 0.08)"
                : "rgba(224, 161, 88, 0.16)",
              color: pending ? "rgba(244, 236, 216, 0.5)" : "#E0A158",
              border: "1px solid rgba(224, 161, 88, 0.6)",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            {pending ? "Revoking…" : "Revoke consent"}
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
