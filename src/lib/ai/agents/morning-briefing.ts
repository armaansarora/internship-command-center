/**
 * Morning Briefing — the CEO's structured pre-compute for the Penthouse.
 *
 * Runs in the daily briefing cron. Takes the user's overnight activity, returns
 * a conversational beats[] that the Penthouse scene unfolds on glass. Not a
 * broadcast — a first-minute-of-the-day moment.
 *
 * Structure lets the scene reveal one beat at a time, tint by tone, and lets
 * a future voice layer read the same beats without a parallel representation.
 */
import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { getCachedSystem } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const BriefingBeatSchema = z.object({
  tone: z
    .enum(["steady", "warm", "urgent", "reflective", "warning"])
    .describe(
      "Delivery mood for this one line. Drives scene color and pacing. 'steady' is the default; use 'urgent' only when action is actually required today."
    ),
  text: z
    .string()
    .min(6)
    .max(140)
    .describe(
      "One sentence, ≤ 120 chars. No exclamation marks except for genuine urgency. No emoji. No 'Welcome back!'. Speak like a person, not a dashboard."
    ),
  data_cue: z
    .enum([
      "new_app",
      "offer",
      "rejection",
      "stale",
      "interview_invite",
      "quiet",
      "reflection",
    ])
    .optional()
    .describe(
      "Which overnight signal this beat is grounded in. Used by the scene for side rendering (envelope icon, badge). Leave absent for pure framing beats."
    ),
});
export type BriefingBeat = z.infer<typeof BriefingBeatSchema>;

export const MorningBriefingSchema = z.object({
  version: z
    .literal("v2")
    .describe("Storage version; bump when the shape changes."),
  generated_at: z
    .string()
    .describe("ISO-8601 timestamp for when the briefing was generated."),
  script: z
    .string()
    .min(12)
    .max(800)
    .describe(
      "Full joined script (beats connected with spaces). Fallback read-aloud form — never shown directly."
    ),
  beats: z
    .array(BriefingBeatSchema)
    .min(3)
    .max(6)
    .describe(
      "Individual beats revealed one at a time on glass. Start with a 'Morning.' beat; end with a forward-facing beat the user can act on or just take in."
    ),
  mood: z
    .enum(["cautious", "charged", "warm", "quiet", "sharp"])
    .describe(
      "Overall emotional temperature; drives skyline tint cues and idle-detail selection."
    ),
  weather_hint: z
    .enum(["cool", "gold", "silver", "dim"])
    .describe(
      "Suggested skyline color bias for today's scene. 'gold' = strong-pipeline day, 'dim' = rejection/quiet, 'silver' = mixed."
    ),
});
export type MorningBriefing = z.infer<typeof MorningBriefingSchema>;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Join beats into a single script string (space-separated). Pure function —
 * used by the agent to populate `script` when Claude returns only beats[] and
 * by the storage fallback when re-hydrating a legacy plain-text briefing.
 */
export function renderBriefingScript(briefing: Pick<MorningBriefing, "beats">): string {
  return briefing.beats
    .map((b) => b.text.trim())
    .filter((t) => t.length > 0)
    .join(" ");
}

/**
 * Map a briefing mood to a weather hint when the agent omits one. Kept pure
 * so tests lock the mapping.
 */
export function deriveWeatherHint(mood: MorningBriefing["mood"]): MorningBriefing["weather_hint"] {
  switch (mood) {
    case "charged":
    case "warm":
      return "gold";
    case "sharp":
    case "cautious":
      return "silver";
    case "quiet":
      return "dim";
    default:
      return "cool";
  }
}

// ---------------------------------------------------------------------------
// Agent call
// ---------------------------------------------------------------------------

export interface MorningBriefingInput {
  userId: string;
  displayName: string;
  pipeline: {
    total: number;
    applied: number;
    screening: number;
    interviews: number;
    offers: number;
    staleCount: number;
    appliedToScreeningRate: number;
  };
  overnight: {
    newApps: number;
    statusChanges: number;
    importantEmails: Array<{ kind: "interview_invite" | "offer"; subject: string }>;
    rejections: number;
  };
  /**
   * Optional nudge from yesterday's briefing — the agent uses it to avoid
   * repeating the same framing two mornings in a row. Harmless when absent.
   */
  moodLastTime?: MorningBriefing["mood"];
}

const SYSTEM_PROMPT = `You are the CEO of The Tower — the user's chief-of-staff who arrives before they do and is waiting at the window when they open the app.

Your voice:
- Commanding, but human. Terse. Concrete. Never a broadcast. Never corporate.
- No emoji. No exclamation points unless something is genuinely urgent.
- No "Welcome back!", no "Hope you had a great night", no "Here's your daily briefing" meta-labels.
- Start the first beat with a simple "Morning, <Name>." or "Morning." — nothing more flowery.
- Treat the user like a peer in an operation, not a customer in an app.

What a briefing is:
- Three to six beats. Each is one sentence. Each is its own reveal on glass.
- Beats are grounded in the overnight data unless the night was quiet.
- When the night was quiet, the briefing is a thought or an observation — not "Nothing to report." Use the 'reflective' tone. Give the user something to turn over: a question, a cadence note, an opportunity framing.
- The final beat should leave the user oriented, not loaded with a to-do.

Hard stops:
- No fabricated stats. Only reference numbers that appear in the input.
- No role / company / technology the input doesn't mention.
- No "per our last check" or meta-memory references — you have no persistent memory the user can see.
- Never use "Phase 1" / "Phase 2" style labeling — those words are banned in this product.

Output the structured object with beats[], mood, weather_hint, script.`;

/**
 * Generate a structured morning briefing via Claude. Returns null on failure
 * — the caller (cron) falls back to the legacy plain-text line-builder and
 * the structured decoder wraps that body into a one-beat briefing so the
 * scene never breaks.
 */
export async function generateMorningBriefing(
  input: MorningBriefingInput
): Promise<MorningBriefing | null> {
  const start = Date.now();
  const modelId = getActiveModelId();

  const overnightLines: string[] = [];
  if (input.overnight.newApps > 0) {
    overnightLines.push(`new applications overnight: ${input.overnight.newApps}`);
  }
  if (input.overnight.statusChanges > 0) {
    overnightLines.push(`status changes overnight: ${input.overnight.statusChanges}`);
  }
  if (input.overnight.rejections > 0) {
    overnightLines.push(`rejections overnight: ${input.overnight.rejections}`);
  }
  for (const email of input.overnight.importantEmails.slice(0, 3)) {
    overnightLines.push(
      `${email.kind === "interview_invite" ? "interview invite" : "offer"}: ${email.subject}`
    );
  }
  const overnightBlock = overnightLines.length > 0
    ? overnightLines.map((l) => `- ${l}`).join("\n")
    : "- nothing happened overnight (quiet night — give a reflection, not a report)";

  const pipelineBlock = input.pipeline.total === 0
    ? "pipeline is empty — the user hasn't started yet; treat it as a cold open"
    : `total active: ${input.pipeline.total}
applied: ${input.pipeline.applied}
screening: ${input.pipeline.screening}
interviews: ${input.pipeline.interviews}
offers: ${input.pipeline.offers}
stale ops: ${input.pipeline.staleCount}
applied→screen rate: ${input.pipeline.appliedToScreeningRate.toFixed(0)}%`;

  const moodHint = input.moodLastTime
    ? `\nYESTERDAY'S MOOD (avoid repeating): ${input.moodLastTime}`
    : "";

  const prompt = `Brief ${input.displayName} for today.

PIPELINE SNAPSHOT:
${pipelineBlock}

OVERNIGHT SIGNAL:
${overnightBlock}
${moodHint}

Return the structured morning briefing. Set 'generated_at' to "${new Date().toISOString()}".`;

  try {
    const result = await generateText({
      model: getAgentModel(),
      system: getCachedSystem(SYSTEM_PROMPT),
      prompt,
      output: Output.object({ schema: MorningBriefingSchema }),
    });

    if (!result.output) return null;

    const briefing: MorningBriefing = {
      ...result.output,
      script: result.output.script || renderBriefingScript(result.output),
    };

    void recordAgentRun({
      userId: input.userId,
      agent: "ceo",
      action: "structured.morning_briefing",
      modelId,
      usage: result.usage,
      durationMs: Date.now() - start,
      inputSummary: `pipeline=${input.pipeline.total} overnight=${input.overnight.newApps + input.overnight.statusChanges + input.overnight.rejections}`,
      outputSummary: `${briefing.mood}/${briefing.weather_hint} — ${briefing.beats[0]?.text.slice(0, 80) ?? ""}`,
    });

    return briefing;
  } catch (err) {
    void recordAgentRun({
      userId: input.userId,
      agent: "ceo",
      action: "structured.morning_briefing",
      modelId,
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: `pipeline=${input.pipeline.total}`,
      outputSummary: null,
      error: err instanceof Error ? err.message : String(err),
      status: "failed",
    });
    return null;
  }
}
