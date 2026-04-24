"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

/** How long the quip lingers before auto-dismissing. */
const AUTO_DISMISS_MS = 6200;

interface Props {
  /** The one-sentence CFO line to render. Rendered as-is — no markdown. */
  quip: string;
  /**
   * Whether the overlay should render at all. `false` renders null
   * synchronously. `true` starts the 6.2s auto-dismiss timer; on timer
   * fire OR on Esc, we hide the node and call `onDismiss` exactly once.
   *
   * The parent is expected to pass `true` only on the FIRST parlor entry
   * after the first offer — the caller reads the server-seeded
   * `parlorCfoQuipShown` preference and flips this prop off afterwards.
   */
  show: boolean;
  /**
   * Fired exactly once when the overlay hides itself — whether from the
   * auto-dismiss timer, the Esc key, or the explicit close button. The
   * parent persists `parlorCfoQuipShown={shown:true}` in response.
   */
  onDismiss: () => void;
}

/**
 * R10.12 — CFOQuipOverlay.
 *
 * Understated dialogue bubble that renders the CFO's one-time, comp-aware
 * quip on the user's first Parlor entry after their first offer arrives.
 * Auto-dismisses after 6.2 seconds. `onDismiss` fires exactly once across
 * any dismissal path (timer, Esc, close button).
 *
 * Design:
 *   - `role="status" aria-live="polite"` so assistive tech reads the line
 *     without interrupting whatever the user is doing in the parlor.
 *   - Esc-to-dismiss because the bubble is modal-ish in spirit and
 *     keyboard users deserve a cheap escape hatch.
 *   - `prefers-reduced-motion` users see no fade; the bubble simply
 *     appears and disappears. CSS handles that variant.
 *
 * Once-only gate: this component does NOT read or write the preference
 * latch. That's the parent route's job (server reads + client writes via
 * /api/profile/preferences). Keeping the pref concerns outside the
 * overlay leaves it trivially unit-testable with manual createRoot.
 */
export function CFOQuipOverlay({
  quip,
  show,
  onDismiss,
}: Props): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(show);
  // Guard so the dismiss callback only ever fires once per mount — the
  // timer + keydown + click paths can all race, and the preference flip
  // on the parent must be idempotent.
  const firedRef = useRef<boolean>(false);

  const dismiss = (): void => {
    if (firedRef.current) return;
    firedRef.current = true;
    setVisible(false);
    onDismiss();
  };

  // Mirror external `show` changes into local `visible`. When the parent
  // re-renders with `show={false}` (e.g., after the pref POST resolves),
  // we hide without firing onDismiss — the parent already knows.
  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    setVisible(true);
    firedRef.current = false;
  }, [show]);

  // Auto-dismiss timer. Runs only while `show` is true AND we haven't
  // already fired. Cleanup cancels the pending timer on unmount or when
  // `show` flips back to false mid-window.
  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
    // `dismiss` is a stable closure over refs/state but not memoized.
    // Including it would re-arm the timer every render; we intentionally
    // depend on `show` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Esc-to-dismiss. Cheap accessibility: keyboard users don't have to
  // wait the full 6.2s if they've already read the line.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!visible) return null;

  return (
    <div role="status" aria-live="polite" className="parlor-cfo-quip">
      <span className="parlor-cfo-quip-name">CFO</span>
      <span className="parlor-cfo-quip-text">{quip}</span>
    </div>
  );
}
