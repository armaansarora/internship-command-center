// src/lib/artlab/orchestrator/gemini-brain.ts
//
// Gemini-powered implementation of ArtLabLlmBrain. Reuses the same key the
// image generator uses, so a single GEMINI_API_KEY unlocks both real images
// AND brain-authored prompt variations / recommendations. Defaults to
// gemini-3.5-flash (current Google text-completion default — cheap + fast).
//
// The system prompts are imported from system-prompts.ts — they're already
// model-agnostic ("return JSON: …").

import type {
  ArtLabLlmBrain,
  ArtLabLlmDecisionRequest,
  ArtLabLlmDecisionResult,
} from "./llm-brain";
import { SYSTEM_PROMPTS_BY_KIND } from "./system-prompts";

interface GeminiBrainOptions {
  apiKey: string;
  model?: string;            // default gemini-3.5-flash (cheap + fast)
}

const DEFAULT_MODEL = "gemini-3.5-flash";

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
      // Gemini requires JSON output via responseMimeType. The system prompt
      // is prepended via the `systemInstruction` field so it stays cached
      // across calls (Gemini does implicit cache reuse for repeated prompts).
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 8192,
          // Suppress extended-thinking tokens. Our system prompts are already
          // highly structured (return JSON: …), so thinking is wasted spend.
          thinkingConfig: { thinkingBudget: 0 },
        },
      };
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errText = await safeReadText(response);
        throw new Error(`gemini-brain ${modelId} HTTP ${response.status}: ${errText}`);
      }
      const json = (await response.json()) as GeminiResponseShape;
      const text = json.candidates?.[0]?.content.parts.map((p) => p.text ?? "").join("") ?? "";
      let outputJson: Record<string, unknown> = {};
      try {
        outputJson = JSON.parse(text) as Record<string, unknown>;
      } catch {
        outputJson = { rawText: text };
      }
      const usage = json.usageMetadata;
      return {
        kind: req.kind,
        outputJson,
        confidence: typeof outputJson.confidence === "number" ? outputJson.confidence : 0.7,
        tokensIn: usage?.promptTokenCount ?? 0,
        tokensOut: usage?.candidatesTokenCount ?? 0,
        model: modelId,
      };
    },
  };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
  } catch {
    return "";
  }
}

interface GeminiResponseShape {
  candidates?: Array<{
    content: { parts: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}
