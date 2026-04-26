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
import { z } from "zod/v4";

const Body = z.object({ path: z.string().min(1) });
const BUCKET = "interview-audio-private";

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

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "path not owned" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .download(parsed.data.path);
  if (error || !data) {
    return NextResponse.json({ error: "download failed" }, { status: 500 });
  }
  const text = await transcribeAudio(data);
  return NextResponse.json({ text });
}
