/**
 * POST /api/briefing/audio-upload
 *
 * Accepts a single audio blob per drill-question, writes it into the
 * private `interview-audio-private` bucket keyed by
 * <userId>/<drillId>/<questionId>.<ext>. Server-role only — never exposed
 * client-side (the bucket is private and has no public URL path).
 *
 * Gate layer 2 of 3 (UI toggle in R6.6, storage RLS in migration):
 *   - 410 when voice_recording_permanently_disabled (one-way latch)
 *   - 403 when voice_recording_enabled is false (opt-in required)
 *   - 400 on bad query/body
 *   - 413 over the 10 MB cap
 *   - 415 on unsupported mime
 *   - 200 on happy path, echoing the storage key so the client can chain
 *     /api/briefing/transcribe
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readDrillPrefs } from "@/lib/db/queries/drill-prefs-rest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod/v4";

const ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/x-m4a",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB cap
const BUCKET = "interview-audio-private";

const Query = z.object({
  drillId: z.string().uuid(),
  questionId: z.string().min(1).max(128),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireUser();
  const prefs = await readDrillPrefs(user.id);
  if (prefs.voiceRecordingPermanentlyDisabled) {
    return NextResponse.json(
      { error: "voice permanently disabled" },
      { status: 410 },
    );
  }
  if (!prefs.voiceRecordingEnabled) {
    return NextResponse.json(
      { error: "voice recording opt-in required" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }

  const form = await req.formData();
  const blob = form.get("audio");
  if (!(blob instanceof Blob)) {
    return NextResponse.json({ error: "audio blob required" }, { status: 400 });
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: "audio too large" }, { status: 413 });
  }
  if (blob.type && !ALLOWED_MIME.has(blob.type)) {
    return NextResponse.json(
      { error: `unsupported mime: ${blob.type}` },
      { status: 415 },
    );
  }

  const ext =
    blob.type.includes("mp4") || blob.type.includes("m4a") ? "m4a" : "webm";
  const key = `${user.id}/${parsed.data.drillId}/${parsed.data.questionId}.${ext}`;

  const admin = getSupabaseAdmin();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(key, blob, {
      contentType: blob.type || "audio/webm",
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ path: key });
}
