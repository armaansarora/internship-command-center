import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import {
  countOffersForUser,
  getOffersForUser,
} from "@/lib/db/queries/offers-rest";
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
 *   4. Otherwise load offers and render the client scene.
 *
 * R10.7 will add the three-chair convening; R10.8 will populate the
 * back-wall pin-stack chart slot. Both placeholder slots are rendered here
 * so the scene composition is stable across those follow-ups.
 */
export default async function ParlorPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const supabase = await createClient();
  const count = await countOffersForUser(supabase, user.id);
  if (count === 0) redirect("/c-suite");
  const offers = await getOffersForUser(supabase, user.id);
  return <ParlorClient offers={offers} />;
}
