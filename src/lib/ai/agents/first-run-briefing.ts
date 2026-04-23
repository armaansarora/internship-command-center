/**
 * First-run Morning Briefing override.
 *
 * Normal flow: the 13:00-UTC `/api/cron/briefing` worker writes a
 * structured briefing into `notifications` nightly; the Penthouse reads
 * it on mount and unfolds the beats on glass. First-run override fires
 * ONCE per account during the ~10-minute window after the Concierge
 * finishes Otis's intake and the bootstrap-discovery pipeline has had a
 * chance to insert new applications. Purpose: the first briefing the
 * user ever sees references actually-discovered jobs — proving the
 * Tower's autonomy from the very first session.
 *
 * Flow:
 *   1. Read ConciergeState → check first_briefing_shown, concierge_completed_at.
 *   2. Exit early if outside the window.
 *   3. Atomically claim the flag via claimFirstBriefing (race-safe).
 *   4. Pull the top newly-discovered applications (status='discovered',
 *      created since concierge_completed_at).
 *   5. Call generateObject with a dedicated first-run system prompt that
 *      tells the LLM to name the specific roles/companies it found.
 *   6. Persist to `notifications` with [briefing_v2] prefix.
 *   7. Return the briefing for the page to render inline.
 *
 * On any error: release nothing (the claim sticks) and return null. The
 * Penthouse falls back to the usual cron/fallback path.
 */
import { generateObject } from "ai";
import { getAgentModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import {
  MorningBriefingSchema,
  renderBriefingScript,
  type MorningBriefing,
} from "./morning-briefing";
import { encodeBriefing } from "@/lib/penthouse/briefing-storage";
import {
  getConciergeState,
  claimFirstBriefing,
} from "@/lib/db/queries/user-profiles-rest";
import { log } from "@/lib/logger";

const FIRST_RUN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const TOP_DISCOVERED_LIMIT = 5;

export interface FirstRunBriefingInput {
  userId: string;
  displayName: string;
}

export async function maybeGenerateFirstRunBriefing(
  input: FirstRunBriefingInput,
): Promise<MorningBriefing | null> {
  const state = await getConciergeState(input.userId);
  if (!state) return null;
  if (state.firstBriefingShown) return null;
  if (!state.conciergeCompletedAt) return null;

  const completedAt = new Date(state.conciergeCompletedAt).getTime();
  if (Number.isNaN(completedAt)) return null;
  if (Date.now() - completedAt > FIRST_RUN_WINDOW_MS) return null;

  // Race-safe flip. If we don't win the claim, another request (or a
  // refresh-in-flight) has already taken responsibility for the first
  // briefing — step out.
  const won = await claimFirstBriefing(input.userId);
  if (!won) return null;

  const supabase = await createClient();

  // Pull the freshest discovered applications (since the Concierge
  // finished). These are the apps the bootstrap pipeline inserted.
  const { data: apps, error: appsErr } = await supabase
    .from("applications")
    .select("id, role, company_name, match_score, created_at")
    .eq("user_id", input.userId)
    .eq("status", "discovered")
    .gte("created_at", state.conciergeCompletedAt)
    .order("match_score", { ascending: false, nullsFirst: false })
    .limit(TOP_DISCOVERED_LIMIT);

  if (appsErr) {
    log.warn("first_run_briefing.apps_read_failed", {
      userId: input.userId,
      error: appsErr.message,
    });
  }

  const topDiscovered = (apps ?? []).map((row) => ({
    role: (row.role as string) ?? "Role",
    company: (row.company_name as string) ?? "Company",
    matchScore:
      typeof row.match_score === "number"
        ? row.match_score
        : typeof row.match_score === "string"
          ? Number.parseFloat(row.match_score)
          : null,
  }));

  const briefing = await generateBriefing(input, topDiscovered);
  if (!briefing) return null;

  // Persist the briefing so subsequent mounts (refresh, slow nav) see
  // the same first-briefing and the cron's 13:00 run doesn't clobber it
  // before the user has read it.
  try {
    const encoded = encodeBriefing(briefing);
    await supabase.from("notifications").insert({
      user_id: input.userId,
      type: "daily_briefing",
      body: encoded,
    });
  } catch (err) {
    log.warn("first_run_briefing.persist_failed", {
      userId: input.userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return briefing;
}

// ---------------------------------------------------------------------------
// LLM call — dedicated system prompt for the first-ever Morning Briefing.
// ---------------------------------------------------------------------------

interface TopDiscovery {
  role: string;
  company: string;
  matchScore: number | null;
}

const FIRST_RUN_SYSTEM = `You are the CEO of The Tower, writing the user's first Morning Briefing.

This is a once-in-a-lifetime moment for this guest. They just finished their intake with Otis at the front desk; while they were riding up, the building pulled together a first wave of opportunities for them. The briefing MUST reference those specific discoveries by role and/or company — not abstract "new applications."

Voice (same rules as every other briefing):
- Commanding, but human. Terse. Concrete. No broadcast tone. No corporate.
- No emoji. No exclamation points unless something is genuinely urgent.
- No "Welcome!", no "Congrats on joining", no "Here's your first briefing" meta-labels.
- Start the first beat with "Morning," or the user's name — nothing else.

What a first-run briefing contains:
- 4–5 beats, each one sentence, each its own reveal on glass.
- Beat 1: the "good morning" register.
- Beats 2–3: name specific roles or companies from the NEW_DISCOVERIES block by role and/or company. E.g. "Linear's got a product design intern open — strong match." Never say "we found X roles." Name a role.
- Beat 4: orientation — point the user to the War Room (Floor 7) where those roles now live.
- Beat 5 (optional): a forward-facing line the user can sit with — not a to-do.

Hard stops:
- Do not fabricate any role, company, or technology the input doesn't contain.
- Do not claim the user said something they didn't — you have not met them before.
- Do not use "Phase 1" / "Phase 2" labels — forbidden building-wide.

Output the structured MorningBriefing object — set mood to "charged" if ≥3 discoveries were found, "warm" if 1–2, "quiet" if 0.`;

async function generateBriefing(
  input: FirstRunBriefingInput,
  topDiscovered: TopDiscovery[],
): Promise<MorningBriefing | null> {
  const discoveryBlock =
    topDiscovered.length === 0
      ? "No new roles landed this time; the boards were quiet. Write a quiet, oriented first-run briefing."
      : topDiscovered
          .slice(0, 5)
          .map((d, i) => {
            const score =
              d.matchScore !== null
                ? ` (match score ${d.matchScore.toFixed(2)})`
                : "";
            return `${i + 1}. ${d.role} at ${d.company}${score}`;
          })
          .join("\n");

  const prompt = `The guest is ${input.displayName || "the new guest"} and this is their first Morning Briefing.

NEW_DISCOVERIES (in match-score order):
${discoveryBlock}

Return the structured MorningBriefing. Set 'generated_at' to "${new Date().toISOString()}". Count of discoveries: ${topDiscovered.length}.`;

  try {
    const result = await generateObject({
      model: getAgentModel(),
      schema: MorningBriefingSchema,
      system: FIRST_RUN_SYSTEM,
      prompt,
    });

    const parsed = MorningBriefingSchema.parse(result.object);
    return {
      ...parsed,
      script: parsed.script || renderBriefingScript(parsed),
    };
  } catch (err) {
    log.error("first_run_briefing.generate_failed", err, {
      userId: input.userId,
    });
    return null;
  }
}
