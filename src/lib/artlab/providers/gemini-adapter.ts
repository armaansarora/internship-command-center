// src/lib/artlab/providers/gemini-adapter.ts
import { isFreeTierImageModel, paidImagesAllowed } from "./image-tiers";

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

// Default image model. Callers (concept-runner, production-runner) select the
// model via `src/lib/artlab/providers/image-tiers.ts`, which is FREE by
// default (gemini-2.5-flash-image — Google AI Studio free tier) for BOTH
// concept exploration and production sprites. The premium Nano Banana Pro
// tier (gemini-3-pro-image-preview) is opt-in only — see image-tiers.ts.
// costCentsForModel() below is the per-image LIST price the budget ledger
// reads off of (list price, not the $0 free-tier price).
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

// Per-image list price in cents, by model. Used by the budget ledger.
// Update these when Google's pricing changes — they're roughly:
//   gemini-2.5-flash-image:          $0.039/image → 4¢  (FREE on AI Studio free tier)
//   gemini-3.1-flash-image:          $0.067/image → 7¢  (Nano Banana 2)
//   gemini-3-pro-image-preview:      $0.134/image → 13¢ (Nano Banana Pro — max quality)
//   imagen-4.0-generate-001:         $0.04/image  → 4¢
//   imagen-4.0-ultra-generate-001:   $0.06/image  → 6¢
//   imagen-4.0-fast-generate-001:    $0.02/image  → 2¢
function costCentsForModel(model: string): number {
  // Nano Banana Pro — the real Gemini API id is `gemini-3-pro-image-preview`;
  // `nano-banana-pro*` is kept as a back-compat alias for older configs.
  if (model.startsWith("gemini-3-pro-image") || model.startsWith("nano-banana-pro")) return 13;
  if (model.startsWith("imagen-4.0-ultra")) return 6;
  if (model.startsWith("imagen-4.0-fast")) return 2;
  if (model.startsWith("imagen-4.0")) return 4;
  if (model.startsWith("gemini-3.1-flash-image")) return 7;
  if (model.startsWith("gemini-2.5-flash-image")) return 4;
  return 5; // unknown — middle estimate
}

// Resolve the image model for a caller. A no-modelId caller (e.g. the SDK
// character CLI) must NEVER silently land on a PAID model: the legacy
// ARTLAB_GEMINI_IMAGE_MODEL env var is honoured only when it names a free-tier
// model OR paid images are explicitly enabled (ARTLAB_ALLOW_PAID_IMAGES=on);
// otherwise we fall back to the free DEFAULT_MODEL. Runners always pass an
// already-guarded modelId via image-tiers.ts. Exported for testing.
export function resolveAdapterImageModel(
  modelId: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (modelId) return modelId;
  const envModel = env.ARTLAB_GEMINI_IMAGE_MODEL;
  if (envModel && (isFreeTierImageModel(envModel) || paidImagesAllowed(env))) return envModel;
  return DEFAULT_MODEL;
}

export function createGeminiProvider(options: GeminiProviderOptions): GeminiProvider {
  const model = resolveAdapterImageModel(options.modelId, process.env);
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;
      // Image-conditioning: if a reference image is supplied (e.g. the
      // approved concept-lane PNG for production sprites) include it inline
      // so the model preserves the same face/identity across the run.
      const parts: Array<Record<string, unknown>> = [];
      if (input.referenceImageBytes) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: input.referenceImageBytes.toString("base64"),
          },
        });
      }
      parts.push({ text: input.prompt });
      const body = JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      });
      let response: Response | undefined;
      let lastErrBody = "";
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
        if (response.ok) break;
        lastErrBody = await safeReadText(response);
        if (!RETRY_STATUSES.has(response.status) || attempt === MAX_RETRIES) {
          throw new Error(`gemini generateImage failed: HTTP ${response.status} ${lastErrBody}`);
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
      if (!response || !response.ok) {
        throw new Error(`gemini generateImage failed after ${MAX_RETRIES} retries: ${lastErrBody}`);
      }
      const json = (await response.json()) as GeminiImageResponse;
      const candidate = json.candidates?.[0];
      if (!candidate) {
        throw new Error("gemini generateImage: empty candidates array");
      }
      // Safety-blocked candidates have a finishReason but no content. Surface
      // that as a clear error so the runner falls back to placeholder rather
      // than throwing a generic "cannot read properties of undefined".
      if (!candidate.content || !Array.isArray(candidate.content.parts)) {
        const reason = candidate.finishReason ?? "no-content";
        throw new Error(`gemini generateImage blocked (finishReason=${reason})`);
      }
      const inline = candidate.content.parts.find((p) => p.inlineData)?.inlineData;
      if (!inline) {
        // Sometimes Gemini returns only a text part (refusal or commentary).
        const textPart = candidate.content.parts.find((p) => typeof p.text === "string")?.text;
        const snippet = textPart ? ` (text reply: ${textPart.slice(0, 120)}…)` : "";
        throw new Error(`gemini generateImage: no image bytes in response${snippet}`);
      }
      const bytes = Buffer.from(inline.data, "base64");
      return {
        mode: "real",
        bytes,
        contentType: "image/png",
        costCents: costCentsForModel(model),
        durationMs: Date.now() - startedAt,
      };
    },
  };
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: { parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 280 ? `${text.slice(0, 280)}…` : text;
  } catch {
    return "";
  }
}
