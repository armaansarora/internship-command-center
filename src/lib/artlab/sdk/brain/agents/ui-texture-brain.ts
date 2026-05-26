import { z } from "zod";
import { callArtLabAnthropic } from "../anthropic-client";
import type { ArtLabAgentBrain } from "../types";

export const UiTextureInputSchema = z
  .object({
    slotId: z.string().min(1),
    directive: z.string().min(4),
    tileable: z.boolean(),
    paletteHints: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)),
    recentWins: z.array(z.object({ at: z.string(), techniques: z.string() }).strict()),
    recentRejections: z.array(z.object({ at: z.string(), reason: z.string(), codes: z.string() }).strict()),
  })
  .strict();
export type UiTextureInput = z.infer<typeof UiTextureInputSchema>;

export const UiTextureOutputSchema = z
  .object({
    plan: z.string().min(1).optional(),
    texturePrompt: z.string().min(1).optional(),
    cssVarName: z.string().min(1).optional(),
    tilingNotes: z.string().min(1).optional(),
    fallbackColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    dryRun: z.boolean().optional(),
    echoedInput: z.unknown().optional(),
  })
  .strict();
export type UiTextureOutput = z.infer<typeof UiTextureOutputSchema>;

const SYSTEM = `You are the UI Texture & Icon agent in the Tower Art ArtLab.
You receive a slotId (e.g. tower.button.bg), a directive, a tileable flag, and palette hints (hex).
Your job: produce a texture plan with a copy-paste prompt, an explicit CSS variable name, and a fallback color for non-image clients.

Output (JSON only):
{
  "plan": "<3-5 short sentences>",
  "texturePrompt": "<single image-model prompt>",
  "cssVarName": "--<slot-kebab>",
  "tilingNotes": "<1-2 lines on how to tile>",
  "fallbackColor": "#XXXXXX"
}

Hard rules:
- Stay inside the supplied paletteHints unless directive explicitly overrides.
- If tileable=true, every prompt must mention seamless edges.
- CSS variable names are kebab-case under the --tower- namespace.`;

export function createUiTextureBrain(opts: {
  apiKey: string;
  model: string;
  dryRun?: boolean;
}): ArtLabAgentBrain<UiTextureInput, UiTextureOutput> {
  return {
    agent: "ui-texture",
    systemPrompt: SYSTEM,
    inputSchema: UiTextureInputSchema,
    outputSchema: UiTextureOutputSchema,
    async decide(input) {
      const parsed = UiTextureInputSchema.parse(input);
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
        throw new Error(`ui-texture brain returned non-JSON: ${String(err).slice(0, 200)}`);
      }
      const output = UiTextureOutputSchema.parse(outputJson);
      return {
        agent: "ui-texture",
        output,
        tokensIn: resp.tokensIn,
        tokensOut: resp.tokensOut,
        model: opts.model,
        durationMs: resp.durationMs,
      };
    },
  };
}
