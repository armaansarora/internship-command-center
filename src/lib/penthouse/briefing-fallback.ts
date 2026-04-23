/**
 * Fallback morning-briefing synthesizer.
 *
 * Used in two places:
 *  1. The Penthouse client when the notifications row for today's briefing is
 *     missing (user arrived before cron ran, or brand-new account).
 *  2. The briefing cron when Claude fails — we still want to persist a
 *     reasonable briefing body rather than skip the day.
 *
 * No Claude call. Pure transform over the same shape {@link MorningBriefingInput}
 * the structured agent consumes. Beats are short, in-voice, and deterministic
 * so a given input always produces the same briefing — useful for tests.
 */
import {
  renderBriefingScript,
  type MorningBriefing,
  type MorningBriefingInput,
  type BriefingBeat,
} from "@/lib/ai/agents/morning-briefing";

/**
 * Synthesize a briefing from stats alone. Always returns a schema-valid
 * briefing — never null.
 */
export function synthesizeFallbackBriefing(
  input: Pick<MorningBriefingInput, "displayName" | "pipeline" | "overnight">
): MorningBriefing {
  const { displayName, pipeline, overnight } = input;
  const beats: BriefingBeat[] = [];

  // Beat 0 — greeting. Keep it minimal; brief bans "Welcome back!".
  beats.push({
    tone: "steady",
    text: `Morning, ${displayName}.`,
  });

  const overnightSignal =
    overnight.newApps + overnight.statusChanges + overnight.rejections + overnight.importantEmails.length;

  if (pipeline.total === 0 && overnightSignal === 0) {
    // Cold open — user hasn't started yet.
    beats.push({
      tone: "reflective",
      text: "The pipeline's cold. That's not a weakness — that's a day to sharpen the shortlist.",
      data_cue: "quiet",
    });
    beats.push({
      tone: "steady",
      text: "Head to the War Room when you're ready.",
    });
    return finalize(beats, "quiet", "cool");
  }

  // Overnight activity summaries — at most 3 extra beats.
  if (overnight.importantEmails.length > 0) {
    const first = overnight.importantEmails[0];
    const label = first.kind === "interview_invite" ? "interview invite" : "offer";
    beats.push({
      tone: "urgent",
      text: `${capFirst(label)} landed overnight — ${trim(first.subject, 70)}.`,
      data_cue: first.kind === "interview_invite" ? "interview_invite" : "offer",
    });
  } else if (overnight.newApps > 0) {
    beats.push({
      tone: "warm",
      text: `${overnight.newApps} new ${plural(overnight.newApps, "op", "ops")} arrived overnight.`,
      data_cue: "new_app",
    });
  } else if (overnight.statusChanges > 0) {
    beats.push({
      tone: "steady",
      text: `${overnight.statusChanges} status ${plural(overnight.statusChanges, "change", "changes")} since yesterday.`,
    });
  } else if (overnight.rejections > 0) {
    beats.push({
      tone: "reflective",
      text: `${overnight.rejections} ${plural(overnight.rejections, "rejection", "rejections")} came in. Noted — move forward.`,
      data_cue: "rejection",
    });
  } else {
    beats.push({
      tone: "reflective",
      text: "Quiet night. Good time to tighten something up.",
      data_cue: "quiet",
    });
  }

  // Stale-pile reminder.
  if (pipeline.staleCount >= 3) {
    beats.push({
      tone: "warning",
      text: `${pipeline.staleCount} stale ${plural(pipeline.staleCount, "op", "ops")} are waiting. Clear them or close them.`,
      data_cue: "stale",
    });
  } else if (pipeline.interviews > 0) {
    beats.push({
      tone: "steady",
      text: `${pipeline.interviews} ${plural(pipeline.interviews, "interview", "interviews")} on the board. Prep is on Floor 3.`,
    });
  }

  // Closing orienting beat.
  beats.push({
    tone: "steady",
    text: "That's the shape. Pick the one you'd feel best about at noon.",
  });

  const mood = pickMood(pipeline, overnight);
  const weather = pickWeather(pipeline, overnight);
  return finalize(beats.slice(0, 6), mood, weather);
}

function finalize(
  beats: BriefingBeat[],
  mood: MorningBriefing["mood"],
  weather_hint: MorningBriefing["weather_hint"]
): MorningBriefing {
  while (beats.length < 3) {
    beats.push({ tone: "reflective", text: "Take the morning as it comes." });
  }
  return {
    version: "v2",
    generated_at: new Date().toISOString(),
    script: renderBriefingScript({ beats }),
    beats,
    mood,
    weather_hint,
  };
}

function pickMood(
  pipeline: MorningBriefingInput["pipeline"],
  overnight: MorningBriefingInput["overnight"]
): MorningBriefing["mood"] {
  if (overnight.importantEmails.some((e) => e.kind === "offer")) return "charged";
  if (overnight.importantEmails.some((e) => e.kind === "interview_invite")) return "sharp";
  if (overnight.rejections > 0) return "cautious";
  if (overnight.newApps > 0 || overnight.statusChanges > 0) return "warm";
  if (pipeline.total === 0) return "quiet";
  if (pipeline.staleCount >= 3) return "cautious";
  return "quiet";
}

function pickWeather(
  pipeline: MorningBriefingInput["pipeline"],
  overnight: MorningBriefingInput["overnight"]
): MorningBriefing["weather_hint"] {
  if (overnight.importantEmails.length > 0 || overnight.newApps >= 2) return "gold";
  if (overnight.rejections > 0 || pipeline.staleCount >= 3) return "dim";
  if (pipeline.total === 0) return "cool";
  return "silver";
}

function plural(n: number, s: string, p: string): string {
  return n === 1 ? s : p;
}
function capFirst(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
function trim(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
