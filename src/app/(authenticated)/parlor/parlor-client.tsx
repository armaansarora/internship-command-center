"use client";

import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";
import type { LookupResult } from "@/lib/comp-bands/lookup";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { ParlorScene } from "@/components/parlor/ParlorScene";
import { OakTable } from "@/components/parlor/OakTable";
import { ThreeChairsConvening } from "@/components/parlor/ThreeChairsConvening";
import {
  CompBandChart,
  type CompBands,
  type CompPin,
} from "@/components/parlor/CompBandChart";
import { NegotiationDraftPanel } from "@/components/parlor/NegotiationDraftPanel";
import { NegotiationSimulator } from "@/components/parlor/simulator/NegotiationSimulator";
import { CFOQuipOverlay } from "@/components/parlor/CFOQuipOverlay";
import { ReferenceRequestPanel } from "@/components/parlor/ReferenceRequestPanel";

interface ParlorClientProps {
  offers: OfferRow[];
  /**
   * Layer 2 of the CEO voice three-layer gate. Seeded from
   * `user_profiles.preferences.ceoVoice.enabled` server-side. Threaded
   * down to the NegotiationDraftPanel so the read-aloud button can gate
   * itself. Default OFF preserves the Layer 1 default when callers drop
   * the prop.
   */
  ceoVoiceEnabled?: boolean;
  /**
   * Seeded from `user_profiles.preferences.parlorCfoQuipShown.shown`
   * server-side. When `true` the CFO overlay is never rendered on this
   * mount (latch-is-closed). When `false` we render the overlay for
   * exactly one dismissal cycle and POST the latch-closed write on
   * dismissal. Default `true` when the prop is omitted so no consumer
   * accidentally re-triggers the beat.
   */
  cfoQuipShown?: boolean;
  /**
   * Server-computed `{quip}` for the first-entry CFO line. Null
   * when comp-band lookup failed catastrophically. When null OR when
   * `cfoQuipShown===true` the overlay stays absent from the DOM.
   */
  initialCfoQuip?: { quip: string } | null;
  /** R10.14 — top-3 warm contacts for the reference-request panel. */
  topWarmContacts?: ContactForAgent[];
  /** R10.14 — cooling fallback, populated only when warm is empty. */
  fallbackCoolingContacts?: ContactForAgent[];
}

/**
 * ParlorClient.
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
 * CFO entry-quip overlay. Rendered at most once per user, ever:
 * the `parlorCfoQuipShown` pref (server-read in page.tsx, client-written
 * here on dismissal) enforces the latch. The overlay is a fire-and-forget
 * beat — we flip the local `quipShown` flag optimistically so a second
 * mount in the same session (e.g., after hot-nav) won't re-render it,
 * then POST the pref in the background. Any POST failure is silent: a
 * retry next visit is safer than surfacing a settings error on a cold
 * path.
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
  cfoQuipShown = true,
  initialCfoQuip = null,
  topWarmContacts = [],
  fallbackCoolingContacts = [],
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

  // Local latch. Seeded from the server pref (which is the source
  // of truth across sessions). We flip it true on dismissal — that hides
  // the overlay for the remainder of this mount AND for any subsequent
  // mount in this session (state persists via React, the pref POST
  // persists across sessions).
  const [quipShown, setQuipShown] = useState<boolean>(cfoQuipShown);

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

  /**
   * Flip the CFO-quip latch and fire the persistence POST.
   *
   * Optimistic: we set `quipShown=true` synchronously so the overlay
   * unmounts even if the POST takes a while (or fails entirely).
   * Fire-and-forget: no await, no UI for errors. A failed POST means the
   * user may see the quip again on their next visit — the expected R10.15
   * behavior is that the latch holds, but a duplicate render is a vastly
   * better failure mode than blocking the UI on a cold pref write.
   */
  const markQuipShown = useCallback((): void => {
    setQuipShown(true);
    void fetch("/api/profile/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: "parlorCfoQuipShown",
        value: { shown: true },
      }),
    }).catch(() => {
      // Silent failure — see docstring.
    });
  }, []);

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

  // Render the overlay only when ALL of:
  //   - The server pref says the latch is open (quipShown === false).
  //   - The server computed a quip (initialCfoQuip !== null). A null quip
  //     is our signal that bands lookup couldn't produce anything; we'd
  //     rather skip the beat than ship an empty bubble.
  const showCfoQuip = !quipShown && initialCfoQuip !== null;

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
          <>
            <NegotiationDraftPanel
              key={`draft-${selectedOfferId}`}
              offerId={selectedOfferId}
              convening={result}
              ceoVoiceEnabled={ceoVoiceEnabled}
            />
            <NegotiationSimulator
              key={`sim-${selectedOfferId}`}
              offer={offers.find((o) => o.id === selectedOfferId)!}
            />
            <ReferenceRequestPanel
              key={`ref-${selectedOfferId}`}
              topWarmContacts={topWarmContacts}
              fallbackCoolingContacts={fallbackCoolingContacts}
              selectedOfferId={selectedOfferId}
            />
          </>
        ) : null
      }
      signatureSlot={
        initialCfoQuip ? (
          <CFOQuipOverlay
            quip={initialCfoQuip.quip}
            show={showCfoQuip}
            onDismiss={markQuipShown}
          />
        ) : null
      }
    />
  );
}
