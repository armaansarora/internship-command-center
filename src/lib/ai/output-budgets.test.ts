/**
 * Sanity guard for the central output-token ceilings.
 *
 * The numeric values themselves are calibration knobs — they can move with
 * intent. This file's job is just to make sure:
 *   - Every exported ceiling is a finite positive integer (no accidental
 *     `NaN`, `0`, negative, or floating-point value that would be silently
 *     rejected by the provider).
 *   - The relative shape is preserved — long-form artifacts (resume, prep
 *     packet, CEO briefing) stay strictly larger than short structured
 *     slots (drill questions, score answer, memory extraction). A future
 *     edit that accidentally inverts that ordering trips this test and
 *     surfaces the regression in PR review.
 */
import { describe, expect, it } from "vitest";
import {
  CEO_BRIEFING_MAX_OUTPUT_TOKENS,
  SUBAGENT_DISPATCH_MAX_OUTPUT_TOKENS,
  ACTIVATION_CRO_MAX_OUTPUT_TOKENS,
  MORNING_BRIEFING_MAX_OUTPUT_TOKENS,
  FIRST_RUN_BRIEFING_MAX_OUTPUT_TOKENS,
  PARLOR_OFFER_EVAL_MAX_OUTPUT_TOKENS,
  PARLOR_CFO_MAX_OUTPUT_TOKENS,
  PARLOR_CNO_MAX_OUTPUT_TOKENS,
  SIMULATOR_TURN_MAX_OUTPUT_TOKENS,
  NEGOTIATION_DRAFT_MAX_OUTPUT_TOKENS,
  COVER_LETTER_MAX_OUTPUT_TOKENS,
  TAILORED_RESUME_MAX_OUTPUT_TOKENS,
  PREP_PACKET_MAX_OUTPUT_TOKENS,
  DRILL_QUESTIONS_MAX_OUTPUT_TOKENS,
  SCORE_ANSWER_MAX_OUTPUT_TOKENS,
  FOLLOW_UP_DRAFT_MAX_OUTPUT_TOKENS,
  REFERENCE_REQUEST_MAX_OUTPUT_TOKENS,
  MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS,
  DOSSIER_EXTRACTION_MAX_OUTPUT_TOKENS,
  CONCIERGE_EXTRACTION_MAX_OUTPUT_TOKENS,
} from "./output-budgets";

const ALL_CEILINGS = [
  CEO_BRIEFING_MAX_OUTPUT_TOKENS,
  SUBAGENT_DISPATCH_MAX_OUTPUT_TOKENS,
  ACTIVATION_CRO_MAX_OUTPUT_TOKENS,
  MORNING_BRIEFING_MAX_OUTPUT_TOKENS,
  FIRST_RUN_BRIEFING_MAX_OUTPUT_TOKENS,
  PARLOR_OFFER_EVAL_MAX_OUTPUT_TOKENS,
  PARLOR_CFO_MAX_OUTPUT_TOKENS,
  PARLOR_CNO_MAX_OUTPUT_TOKENS,
  SIMULATOR_TURN_MAX_OUTPUT_TOKENS,
  NEGOTIATION_DRAFT_MAX_OUTPUT_TOKENS,
  COVER_LETTER_MAX_OUTPUT_TOKENS,
  TAILORED_RESUME_MAX_OUTPUT_TOKENS,
  PREP_PACKET_MAX_OUTPUT_TOKENS,
  DRILL_QUESTIONS_MAX_OUTPUT_TOKENS,
  SCORE_ANSWER_MAX_OUTPUT_TOKENS,
  FOLLOW_UP_DRAFT_MAX_OUTPUT_TOKENS,
  REFERENCE_REQUEST_MAX_OUTPUT_TOKENS,
  MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS,
  DOSSIER_EXTRACTION_MAX_OUTPUT_TOKENS,
  CONCIERGE_EXTRACTION_MAX_OUTPUT_TOKENS,
];

describe("output-budgets", () => {
  it("every ceiling is a finite positive integer", () => {
    for (const v of ALL_CEILINGS) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("CEO briefing budget is the widest C-suite ceiling", () => {
    // The CEO synthesizes up to 6 sub-agent reports plus a structured
    // executive frame. It must be at least as large as any single
    // department's own per-floor ceiling.
    expect(CEO_BRIEFING_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(
      SUBAGENT_DISPATCH_MAX_OUTPUT_TOKENS,
    );
    expect(CEO_BRIEFING_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(
      COVER_LETTER_MAX_OUTPUT_TOKENS,
    );
  });

  it("long-form artifacts dwarf short structured slots", () => {
    // Drill questions / score answer / memory extraction are tight JSON
    // envelopes — they should never approach the long-form ceilings.
    expect(TAILORED_RESUME_MAX_OUTPUT_TOKENS).toBeGreaterThan(
      DRILL_QUESTIONS_MAX_OUTPUT_TOKENS * 2,
    );
    expect(PREP_PACKET_MAX_OUTPUT_TOKENS).toBeGreaterThan(
      SCORE_ANSWER_MAX_OUTPUT_TOKENS * 2,
    );
    expect(CEO_BRIEFING_MAX_OUTPUT_TOKENS).toBeGreaterThan(
      MEMORY_EXTRACTION_MAX_OUTPUT_TOKENS * 4,
    );
  });

  it("no ceiling exceeds 4000 tokens — anything bigger is a sign of unbounded output", () => {
    // Anthropic's default upper bound for a single response is much larger
    // than this; we hold to 4000 as a soft policy ceiling so an unbounded
    // long-form artifact never accidentally lands without review.
    for (const v of ALL_CEILINGS) {
      expect(v).toBeLessThanOrEqual(4000);
    }
  });
});
