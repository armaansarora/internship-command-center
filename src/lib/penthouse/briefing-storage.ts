/**
 * Briefing storage — encode/decode a structured {@link MorningBriefing} to
 * and from the `notifications.body` field.
 *
 * Brief R2 says "pre-compute during cron sync and persist to notifications".
 * To avoid a new migration we JSON-encode the structured briefing and prefix
 * it with `[briefing_v2]`. Callers that don't parse the prefix simply see a
 * long string body — no breakage.
 *
 * Decoding is defensive: missing, malformed, or legacy (plain-text) bodies
 * are wrapped into a minimal one-beat briefing so the Penthouse scene never
 * shows a broken state. The scene treats legacy briefings the same as rich
 * ones; only the data-cue is coarser.
 */
import {
  MorningBriefingSchema,
  renderBriefingScript,
  type MorningBriefing,
} from "@/lib/ai/agents/morning-briefing";

export const BRIEFING_PREFIX = "[briefing_v2]";

/**
 * Serialize a briefing to the notifications.body shape. Always produces a
 * string that `decodeBriefing` round-trips losslessly.
 */
export function encodeBriefing(b: MorningBriefing): string {
  const validated = MorningBriefingSchema.parse(b);
  return `${BRIEFING_PREFIX}${JSON.stringify(validated)}`;
}

/**
 * Parse a body back into a structured briefing. Behaviour:
 *   - `null` / empty → `null`
 *   - starts with `[briefing_v2]` → parse the remainder as JSON, validate;
 *     returns the briefing on success, returns a legacy wrap on JSON / schema
 *     failure (keeps the scene alive even on corrupt bodies).
 *   - any other string → treat as legacy plain-text; wrap into a one-beat
 *     briefing with `mood: 'cautious'` and `weather_hint: 'cool'`.
 */
export function decodeBriefing(body: string | null | undefined): MorningBriefing | null {
  if (body === null || body === undefined) return null;
  const trimmed = body.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.startsWith(BRIEFING_PREFIX)) {
    const jsonPart = trimmed.slice(BRIEFING_PREFIX.length);
    try {
      const parsed = JSON.parse(jsonPart);
      const validated = MorningBriefingSchema.parse(parsed);
      return validated;
    } catch {
      // Malformed v2 body — drop to legacy wrap so the scene still paints.
      return wrapLegacy(trimmed.slice(BRIEFING_PREFIX.length));
    }
  }

  return wrapLegacy(trimmed);
}

/**
 * Wrap a plain-text briefing body (the shape the old cron wrote) into a
 * minimal structured briefing. The scene gets one beat; mood is neutral.
 *
 * Exported for tests and for callers that want to canonicalise legacy
 * bodies on read.
 */
export function wrapLegacy(plain: string): MorningBriefing {
  const text = plain.trim().slice(0, 400);
  const beats = splitLegacyIntoBeats(text);
  return {
    version: "v2",
    generated_at: new Date(0).toISOString(),
    script: renderBriefingScript({ beats }),
    beats,
    mood: "cautious",
    weather_hint: "cool",
  };
}

// Legacy bodies are sentence-concatenations like
// "Morning, Armaan. Pipeline: 5 active ops. ⚠ 3 stale ops need attention."
// We split on ". " boundaries (or the known separators) to recover beats.
function splitLegacyIntoBeats(text: string): MorningBriefing["beats"] {
  const chunks = text
    .split(/(?<=[.!?])\s+(?=[A-Z⚠📬])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const beats: MorningBriefing["beats"] = chunks.slice(0, 6).map((chunk) => {
    // Cap per-beat length to satisfy the schema.
    const text = chunk.length > 140 ? chunk.slice(0, 137) + "…" : chunk;
    const tone: MorningBriefing["beats"][number]["tone"] = chunk.startsWith("⚠")
      ? "warning"
      : "steady";
    return { tone, text };
  });

  // Schema requires min 3 beats. Pad with a neutral reflective filler that
  // stays in-voice (rather than a dashed placeholder that would read wrong).
  const fillers = [
    "Nothing else on the wire yet.",
    "Everything else can wait.",
    "Let's take the morning as it comes.",
  ];
  let i = 0;
  while (beats.length < 3) {
    beats.push({ tone: "reflective", text: fillers[i % fillers.length] });
    i += 1;
  }

  return beats;
}
