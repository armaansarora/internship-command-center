"use client";

import type { JSX } from "react";
import { useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { ParlorScene } from "@/components/parlor/ParlorScene";
import { OakTable } from "@/components/parlor/OakTable";

interface ParlorClientProps {
  offers: OfferRow[];
}

/**
 * R10.6 — ParlorClient.
 *
 * Client scaffold for the Negotiation Parlor. Holds the selected-offer
 * state and threads it into the OakTable + OfferFolder tree. The
 * chart + chairs slots are placeholders here; R10.7 wires the
 * ThreeChairsConvening into the chairsSlot and R10.8 wires the
 * pin-stack chart into the chartSlot.
 *
 * Selection default: first offer in the server-provided list (already
 * sorted newest-first by `getOffersForUser`). Null only when the list
 * is empty — which the server-side gate prevents by redirecting back
 * to /c-suite, but we still guard via `offers[0]?.id ?? null` in case
 * a future code path lets a zero-offer client through.
 */
export function ParlorClient({ offers }: ParlorClientProps): JSX.Element {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    offers[0]?.id ?? null,
  );
  return (
    <ParlorScene
      tableSlot={
        <OakTable
          offers={offers}
          selectedOfferId={selectedOfferId}
          onSelect={setSelectedOfferId}
        />
      }
      chartSlot={<div data-testid="parlor-chart-slot" />}
      chairsSlot={<div data-testid="parlor-chairs-slot" />}
    />
  );
}
