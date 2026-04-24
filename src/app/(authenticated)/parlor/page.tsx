import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import {
  countOffersForUser,
  getOffersForUser,
} from "@/lib/db/queries/offers-rest";
import { readCeoVoicePref } from "@/lib/preferences/ceo-voice-pref";
import { ParlorClient } from "./parlor-client";

export const metadata: Metadata = { title: "The Negotiation Parlor | The Tower" };

/**
 * R10.6 — The Negotiation Parlor (C-Suite annex).
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
 *   4. Otherwise load offers + ceoVoice pref and render the client scene.
 *
 * R10.7 added the three-chair convening; R10.8 populates the back-wall
 * chart; R10.11 threads the ceoVoice pref (default OFF) through to the
 * NegotiationDraftPanel so the read-aloud button can gate itself.
 */
export default async function ParlorPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const supabase = await createClient();
  const count = await countOffersForUser(supabase, user.id);
  if (count === 0) redirect("/c-suite");
  const offers = await getOffersForUser(supabase, user.id);

  // R10.11 — Seed the CEO voice toggle (Layer 1 of the three-layer gate).
  // Defensive read: any malformed preferences blob falls back to OFF.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();
  const ceoVoicePref = readCeoVoicePref(
    (profile as { preferences?: unknown } | null)?.preferences ?? null,
  );

  return <ParlorClient offers={offers} ceoVoiceEnabled={ceoVoicePref.enabled} />;
}
