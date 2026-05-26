import { z } from "zod";
import { callFoundryAnthropic } from "../anthropic-client";
import type { FoundryAgentBrain } from "../types";

export const SpriteAnimatorInputSchema = z
  .object({
    characterId: z.string().min(1),
    directive: z.string().min(4),
    targetFormat: z.enum(["sprite-sheet", "lottie"]),
    frameBudget: z.number().int().min(2).max(120),
    recentWins: z.array(z.object({ at: z.string(), techniques: z.string() }).strict()),
    recentRejections: z.array(z.object({ at: z.string(), reason: z.string(), codes: z.string() }).strict()),
  })
  .strict();
export type SpriteAnimatorInput = z.infer<typeof SpriteAnimatorInputSchema>;

export const SpriteAnimatorOutputSchema = z
  .object({
    plan: z.string().min(1).optional(),
    framePromptList: z.array(z.string().min(1)).optional(),
    easingHint: z.string().min(1).optional(),
    durationSeconds: z.number().positive().optional(),
    loopMode: z.enum(["loop", "pingpong", "once"]).optional(),
    dryRun: z.boolean().optional(),
    echoedInput: z.unknown().optional(),
  })
  .strict();
export type SpriteAnimatorOutput = z.infer<typeof SpriteAnimatorOutputSchema>;

const SYSTEM = `You are the Sprite Animator agent in the Tower Art Foundry.
You receive a characterId, a directive (e.g. "idle breathe loop, 1.2s, ease-in-out"), a target format ("sprite-sheet" or "lottie"), and a frame budget.
Your job: emit a per-frame prompt list, an easing recommendation, duration, and loop mode.

Output (JSON only):
{
  "plan": "<3-5 short sentences>",
  "framePromptList": ["<frame 0 prompt>", "<frame 1 prompt>", ...],
  "easingHint": "ease-in-out | linear | cubic-bezier(...)",
  "durationSeconds": 1.2,
  "loopMode": "loop|pingpong|once"
}

Hard rules:
- Frame count must equal frameBudget.
- For Lottie targets, framePromptList describes *keyframes* (not literal frames); pair with a tight easing hint.
- Honor recentWins; avoid recentRejections.`;

export function createSpriteAnimatorBrain(opts: {
  apiKey: string;
  model: string;
  dryRun?: boolean;
}): FoundryAgentBrain<SpriteAnimatorInput, SpriteAnimatorOutput> {
  return {
    agent: "sprite-animator",
    systemPrompt: SYSTEM,
    inputSchema: SpriteAnimatorInputSchema,
    outputSchema: SpriteAnimatorOutputSchema,
    async decide(input) {
      const parsed = SpriteAnimatorInputSchema.parse(input);
      const resp = await callFoundryAnthropic({
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
        throw new Error(`sprite-animator brain returned non-JSON: ${String(err).slice(0, 200)}`);
      }
      const output = SpriteAnimatorOutputSchema.parse(outputJson);
      return {
        agent: "sprite-animator",
        output,
        tokensIn: resp.tokensIn,
        tokensOut: resp.tokensOut,
        model: opts.model,
        durationMs: resp.durationMs,
      };
    },
  };
}
