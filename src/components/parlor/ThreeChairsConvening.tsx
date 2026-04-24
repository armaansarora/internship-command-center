"use client";

import type { JSX } from "react";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

interface ThreeChairsConveningProps {
  /** True while the `/api/offers/:id/convene` call is in flight. */
  loading: boolean;
  /** The typed three-block result, or null before the first convening. */
  result: ParlorConveningResult | null;
  /** Fires when the user clicks the Convene button. */
  onConvene: () => void;
}

/** Format a whole-dollar number as `$xxx,xxx`. Mirrors OfferFolder's USD rule. */
function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/**
 * R10.7 — ThreeChairsConvening.
 *
 * Right-half of the Parlor floor. Three glass-panel cards seat the three
 * convening agents — Offer Evaluator (new CRO subagent), CFO (Parlor-scoped),
 * and CNO (Parlor-scoped). Before the first convening the panel collapses to
 * a single "Convene" button; during the RPC round-trip it shows a polite
 * aria-live announcement; on completion it fans into a three-card grid.
 *
 * Shape: purely presentational — the parent (`ParlorClient`) owns loading /
 * result state and the POST call. We surface `data-seat` attributes on each
 * card so integration tests and R10.8 analytics can target individual seats
 * without scraping DOM structure.
 */
export function ThreeChairsConvening({
  loading,
  result,
  onConvene,
}: ThreeChairsConveningProps): JSX.Element {
  if (!result && !loading) {
    return (
      <div className="parlor-chairs-empty">
        <button
          type="button"
          className="parlor-chairs-convene-btn"
          onClick={onConvene}
        >
          Convene
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="parlor-chairs-loading" aria-live="polite">
        The three lean in…
      </div>
    );
  }

  // result must be non-null here — the loading && !result branch was handled above
  // and the empty-state branch returned early.
  const r = result!;

  return (
    <div className="parlor-chairs-grid">
      <article className="parlor-chair" data-seat="offer_evaluator">
        <h3>Offer Evaluator</h3>
        <p className="parlor-chair-verdict" data-verdict={r.offer_evaluator.verdict}>
          {r.offer_evaluator.verdict}
        </p>
        <p className="parlor-chair-narrative">{r.offer_evaluator.narrative}</p>
        {r.offer_evaluator.risks.length > 0 && (
          <ul className="parlor-chair-risks">
            {r.offer_evaluator.risks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        )}
      </article>

      <article className="parlor-chair" data-seat="cfo">
        <h3>CFO</h3>
        <p className="parlor-chair-total">
          Year 1 total: {formatUSD(r.cfo.total_comp_year1)}
        </p>
        <p className="parlor-chair-total">
          4yr total: {formatUSD(r.cfo.total_comp_4yr)}
        </p>
        {r.cfo.vesting_note && (
          <p className="parlor-chair-vesting">{r.cfo.vesting_note}</p>
        )}
        {r.cfo.narrative && (
          <p className="parlor-chair-narrative">{r.cfo.narrative}</p>
        )}
      </article>

      <article className="parlor-chair" data-seat="cno">
        <h3>CNO</h3>
        {r.cno.narrative && (
          <p className="parlor-chair-narrative">{r.cno.narrative}</p>
        )}
        {r.cno.contacts_at_company.length > 0 && (
          <ul className="parlor-chair-contacts">
            {r.cno.contacts_at_company.map((c) => (
              <li key={c.name}>
                <span className="parlor-chair-contact-name">{c.name}</span>
                {" — "}
                <span className="parlor-chair-contact-note">{c.note}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
