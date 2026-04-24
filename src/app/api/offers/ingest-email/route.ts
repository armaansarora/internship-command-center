/**
 * R10 post-mortem — POST /api/offers/ingest-email
 *
 * Closes GAP A from the R10 Proof-line audit: the Proof line says "Offer
 * arriving via email parses INTO the offers table" but the original
 * POST /api/offers only accepts pre-parsed structured JSON. This route
 * takes raw email text, runs it through `parseOfferEmail`, and inserts
 * the result — the real end-to-end chain the Proof line described.
 *
 * Intended consumers:
 *   - Future email webhook (SendGrid / Resend / Gmail forwarding rule →
 *     /api/offers/ingest-email with the email body).
 *   - Penthouse manual-paste surface where the user pastes an offer email.
 *
 * Unparseable emails (parser returns null — typically no company name or
 * no base salary extractable) return 422 with a reason, so callers can
 * surface "paste didn't parse, enter manually" UX. This matches the
 * existing Penthouse fallback path intent.
 *
 * Date handling: `parseOfferEmail` returns YYYY-MM-DD for both startDate
 * and deadlineAt. `startDate` is a date column — date-only is correct.
 * `deadlineAt` is a timestamptz column — coerce to midnight-UTC datetime
 * before insert. (The POST /api/offers structured-JSON path hits the
 * same Zod schema that requires datetime; callers there already pass
 * datetime. This route handles the coercion so email ingest is a clean
 * one-shot.)
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { insertOffer } from "@/lib/db/queries/offers-rest";
import { parseOfferEmail } from "@/lib/offers/parse-offer-email";

const IngestEmailSchema = z
  .object({
    subject: z.string().max(500).default(""),
    emailText: z.string().min(1).max(50_000),
    applicationId: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = IngestEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const extracted = await parseOfferEmail({
    subject: parsed.data.subject,
    body: parsed.data.emailText,
  });

  if (!extracted) {
    return NextResponse.json(
      {
        error: "unparseable",
        reason:
          "Could not extract a company name and base salary from the email. Try the manual entry form.",
      },
      { status: 422 },
    );
  }

  // parseOfferEmail yields date-only ISO ("2026-05-01") — coerce to a
  // midnight-UTC timestamptz for the offers.deadline_at column.
  const deadlineAtDatetime = extracted.deadlineAt
    ? `${extracted.deadlineAt}T00:00:00.000Z`
    : null;

  const supabase = await createClient();
  const row = await insertOffer(supabase, {
    userId: auth.user.id,
    applicationId: parsed.data.applicationId ?? null,
    companyName: extracted.companyName,
    role: extracted.role,
    level: extracted.level,
    location: extracted.location,
    base: extracted.base,
    bonus: extracted.bonus,
    equity: extracted.equity,
    signOn: extracted.signOn,
    housing: extracted.housing,
    startDate: extracted.startDate,
    deadlineAt: deadlineAtDatetime,
  });

  return NextResponse.json({ offer: row }, { status: 201 });
}
