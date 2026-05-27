import { z } from "zod";
import { callArtLabAnthropic } from "../anthropic-client";
import type { ArtLabAgentBrain } from "../types";

export const CharacterMasterInputSchema = z
  .object({
    characterId: z.string().min(1),
    directive: z.string().min(4),
    anchorPackId: z.string().min(1).optional(),
    recentWins: z.array(z.object({ at: z.string(), techniques: z.string() }).strict()),
    recentRejections: z.array(z.object({ at: z.string(), reason: z.string(), codes: z.string() }).strict()),
  })
  .strict();
export type CharacterMasterInput = z.infer<typeof CharacterMasterInputSchema>;

export const CharacterMasterOutputSchema = z
  .object({
    plan: z.string().min(1).optional(),
    promptDraft: z.string().min(1).optional(),
    silhouetteNotes: z.string().min(1).optional(),
    wardrobeNotes: z.string().min(1).optional(),
    accentRecommendation: z.string().min(1).optional(),
    riskFlags: z.array(z.string()).optional(),
    dryRun: z.boolean().optional(),
    echoedInput: z.unknown().optional(),
  })
  .strict();
export type CharacterMasterOutput = z.infer<typeof CharacterMasterOutputSchema>;

const SYSTEM = `You are the Character Master agent in the ArtLab SDK.
You receive a characterId, a directive (plain-English request), and optional anchor pack + recent feedback signals.
Your job: produce a concrete, executable plan to generate or refine that character's sprite/keyframes.

Output (JSON only — no prose outside the object):
{
  "plan": "<3-5 short sentences describing the next pipeline step>",
  "promptDraft": "<a single prompt suitable for an image model>",
  "silhouetteNotes": "<1-2 lines on silhouette>",
  "wardrobeNotes": "<1-2 lines on wardrobe>",
  "accentRecommendation": "<one phrase>",
  "riskFlags": ["..."]
}

Hard rules:
- Respect Tower canon: characters belong to floors with named atmospheres; never invent rooms.
- Reuse style techniques that appear in recentWins; avoid patterns flagged in recentRejections.
- Bias outputs toward concise, copy-paste prompts (no flowery storytelling).`;

export function createCharacterMasterBrain(opts: {
  apiKey: string;
  model: string;
  dryRun?: boolean;
}): ArtLabAgentBrain<CharacterMasterInput, CharacterMasterOutput> {
  return {
    agent: "character-master",
    systemPrompt: SYSTEM,
    inputSchema: CharacterMasterInputSchema,
    outputSchema: CharacterMasterOutputSchema,
    async decide(input) {
      const parsed = CharacterMasterInputSchema.parse(input);
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
        throw new Error(`character-master brain returned non-JSON: ${String(err).slice(0, 200)}`);
      }
      const output = CharacterMasterOutputSchema.parse(outputJson);
      return {
        agent: "character-master",
        output,
        tokensIn: resp.tokensIn,
        tokensOut: resp.tokensOut,
        model: opts.model,
        durationMs: resp.durationMs,
      };
    },
  };
}
