// src/lib/artlab/providers/gemini-adapter.ts
export interface GeminiProviderOptions {
  apiKey: string;
  modelId?: string;
}

export interface GenerateImageInput {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  laneIndex: number;
  referenceImageBytes?: Buffer;
}

export interface GenerateImageResult {
  mode: "real" | "mock";
  bytes: Buffer;
  contentType: "image/png";
  costCents: number;
  durationMs: number;
}

export interface GeminiProvider {
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}

const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

export function createGeminiProvider(options: GeminiProviderOptions): GeminiProvider {
  const model = options.modelId ?? DEFAULT_MODEL;
  return {
    async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
      if (process.env.ARTLAB_GEMINI_MODE === "mock") {
        const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(32).fill(input.laneIndex)]);
        return { mode: "mock", bytes: fakePng, contentType: "image/png", costCents: 0, durationMs: 1 };
      }
      if (!options.apiKey) {
        throw new Error("gemini: missing api key (set GEMINI_API_KEY or use ARTLAB_GEMINI_MODE=mock)");
      }
      const startedAt = Date.now();
      // Production call: see Phase 5 Task 5.X for true-parallel + caching enhancements.
      // The minimum viable production path is a single REST POST per slot.
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input.prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`gemini generateImage failed: HTTP ${response.status}`);
      }
      const json = (await response.json()) as { candidates?: { content: { parts: { inlineData?: { data: string; mimeType: string } }[] } }[] };
      const inline = json.candidates?.[0]?.content.parts.find((p) => p.inlineData)?.inlineData;
      if (!inline) throw new Error("gemini generateImage: no image bytes in response");
      const bytes = Buffer.from(inline.data, "base64");
      return {
        mode: "real",
        bytes,
        contentType: "image/png",
        costCents: 200, // Nano Banana 2 list price; refine when ledger confirms actual
        durationMs: Date.now() - startedAt,
      };
    },
  };
}
