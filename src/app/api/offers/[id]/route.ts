/**
 * GET/PATCH /api/offers/[id]
 *
 * GET returns a single offer owned by the user (404 otherwise — never reveal
 * row existence across user boundaries). PATCH mutates the status enum only;
 * the Negotiation Parlor transitions an offer through
 * received → negotiating → accepted|declined|expired|withdrawn.
 *
 * All writes go through RLS (auth.uid() = user_id); the 404 from
 * `getOfferById` on a non-owned row is a defense-in-depth belt on top.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  getOfferById,
  updateOfferStatus,
} from "@/lib/db/queries/offers-rest";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";

const StatusSchema = z.enum([
  "received",
  "negotiating",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
]);

const UpdateOfferSchema = z
  .object({
    status: StatusSchema,
  })
  .strict();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const rate = await withRateLimit(auth.user.id, "A");
  if (rate.response) return rate.response;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const supabase = await createClient();
  const offer = await getOfferById(supabase, auth.user.id, id);
  if (!offer) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ offer });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const rate = await withRateLimit(auth.user.id, "C");
  if (rate.response) return rate.response;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const raw = await readJsonBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!raw.ok) {
    return NextResponse.json({ error: raw.error }, { status: raw.status });
  }

  const parsed = UpdateOfferSchema.safeParse(raw.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const existing = await getOfferById(supabase, auth.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await updateOfferStatus(supabase, auth.user.id, id, parsed.data.status);
  return NextResponse.json({ success: true });
}
