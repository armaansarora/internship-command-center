/**
 * Output-token ceilings per AI call site.
 *
 * Every `generateText` / `generateObject` / `streamText` call site in the AI
 * tree should pass a `maxOutputTokens` value sourced from this module. The
 * file is the single source of truth so a budget change is a one-file PR.
 *
 * # Why ceilings matter
 *
 * Anthropic charges per output token. Without a ceiling the model can — and
 * occasionally does — run on for several thousand tokens past the point a
 * user-facing response stays useful, especially during tool-loop sub-agent
 * synthesis. A 600-token cap on a sub-agent's compressed report is the
 * difference between $0.009 and $0.045 on Sonnet 4.6 pricing.
 *
 * # Calibration philosophy
 *
 * - Short structured slots (drill questions, score answer, follow-up tone
 *   label) get tight caps (≤400 tokens) because their Zod shape already
 *   bounds the JSON envelope.
 * - One-shot character replies that produce a single email or compressed
 *   report get 600 tokens — enough for a 200-word draft plus envelope
 *   structure.
 * - Long-form artifacts (tailored resume, prep packet, three-tone cover
 *   letter, morning briefing with beats[]) get 2000 tokens.
 * - The CEO's own briefing turn caps at 2000 because it has to synthesize up
 *   to six sub-agent reports and still produce a structured executive frame.
 *
 * # Updating a budget
 *
 * Edit the constant here, then bump the matching test snapshot in
 * `src/lib/ai/output-budgets.test.ts` so the change shows up in code review.
 * Never inline a magic-number cap at the call site — that defeats the audit.
 */

// ---------------------------------------------------------------------------
// Sub-agent synthesis (dispatched from CEO)
// ---------------------------------------------------------------------------
/**
 * Compressed report each C-suite sub-agent produces when the CEO dispatches.
 * The orchestrator prompt asks for "under 250 words". 800 tokens accommodates
 * that plus a generous envelope for tool-call scratch — sub-agents still call
 * tools inside this loop so the budget covers tool-result text, not just the
 * final summary text.
 */
export const SUBAGENT_DISPATCH_MAX_OUTPUT_TOKENS = 800;

// ---------------------------------------------------------------------------
// CEO orchestration & briefings
// ---------------------------------------------------------------------------
/**
 * The CEO's own streaming turn — synthesises up to 6 sub-agent reports plus a
 * STRATEGIC PRIORITY tail. 2000 tokens is the upper bound of "useful
 * synthesis"; past it the response devolves into a memo no one reads.
 */
export const CEO_BRIEFING_MAX_OUTPUT_TOKENS = 2000;

/**
 * Morning briefing — 3–6 beats × ≤140 chars each, plus the structured envelope.
 * 800 tokens is comfortable headroom for the schema'd output.
 */
export const MORNING_BRIEFING_MAX_OUTPUT_TOKENS = 800;

/**
 * First-run briefing — same shape as the daily morning briefing but a touch
 * longer because it always lists multiple discovered roles. 1000 tokens.
 */
export const FIRST_RUN_BRIEFING_MAX_OUTPUT_TOKENS = 1000;

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------
/**
 * Activation gauntlet's one CRO call — short, decisive, ≤600 chars summary.
 * Kept here so the activation file no longer owns the magic number.
 */
export const ACTIVATION_CRO_MAX_OUTPUT_TOKENS = 600;

// ---------------------------------------------------------------------------
// Negotiation Parlor
// ---------------------------------------------------------------------------
/** Offer Evaluator block — verdict + 3-5 sentences + risks[]. */
export const PARLOR_OFFER_EVAL_MAX_OUTPUT_TOKENS = 500;
/** CFO comp computation in the Parlor — numbers + 1-line vesting note. */
export const PARLOR_CFO_MAX_OUTPUT_TOKENS = 400;
/** CNO contacts surface — a list of contacts + one-line note each. */
export const PARLOR_CNO_MAX_OUTPUT_TOKENS = 500;
/** Recruiter simulator turn — recruiter reply ≤150 words + scoring envelope. */
export const SIMULATOR_TURN_MAX_OUTPUT_TOKENS = 700;
/** Negotiation draft — 200-word body + short subject. */
export const NEGOTIATION_DRAFT_MAX_OUTPUT_TOKENS = 700;

// ---------------------------------------------------------------------------
// CMO outputs (cover letters, resumes)
// ---------------------------------------------------------------------------
/** Single-tone cover letter (structured) — body + envelope. */
export const COVER_LETTER_MAX_OUTPUT_TOKENS = 1200;
/** Tailored resume — sections + bullets across 4-6 roles. */
export const TAILORED_RESUME_MAX_OUTPUT_TOKENS = 2000;

// ---------------------------------------------------------------------------
// CPO outputs (prep packets, drills, scoring)
// ---------------------------------------------------------------------------
/** Prep packet — 4-12 questions × frameworks + summaries. */
export const PREP_PACKET_MAX_OUTPUT_TOKENS = 2000;
/** Drill questions — 3 questions × rubric. */
export const DRILL_QUESTIONS_MAX_OUTPUT_TOKENS = 600;
/** Score answer — 4 STAR floats + score + narrative + nudge. */
export const SCORE_ANSWER_MAX_OUTPUT_TOKENS = 400;

// ---------------------------------------------------------------------------
// COO outputs (overnight follow-up drafts)
// ---------------------------------------------------------------------------
/** Single follow-up email body (≤200 words). */
export const FOLLOW_UP_DRAFT_MAX_OUTPUT_TOKENS = 600;

// ---------------------------------------------------------------------------
// CNO outputs (reference requests)
// ---------------------------------------------------------------------------
/** Reference-request email body (≤180 words). */
export const REFERENCE_REQUEST_MAX_OUTPUT_TOKENS = 500;

// ---------------------------------------------------------------------------
// Extraction / classification helpers (Haiku-served)
// ---------------------------------------------------------------------------
/** Memory extractor — at most 3 entries × ≤280 chars + envelope. */
export const MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS = 400;
/** Dossier extractor — structured Council Table dossier. */
export const DOSSIER_EXTRACTION_MAX_OUTPUT_TOKENS = 500;
/** Concierge target-profile extraction — small JSON envelope. */
export const CONCIERGE_EXTRACTION_MAX_OUTPUT_TOKENS = 600;
