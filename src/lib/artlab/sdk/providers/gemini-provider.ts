import { createGeminiProvider, type GeminiProvider } from "@/lib/artlab/providers/gemini-adapter";
import type {
  ArtLabImageProvider,
  ArtLabImageProviderInput,
  ArtLabImageProviderResult,
} from "./types";

export interface CreateGeminiArtLabProviderOptions {
  apiKey: string;
  modelId?: string;
}

function aspectToGemini(aspect: ArtLabImageProviderInput["aspectRatio"]): "9:16" | "16:9" | "1:1" {
  if (aspect === "9:16" || aspect === "16:9" || aspect === "1:1") return aspect;
  return "1:1";
}

function dimensionsForAspect(aspect: ArtLabImageProviderInput["aspectRatio"]): { widthPx: number; heightPx: number } {
  switch (aspect) {
    case "9:16": return { widthPx: 1152, heightPx: 2048 };
    case "16:9": return { widthPx: 2048, heightPx: 1152 };
    case "1:1": return { widthPx: 1536, heightPx: 1536 };
    case "4:3": return { widthPx: 1536, heightPx: 1152 };
    case "3:4": return { widthPx: 1152, heightPx: 1536 };
  }
}

export function createGeminiArtLabProvider(options: CreateGeminiArtLabProviderOptions): ArtLabImageProvider {
  const inner: GeminiProvider = createGeminiProvider({ apiKey: options.apiKey, modelId: options.modelId });
  return {
    id: "gemini-artlab",
    async generate(input: ArtLabImageProviderInput): Promise<ArtLabImageProviderResult> {
      const result = await inner.generateImage({
        prompt: input.prompt,
        aspectRatio: aspectToGemini(input.aspectRatio),
        laneIndex: input.laneIndex,
        referenceImageBytes: input.referenceImageBytes,
      });
      const dims = dimensionsForAspect(input.aspectRatio);
      return {
        mode: result.mode === "mock" ? "mock" : "real",
        bytes: result.bytes,
        contentType: result.contentType,
        widthPx: dims.widthPx,
        heightPx: dims.heightPx,
        costCents: result.costCents,
        durationMs: result.durationMs,
        providerId: "gemini-artlab",
        seed: input.seed,
      };
    },
  };
}
