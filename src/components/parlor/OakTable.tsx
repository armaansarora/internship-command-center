import type { JSX } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { OfferFolder } from "./OfferFolder";

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
 */
export function OakTable({
  offers,
  selectedOfferId,
  onSelect,
}: OakTableProps): JSX.Element {
  return (
    <div className="parlor-oak-table" role="list">
      {offers.map((o, i) => (
        <OfferFolder
          key={o.id}
          offer={o}
          index={i}
          selected={selectedOfferId === o.id}
          onSelect={() => onSelect(o.id)}
        />
      ))}
    </div>
  );
}
