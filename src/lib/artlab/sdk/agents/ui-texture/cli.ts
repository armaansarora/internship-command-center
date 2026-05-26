// src/lib/artlab/sdk/agents/ui-texture/cli.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { runArtLabUiTexture } from "./index";
import { createArtLabIconMockLlmProvider } from "./__tests__/mock-llm-provider";
import { ArtLabUiTextureInputSchema } from "./types";
import type { ArtLabImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

function makeMockImageProvider(): ArtLabImageProvider {
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

export interface ArtLabUiTextureCliInput {
  name: string;
  kind: "icon" | "texture";
  ariaLabel?: string;
  tileMode?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
  runDir?: string;
  providerKind: "mock" | "claude" | "gemini";
  seed?: number;
  dryRun?: boolean;
}

export interface ArtLabUiTextureCliResult {
  summary: string;
  runDir: string;
  packId?: string;
}

export async function runArtLabUiTextureCli(
  input: ArtLabUiTextureCliInput,
): Promise<ArtLabUiTextureCliResult> {
  const runDir =
    input.runDir ?? mkdtempSync(join(tmpdir(), "artlab-ui-run-"));
  const parsed = ArtLabUiTextureInputSchema.parse(
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
      `artlab/ui-texture cli: provider kind ${input.providerKind} not yet wired`,
    );
  }
  const result = await runArtLabUiTexture(
    parsed,
    {
      iconLlm: createArtLabIconMockLlmProvider(),
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
