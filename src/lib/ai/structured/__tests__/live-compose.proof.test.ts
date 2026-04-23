/**
 * R5.4 Proof — live-compose streaming invariants.
 *
 * Three assertions (partner non-negotiables):
 *   1. All three streams start within 100ms of each other (parallel fan-out,
 *      not sequential).
 *   2. Each stream emits >=10 token deltas before finishing.
 *   3. The full streamed text equals the non-streamed generation for the
 *      same prompt (round-trip equivalence).
 *
 * LLMs are non-deterministic in prod; the equivalence assertion is only
 * meaningful in a mocked environment. This is the standard mocking pattern
 * already used by three-tone-divergence.proof.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

// --- Deterministic chunks keyed by tone -------------------------------------
const CHUNKS_BY_TONE: Record<string, string[]> = {
  formal: [
    "Dear", " ", "Hiring", " ", "Team,\n\n",
    "Hexspire", " Capital's", " underwriting", " discipline", " is",
    " precisely", " the", " register", " I", " operate", " within.",
  ],
  conversational: [
    "Hi", " there,\n\n",
    "I've", " been", " reading", " CBRE's", " Q3", " notes", " and",
    " the", " industrial", " re-pricing", " piece", " caught", " my",
    " eye.",
  ],
  bold: [
    "Hire", " someone", " who", " has", " modeled", " the", " exact",
    " capital", " stack", " you", " just", " restructured.\n\n",
    "I", " am", " that", " candidate.",
  ],
};

const callTimes: number[] = [];

// --- `ai` module mock -------------------------------------------------------
vi.mock("ai", () => {
  return {
    streamText: vi.fn(({ system }: { system: string }) => {
      callTimes.push(Date.now());
      const tone = system.includes("FORMAL mode")
        ? "formal"
        : system.includes("CONVERSATIONAL mode")
          ? "conversational"
          : "bold";
      const chunks = CHUNKS_BY_TONE[tone];
      async function* textStream() {
        for (const c of chunks) yield c;
      }
      return {
        textStream: textStream(),
        // AI SDK v6 result object also surfaces `text` as a promise of the
        // final concatenation. Mirror that so our production helper can use
        // it without branching on mock vs real.
        text: Promise.resolve(chunks.join("")),
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 20, totalTokens: 30 }),
      };
    }),
    generateText: vi.fn(async ({ system }: { system: string }) => {
      const tone = system.includes("FORMAL mode")
        ? "formal"
        : system.includes("CONVERSATIONAL mode")
          ? "conversational"
          : "bold";
      return {
        text: CHUNKS_BY_TONE[tone].join(""),
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      };
    }),
  };
});

import {
  streamCoverLetterProse,
  generateCoverLetterProse,
} from "../cover-letter-stream";

beforeEach(() => {
  callTimes.length = 0;
});

describe("R5.4 Proof — live-compose streaming", () => {
  it("fans three tones out in parallel (all starts within 100ms)", async () => {
    const input = {
      userId: "u1",
      companyName: "Acme",
      role: "Analyst",
      jobDescription: "jd",
    };
    await Promise.all([
      consume(streamCoverLetterProse({ ...input, tone: "formal" }).textStream),
      consume(streamCoverLetterProse({ ...input, tone: "conversational" }).textStream),
      consume(streamCoverLetterProse({ ...input, tone: "bold" }).textStream),
    ]);
    expect(callTimes.length).toBe(3);
    const spread = Math.max(...callTimes) - Math.min(...callTimes);
    expect(spread).toBeLessThan(100);
  });

  it("each stream emits >=10 token deltas", async () => {
    const input = {
      userId: "u1",
      companyName: "Acme",
      role: "Analyst",
    };
    const counts = await Promise.all(
      (["formal", "conversational", "bold"] as const).map(async (tone) => {
        let n = 0;
        for await (const chunk of streamCoverLetterProse({ ...input, tone }).textStream) {
          void chunk;
          n++;
        }
        return n;
      }),
    );
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(10);
  });

  it("streamed full text equals non-streamed generation for the same prompt", async () => {
    const input = {
      userId: "u1",
      companyName: "Acme",
      role: "Analyst",
      tone: "formal" as const,
    };
    const streamed = await streamCoverLetterProse(input).fullText;
    const nonStreamed = await generateCoverLetterProse(input);
    expect(streamed).toBe(nonStreamed);
  });
});

async function consume(it: AsyncIterable<string>): Promise<void> {
  for await (const chunk of it) void chunk;
}
