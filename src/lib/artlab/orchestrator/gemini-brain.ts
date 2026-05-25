// src/lib/artlab/orchestrator/gemini-brain.ts
//
// Gemini-powered implementation of ArtLabLlmBrain. Reuses the same key the
// image generator uses, so a single GEMINI_API_KEY unlocks both real images
// AND brain-authored prompt variations / recommendations / critique.
//
// Defaults to gemini-3-pro-preview for maximum reasoning depth (cost is no
// object — the user wants the brain to feel like a real creative director).
// Falls back automatically to gemini-3.5-flash via the buildBrain wrapper in
// concept-runner if Pro tier returns errors.
//
// Multimodal: vision-aware decision kinds (critique-concept-board,
// critique-production-sprites) pass PNG image paths or bytes via the
// req.images field. Encoder converts each to an inlineData part alongside
// the user-text part.

import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type {
  ArtLabLlmBrain,
  ArtLabLlmDecisionRequest,
  ArtLabLlmDecisionResult,
  ArtLabLlmImageInput,
} from "./llm-brain";
import { SYSTEM_PROMPTS_BY_KIND } from "./system-prompts";
import { defaultTimeoutForKind, isRetryableHttpStatus, withRetryAndTimeout } from "./brain-retry";
import { validateDecisionOutput } from "./decision-schemas";

interface GeminiBrainOptions {
  apiKey: string;
  model?: string;            // default gemini-3-pro-preview (premium reasoning)
}

const DEFAULT_MODEL = "gemini-3-pro-preview";

export interface ArtLabGeminiBrain extends ArtLabLlmBrain {
  modelId: string;
}

export function createGeminiBrain(options: GeminiBrainOptions): ArtLabGeminiBrain {
  const modelId = options.model ?? DEFAULT_MODEL;
  return {
    modelId,
    async decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
      const system = SYSTEM_PROMPTS_BY_KIND[req.kind];
      if (!options.apiKey) {
        throw new Error("gemini-brain: missing api key");
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${options.apiKey}`;
      const userMessage = JSON.stringify(req.input);
      // Build multimodal parts: text first, then any attached images.
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: userMessage },
      ];
      if (req.images && req.images.length > 0) {
        for (const image of req.images) {
          parts.push({ inlineData: encodeImage(image) });
        }
      }
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 8192,
          // Pro-tier thinking is valuable for critique kinds, but expensive.
          // Default off; opt back in via ARTLAB_GEMINI_THINKING=on if needed.
          ...(process.env.ARTLAB_GEMINI_THINKING === "on"
            ? {}
            : { thinkingConfig: { thinkingBudget: 0 } }),
        },
      };
      const bodyString = JSON.stringify(body);
      const startedAt = Date.now();
      const envelope = await withRetryAndTimeout(
        async (signal) => {
          const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: bodyString,
            signal,
          });
          if (!response.ok) {
            const errText = await safeReadText(response);
            const err = new Error(`gemini-brain ${modelId} HTTP ${response.status}: ${errText}`);
            // Tag retryable HTTP errors so withRetryAndTimeout actually retries.
            if (isRetryableHttpStatus(response.status)) {
              (err as Error & { status?: number }).status = response.status;
            }
            throw err;
          }
          return (await response.json()) as GeminiResponseShape;
        },
        {
          opName: `gemini-brain[${req.kind}]`,
          timeoutMs: defaultTimeoutForKind(req.kind),
        },
      );
      const json = envelope.result;
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      let outputJson: Record<string, unknown> = {};
      try {
        outputJson = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Tag parse failure VISIBLY so callers (and /decisions) know the
        // brain returned garbage rather than silently treating it as missing.
        outputJson = { _parseError: "malformed-json", rawText: text.slice(0, 500) };
      }
      const validation = validateDecisionOutput(req.kind, outputJson);
      const usage = json.usageMetadata;
      return {
        kind: req.kind,
        outputJson,
        confidence: typeof outputJson.confidence === "number" ? outputJson.confidence : 0.7,
        tokensIn: usage?.promptTokenCount ?? 0,
        tokensOut: usage?.candidatesTokenCount ?? 0,
        model: modelId,
        retryCount: envelope.retryCount,
        lastTransientError: envelope.lastError,
        validationError: validation.ok ? undefined : validation.error,
        durationMs: Date.now() - startedAt,
      };
    },
  };
}

function encodeImage(image: ArtLabLlmImageInput): { mimeType: string; data: string } {
  if ("bytes" in image) {
    return { mimeType: image.mimeType, data: image.bytes.toString("base64") };
  }
  const bytes = readFileSync(image.path);
  const mimeType = image.mimeType ?? mimeFromExtension(image.path);
  return { mimeType, data: bytes.toString("base64") };
}

function mimeFromExtension(path: string): string {
  const ext = extname(path).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    default: return "image/png";
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 280 ? `${text.slice(0, 280)}…` : text;
  } catch {
    return "";
  }
}

interface GeminiResponseShape {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}
