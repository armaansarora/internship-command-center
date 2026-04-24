"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PenGlowCursor } from "@/components/floor-5/live-compose/PenGlowCursor";
import { CEOVoicePlayButton } from "@/components/parlor/CEOVoicePlayButton";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

/**
 * R10.9 — NegotiationDraftPanel.
 *
 * The Negotiation Parlor's final-beat surface: one clean "Draft negotiation"
 * CTA that POSTs to `/api/offers/:id/negotiation-draft`, then reveals the
 * returned draft character-by-character with the R5.4 pen-glow cursor at
 * the live edge — **reusing `PenGlowCursor` and the per-tick re-mount key
 * pattern, NOT the full LiveComposePanel**.
 *
 * Why a local reveal (not a streaming endpoint): the negotiation-draft API
 * is one-shot `generateObject` — it returns the full draft in the response.
 * The character-by-character reveal is a **visual simulation** run on the
 * client (append one char per animation frame, re-key the cursor on each
 * tick). The scaffolding being reused is the pen-glow primitive + the
 * reveal animation, not the network layer. This is exactly what R10.9's
 * brief calls for.
 *
 * prefers-reduced-motion: when reduced, the full body snaps into place as
 * soon as the draft resolves; the cursor is suppressed. The subject is
 * always shown in full once fetched (no "subject reveal" beat) so
 * assistive-tech users have a stable landmark.
 *
 * After reveal completes, the subject + body are rendered as plain text in
 * a read-only preview. An explicit edit step is out of scope for R10.9 —
 * the existing /api/outreach/approve pipeline handles approve-or-edit in a
 * later beat. The `onDrafted(outreachId)` callback fires once as the
 * reveal lands, so the ParlorClient can wire follow-up state.
 */

interface NegotiationDraftPanelProps {
  /** The offer whose draft we're composing. */
  offerId: string;
  /** Three-chair convening result, or null when the user skipped convening. */
  convening?: ParlorConveningResult | null;
  /** Fires once with the outreach row id after the draft is persisted. */
  onDrafted?: (outreachId: string) => void;
  /**
   * Auto-start the POST + reveal on mount. Defaults to `false` so tests can
   * mount the component without firing network calls.
   */
  autoStart?: boolean;
  /**
   * Force reduced-motion mode (bypasses the hook). Tests use this to assert
   * the snap-in-place branch without stubbing `matchMedia`.
   */
  reducedMotion?: boolean;
  /** Override the endpoint (tests). */
  endpoint?: string;
  /**
   * R10.11 — Layer 2 of the three-layer voice gate. When true, the
   * CEOVoicePlayButton is rendered after the reveal finishes; when false
   * (default), the button is not rendered. The button performs its own
   * Layer 3 browser-support check internally, so callers don't need to
   * pre-filter by window.speechSynthesis availability.
   */
  ceoVoiceEnabled?: boolean;
}

interface DraftResult {
  id: string;
  subject: string;
  body: string;
}

/** Per-frame characters revealed. Small enough to feel hand-written, large
 * enough that a 200-word body reveals in ~3 seconds. */
const CHARS_PER_FRAME = 3;

export function NegotiationDraftPanel({
  offerId,
  convening = null,
  onDrafted,
  autoStart = false,
  reducedMotion,
  endpoint,
  ceoVoiceEnabled = false,
}: NegotiationDraftPanelProps): JSX.Element {
  const hookReduced = useReducedMotion();
  const reduced = reducedMotion ?? hookReduced;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [revealedLen, setRevealedLen] = useState<number>(0);
  const [penTick, setPenTick] = useState<number>(0);

  const startedRef = useRef<boolean>(false);
  const firedDoneRef = useRef<boolean>(false);

  const startDraft = useCallback(async (): Promise<void> => {
    if (startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        endpoint ?? `/api/offers/${offerId}/negotiation-draft`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ convening }),
        },
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        outreach: { id: string; subject: string; body: string };
      };
      const next: DraftResult = {
        id: body.outreach.id,
        subject: body.outreach.subject,
        body: body.outreach.body,
      };
      setDraft(next);
      // Reduced motion: snap to full reveal immediately. No per-frame
      // cursor, no animation frame loop, no accidental flashes for
      // motion-sensitive users.
      if (reduced) {
        setRevealedLen(next.body.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      startedRef.current = false; // allow retry after error
    } finally {
      setLoading(false);
    }
  }, [endpoint, offerId, convening, reduced]);

  // Auto-start on mount when the caller opts in.
  useEffect(() => {
    if (!autoStart) return;
    void startDraft();
  }, [autoStart, startDraft]);

  // Character-by-character reveal loop. Only runs under full motion; the
  // reduced branch snaps above. Driven by requestAnimationFrame so the
  // reveal breathes in sync with the browser's paint cycle rather than a
  // setInterval tick.
  useEffect(() => {
    if (!draft) return;
    if (reduced) return;
    if (revealedLen >= draft.body.length) return;

    let raf = 0;
    const step = (): void => {
      setRevealedLen((prev) => {
        const next = Math.min(prev + CHARS_PER_FRAME, draft.body.length);
        return next;
      });
      setPenTick((t) => t + 1);
      if (revealedLen + CHARS_PER_FRAME < draft.body.length) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [draft, reduced, revealedLen]);

  // Fire onDrafted exactly once when the reveal completes.
  useEffect(() => {
    if (!draft) return;
    if (firedDoneRef.current) return;
    if (reduced || revealedLen >= draft.body.length) {
      firedDoneRef.current = true;
      onDrafted?.(draft.id);
    }
  }, [draft, reduced, revealedLen, onDrafted]);

  const revealedBody = draft ? draft.body.slice(0, revealedLen) : "";
  const fullyRevealed = draft ? revealedLen >= draft.body.length : false;
  const showCursor = Boolean(draft) && !reduced && !fullyRevealed;

  return (
    <section
      role="region"
      aria-label="Negotiation draft"
      className="parlor-negotiation-draft"
      data-state={draft ? (fullyRevealed ? "done" : "revealing") : "empty"}
    >
      <header className="parlor-negotiation-draft-header">
        <h3>Negotiation draft</h3>
        <span className="parlor-negotiation-draft-tag">R10.9 · DRAFT</span>
      </header>

      {!draft && !loading && (
        <div className="parlor-negotiation-draft-empty">
          <button
            type="button"
            onClick={() => {
              void startDraft();
            }}
            className="parlor-negotiation-draft-cta"
            data-testid="negotiation-draft-cta"
          >
            Draft negotiation
          </button>
          {error ? (
            <p role="alert" className="parlor-negotiation-draft-error">
              Draft failed: {error}
            </p>
          ) : null}
        </div>
      )}

      {loading && (
        <p className="parlor-negotiation-draft-loading" aria-live="polite">
          Drafting…
        </p>
      )}

      {draft && (
        <div className="parlor-negotiation-draft-body">
          <div className="parlor-negotiation-draft-subject">
            <span className="parlor-negotiation-draft-label">Subject</span>
            <p>{draft.subject}</p>
          </div>
          <div
            className="parlor-negotiation-draft-content"
            aria-live="polite"
            aria-busy={!fullyRevealed}
          >
            <span className="parlor-negotiation-draft-label">Body</span>
            <div className="parlor-negotiation-draft-text">
              {revealedBody}
              {showCursor ? <PenGlowCursor key={penTick} /> : null}
            </div>
            {/* R10.11 — Read-aloud button. Three-layer gate:
                Layer 1/2 arrives as `ceoVoiceEnabled`; Layer 3 (browser
                support) is checked inside the button. Rendered only once
                the reveal is complete so the audio matches the final
                text, not the mid-animation slice. */}
            {fullyRevealed ? (
              <CEOVoicePlayButton
                enabled={ceoVoiceEnabled}
                text={draft.body}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
