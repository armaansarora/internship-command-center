"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * RevokeButton — destructive scope-revoke action with a built-in
 * confirmation modal.
 *
 * UX contract:
 *   - Click the trigger → opens a small modal (role="dialog",
 *     aria-modal="true") with the scope-specific consequence copy.
 *   - The modal traps focus (first focusable on open, last↔first on Tab)
 *     and is dismissible via Escape, the backdrop, or the "Keep" button.
 *   - Confirming calls `onConfirm()`. While the promise is pending the
 *     confirm button is disabled and aria-live announces progress.
 *   - On success: modal stays open briefly to show "Revoked at {time} ·
 *     logged in your audit timeline." then auto-closes. The parent is
 *     expected to refresh state.
 *   - On failure: a polite aria-live error is shown and the user can
 *     retry or cancel.
 *
 * Pure UI: no API knowledge — the parent supplies the async action.
 */

export interface RevokeButtonProps {
  onConfirm: () => Promise<void>;
  scope: "networking" | "gmail" | "calendar" | "all-data";
  disabled?: boolean;
}

type Phase = "idle" | "open" | "submitting" | "success" | "error";

interface ScopeCopy {
  /** Trigger button label, e.g. "Revoke matching consent". */
  trigger: string;
  /** Modal title, e.g. "Revoke warm-intro matching?". */
  title: string;
  /** Plain-English description of what gets deleted. */
  warning: string;
  /** aria-live success line. */
  successPrefix: string;
}

const SCOPE_COPY: Record<RevokeButtonProps["scope"], ScopeCopy> = {
  networking: {
    trigger: "Revoke matching consent",
    title: "Revoke warm-intro matching?",
    warning:
      "We'll stop matching your contacts for warm intros and delete the consent-scoped derived data. Your raw contacts remain. You can opt back in anytime.",
    successPrefix: "Matching consent revoked",
  },
  gmail: {
    trigger: "Disconnect Gmail",
    title: "Disconnect Gmail?",
    warning:
      "We'll revoke the Gmail OAuth grant, delete cached message metadata, and stop sending follow-ups on your behalf. Threads we've already drafted stay in your account.",
    successPrefix: "Gmail disconnected",
  },
  calendar: {
    trigger: "Disconnect Calendar",
    title: "Disconnect Calendar?",
    warning:
      "We'll revoke the Calendar OAuth grant and delete cached event metadata. Existing events on your Google Calendar are untouched.",
    successPrefix: "Calendar disconnected",
  },
  "all-data": {
    trigger: "Delete all my data",
    title: "Delete all your Tower data?",
    warning:
      "We'll schedule a full export, then permanently delete your account, all consent records, contacts, applications, drafts, audit history, and connected-service caches within 30 days. This is not reversible after the 30-day window.",
    successPrefix: "Deletion requested",
  },
};

function formatNowShort(): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function isFocusable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("disabled")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const tabIndex = el.getAttribute("tabindex");
  if (tabIndex && parseInt(tabIndex, 10) < 0) return false;
  return true;
}

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function RevokeButton(props: RevokeButtonProps): JSX.Element {
  const { onConfirm, scope, disabled = false } = props;
  const copy = SCOPE_COPY[scope];

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successAt, setSuccessAt] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const open = phase === "open" || phase === "submitting" ||
    phase === "success" || phase === "error";

  const closeModal = useCallback((): void => {
    setPhase("idle");
    setErrorMsg(null);
    setSuccessAt(null);
    // Restore focus to the trigger so keyboard users stay anchored.
    const prev = previouslyFocusedRef.current;
    if (prev && document.contains(prev)) {
      prev.focus();
    } else if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  const handleOpen = useCallback((): void => {
    if (disabled) return;
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    setPhase("open");
    setErrorMsg(null);
    setSuccessAt(null);
  }, [disabled]);

  const handleConfirm = useCallback(async (): Promise<void> => {
    setPhase("submitting");
    setErrorMsg(null);
    try {
      await onConfirm();
      setSuccessAt(formatNowShort());
      setPhase("success");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Could not complete the revoke. Try again in a moment.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, [onConfirm]);

  // Escape + focus trap while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (phase !== "submitting") {
          e.stopPropagation();
          closeModal();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const dlg = dialogRef.current;
      if (!dlg) return;
      const focusable = Array.from(
        dlg.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter(isFocusable);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, phase, closeModal]);

  // On open, focus the safest button (Keep) so confirm is intentional.
  useEffect(() => {
    if (phase !== "open") return;
    const dlg = dialogRef.current;
    if (!dlg) return;
    const keep = dlg.querySelector<HTMLButtonElement>(
      "[data-testid='revoke-modal-keep']",
    );
    keep?.focus();
  }, [phase]);

  // Success auto-dismiss after a beat so users can read the line.
  useEffect(() => {
    if (phase !== "success") return;
    const t = window.setTimeout(() => {
      closeModal();
    }, 2400);
    return () => window.clearTimeout(t);
  }, [phase, closeModal]);

  const triggerLabel = copy.trigger;
  const dialogTitleId = `revoke-${scope}-title`;
  const dialogDescId = `revoke-${scope}-desc`;

  const ariaLiveText =
    phase === "submitting"
      ? "Revoking — please wait."
      : phase === "success" && successAt
      ? `${copy.successPrefix} at ${successAt}. Logged in your audit timeline.`
      : phase === "error" && errorMsg
      ? `Error: ${errorMsg}`
      : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        data-testid={`revoke-trigger-${scope}`}
        className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          fontFamily: "'Satoshi', system-ui, sans-serif",
          background: "rgba(224, 161, 88, 0.10)",
          color: "#E0A158",
          border: "1px solid rgba(224, 161, 88, 0.35)",
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
          data-testid={`revoke-modal-${scope}`}
          onClick={(e) => {
            if (e.target === e.currentTarget && phase !== "submitting") {
              closeModal();
            }
          }}
          style={{
            background: "rgba(0, 0, 0, 0.62)",
            // Soften the backdrop fade for reduced-motion users via the
            // CSS pref query at the layer level; here we keep it instant.
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescId}
            data-testid={`revoke-dialog-${scope}`}
            className="w-full max-w-md rounded-xl p-5 md:p-6"
            style={{
              background: "rgba(14, 16, 28, 0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(224, 161, 88, 0.25)",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          >
            <h3
              id={dialogTitleId}
              className="text-lg md:text-xl font-semibold leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "#F4ECD8",
              }}
            >
              {copy.title}
            </h3>
            <p
              id={dialogDescId}
              className="mt-2 text-sm leading-relaxed"
              style={{
                fontFamily: "'Satoshi', system-ui, sans-serif",
                color: "rgba(244, 236, 216, 0.72)",
              }}
            >
              {copy.warning}
            </p>

            {/* aria-live region: announces status without stealing focus. */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-3 min-h-[1.25rem] text-xs"
              data-testid={`revoke-status-${scope}`}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color:
                  phase === "error"
                    ? "rgba(232, 130, 130, 0.95)"
                    : phase === "success"
                    ? "#C9A84C"
                    : "rgba(244, 236, 216, 0.55)",
              }}
            >
              {ariaLiveText}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={phase === "submitting"}
                data-testid="revoke-modal-keep"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#F4ECD8",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  phase === "submitting" || phase === "success"
                }
                data-testid="revoke-modal-confirm"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  background: "rgba(224, 161, 88, 0.18)",
                  color: "#F4ECD8",
                  border: "1px solid rgba(224, 161, 88, 0.55)",
                }}
              >
                {phase === "submitting" ? "Revoking…" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
