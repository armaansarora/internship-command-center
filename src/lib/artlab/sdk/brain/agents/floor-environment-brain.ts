import { z } from "zod";
import { callArtLabAnthropic } from "../anthropic-client";
import type { ArtLabAgentBrain } from "../types";

export const ARTLAB_TOWER_SPACES = [
  "penthouse",
  "war-room",
  "rolodex-lounge",
  "writing-room",
  "situation-room",
  "briefing-room",
  "observatory",
  "ceo-office",
  "lobby",
] as const;
export type ArtLabTowerSpace = (typeof ARTLAB_TOWER_SPACES)[number];

export const FloorEnvironmentInputSchema = z
  .object({
    space: z.enum(ARTLAB_TOWER_SPACES),
    directive: z.string().min(4),
    timeStates: z.array(z.enum(["dawn", "morning", "midday", "afternoon", "dusk", "evening", "night"])),
    recentWins: z.array(z.object({ at: z.string(), techniques: z.string() }).strict()),
    recentRejections: z.array(z.object({ at: z.string(), reason: z.string(), codes: z.string() }).strict()),
  })
  .strict();
export type FloorEnvironmentInput = z.infer<typeof FloorEnvironmentInputSchema>;

export const FloorEnvironmentOutputSchema = z
  .object({
    plan: z.string().min(1).optional(),
    backgroundPrompt: z.string().min(1).optional(),
    atmosphereNotes: z.string().min(1).optional(),
    lightingPlan: z.array(z.string()).optional(),
    timeStatePromptVariants: z.record(z.string(), z.string()).optional(),
    dryRun: z.boolean().optional(),
    echoedInput: z.unknown().optional(),
  })
  .strict();
export type FloorEnvironmentOutput = z.infer<typeof FloorEnvironmentOutputSchema>;

const SYSTEM = `You are the Floor & Environment agent in the ArtLab SDK.
You receive a Tower space slug, a directive, and the set of time states (dawn..night) the consumer wants.
Your job: emit a background-only generation plan with prompt variants keyed by time state.

Output (JSON only):
{
  "plan": "<3-5 short sentences>",
  "backgroundPrompt": "<base prompt>",
  "atmosphereNotes": "<1-2 lines>",
  "lightingPlan": ["..."],
  "timeStatePromptVariants": { "dawn": "...", "dusk": "...", "night": "..." }
}

Hard rules:
- Backgrounds are camera-locked Apple-TV-style autonomy — no parallax, no mouse-driven motion.
- Each time state has its own atmosphere; never reuse one prompt across two states.
- Honor recentWins; avoid recentRejections.`;

export function createFloorEnvironmentBrain(opts: {
  apiKey: string;
  model: string;
  dryRun?: boolean;
}): ArtLabAgentBrain<FloorEnvironmentInput, FloorEnvironmentOutput> {
  return {
    agent: "floor-environment",
    systemPrompt: SYSTEM,
    inputSchema: FloorEnvironmentInputSchema,
    outputSchema: FloorEnvironmentOutputSchema,
    async decide(input) {
      const parsed = FloorEnvironmentInputSchema.parse(input);
      const resp = await callArtLabAnthropic({
        systemPrompt: SYSTEM,
        userJson: parsed,
        model: opts.model,
        apiKey: opts.apiKey,
        dryRun: opts.dryRun,
      });
      let outputJson: Record<string, unknown>;
      try {
        outputJson = JSON.parse(resp.text) as Record<string, unknown>;
      } catch (err) {
        throw new Error(`floor-environment brain returned non-JSON: ${String(err).slice(0, 200)}`);
      }
      const output = FloorEnvironmentOutputSchema.parse(outputJson);
      return {
        agent: "floor-environment",
        output,
        tokensIn: resp.tokensIn,
        tokensOut: resp.tokensOut,
        model: opts.model,
        durationMs: resp.durationMs,
      };
    },
  };
}
