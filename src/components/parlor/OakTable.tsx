import type { JSX } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { OfferFolder } from "./OfferFolder";

/**
 * R12 Red Team scale fix: cap the visible folder stack at this many
 * offers. Beyond the cap, an overflow banner counts hidden offers and
 * suggests archival via Settings. Realistic users top out at ≤10
 * offers; the cap is defense-in-depth against fixture spam, malicious
 * insert flooding, or test-bench scale scenarios. The full offers
 * array remains available to logic upstream (CompBandChart, etc.) —
 * this cap is purely about render budget on the OakTable surface.
 */
const MAX_VISIBLE_OFFERS = 50;

interface OakTableProps {
  /** The user's offers, already sorted by the server (newest first). */
  offers: OfferRow[];
  /** The currently-selected offer id, or null when nothing is selected. */
  selectedOfferId: string | null;
  /** Fired when a folder is clicked; receives the clicked folder's id. */
  onSelect: (id: string) => void;
}

/**
 * R10.6 — The Oak Table at the center of the Parlor.
 *
 * Holds the collection of OfferFolders as a `role="list"` for
 * assistive-tech users (each OfferFolder is a `role="listitem"`). The
 * tilted stack-of-folders effect is OfferFolder's responsibility; this
 * container just arranges them in the table's flow.
 *
 * Pure structural component — no state. Selection state lives in the
 * ParlorClient and is threaded down via `selectedOfferId` + `onSelect`.
 *
 * R12 cap (2026-04-24): renders at most MAX_VISIBLE_OFFERS folders. If
 * the user somehow accumulates more than that, an overflow banner
 * surfaces the count and suggests archival.
 */
export function OakTable({
  offers,
  selectedOfferId,
  onSelect,
}: OakTableProps): JSX.Element {
  const visibleOffers =
    offers.length > MAX_VISIBLE_OFFERS
      ? offers.slice(0, MAX_VISIBLE_OFFERS)
      : offers;
  const overflowCount = offers.length - visibleOffers.length;

  return (
    <div className="parlor-oak-table" role="list">
      {visibleOffers.map((o, i) => (
        <OfferFolder
          key={o.id}
          offer={o}
          index={i}
          selected={selectedOfferId === o.id}
          onSelect={() => onSelect(o.id)}
        />
      ))}
      {overflowCount > 0 ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="parlor-oak-table-overflow-banner"
          className="parlor-oak-table-overflow"
        >
          <span className="parlor-oak-table-overflow__count">
            {`+ ${overflowCount} more offer${overflowCount === 1 ? "" : "s"}`}
          </span>
          <span className="parlor-oak-table-overflow__hint">
            {`oak table shows the ${MAX_VISIBLE_OFFERS} most recent — archive older offers in Settings.`}
          </span>
        </div>
      ) : null}
    </div>
  );
}
