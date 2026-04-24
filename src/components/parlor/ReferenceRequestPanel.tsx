"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PenGlowCursor } from "@/components/floor-5/live-compose/PenGlowCursor";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";

/**
 * R10.14 — ReferenceRequestPanel.
 *
 * Three states driven by the server-fetched contact tiers:
 *   1. Warm contacts present → list up to 3 with per-card "Draft reference
 *      request" CTA. Click → POST → PenGlow reveal.
 *   2. Warm empty, cooling present → list coolings with "Re-warm first"
 *      coaching. No draft CTA — reference asks land flat on cooling
 *      relationships.
 *   3. Both empty → Floor 6 signpost (link to /rolodex-lounge).
 *
 * The PenGlow reveal reuses the R10.9 pattern (char-by-char, reducedMotion
 * snaps to full text). Copy-pasted rather than extracted — two callers
 * don't warrant an abstraction yet.
 */

interface Props {
  topWarmContacts: ContactForAgent[];
  fallbackCoolingContacts: ContactForAgent[];
  selectedOfferId: string | null;
  endpoint?: string;
  reducedMotion?: boolean;
}

interface DraftResult {
  id: string;
  subject: string;
  body: string;
}

const CHARS_PER_FRAME = 3;

export function ReferenceRequestPanel({
  topWarmContacts,
  fallbackCoolingContacts,
  selectedOfferId,
  endpoint,
  reducedMotion,
}: Props): JSX.Element | null {
  const hookReduced = useReducedMotion();
  const reduced = reducedMotion ?? hookReduced;

  const [draftContactId, setDraftContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [revealedLen, setRevealedLen] = useState(0);
  const [penTick, setPenTick] = useState(0);
  const startedRef = useRef(false);

  const onDraft = useCallback(
    async (contactId: string): Promise<void> => {
      if (!selectedOfferId) return;
      if (startedRef.current) return;
      startedRef.current = true;
      setLoading(true);
      setError(null);
      setDraftContactId(contactId);
      try {
        const url =
          endpoint ?? `/api/contacts/${contactId}/reference-request`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offerId: selectedOfferId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          outreach: { id: string; subject: string; body: string };
        };
        const next: DraftResult = {
          id: body.outreach.id,
          subject: body.outreach.subject,
          body: body.outreach.body,
        };
        setDraft(next);
        if (reduced) setRevealedLen(next.body.length);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        startedRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, selectedOfferId, reduced],
  );

  useEffect(() => {
    if (!draft) return;
    if (reduced) return;
    if (revealedLen >= draft.body.length) return;
    let raf = 0;
    const step = (): void => {
      setRevealedLen((prev) =>
        Math.min(prev + CHARS_PER_FRAME, draft.body.length),
      );
      setPenTick((t) => t + 1);
      if (revealedLen + CHARS_PER_FRAME < draft.body.length) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [draft, reduced, revealedLen]);

  if (!selectedOfferId) return null;

  const revealedBody = draft ? draft.body.slice(0, revealedLen) : "";
  const fullyRevealed = draft ? revealedLen >= draft.body.length : false;
  const showCursor = Boolean(draft) && !reduced && !fullyRevealed;

  const shownWarms = topWarmContacts.slice(0, 3);

  return (
    <section
      role="region"
      aria-label="Reference request"
      className="parlor-reference"
      data-state={draft ? "drafted" : "idle"}
    >
      <header className="parlor-reference-header">
        <h3>Reference request</h3>
        <span className="parlor-reference-tag">R10.14 · CNO</span>
      </header>

      {shownWarms.length > 0 && !draft && (
        <div className="parlor-reference-list">
          <p className="parlor-reference-copy">
            Your warmest relationships — pick one to draft a reference ask.
          </p>
          {shownWarms.map((c) => (
            <div key={c.id} className="parlor-reference-card" data-testid="ref-contact-card">
              <div className="parlor-reference-card-head">
                <span className="parlor-reference-card-name">{c.name}</span>
                {c.companyName ? (
                  <span className="parlor-reference-card-company">· {c.companyName}</span>
                ) : null}
              </div>
              {c.title ? (
                <span className="parlor-reference-card-title">{c.title}</span>
              ) : null}
              <button
                type="button"
                data-testid="ref-draft-cta"
                onClick={() => { void onDraft(c.id); }}
                className="parlor-reference-draft-cta"
                disabled={loading && draftContactId === c.id}
              >
                {loading && draftContactId === c.id
                  ? "Drafting…"
                  : "Draft reference request"}
              </button>
            </div>
          ))}
        </div>
      )}

      {shownWarms.length === 0 &&
        fallbackCoolingContacts.length > 0 &&
        !draft && (
          <div className="parlor-reference-cooling">
            <p className="parlor-reference-copy">
              Nobody&apos;s warm enough for a reference ask right now. These
              relationships are cooling — <strong>re-warm first</strong>,
              then come back. Reference asks land flat on cool contacts.
            </p>
            {fallbackCoolingContacts.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="parlor-reference-card parlor-reference-card-cooling"
                data-testid="ref-cooling-card"
              >
                <span className="parlor-reference-card-name">{c.name}</span>
                <Link href="/rolodex-lounge" className="parlor-reference-cooling-cta">
                  Re-warm first
                </Link>
              </div>
            ))}
          </div>
        )}

      {shownWarms.length === 0 &&
        fallbackCoolingContacts.length === 0 &&
        !draft && (
          <div className="parlor-reference-empty">
            <p className="parlor-reference-copy">
              Head to the <Link href="/rolodex-lounge">Rolodex Lounge</Link>{" "}
              to build the relationships that make references land. A warm
              intro is worth ten cold asks.
            </p>
          </div>
        )}

      {draft && (
        <div className="parlor-reference-draft">
          <div className="parlor-reference-draft-subject">
            <span className="parlor-reference-draft-label">Subject</span>
            <p>{draft.subject}</p>
          </div>
          <div
            className="parlor-reference-draft-body"
            aria-live="polite"
            aria-busy={!fullyRevealed}
          >
            <span className="parlor-reference-draft-label">Body</span>
            <div className="parlor-reference-draft-text">
              {revealedBody}
              {showCursor ? <PenGlowCursor key={penTick} /> : null}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="parlor-reference-error">
          Draft failed: {error}
        </p>
      )}
    </section>
  );
}
