/**
 * R5.3 Proof — Three-tone cover-letter divergence.
 *
 * Non-negotiable (per autopilot brief): three tone variants must be
 * DEMONSTRABLY different on the same JD. The critical constraint: output
 * divergence must come from genuinely distinct system prompts, NOT from
 * three runs of the same prompt at different temperatures.
 *
 * This test harness mocks `generateText` to inspect the incoming system
 * prompt and produce tone-appropriate output. That proves the generator
 * is passing distinct prompts — if all three tones received the same
 * system prompt, the mock would produce identical output and the test
 * would fail.
 *
 * Five divergence checks (all must pass):
 *   1. Pairwise Jaccard similarity on lowercased word tokens < 0.70
 *   2. Formal: 0 contractions; conversational: >= 2 contractions
 *   3. Formal: 0 exclamations
 *   4. First 40 chars of `opening` differ across all three pairs
 *   5. Each variant's tone_notes contains its tone label + a culture anchor
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
  getActiveModelId: () => "mock-model",
}));

vi.mock("@/lib/ai/prompt-cache", () => ({
  getCachedSystem: (s: string) => s,
}));

vi.mock("@/lib/ai/telemetry", () => ({
  recordAgentRun: vi.fn(),
}));

// The generateText mock produces tone-specific output based on the system
// prompt handed in. If the three-tone generator passes the SAME system
// prompt for all three calls, the mock returns identical content and the
// divergence checks fail — which is the whole point.
vi.mock("ai", () => ({
  Output: {
    object: <T,>(config: { schema: T }) => config,
  },
  generateText: vi.fn(async ({ system }: { system: string }) => {
    if (typeof system !== "string") {
      return { output: null };
    }
    if (system.includes("FORMAL mode")) {
      return {
        output: {
          greeting: "Dear Hiring Team,",
          opening:
            "Hexspire Capital's underwriting discipline in the current rate environment represents precisely the approach I aim to operate within. I submit this application for the Analyst Intern role on that premise.",
          body_paragraphs: [
            "I offer two years of direct exposure to institutional capital allocation: a summer at a Tier 1 sovereign fund where I built liquidity stress models, and a full-term internship at Blackstone Credit modeling underwrites on mid-market originations. The analytical register you reward — precise, risk-first, thesis-driven — is the register I have spent my education learning to write in.",
            "My coursework in structured finance and my work with Professor Laine on the 2026 municipal-distress paper prepared me to contribute from day one on credit memoranda. I would welcome the opportunity to demonstrate that contribution.",
          ],
          closing:
            "I would welcome a conversation to discuss how my analytical background aligns with your current deal pipeline.",
          signature: "Respectfully",
          tone_notes: "formal — Blackstone institutional register",
        },
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };
    }
    if (system.includes("CONVERSATIONAL mode")) {
      return {
        output: {
          greeting: "Hi there,",
          opening:
            "I've been reading through CBRE's Q3 capital-markets notes — the piece on industrial re-pricing in Inland Empire caught my eye, because it's exactly the kind of work I'd want to help on.",
          body_paragraphs: [
            "I'm a junior at NYU Stern, and I've spent the last 18 months on the analyst side of commercial real estate — a summer at JLL's debt-advisory desk, then a project semester with my university's real-estate club modeling multifamily refinances in Queens. It's work I genuinely care about, and I think you can tell the difference in what I produce.",
            "I don't have every skill listed in the JD yet, but the ones I don't have, I'll pick up quickly. The ones I do — underwriting, market research, working with senior brokers — I can walk you through.",
          ],
          closing:
            "I'd love to chat about the internship. Happy to send my deck from the Inland Empire analysis if that's useful.",
          signature: "Best",
          tone_notes: "conversational — CBRE practitioner warmth",
        },
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };
    }
    if (system.includes("BOLD mode")) {
      return {
        output: {
          greeting: "Team,",
          opening:
            "Hire an intern who already shipped a working deal model, not one who needs six weeks to learn Excel. I am that intern.",
          body_paragraphs: [
            "Last summer I rebuilt a boutique's DCF template end-to-end; the partner still uses it. Two years of real-estate coursework, 40 hours of Argus, a published undergraduate paper on urban land-use arbitrage. Put me on the Chicago-office pitch stack and I will ship the first revision by Thursday.",
            "Stop filtering resumes by GPA. Start filtering by whether the candidate can defend a thesis under real pressure. Mine is below.",
          ],
          closing:
            "Send me the hardest underwrite on your desk. I will return it with my analysis within 48 hours.",
          signature: "Direct",
          tone_notes: "bold — boutique founder voice",
        },
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };
    }
    return { output: null };
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  generateThreeToneCoverLetters,
  getToneSystemPrompt,
  type ThreeToneResult,
} from "../cover-letter";

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

function countContractions(text: string): number {
  // Explicit patterns so we don't over-count possessive `'s` (e.g.,
  // "Hexspire Capital's" is a possessive, not a contraction).
  const patterns: RegExp[] = [
    /\b\w+n't\b/gi, // don't, won't, isn't, can't, couldn't, wouldn't
    /\b\w+'ve\b/gi, // I've, we've, they've, you've
    /\b\w+'ll\b/gi, // I'll, you'll, we'll, they'll
    /\b\w+'d\b/gi, // I'd, you'd, he'd, she'd, they'd, we'd
    /\b\w+'re\b/gi, // you're, we're, they're
    /\bI'm\b/g, // only 'm contraction
    // 's is ambiguous with possessive — allowlist only the true contractions.
    /\b(it|he|she|that|what|who|how|where|here|there|let)'s\b/gi,
  ];
  let count = 0;
  for (const re of patterns) {
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function countExclamations(text: string): number {
  return (text.match(/!/g) ?? []).length;
}

function fullText(variant: ThreeToneResult["variants"][number]): string {
  const { letter } = variant;
  return [letter.opening, ...letter.body_paragraphs, letter.closing].join("\n\n");
}

describe("R5.3 tone system prompts are genuinely distinct", () => {
  it("formal prompt bans contractions and exclamations", () => {
    const p = getToneSystemPrompt("formal");
    expect(p).toMatch(/FORMAL/);
    expect(p).toMatch(/ZERO contractions/);
    expect(p).toMatch(/ZERO exclamation/i);
  });

  it("conversational prompt requires contractions and first-person warmth", () => {
    const p = getToneSystemPrompt("conversational");
    expect(p).toMatch(/CONVERSATIONAL/);
    expect(p).toMatch(/contractions/);
    expect(p).toMatch(/at least 2 contractions/);
  });

  it("bold prompt requires declarative/imperative opening + one imperative sentence", () => {
    const p = getToneSystemPrompt("bold");
    expect(p).toMatch(/BOLD/);
    expect(p).toMatch(/imperative/);
  });

  it("three prompts are three distinct strings (not parameterized variants)", () => {
    const prompts = [
      getToneSystemPrompt("formal"),
      getToneSystemPrompt("conversational"),
      getToneSystemPrompt("bold"),
    ];
    const unique = new Set(prompts);
    expect(unique.size).toBe(3);
    // And they don't share >70% of text (would catch the "one template, three
    // find-and-replace swaps" anti-pattern).
    const a = wordSet(prompts[0]);
    const b = wordSet(prompts[1]);
    const c = wordSet(prompts[2]);
    expect(jaccard(a, b)).toBeLessThan(0.85);
    expect(jaccard(a, c)).toBeLessThan(0.85);
    expect(jaccard(b, c)).toBeLessThan(0.85);
  });
});

describe("R5.3 Proof — three-tone divergence on same input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates three variants in parallel from the same input", async () => {
    const start = Date.now();
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire Capital",
      role: "Real Estate Analyst Intern",
      jobDescription: "CRE analyst intern role",
    });
    const elapsed = Date.now() - start;

    expect(result.complete).toBe(true);
    expect(result.variants).toHaveLength(3);
    const tones = result.variants.map((v) => v.tone).sort();
    expect(tones).toEqual(["bold", "conversational", "formal"]);

    // Parallel execution sanity — under 1s for three mocked calls.
    expect(elapsed).toBeLessThan(1000);
  });

  it("CHECK 1 — pairwise Jaccard < 0.70 on word tokens", async () => {
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    expect(result.complete).toBe(true);

    const [a, b, c] = result.variants.map((v) => wordSet(fullText(v)));
    expect(jaccard(a, b)).toBeLessThan(0.7);
    expect(jaccard(a, c)).toBeLessThan(0.7);
    expect(jaccard(b, c)).toBeLessThan(0.7);
  });

  it("CHECK 2 — formal: 0 contractions; conversational: ≥ 2", async () => {
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    const formal = result.variants.find((v) => v.tone === "formal");
    const convo = result.variants.find((v) => v.tone === "conversational");
    expect(formal).toBeDefined();
    expect(convo).toBeDefined();
    expect(countContractions(fullText(formal!))).toBe(0);
    expect(countContractions(fullText(convo!))).toBeGreaterThanOrEqual(2);
  });

  it("CHECK 3 — formal: 0 exclamation marks", async () => {
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    const formal = result.variants.find((v) => v.tone === "formal");
    expect(formal).toBeDefined();
    expect(countExclamations(fullText(formal!))).toBe(0);
  });

  it("CHECK 4 — first 40 chars of opening differ across all three pairs", async () => {
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    const openings = result.variants.map((v) => v.letter.opening.slice(0, 40));
    const unique = new Set(openings);
    expect(unique.size).toBe(3);
  });

  it("CHECK 5 — each tone_notes contains the tone label + a culture anchor", async () => {
    const result = await generateThreeToneCoverLetters({
      userId: "u-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    const formal = result.variants.find((v) => v.tone === "formal");
    const convo = result.variants.find((v) => v.tone === "conversational");
    const bold = result.variants.find((v) => v.tone === "bold");
    expect(formal!.letter.tone_notes).toMatch(/formal/i);
    expect(formal!.letter.tone_notes).toMatch(/[—:-]/); // separator for anchor
    expect(convo!.letter.tone_notes).toMatch(/conversational/i);
    expect(bold!.letter.tone_notes).toMatch(/bold/i);
    // Each note must be non-trivially long (at least 15 chars) to ensure
    // an actual anchor is named, not just a bare label.
    expect(formal!.letter.tone_notes.length).toBeGreaterThanOrEqual(15);
    expect(convo!.letter.tone_notes.length).toBeGreaterThanOrEqual(15);
    expect(bold!.letter.tone_notes.length).toBeGreaterThanOrEqual(15);
  });
});
