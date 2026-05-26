import { createHash } from "node:crypto";
import type {
  FoundryImageProvider,
  FoundryImageProviderInput,
  FoundryImageProviderResult,
} from "./types";

export interface CreateMockFoundryImageProviderOptions {
  failOnPromptContains?: string;
  id?: string;
}

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function dimensionsFor(aspect: FoundryImageProviderInput["aspectRatio"]): { widthPx: number; heightPx: number } {
  switch (aspect) {
    case "9:16": return { widthPx: 1024, heightPx: 1792 };
    case "16:9": return { widthPx: 1792, heightPx: 1024 };
    case "1:1": return { widthPx: 1024, heightPx: 1024 };
    case "4:3": return { widthPx: 1024, heightPx: 768 };
    case "3:4": return { widthPx: 768, heightPx: 1024 };
  }
}

export function createMockFoundryImageProvider(opts: CreateMockFoundryImageProviderOptions = {}): FoundryImageProvider {
  const id = opts.id ?? "mock-foundry-image";
  return {
    id,
    async generate(input: FoundryImageProviderInput): Promise<FoundryImageProviderResult> {
      if (opts.failOnPromptContains && input.prompt.includes(opts.failOnPromptContains)) {
        throw new Error(`mock provider: prompt contained "${opts.failOnPromptContains}"`);
      }
      const seedPart = `${input.aspectRatio}|${input.laneIndex}|${input.seed ?? 0}|${input.prompt}`;
      const digest = createHash("sha256").update(seedPart).digest();
      const bytes = Buffer.concat([PNG_HEADER, digest, digest, digest, digest]);
      const dims = dimensionsFor(input.aspectRatio);
      return {
        mode: "mock",
        bytes,
        contentType: "image/png",
        widthPx: dims.widthPx,
        heightPx: dims.heightPx,
        costCents: 0,
        durationMs: 1,
        providerId: id,
        seed: input.seed,
      };
    },
  };
}
