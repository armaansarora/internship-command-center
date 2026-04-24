/**
 * R10.7 — POST /api/offers/[id]/convene
 *
 * The Negotiation Parlor's "Convene" button hits this endpoint. We resolve
 * the offer, look up comp bands (cache-first), then fan out the three
 * seats in parallel via `convenePipelineForOffer`.
 *
 * Contract:
 *   - 401 when unauthenticated.
 *   - 404 when the offer doesn't exist or isn't owned by the caller.
 *   - 200 with `{ result, bands }` on happy path. `result` is the typed
 *     three-block convening output; `bands` is the LookupResult so the UI
 *     can render the pin-stack (R10.8) with the same data.
 *
 * The bands payload is passed to the pipeline only when `lookupCompBands`
 * resolves `ok:true`. `ok:false` branches (no key, over budget, empty)
 * pass `null` through — the Offer Evaluator's system prompt knows how to
 * down-weight thin-data situations.
 */
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { convenePipelineForOffer } from "@/lib/ai/agents/parlor-convening";
import { lookupCompBands } from "@/lib/comp-bands/lookup";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, id);
  if (!offer) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  const bands = await lookupCompBands(client, admin, {
    company: offer.company_name,
    role: offer.role,
    location: offer.location,
    level: offer.level ?? undefined,
  });

  const result = await convenePipelineForOffer({
    userId: auth.user.id,
    userFirstName:
      (auth.user as { firstName?: string }).firstName ?? "there",
    offer,
    bands: bands.ok ? bands : null,
  });

  return NextResponse.json({ result, bands });
}
