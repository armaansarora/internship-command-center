"use client";

import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";
import type { LookupResult } from "@/lib/comp-bands/lookup";
import { ParlorScene } from "@/components/parlor/ParlorScene";
import { OakTable } from "@/components/parlor/OakTable";
import { ThreeChairsConvening } from "@/components/parlor/ThreeChairsConvening";
import {
  CompBandChart,
  type CompBands,
  type CompPin,
} from "@/components/parlor/CompBandChart";
import { NegotiationDraftPanel } from "@/components/parlor/NegotiationDraftPanel";

interface ParlorClientProps {
  offers: OfferRow[];
  /**
   * R10.11 — Layer 2 of the CEO voice three-layer gate. Seeded from
   * `user_profiles.preferences.ceoVoice.enabled` server-side. Threaded
   * down to the NegotiationDraftPanel so the read-aloud button can gate
   * itself. Default OFF preserves the Layer 1 default when callers drop
   * the prop.
   */
  ceoVoiceEnabled?: boolean;
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
 * chairs.
 *
 * R10.8 populates the chartSlot with the CompBandChart. Bands arrive with
 * the convene response (the same payload the Offer Evaluator saw); we
 * stash them keyed by offer id so they persist across folder switches and
 * adapt `LookupResult.ok:true` to the chart's local `CompBands` shape.
 * When there are no bands yet (no convening, or a no_key/over_budget/
 * empty response), the chart graceful-empties and the other offers still
 * pin on the shared rails built from any successful convenings.
 *
 * Selection default: first offer in the server-provided list (already
 * sorted newest-first by `getOffersForUser`). Null only when the list
 * is empty — which the server-side gate prevents by redirecting back
 * to /c-suite, but we still guard via `offers[0]?.id ?? null` in case
 * a future code path lets a zero-offer client through.
 */
export function ParlorClient({
  offers,
  ceoVoiceEnabled = false,
}: ParlorClientProps): JSX.Element {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
    offers[0]?.id ?? null,
  );
  const [loadingByOfferId, setLoadingByOfferId] = useState<Record<string, boolean>>({});
  const [resultByOfferId, setResultByOfferId] = useState<
    Record<string, ParlorConveningResult>
  >({});
  const [bandsByOfferId, setBandsByOfferId] = useState<
    Record<string, LookupResult>
  >({});

  const onConvene = useCallback(async () => {
    if (!selectedOfferId) return;
    setLoadingByOfferId((m) => ({ ...m, [selectedOfferId]: true }));
    try {
      const res = await fetch(`/api/offers/${selectedOfferId}/convene`, {
        method: "POST",
      });
      if (!res.ok) return;
      const body = (await res.json()) as {
        result: ParlorConveningResult;
        bands: LookupResult;
      };
      setResultByOfferId((m) => ({ ...m, [selectedOfferId]: body.result }));
      setBandsByOfferId((m) => ({ ...m, [selectedOfferId]: body.bands }));
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

  // Adapt the LookupResult for the currently-selected offer into the
  // chart's local CompBands shape. Non-ok lookups (no_key / over_budget /
  // empty) render as the chart's empty-state.
  const chartBands: CompBands | null = useMemo(() => {
    if (!selectedOfferId) return null;
    const lookup = bandsByOfferId[selectedOfferId];
    if (!lookup || !lookup.ok) return null;
    return {
      p25: lookup.base.p25,
      p50: lookup.base.p50,
      p75: lookup.base.p75,
      sampleSize: lookup.sampleSize,
      source: lookup.source,
    };
  }, [selectedOfferId, bandsByOfferId]);

  // Pin every offer on the chart so the user can compare their stack at a
  // glance. Label uses company_name — duplicate-company edge case surfaces
  // via the chart's label-collision dodge rather than silent overlap.
  const chartPins: CompPin[] = useMemo(
    () => offers.map((o) => ({ label: o.company_name, base: o.base })),
    [offers],
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
      chartSlot={<CompBandChart bands={chartBands} pins={chartPins} />}
      chairsSlot={
        <ThreeChairsConvening
          loading={loading}
          result={result}
          onConvene={onConvene}
        />
      }
      draftSlot={
        selectedOfferId ? (
          <NegotiationDraftPanel
            key={selectedOfferId}
            offerId={selectedOfferId}
            convening={result}
            ceoVoiceEnabled={ceoVoiceEnabled}
          />
        ) : null
      }
    />
  );
}
