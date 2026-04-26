/**
 * POST/GET /api/offers
 *
 * POST creates a new offer row (scoped to the authenticated user via RLS).
 * GET lists all offers owned by the user, newest `received_at` first.
 *
 * Validation is strict: extra keys on the POST body are rejected to keep
 * callers honest about the offer shape. The Penthouse ingest flow and the
 * manual-entry form both hit POST; the Parlor door-materialization gate,
 * pin-stack comp chart, and CFO quip selector all read through GET.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  insertOffer,
  getOffersForUser,
} from "@/lib/db/queries/offers-rest";

const CreateOfferSchema = z
  .object({
    applicationId: z.string().uuid().nullable().optional(),
    companyName: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    level: z.string().max(50).nullable().optional(),
    location: z.string().min(1).max(200),
    base: z.number().int().min(0),
    bonus: z.number().int().min(0).optional(),
    equity: z.number().int().min(0).optional(),
    signOn: z.number().int().min(0).optional(),
    housing: z.number().int().min(0).optional(),
    startDate: z.string().date().nullable().optional(),
    deadlineAt: z.string().datetime().nullable().optional(),
    benefits: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = CreateOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const row = await insertOffer(supabase, {
    userId: auth.user.id,
    ...parsed.data,
  });
  return NextResponse.json({ offer: row });
}

export async function GET(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const offers = await getOffersForUser(supabase, auth.user.id);
  return NextResponse.json({ offers });
}
