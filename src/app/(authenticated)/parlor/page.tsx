import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  countOffersForUser,
  getOffersForUser,
} from "@/lib/db/queries/offers-rest";
import { getContactsForAgent } from "@/lib/db/queries/contacts-rest";
import { readCeoVoicePref } from "@/lib/preferences/ceo-voice-pref";
import { readParlorCfoQuipPref } from "@/lib/preferences/parlor-cfo-quip-pref";
import { lookupCompBands } from "@/lib/comp-bands/lookup";
import { positionFor, cfoQuipForPosition } from "@/lib/parlor/cfo-quip";
import { ParlorClient } from "./parlor-client";

export const metadata: Metadata = { title: "The Negotiation Parlor | The Tower" };

/**
 * The Negotiation Parlor (C-Suite annex).
 *
 * Gated server-side: a user with zero offers cannot enter. The R10.5 door
 * is absent from the C-Suite when `offerCount === 0`, and this route also
 * redirects to `/c-suite` for the same condition. Two independent guards,
 * one contract: no empty Parlor.
 *
 * Data-load order:
 *   1. Auth (redirects to /lobby via `requireUser`).
 *   2. Count offers (cheap `head: true` query).
 *   3. If zero → redirect away.
 *   4. Otherwise load offers + preferences, optionally compute the CFO
 *      entry-quip, and render the client scene.
 *
 * R10.7 added the three-chair convening; R10.8 populates the back-wall
 * chart; R10.11 threads the ceoVoice pref (default OFF) through to the
 * NegotiationDraftPanel so the read-aloud button can gate itself.
 *
 * CFO quip on first parlor entry (once, ever). When
 * `parlorCfoQuipShown.shown === false` AND comp bands are available for
 * the newest offer (the Parlor's default selection), we compute the
 * position + quip server-side and pass both down to the client. The
 * client renders the overlay only when the pref says it hasn't been
 * shown; dismissal POSTs the latch so the CFO stays silent on every
 * subsequent visit.
 *
 * Skipping the quip computation on already-shown users avoids an
 * otherwise-unnecessary Firecrawl credit spend — if we're not going to
 * render, we don't need the bands.
 */
export default async function ParlorPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const supabase = await createClient();
  const count = await countOffersForUser(supabase, user.id);
  if (count === 0) redirect("/c-suite");
  const offers = await getOffersForUser(supabase, user.id);

  // top-3 warm contacts for the reference-request panel.
  // Tiered fallback: if no warm contacts, fetch cooling contacts so the
  // panel can coach the user to re-warm before asking for a reference.
  const { contacts: topWarmContacts } = await getContactsForAgent(user.id, {
    warmth: "warm",
    sortBy: "recent_desc",
    limit: 3,
  });
  const { contacts: fallbackCoolingContacts } =
    topWarmContacts.length === 0
      ? await getContactsForAgent(user.id, {
          warmth: "cooling",
          sortBy: "recent_desc",
          limit: 3,
        })
      : { contacts: [] };

  // R10.11 + R10.12 — Seed preferences. Defensive reads so any malformed
  // preferences blob falls back to safe defaults (voice OFF, quip shown
  // = false so the first-entry experience plays once).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();
  const preferences =
    (profile as { preferences?: unknown } | null)?.preferences ?? null;
  const ceoVoicePref = readCeoVoicePref(preferences);
  const cfoQuipPref = readParlorCfoQuipPref(preferences);

  // Only compute the entry-quip when we'd actually render it.
  // `cfoQuipPref.shown === true` means the user has already seen it; we
  // short-circuit. When unshown, we read comp bands for the user's
  // newest offer (same offer the ParlorClient default-selects) and
  // resolve the position → copy via the pure helpers.
  let initialCfoQuip: { quip: string } | null = null;
  if (!cfoQuipPref.shown) {
    const firstOffer = offers[0];
    if (firstOffer) {
      try {
        const admin = getSupabaseAdmin();
        const bands = await lookupCompBands(supabase, admin, {
          company: firstOffer.company_name,
          role: firstOffer.role,
          location: firstOffer.location,
          level: firstOffer.level ?? undefined,
        });
        if (bands.ok) {
          const pos = positionFor(
            firstOffer.base,
            bands.base.p25,
            bands.base.p50,
            bands.base.p75,
          );
          const quip = cfoQuipForPosition(pos, {
            base: firstOffer.base,
            p25: bands.base.p25,
          });
          initialCfoQuip = { quip };
        } else {
          // Thin-data / no-key / over-budget → the CFO still has a line
          // for that; we want the user to hear it once.
          const quip = cfoQuipForPosition("thin_data", {
            base: firstOffer.base,
          });
          initialCfoQuip = { quip };
        }
      } catch {
        // Any failure in bands lookup shouldn't block Parlor entry —
        // the overlay is a signature beat, not load-bearing. Skip it;
        // the pref stays unshown and the user gets a retry next visit.
        initialCfoQuip = null;
      }
    }
  }

  return (
    <ParlorClient
      offers={offers}
      ceoVoiceEnabled={ceoVoicePref.enabled}
      cfoQuipShown={cfoQuipPref.shown}
      initialCfoQuip={initialCfoQuip}
      topWarmContacts={topWarmContacts}
      fallbackCoolingContacts={fallbackCoolingContacts}
    />
  );
}
