/**
 * Concierge extraction — turn Otis's conversation into a TargetProfile.
 *
 * Runs AI SDK v6 `generateObject` against the existing `TargetProfileSchema`
 * (the canonical schema used by the CRO, Job Discovery, and the Writing
 * Room). We deliberately reuse the CRO's schema rather than invent a
 * Concierge-specific one so every downstream consumer — the cron job that
 * runs Job Discovery, the Writing Room's "pull target profile" tool —
 * works against Otis's output unchanged.
 *
 * On success: persists via `upsertTargetProfile` (the canonical
 * agent_memory row with an embedding) AND via `saveConciergeProfile` (the
 * user_profiles-side mirror). On skip: writes a minimum-viable placeholder
 * profile so Job Discovery still runs; the user is never stranded.
 */
import { generateObject } from "ai";
import { getFastModel } from "@/lib/ai/model";
import { CONCIERGE_EXTRACTION_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budgets";
import {
  TargetProfileSchema,
  type TargetProfile,
  upsertTargetProfile,
} from "@/lib/agents/cro/target-profile";
import { saveConciergeProfile } from "@/lib/db/queries/user-profiles-rest";
import { log } from "@/lib/logger";

export interface ExtractionTurn {
  role: "assistant" | "user";
  text: string;
}

export interface ExtractResult {
  profile: TargetProfile;
  completedAt: string | null;
  source: "conversation" | "structured" | "skip";
}

/**
 * The Concierge's conversation produced a profile. Serialize the turns
 * into a transcript the model can reason over, call generateObject with
 * the shared TargetProfileSchema, then persist both to agent_memory
 * (canonical + embedding) and to user_profiles.concierge_target_profile
 * (fast read).
 */
export async function extractTargetProfileFromConversation(
  userId: string,
  turns: ExtractionTurn[],
): Promise<ExtractResult | null> {
  const transcript = turns
    .map((t) => `${t.role === "assistant" ? "Otis" : "Guest"}: ${t.text.trim()}`)
    .join("\n");

  const system = `Extract a TargetProfile from the following Concierge intake conversation between Otis (the Lobby Concierge) and a new guest of The Tower. Only output fields the guest explicitly stated or the CONVERSATION clearly implies — never fabricate. If a required field is genuinely missing, use a conservative default (e.g. roles = ["Software Engineer"], geos = ["Remote"] only if the guest indicated location flexibility, level = ["intern", "new_grad"]). If the guest named dream companies, put them in companies[]; if they named dealbreakers, put them in musts/nices with explicit phrasing. Keep roles and geos short, human-facing, title-cased.`;

  const prompt = `CONVERSATION TRANSCRIPT
${transcript}

Return a structured TargetProfile.`;

  try {
    const result = await generateObject({
      model: getFastModel(),
      schema: TargetProfileSchema,
      system,
      prompt,
      maxOutputTokens: CONCIERGE_EXTRACTION_MAX_OUTPUT_TOKENS,
    });

    const parsed = TargetProfileSchema.parse(result.object);
    const stored = await upsertTargetProfile(userId, parsed);
    if (!stored) {
      log.warn("concierge.upsert_profile_failed", { userId });
      return null;
    }

    const mirrored = await saveConciergeProfile(userId, parsed);
    if (!mirrored.ok) {
      log.warn("concierge.mirror_profile_failed", { userId });
      return null;
    }

    return {
      profile: parsed,
      completedAt: mirrored.completedAt,
      source: "conversation",
    };
  } catch (err) {
    log.error("concierge.extract_failed", err, { userId });
    return null;
  }
}

/**
 * The structured intake desk already collected the canonical profile. Persist
 * it directly, bypassing the Concierge LLM extraction call.
 */
export async function persistStructuredTargetProfile(
  userId: string,
  profile: TargetProfile,
): Promise<ExtractResult | null> {
  const parsed = TargetProfileSchema.parse(profile);

  const stored = await upsertTargetProfile(userId, parsed);
  if (!stored) {
    log.warn("concierge.structured_upsert_failed", { userId });
    return null;
  }

  const mirrored = await saveConciergeProfile(userId, parsed);
  if (!mirrored.ok) {
    log.warn("concierge.structured_mirror_failed", { userId });
    return null;
  }

  return {
    profile: parsed,
    completedAt: mirrored.completedAt,
    source: "structured",
  };
}

/**
 * The guest skipped the Concierge. Write a minimum-viable placeholder so
 * Job Discovery has something to run against. The user is never stranded
 * on an empty Penthouse.
 */
export async function persistSkipPlaceholderProfile(
  userId: string,
): Promise<ExtractResult | null> {
  const placeholder: TargetProfile = TargetProfileSchema.parse({
    version: 1,
    roles: ["Software Engineer"],
    level: ["intern", "new_grad"],
    companies: [],
    geos: ["Remote"],
    musts: [],
    nices: [],
    notes: "Concierge skipped — placeholder profile until the guest updates it from the War Room.",
  });

  const stored = await upsertTargetProfile(userId, placeholder);
  if (!stored) {
    log.warn("concierge.skip_upsert_failed", { userId });
    return null;
  }

  const mirrored = await saveConciergeProfile(userId, placeholder);
  if (!mirrored.ok) {
    log.warn("concierge.skip_mirror_failed", { userId });
    return null;
  }

  return {
    profile: placeholder,
    completedAt: mirrored.completedAt,
    source: "skip",
  };
}
