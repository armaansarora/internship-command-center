/**
 * POST /api/writing-room/approve
 *
 * Flips a cover_letter_send outreach_queue row from pending_approval →
 * approved. The outreach-sender cron picks it up from there and sends.
 *
 * Non-negotiable gate (per autopilot brief): this is the SECOND
 * mandatory click. Must have selectedCoverLetterId already set in
 * metadata (via the /choose-tone route). If not set, rejected 400
 * `no_tone_chosen` — this is the whole point of the gate.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { log } from "@/lib/logger";

interface ApproveBody {
  outreachQueueId?: string;
}

const MAX_ID_LEN = 200;

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ApproveBody | null;
  if (!body || !body.outreachQueueId) {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected { outreachQueueId }." },
      { status: 400 },
    );
  }
  if (typeof body.outreachQueueId !== "string" || body.outreachQueueId.length > MAX_ID_LEN) {
    return NextResponse.json(
      { error: "invalid_body", message: "outreachQueueId must be a short string." },
      { status: 400 },
    );
  }

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
  }

  const supabase = await createClient();

  const { data: queueRow, error: queueError } = await supabase
    .from("outreach_queue")
    .select("id, status, metadata, type, body")
    .eq("id", body.outreachQueueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (queueError) {
    log.error("[writing-room/approve] queue lookup failed", queueError, {
      userId: user.id,
      outreachQueueId: body.outreachQueueId,
    });
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!queueRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (queueRow.type !== "cover_letter_send") {
    return NextResponse.json(
      { error: "wrong_type", message: "Not a cover-letter-send queue row." },
      { status: 400 },
    );
  }
  if (queueRow.status !== "pending_approval") {
    return NextResponse.json(
      {
        error: "wrong_status",
        message: `Queue row is ${queueRow.status}; only pending_approval rows can be approved.`,
      },
      { status: 400 },
    );
  }

  const meta =
    typeof queueRow.metadata === "object" && queueRow.metadata !== null
      ? (queueRow.metadata as Record<string, unknown>)
      : {};
  const selectedCoverLetterId = meta.selectedCoverLetterId as string | null | undefined;

  // THE GATE. Do not let approve fire without a tone choice.
  if (!selectedCoverLetterId) {
    return NextResponse.json(
      {
        error: "no_tone_chosen",
        message:
          "Pick a tone first via /api/writing-room/choose-tone. Approve must be a separate, explicit click after selection.",
      },
      { status: 400 },
    );
  }

  // Defense-in-depth — the body must be populated (choose-tone sets it).
  if (!queueRow.body || (queueRow.body as string).trim().length === 0) {
    return NextResponse.json(
      {
        error: "empty_body",
        message: "Queue row has no letter content — re-run choose-tone.",
      },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", body.outreachQueueId)
    .eq("user_id", user.id)
    .eq("status", "pending_approval"); // optimistic concurrency

  if (updateError) {
    log.error("[writing-room/approve] approve update failed", updateError, {
      userId: user.id,
      outreachQueueId: body.outreachQueueId,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      outreachQueueId: body.outreachQueueId,
      status: "approved",
      approvedAt: nowIso,
    },
    { status: 200 },
  );
}
