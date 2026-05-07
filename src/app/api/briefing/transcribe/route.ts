/**
 * POST /api/briefing/transcribe
 *
 * Downloads an opt-in audio blob from interview-audio-private, hands it to
 * Whisper, and returns the transcribed text. The three-layer gate:
 *   - 410 when voice_recording_permanently_disabled
 *   - 403 when voice_recording_enabled is false
 *   - 403 when the requested path does not start with the caller's userId —
 *     defence-in-depth against a crafted-path IDOR even though the admin
 *     client bypasses RLS by design
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { readDrillPrefs } from "@/lib/db/queries/drill-prefs-rest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/speech/transcribe";
import { consumeAiQuota } from "@/lib/ai/quota";
import { getUserTier } from "@/lib/stripe/entitlements";
import { log } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { z } from "zod/v4";

function userAudioPathSchema(userId: string): z.ZodString {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return z
    .string()
    .max(500)
    .regex(
      new RegExp(
        `^${escapedUserId}/[0-9a-fA-F-]{36}/[A-Za-z0-9_-]{1,128}\\.(webm|m4a)$`,
      ),
    );
}

const Body = z.object({ path: z.string().min(1).max(500) });
const BUCKET = "interview-audio-private";

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireUser();
  const rate = await withRateLimit(user.id, "B");
  if (rate.response) return rate.response;

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

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  if (!userAudioPathSchema(user.id).safeParse(parsed.data.path).success) {
    return NextResponse.json({ error: "path not owned" }, { status: 403 });
  }

  const tier = await getUserTier(user.id);
  const quota = await consumeAiQuota(user.id, tier);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "ai_quota_exceeded", used: quota.used, cap: quota.cap },
      { status: 429 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .download(parsed.data.path);
  if (error || !data) {
    return NextResponse.json({ error: "download failed" }, { status: 500 });
  }
  let text: string | null = null;
  let transcriptionError: unknown = null;
  try {
    text = await transcribeAudio(data);
  } catch (err) {
    transcriptionError = err;
  }

  const { error: cleanupError } = await admin.storage
    .from(BUCKET)
    .remove([parsed.data.path]);

  if (cleanupError) {
    log.error("briefing.transcribe.cleanup_failed", cleanupError, {
      userId: user.id,
      path: parsed.data.path,
    });
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }

  if (transcriptionError) {
    log.error("briefing.transcribe.failed", transcriptionError, {
      userId: user.id,
      path: parsed.data.path,
    });
    return NextResponse.json({ error: "transcription failed" }, { status: 500 });
  }

  return NextResponse.json({ text });
}
