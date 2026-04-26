"use client";

import type { JSX } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

interface OfferFolderProps {
  offer: OfferRow;
  /** Index in the OakTable — drives the ±1.5° tilt (stack-of-folders look). */
  index: number;
  /** True when this folder is the currently selected offer. */
  selected: boolean;
  /** Fired when the folder is clicked. */
  onSelect: () => void;
}

/** Format a whole-dollar number as `$xxx,xxx`. */
function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/**
 * A single manila folder on the Oak Table.
 *
 * Renders a button (not a link) because selecting an offer changes local
 * client state only — the Parlor is a single-route floor, one user
 * session, no URL transition per folder.
 *
 * Visual "stack-of-folders" feel: even indices tilt -1.5°, odd tilt +1.5°.
 * On-hover lift + selected bumps are handled in `parlor.css`.
 *
 * Accessibility: exposes `aria-pressed` (mirroring the `selected` prop)
 * and acts as a `listitem` inside OakTable's `role="list"` container.
 */
export function OfferFolder({
  offer,
  index,
  selected,
  onSelect,
}: OfferFolderProps): JSX.Element {
  const total =
    offer.base + offer.bonus + offer.equity + offer.sign_on + offer.housing;
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  // Listitem wraps the button so the a11y tree reads the OakTable's
  // role="list" -> role="listitem" -> button as a toggleable control.
  // Overriding the button to role="listitem" would strip the button's
  // implicit role and break aria-pressed semantics (eslint rule
  // jsx-a11y/role-supports-aria-props).
  return (
    <div role="listitem" className="parlor-offer-folder-item">
      <button
        type="button"
        className="parlor-offer-folder"
        data-selected={selected ? "true" : "false"}
        data-offer-id={offer.id}
        style={{ transform: `rotate(${tilt}deg)` }}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <span className="parlor-offer-folder-tab">{offer.company_name}</span>
        <span className="parlor-offer-folder-body">
          <span className="parlor-offer-folder-role">{offer.role}</span>
          <span className="parlor-offer-folder-loc">{offer.location}</span>
          <span className="parlor-offer-folder-total">
            {formatUSD(total)} total
          </span>
          <span
            className="parlor-offer-folder-status"
            data-status={offer.status}
          >
            {offer.status}
          </span>
        </span>
      </button>
    </div>
  );
}
