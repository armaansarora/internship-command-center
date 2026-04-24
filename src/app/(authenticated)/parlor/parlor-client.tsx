"use client";

import type { JSX } from "react";
import { useCallback, useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";
import { ParlorScene } from "@/components/parlor/ParlorScene";
import { OakTable } from "@/components/parlor/OakTable";
import { ThreeChairsConvening } from "@/components/parlor/ThreeChairsConvening";

interface ParlorClientProps {
  offers: OfferRow[];
}

/**
 * R10.6 — ParlorClient.
 *
 * Client scaffold for the Negotiation Parlor. Holds the selected-offer
 * state and threads it into the OakTable + OfferFolder tree.
 *
 * R10.7 adds the three-chair convening: per-offer loading + result state
 * maps are keyed by offer id so switching selection between offers
 * preserves each one's convening result (or loading flag). The button
 * POSTs to `/api/offers/:id/convene`; on success we render the three
 * chairs. R10.8 will populate the `chartSlot` with the pin-stack chart.
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
  const [loadingByOfferId, setLoadingByOfferId] = useState<Record<string, boolean>>({});
  const [resultByOfferId, setResultByOfferId] = useState<
    Record<string, ParlorConveningResult>
  >({});

  const onConvene = useCallback(async () => {
    if (!selectedOfferId) return;
    setLoadingByOfferId((m) => ({ ...m, [selectedOfferId]: true }));
    try {
      const res = await fetch(`/api/offers/${selectedOfferId}/convene`, {
        method: "POST",
      });
      if (!res.ok) return;
      const body = (await res.json()) as { result: ParlorConveningResult };
      setResultByOfferId((m) => ({ ...m, [selectedOfferId]: body.result }));
    } finally {
      setLoadingByOfferId((m) => ({ ...m, [selectedOfferId]: false }));
    }
  }, [selectedOfferId]);

  const loading = selectedOfferId
    ? Boolean(loadingByOfferId[selectedOfferId])
    : false;
  const result = selectedOfferId
    ? (resultByOfferId[selectedOfferId] ?? null)
    : null;

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
      chairsSlot={
        <ThreeChairsConvening
          loading={loading}
          result={result}
          onConvene={onConvene}
        />
      }
    />
  );
}
