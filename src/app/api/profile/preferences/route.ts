import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  REJECTION_REFLECTIONS_PREF_KEY,
  RejectionReflectionsPrefSchema,
} from "@/lib/preferences/rejection-reflections-pref";
import {
  CEO_VOICE_PREF_KEY,
  CeoVoicePrefSchema,
} from "@/lib/preferences/ceo-voice-pref";
import {
  PARLOR_DOOR_SEEN_PREF_KEY,
  ParlorDoorSeenPrefSchema,
} from "@/lib/preferences/parlor-door-seen-pref";
import {
  PARLOR_CFO_QUIP_PREF_KEY,
  ParlorCfoQuipPrefSchema,
} from "@/lib/preferences/parlor-cfo-quip-pref";

/**
 * POST /api/profile/preferences
 *
 * Generic merge endpoint for `user_profiles.preferences` jsonb. The
 * route is a controlled key/value setter: only known keys are accepted,
 * and each known key has its own per-key Zod schema for the value.
 *
 * Body: { key: string, value: unknown }
 *
 * Implementation: read-modify-write the jsonb. The race window between read
 * and write is small and the merge is field-level, so two concurrent writes
 * to different keys are safe; two writes to the same key collapse to the
 * last writer wins, which is fine for user-driven preference toggles that
 * are rarely concurrent.
 *
 * Whitelisted keys:
 *   - "rejectionReflections" → { enabled: boolean }   (R9.6)
 *   - "ceoVoice"             → { enabled: boolean }   (R10.1)
 *   - "parlorDoorSeen"       → { seen: boolean }      (R10.1)
 *   - "parlorCfoQuipShown"   → { shown: boolean }     (R10.1)
 */

const PREF_VALUE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  [REJECTION_REFLECTIONS_PREF_KEY]: RejectionReflectionsPrefSchema,
  [CEO_VOICE_PREF_KEY]: CeoVoicePrefSchema,
  [PARLOR_DOOR_SEEN_PREF_KEY]: ParlorDoorSeenPrefSchema,
  [PARLOR_CFO_QUIP_PREF_KEY]: ParlorCfoQuipPrefSchema,
};

const BodySchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { key, value } = parsed.data;

  const valueSchema = PREF_VALUE_SCHEMAS[key];
  if (!valueSchema) {
    return NextResponse.json({ error: "unknown_key" }, { status: 400 });
  }

  const valueParsed = valueSchema.safeParse(value);
  if (!valueParsed.success) {
    return NextResponse.json(
      { error: "invalid_value", details: valueParsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: row, error: readErr } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json(
      { error: readErr.message },
      { status: 500 },
    );
  }

  const current =
    row && typeof row.preferences === "object" && row.preferences !== null
      ? (row.preferences as Record<string, unknown>)
      : {};
  const next: Record<string, unknown> = {
    ...current,
    [key]: valueParsed.data,
  };

  const { error: writeErr } = await supabase
    .from("user_profiles")
    .update({ preferences: next })
    .eq("id", auth.user.id);

  if (writeErr) {
    return NextResponse.json(
      { error: writeErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
