/**
 * R10.14 — POST /api/contacts/[id]/reference-request
 *
 * The CNO drafts a reference-request email for a specific contact,
 * anchored on a specific offer. We insert the draft into `outreach_queue`
 * as type='reference_request', status='pending_approval'; the existing
 * /api/outreach/approve flow picks it up and enforces the 24h send-hold
 * via the HOLD_SECONDS_BY_TYPE map extended in R10.14's refactor.
 *
 * Contract:
 *   - 401 when unauthenticated.
 *   - 400 when body lacks offerId or offerId isn't a UUID.
 *   - 404 when the contact or offer doesn't resolve under the caller's user.
 *   - 500 when the queue insert fails.
 *   - 200 with { outreach } on happy path.
 *
 * The response body includes ONLY the inserted outreach_queue row, which
 * does NOT carry any contact privateNote content. The helper
 * draftReferenceRequest strips privateNote before serializing to the LLM
 * prompt (R8/P5 invariant — see commit history for 6b1af71).
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getContactById } from "@/lib/db/queries/contacts-rest";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { draftReferenceRequest } from "@/lib/ai/structured/reference-request";

export const maxDuration = 60;

const BodySchema = z.object({
  offerId: z.string().uuid(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const { id: contactId } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const contact = await getContactById(auth.user.id, contactId);
  if (!contact) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, parsed.data.offerId);
  if (!offer) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const draft = await draftReferenceRequest({
    userFirstName:
      (auth.user as { firstName?: string }).firstName ?? "there",
    contact,
    offer,
  });

  const { data: inserted, error } = await client
    .from("outreach_queue")
    .insert({
      user_id: auth.user.id,
      application_id: offer.application_id,
      company_id: contact.companyId,
      contact_id: contact.id,
      type: "reference_request",
      subject: draft.subject,
      body: draft.body,
      status: "pending_approval",
      generated_by: "cno",
      metadata: { offer_id: offer.id, contact_id: contact.id },
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "insert_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ outreach: inserted });
}
