// src/lib/foundry/agents/ui-texture/cli.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { runFoundryUiTexture } from "./index";
import { createFoundryIconMockLlmProvider } from "./__tests__/mock-llm-provider";
import { FoundryUiTextureInputSchema } from "./types";
import type { FoundryImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

function makeMockImageProvider(): FoundryImageProvider {
  return {
    async generateImage(input) {
      const seed = input.seed ?? 0;
      const c = 80 + ((seed * 17) % 100);
      const bytes = await sharp({
        create: { width: 64, height: 64, channels: 3, background: { r: c, g: c, b: c } },
      })
        .png()
        .toBuffer();
      return { mode: "mock", bytes, contentType: "image/png", costCents: 0, durationMs: 1 };
    },
  };
}

export interface FoundryUiTextureCliInput {
  name: string;
  kind: "icon" | "texture";
  ariaLabel?: string;
  tileMode?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
  runDir?: string;
  providerKind: "mock" | "claude" | "gemini";
  seed?: number;
  dryRun?: boolean;
}

export interface FoundryUiTextureCliResult {
  summary: string;
  runDir: string;
  packId?: string;
}

export async function runFoundryUiTextureCli(
  input: FoundryUiTextureCliInput,
): Promise<FoundryUiTextureCliResult> {
  const runDir =
    input.runDir ?? mkdtempSync(join(tmpdir(), "foundry-ui-run-"));
  const parsed = FoundryUiTextureInputSchema.parse(
    input.kind === "icon"
      ? {
          runId: randomUUID(),
          name: input.name,
          kind: "icon",
          requestedBy: "cli" as const,
          ariaLabel: input.ariaLabel ?? `${input.name} icon`,
          seed: input.seed,
        }
      : {
          runId: randomUUID(),
          name: input.name,
          kind: "texture",
          requestedBy: "cli" as const,
          tileMode: input.tileMode ?? "repeat",
          seed: input.seed,
        },
  );
  if (input.dryRun) {
    return {
      summary: `${input.kind} ${input.name} validated`,
      runDir,
    };
  }
  if (input.providerKind !== "mock") {
    throw new Error(
      `foundry/ui-texture cli: provider kind ${input.providerKind} not yet wired`,
    );
  }
  const result = await runFoundryUiTexture(
    parsed,
    {
      iconLlm: createFoundryIconMockLlmProvider(),
      image: makeMockImageProvider(),
    },
    { runDir },
  );
  return {
    summary: `${input.kind} ${input.name} pack ${result.packId} validated`,
    runDir,
    packId: result.packId,
  };
}
