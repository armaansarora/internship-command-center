/**
 * R5.6 — POST /api/writing-room/choose-tone
 *
 * User selects one of the three tone variants (formal / conversational /
 * bold) for a cover-letter tone group. Updates the outreach_queue row's
 * body (so the cron sender has the chosen copy) and metadata
 * (selectedCoverLetterId, selectedTone). Status remains
 * `pending_approval` — the approve route is a separate, explicit call.
 *
 * This is the FIRST of two mandatory clicks that stand between generate
 * and send. Per autopilot non-negotiable: no single-click
 * generate-and-send. The gate lives here + in /approve.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

interface ChooseToneBody {
  outreachQueueId?: string;
  coverLetterId?: string;
  tone?: "formal" | "conversational" | "bold";
}

export async function POST(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ChooseToneBody | null;
  if (!body || !body.outreachQueueId || !body.coverLetterId || !body.tone) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: "Expected { outreachQueueId, coverLetterId, tone }.",
      },
      { status: 400 },
    );
  }

  if (!["formal", "conversational", "bold"].includes(body.tone)) {
    return NextResponse.json(
      { error: "invalid_tone", message: `Unknown tone: ${body.tone}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Verify the outreach row belongs to the user AND is still pending.
  const { data: queueRow, error: queueError } = await supabase
    .from("outreach_queue")
    .select("id, status, metadata, type")
    .eq("id", body.outreachQueueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (queueError) {
    log.error("[writing-room/choose-tone] queue lookup failed", queueError, {
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
        message: `Queue row is ${queueRow.status}; tone can only be chosen while pending_approval.`,
      },
      { status: 400 },
    );
  }

  // Resolve the selected cover letter so we can copy its content into the
  // queue row's body. Verify ownership + that it sits under the expected
  // tone group.
  const currentMeta =
    typeof queueRow.metadata === "object" && queueRow.metadata !== null
      ? (queueRow.metadata as Record<string, unknown>)
      : {};
  const expectedGroup = currentMeta.toneGroupId as string | undefined;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, content, parent_id, type, generated_by")
    .eq("id", body.coverLetterId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (docError) {
    log.error("[writing-room/choose-tone] document lookup failed", docError, {
      userId: user.id,
      coverLetterId: body.coverLetterId,
    });
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json(
      { error: "document_not_found" },
      { status: 404 },
    );
  }
  if (doc.type !== "cover_letter") {
    return NextResponse.json(
      { error: "wrong_document_type" },
      { status: 400 },
    );
  }
  if (expectedGroup && doc.parent_id !== expectedGroup) {
    return NextResponse.json(
      {
        error: "tone_group_mismatch",
        message: "Cover letter doesn't belong to this approval's tone group.",
      },
      { status: 400 },
    );
  }

  const nextMeta: Record<string, unknown> = {
    ...currentMeta,
    selectedCoverLetterId: body.coverLetterId,
    selectedTone: body.tone,
  };

  const { error: updateError } = await supabase
    .from("outreach_queue")
    .update({
      body: (doc.content as string) ?? "",
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.outreachQueueId)
    .eq("user_id", user.id);

  if (updateError) {
    log.error("[writing-room/choose-tone] update failed", updateError, {
      userId: user.id,
      outreachQueueId: body.outreachQueueId,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      outreachQueueId: body.outreachQueueId,
      selectedCoverLetterId: body.coverLetterId,
      selectedTone: body.tone,
      status: "pending_approval",
    },
    { status: 200 },
  );
}
