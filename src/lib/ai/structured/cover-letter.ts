/**
 * Structured cover letter generation.
 *
 * Replaces the prior plaintext-template approach (which embedded prompts like
 * "[HOOK — Paragraph 1]" inside the saved content) with a real LLM-generated
 * draft validated against a Zod schema.
 *
 * The DB consumer (Writing Room viewer) stores documents as a single `content`
 * string today. To stay non-invasive, we marshal the typed schema back into a
 * markdown body before persisting — consumers keep working unchanged, but the
 * LLM gets type-safety on its way out.
 */

import { generateText, Output } from "ai";
import { z } from "zod/v4";
import { getAgentModel, getActiveModelId } from "@/lib/ai/model";
import { getCachedSystem } from "@/lib/ai/prompt-cache";
import { recordAgentRun } from "@/lib/ai/telemetry";

// ---------------------------------------------------------------------------
// Schema (export so other tools / UI can consume the typed shape later)
// ---------------------------------------------------------------------------
export const CoverLetterSchema = z.object({
  greeting: z
    .string()
    .max(100)
    .describe("Salutation line, e.g. 'Dear Hiring Team' or 'Dear Mr. Smith'"),
  opening: z
    .string()
    .max(800)
    .describe(
      "Hook paragraph — opens with company-specific or role-specific specificity. Never starts with 'I am writing to apply for...'.",
    ),
  body_paragraphs: z
    .array(z.string().max(900))
    .min(1)
    .max(3)
    .describe(
      "1-3 paragraphs of value proposition — each connects user experience to a specific company need. Sentences, not bullet lists.",
    ),
  closing: z
    .string()
    .max(500)
    .describe(
      "Confident, direct call-to-action paragraph. No hedging, no 'I hope to hear from you'.",
    ),
  signature: z
    .string()
    .max(80)
    .describe("Sign-off line, e.g. 'Best regards' (no full name — that's a placeholder)."),
  tone_notes: z
    .string()
    .max(200)
    .describe(
      "One-line internal note on the tone calibration applied (e.g. 'Formal — Blackstone Group culture: precise, no contractions').",
    ),
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;

// ---------------------------------------------------------------------------
// Renderer — typed object → markdown content stored in `documents.content`
// ---------------------------------------------------------------------------
/**
 * Marshal a typed cover letter into the markdown body the Writing Room viewer
 * expects. Kept stable so the existing renderer keeps working.
 */
export function renderCoverLetter(letter: CoverLetter): string {
  const body = letter.body_paragraphs.join("\n\n");
  return [
    letter.greeting,
    "",
    letter.opening,
    "",
    body,
    "",
    letter.closing,
    "",
    `${letter.signature},`,
    "[Your Name]",
    "",
    "---",
    `_Tone: ${letter.tone_notes}_`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------
interface GenerateInput {
  userId: string;
  companyName: string;
  role: string;
  tone: "formal" | "conversational" | "bold";
  jobDescription?: string;
  /** Optional research blob from CIO to ground the personalization. */
  companyResearch?: string;
}

const SYSTEM_PROMPT = `You are the CMO of The Tower — a marketing-strategist character writing cover letters for the user. Every word must earn its place.

Cover letter structure (you MUST hit all parts):
  HOOK — Open with company/role specificity. Never start with "I am writing to apply for..."
  VALUE PROPOSITION — 1-3 body paragraphs connecting user's strongest relevant experience to the company's specific need.
  CLOSE — Confident, direct call-to-action. No hedging.

Tone calibration:
  formal — Goldman, Blackstone, Apollo, KKR, JPMorgan: precise, no contractions, authoritative.
  conversational — CBRE, JLL, Cushman & Wakefield, Hines: warm but professional, contractions OK.
  bold — boutiques, startups: direct, confident, personality-forward.

Your output must be a structured cover letter with greeting, opening, body_paragraphs, closing, signature, and a one-line tone_notes annotation explaining the calibration choice.`;

/**
 * Generate a typed cover letter draft. Returns both the typed object and the
 * rendered markdown body the consumer can persist.
 */
export async function generateStructuredCoverLetter(
  input: GenerateInput,
): Promise<{ letter: CoverLetter; markdown: string } | null> {
  const start = Date.now();
  const modelId = getActiveModelId();

  const researchBlock = input.companyResearch
    ? `\n\nCOMPANY RESEARCH (cite specifics from this):\n${input.companyResearch.slice(0, 1500)}`
    : "";
  const jobBlock = input.jobDescription
    ? `\n\nJOB DESCRIPTION KEYWORDS (address these):\n${input.jobDescription.slice(0, 800)}`
    : "";

  const prompt = `Write a cover letter for ${input.companyName} — ${input.role}.
Tone: ${input.tone}${researchBlock}${jobBlock}

Lead with a HOOK that proves you've done the work. Make the value proposition concrete. Close with intent.`;

  try {
    const result = await generateText({
      model: getAgentModel(),
      system: getCachedSystem(SYSTEM_PROMPT),
      prompt,
      output: Output.object({ schema: CoverLetterSchema }),
    });

    if (!result.output) return null;

    void recordAgentRun({
      userId: input.userId,
      agent: "cmo",
      action: "structured.cover_letter",
      modelId,
      usage: result.usage,
      durationMs: Date.now() - start,
      inputSummary: `${input.companyName} / ${input.role} (${input.tone})`,
      outputSummary: `Letter v1 — ${result.output.opening.slice(0, 120)}`,
    });

    return {
      letter: result.output,
      markdown: renderCoverLetter(result.output),
    };
  } catch (err) {
    void recordAgentRun({
      userId: input.userId,
      agent: "cmo",
      action: "structured.cover_letter",
      modelId,
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: `${input.companyName} / ${input.role}`,
      outputSummary: null,
      error: err instanceof Error ? err.message : String(err),
      status: "failed",
    });
    return null;
  }
}
