import { describe, expect, it } from "vitest";
import {
  BASE_CACHE_MARKER,
  BASE_SCAFFOLD,
  BASE_SCAFFOLD_TOKEN_COUNT,
} from "./base-scaffold";

/**
 * BASE_SCAFFOLD invariants.
 *
 * The whole point of this constant is byte-identity across every C-suite
 * builder — that is what unlocks Anthropic's prompt cache when the user
 * switches floors. These tests guard the invariants that keep the bytes
 * stable AND keep the scaffold above the Sonnet 4.6 cache minimum
 * (1024 tokens).
 *
 *   - No `{` / `${` / `process.env` / character names — the prompt MUST
 *     NOT depend on runtime values; if it did, the bytes would differ
 *     per request and the cache would never hit.
 *   - Token count within ±10 of the committed estimate. A 50% blow-up
 *     would mean someone wrote a novel into the scaffold; a 50% shrink
 *     would drop us below the cache minimum.
 *   - No trailing newline / no trailing whitespace — the builder adds
 *     deterministic separators, and a stray `\n` here would silently
 *     invalidate the cache.
 *   - The marker MUST NOT appear inside the scaffold itself, otherwise
 *     the splitter in `prompt-cache.ts` would self-split.
 */
describe("BASE_SCAFFOLD", () => {
  it("contains no template-interpolation hooks or runtime references", () => {
    expect(BASE_SCAFFOLD.includes("{")).toBe(false);
    expect(BASE_SCAFFOLD.includes("${")).toBe(false);
    expect(BASE_SCAFFOLD.includes("process.env")).toBe(false);
  });

  it("contains no character-specific identity hooks", () => {
    const forbidden = [
      "CEO",
      "CRO",
      "CFO",
      "CIO",
      "CMO",
      "CNO",
      "COO",
      "CPO",
      "Dylan",
      "Otis",
    ];
    for (const token of forbidden) {
      expect(
        BASE_SCAFFOLD.includes(token),
        `BASE_SCAFFOLD must not contain '${token}'.`,
      ).toBe(false);
    }
  });

  it("does not embed the user's first name", () => {
    expect(BASE_SCAFFOLD.includes("Armaan")).toBe(false);
  });

  it("token count is within the committed band (±10)", () => {
    // Char-based heuristic: Anthropic's tokenizer averages ~4 chars/token
    // for plain English prose. Update both this constant and the inline
    // comment in the source if the scaffold changes meaningfully.
    const estimate = Math.round(BASE_SCAFFOLD.length / 4);
    expect(Math.abs(estimate - BASE_SCAFFOLD_TOKEN_COUNT)).toBeLessThanOrEqual(
      10,
    );
  });

  it("clears the Anthropic Sonnet 4.6 cache minimum (1024 tokens)", () => {
    // The whole point of this fix. If BASE_SCAFFOLD ever drops below 1024
    // tokens, the first cache breakpoint silently no-ops and we lose the
    // cross-character cache benefit. Hard floor at 1024 (with margin).
    expect(BASE_SCAFFOLD_TOKEN_COUNT).toBeGreaterThanOrEqual(1100);
  });

  it("has no trailing newline or trailing whitespace", () => {
    expect(BASE_SCAFFOLD.endsWith("\n")).toBe(false);
    expect(BASE_SCAFFOLD.trimEnd()).toBe(BASE_SCAFFOLD);
  });

  it("does not contain the cache marker (would cause self-split)", () => {
    expect(BASE_SCAFFOLD.includes(BASE_CACHE_MARKER)).toBe(false);
  });

  it("uses no smart quotes, no NBSP, no CRLF", () => {
    expect(/[‘’“”]/.test(BASE_SCAFFOLD)).toBe(false);
    expect(BASE_SCAFFOLD.includes(" ")).toBe(false);
    expect(BASE_SCAFFOLD.includes("\r")).toBe(false);
  });

  it("is comfortably above the splitter's minimum-base threshold", () => {
    // The splitter in prompt-cache.ts refuses to split when base.length < 200.
    // Keeping the scaffold well above that threshold ensures Case A / Case B
    // fire as intended.
    expect(BASE_SCAFFOLD.length).toBeGreaterThan(2000);
  });

  it("does NOT contain the per-character disclaimer (stays per-character)", () => {
    // Per Codex-Adversary's voice-contamination ruling: each character's
    // room/prop reframes "You are NOT an AI assistant" — extracting it
    // here would flatten voice. The line stays in each character file.
    expect(BASE_SCAFFOLD.includes("You are NOT an AI assistant")).toBe(false);
    expect(BASE_SCAFFOLD.includes("You exist as a real person")).toBe(false);
  });
});

describe("BASE_CACHE_MARKER", () => {
  it("is the locked V1 sentinel string", () => {
    expect(BASE_CACHE_MARKER).toBe("<<<TOWER_CACHE_BASE_V1_END>>>");
  });
});
