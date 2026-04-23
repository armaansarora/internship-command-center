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
// Tone-specific system prompts
// ---------------------------------------------------------------------------
//
// R5.3 non-negotiable: three tones must be DEMONSTRABLY different on the same
// JD. Temperature variance on a shared prompt yields three rewrites of the
// same author's voice. We produce three tones by making the CMO inhabit a
// genuinely different character per tone — distinct system prompts, each
// with its own anchor culture, its own voice constraints, and its own
// stylistic hard-stops.
//
// The divergence proof test asserts measurable output differences; see
// src/lib/ai/structured/three-tone-divergence.proof.test.ts.
// ---------------------------------------------------------------------------
const STRUCTURE_SECTION = `Cover letter structure (you MUST hit all parts):
  HOOK — Open with company/role specificity. Never start with "I am writing to apply for..."
  VALUE PROPOSITION — 1-3 body paragraphs connecting user's strongest relevant experience to the company's specific need.
  CLOSE — Confident, direct call-to-action. No hedging.

Your output must be a structured cover letter with greeting, opening, body_paragraphs, closing, signature, and a one-line tone_notes annotation explaining the calibration choice.`;

const FORMAL_SYSTEM_PROMPT = `You are the CMO of The Tower writing in FORMAL mode. Inhabit the institutional voice of Goldman Sachs / Blackstone / Apollo / KKR / JPMorgan — precise, authoritative, restrained.

VOICE RULES (strict):
- ZERO contractions. "I am", never "I'm". "do not", never "don't". No exceptions.
- ZERO exclamation marks.
- ZERO first-person-plural "we"; this is one candidate addressing one firm.
- Open with institutional fit — the company's position in the market, its recent move, the precise why.
- No rhetorical questions.
- Preferred register: "I believe", "I submit", "I offer", "I would welcome".
- Avoid "passionate", "excited", "thrilled", "love".

tone_notes MUST contain the token "formal" and name the culture anchor (e.g., "formal — Blackstone institutional register").

${STRUCTURE_SECTION}`;

const CONVERSATIONAL_SYSTEM_PROMPT = `You are the CMO of The Tower writing in CONVERSATIONAL mode. Inhabit the professional-warm voice of CBRE / JLL / Cushman & Wakefield / Hines — warm, human, first-person natural, still unmistakably professional.

VOICE RULES (strict):
- USE contractions liberally — "I'm", "I've", "you'll", "don't", "can't". Aim for at least 2 contractions in the body.
- Open with a human observation, not a thesis statement — a moment noticed, a line from their work, a specific practice that caught attention.
- Natural first-person. "I" is fine. "I noticed", "I read", "I watched" are all fine.
- Register: engaged, curious, humble-confident.
- ZERO exclamation marks (warmth != hype).
- Avoid corporate filler: "synergies", "leverage", "best-in-class".

tone_notes MUST contain the token "conversational" and name the culture anchor.

${STRUCTURE_SECTION}`;

const BOLD_SYSTEM_PROMPT = `You are the CMO of The Tower writing in BOLD mode. Inhabit the boutique-startup voice — direct, personality-forward, contrarian when the facts support it.

VOICE RULES (strict):
- Open with a declarative statement OR an imperative — not a question, never "I am writing to apply".
- Include at least one imperative-voice sentence somewhere in the body ("Hire a ... who ...", "Put ... in front of ...", "Stop ... and start ..."). Concrete and specific, never hollow.
- Short sentences permitted. Fragments permitted when they punch.
- Confident claims backed by concrete specifics — fact first, then the claim.
- Exclamation marks are allowed but should be rare; never more than one.
- Avoid MBA clichés ("passionate", "driven", "results-oriented") — replace with specifics.

tone_notes MUST contain the token "bold" and name the style anchor.

${STRUCTURE_SECTION}`;

/**
 * Return the tone-specific system prompt. Exported so the three-tone
 * generator can cache them individually via getCachedSystem and so tests
 * can verify the tone-specific discriminators.
 */
export function getToneSystemPrompt(tone: "formal" | "conversational" | "bold"): string {
  switch (tone) {
    case "formal":
      return FORMAL_SYSTEM_PROMPT;
    case "conversational":
      return CONVERSATIONAL_SYSTEM_PROMPT;
    case "bold":
      return BOLD_SYSTEM_PROMPT;
  }
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

// Legacy single-tone callers receive the tone-appropriate prompt via
// getToneSystemPrompt() inside generateStructuredCoverLetter.

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
      system: getCachedSystem(getToneSystemPrompt(input.tone)),
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

// ---------------------------------------------------------------------------
// Three-tone parallel generator
// ---------------------------------------------------------------------------

export interface ThreeToneInput {
  userId: string;
  companyName: string;
  role: string;
  jobDescription?: string;
  companyResearch?: string;
}

export interface ThreeToneVariant {
  tone: "formal" | "conversational" | "bold";
  letter: CoverLetter;
  markdown: string;
}

export interface ThreeToneResult {
  variants: ThreeToneVariant[];
  /** True if all three tones produced output. False if any tone returned null. */
  complete: boolean;
}

/**
 * Generate three cover letters (formal / conversational / bold) for the
 * same input in parallel. Each tone uses its own distinct system prompt —
 * not the same prompt at different temperatures. The divergence proof
 * test asserts that the three outputs are measurably different on the
 * same JD.
 *
 * Partial results (one or two tones succeeded) are still returned with
 * `complete: false` so the caller can decide whether to retry the missing
 * tone(s) or surface the two that succeeded.
 */
export async function generateThreeToneCoverLetters(
  input: ThreeToneInput,
): Promise<ThreeToneResult> {
  const tones: Array<"formal" | "conversational" | "bold"> = [
    "formal",
    "conversational",
    "bold",
  ];

  const results = await Promise.all(
    tones.map((tone) =>
      generateStructuredCoverLetter({
        userId: input.userId,
        companyName: input.companyName,
        role: input.role,
        tone,
        jobDescription: input.jobDescription,
        companyResearch: input.companyResearch,
      }).then((out) => (out ? { tone, letter: out.letter, markdown: out.markdown } : null)),
    ),
  );

  const variants = results.filter((r): r is ThreeToneVariant => r !== null);
  return {
    variants,
    complete: variants.length === 3,
  };
}
