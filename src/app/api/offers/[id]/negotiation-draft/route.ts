/**
 * POST /api/offers/[id]/negotiation-draft
 *
 * The Negotiation Parlor's final beat: the Offer Evaluator drafts the
 * negotiation email for a specific offer, optionally anchored on the
 * three-chair convening result the client already has. We insert the
 * draft into `outreach_queue` as `type='negotiation'`,
 * `status='pending_approval'` — the existing Writing-Room approve/send
 * flow takes it from there.
 *
 * Contract:
 *   - 401 when unauthenticated.
 *   - 404 when the offer doesn't exist or isn't owned by the caller.
 *   - 503 when the AI draft helper errors or times out (retryable).
 *   - 500 when the queue insert fails.
 *   - 200 with `{ outreach }` on happy path — the inserted
 *     outreach_queue row (id, subject, body, type='negotiation', …).
 *
 * The request body is optional: `{ convening?: ParlorConveningResult | null }`.
 * When absent, we pass `null` through — the draft helper falls back to
 * generic-market copy and negotiates on terms rather than numbers.
 *
 * The outreach_queue.type CHECK constraint permits 'negotiation' since
 * R10.1 (see migration 0020, line 147).
 */
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOfferById } from "@/lib/db/queries/offers-rest";
import { draftNegotiationEmail } from "@/lib/ai/structured/negotiation-draft";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";
import { log } from "@/lib/logger";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readRawBodyWithLimit,
} from "@/lib/http/request-body";

export const maxDuration = 60;

const MAX_CONVENING_BYTES = 5_000;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const rate = await withRateLimit(auth.user.id, "B");
  if (rate.response) return rate.response;

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const client = await createClient();
  const offer = await getOfferById(client, auth.user.id, id);
  if (!offer) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bodyResult = await readRawBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status },
    );
  }
  const bodyText = new TextDecoder().decode(bodyResult.bytes).trim();
  let body: { convening?: ParlorConveningResult | null } = {};
  if (bodyText.length > 0) {
    try {
      body = JSON.parse(bodyText) as { convening?: ParlorConveningResult | null };
    } catch {
      return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
    }
  }
  const convening = body?.convening ?? null;

  // Defence against token-cost DOS via crafted convening payloads.
  if (convening !== null) {
    let serialized: string;
    try {
      serialized = JSON.stringify(convening);
    } catch {
      return NextResponse.json({ error: "invalid_convening" }, { status: 400 });
    }
    if (serialized.length > MAX_CONVENING_BYTES) {
      return NextResponse.json(
        { error: "convening_too_large", bytes: serialized.length, cap: MAX_CONVENING_BYTES },
        { status: 400 },
      );
    }
  }

  const tier = await getUserTier(auth.user.id);
  const quota = await consumeAiQuota(auth.user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
  }

  let draft;
  try {
    draft = await draftNegotiationEmail({
      userFirstName:
        (auth.user as { firstName?: string }).firstName ?? "there",
      offer,
      convening,
    });
  } catch (err) {
    // AI provider error (rate limit, upstream 5xx, malformed completion).
    // Fail with a clean retryable 503 instead of a raw 500, matching the
    // offers/[id]/simulate pattern.
    log.error("offers.negotiation_draft.ai_failed", err, {
      userId: auth.user.id,
      offerId: offer.id,
    });
    return NextResponse.json({ error: "draft_failed" }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const { data: inserted, error } = await admin
    .from("outreach_queue")
    .insert({
      user_id: auth.user.id,
      application_id: offer.application_id,
      company_id: null,
      contact_id: null,
      type: "negotiation",
      subject: draft.subject,
      body: draft.body,
      status: "pending_approval",
      generated_by: "offer_evaluator",
      metadata: { offer_id: offer.id },
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ outreach: inserted });
}
