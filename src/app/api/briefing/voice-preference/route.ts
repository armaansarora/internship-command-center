/**
 * PUT /api/briefing/voice-preference
 *
 * Lets the user flip voice_recording_enabled and optionally latch the
 * permanent-disable bit. Returns the fresh DrillPrefs so the UI can
 * re-render without a second round-trip.
 *
 * Safety layers:
 *   - 400 on bad body (Zod).
 *   - 410 when trying to enable while voice_recording_permanently_disabled
 *     is true (one-way latch — respected here and at every other voice
 *     endpoint).
 *   - permanentlyDisable:true is terminal. Helper writes both columns in a
 *     single update so the UI flip is atomic.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import {
  setVoiceEnabled,
  permanentlyDisableVoice,
  readDrillPrefs,
} from "@/lib/db/queries/drill-prefs-rest";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/http/request-body";
import { z } from "zod/v4";

const Body = z.object({
  enabled: z.boolean().optional(),
  permanentlyDisable: z.boolean().optional(),
});

export async function PUT(req: NextRequest): Promise<Response> {
  const user = await requireUser();
  const rate = await withRateLimit(user.id, "C");
  if (rate.response) return rate.response;

  const raw = await readJsonBodyWithLimit(req, DEFAULT_JSON_BODY_MAX_BYTES);
  if (!raw.ok) {
    return NextResponse.json({ error: raw.error }, { status: raw.status });
  }

  const parsed = Body.safeParse(raw.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const body = parsed.data;

  if (body.permanentlyDisable === true) {
    await permanentlyDisableVoice(user.id);
    return NextResponse.json(await readDrillPrefs(user.id));
  }

  if (body.enabled !== undefined) {
    const result = await setVoiceEnabled(user.id, body.enabled);
    if (!result.ok && result.reason === "permanently_disabled") {
      return NextResponse.json(
        { error: "voice permanently disabled" },
        { status: 410 },
      );
    }
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? "update failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(await readDrillPrefs(user.id));
}
