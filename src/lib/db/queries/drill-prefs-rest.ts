/**
 * Drill preferences REST helpers.
 *
 * Exposes the three user_profiles columns that gate voice recording end-to-
 * end:
 *   - voice_recording_enabled            — opt-in flip, default false
 *   - voice_recording_permanently_disabled — one-way latch, default false
 *   - drill_preferences                  — interruptFirmness + timerSeconds
 *
 * Called by /api/briefing/voice-preference (PUT), /api/briefing/audio-upload
 * (POST), and /api/briefing/transcribe (POST). Every route that touches
 * audio MUST read prefs first and 403 when not enabled, 410 when permanently
 * disabled. Partner constraint: "a half-gated voice path is worse than no
 * voice path" — the gate lives at every API boundary, not just the UI.
 */
import { createClient } from "@/lib/supabase/server";

export interface DrillPrefs {
  voiceRecordingEnabled: boolean;
  voiceRecordingPermanentlyDisabled: boolean;
  drillPreferences: {
    interruptFirmness: "gentle" | "firm" | "hardass";
    timerSeconds: number;
  };
}

const DEFAULT_PREFS: DrillPrefs = {
  voiceRecordingEnabled: false,
  voiceRecordingPermanentlyDisabled: false,
  drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
};

export async function readDrillPrefs(userId: string): Promise<DrillPrefs> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("user_profiles")
    .select(
      "voice_recording_enabled, voice_recording_permanently_disabled, drill_preferences",
    )
    .eq("id", userId)
    .single();
  if (error || !data) return DEFAULT_PREFS;

  const dp =
    (data.drill_preferences ?? null) as DrillPrefs["drillPreferences"] | null;
  return {
    voiceRecordingEnabled: Boolean(data.voice_recording_enabled),
    voiceRecordingPermanentlyDisabled: Boolean(
      data.voice_recording_permanently_disabled,
    ),
    drillPreferences: dp ?? DEFAULT_PREFS.drillPreferences,
  };
}

export async function setVoiceEnabled(
  userId: string,
  enabled: boolean,
): Promise<{ ok: boolean; reason?: "permanently_disabled" | string }> {
  const prefs = await readDrillPrefs(userId);
  if (prefs.voiceRecordingPermanentlyDisabled && enabled) {
    return { ok: false, reason: "permanently_disabled" };
  }
  const sb = await createClient();
  const { error } = await sb
    .from("user_profiles")
    .update({ voice_recording_enabled: enabled })
    .eq("id", userId);
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function permanentlyDisableVoice(userId: string): Promise<void> {
  const sb = await createClient();
  await sb
    .from("user_profiles")
    .update({
      voice_recording_enabled: false,
      voice_recording_permanently_disabled: true,
    })
    .eq("id", userId);
}
