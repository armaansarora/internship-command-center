import { createGeminiProvider, type GeminiProvider } from "@/lib/artlab/providers/gemini-adapter";
import type {
  FoundryImageProvider,
  FoundryImageProviderInput,
  FoundryImageProviderResult,
} from "./types";

export interface CreateGeminiFoundryProviderOptions {
  apiKey: string;
  modelId?: string;
}

function aspectToGemini(aspect: FoundryImageProviderInput["aspectRatio"]): "9:16" | "16:9" | "1:1" {
  if (aspect === "9:16" || aspect === "16:9" || aspect === "1:1") return aspect;
  return "1:1";
}

function dimensionsForAspect(aspect: FoundryImageProviderInput["aspectRatio"]): { widthPx: number; heightPx: number } {
  switch (aspect) {
    case "9:16": return { widthPx: 1152, heightPx: 2048 };
    case "16:9": return { widthPx: 2048, heightPx: 1152 };
    case "1:1": return { widthPx: 1536, heightPx: 1536 };
    case "4:3": return { widthPx: 1536, heightPx: 1152 };
    case "3:4": return { widthPx: 1152, heightPx: 1536 };
  }
}

export function createGeminiFoundryProvider(options: CreateGeminiFoundryProviderOptions): FoundryImageProvider {
  const inner: GeminiProvider = createGeminiProvider({ apiKey: options.apiKey, modelId: options.modelId });
  return {
    id: "gemini-foundry",
    async generate(input: FoundryImageProviderInput): Promise<FoundryImageProviderResult> {
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
        providerId: "gemini-foundry",
        seed: input.seed,
      };
    },
  };
}
