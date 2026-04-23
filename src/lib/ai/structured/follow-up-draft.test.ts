/**
 * R7.6 — follow-up draft generator contract tests.
 *
 * We stub out the `ai` module's `generateObject` so we never hit the network;
 * the `getAgentModel()` helper stays live but receives a null model (acceptable
 * because the real `generateObject` never runs). Tests verify:
 *   - the mocked structured object round-trips through
 *   - the returned shape parses cleanly through the Zod schema
 *   - the prompt includes company, role, days-since-activity, and warmth
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateObjectMock = vi.hoisted(() =>
  vi.fn(async () => ({
    object: {
      subject: "Reopening the conversation on the Analyst role",
      body: "Three weeks have passed since our last exchange on the Analyst role. I wanted to surface one concrete update that bears on the fit — my next project review ships Friday and touches the exact pipeline work you described. Open to a 15-minute call any day this week?",
      tone: "direct" as const,
    },
  })),
);

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
}));

import {
  FollowUpDraftSchema,
  generateFollowUpDraft,
} from "./follow-up-draft";

describe("R7.6 generateFollowUpDraft", () => {
  beforeEach(() => {
    generateObjectMock.mockClear();
  });

  it("returns the mocked structured object", async () => {
    const out = await generateFollowUpDraft({
      company: "CBRE",
      role: "Analyst",
      daysSinceActivity: 9,
    });

    expect(out.subject).toContain("Analyst");
    expect(out.body.length).toBeGreaterThan(50);
    expect(out.tone).toBe("direct");
  });

  it("returned object parses through the Zod schema", async () => {
    const out = await generateFollowUpDraft({
      company: "Blackstone",
      role: "Associate",
      daysSinceActivity: 14,
      contactName: "Jane",
      contactWarmth: 82,
    });

    const parsed = FollowUpDraftSchema.safeParse(out);
    expect(parsed.success).toBe(true);
  });

  it("prompt includes company, role, days, and warmth", async () => {
    await generateFollowUpDraft({
      company: "Apollo Global",
      role: "Senior Analyst",
      daysSinceActivity: 11,
      contactName: "Morgan",
      contactWarmth: 64,
    });

    expect(generateObjectMock).toHaveBeenCalledOnce();
    const firstCall = (generateObjectMock.mock.calls as unknown as unknown[][])[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as {
      prompt: string;
      system: string;
      schema: unknown;
    };
    expect(call.prompt).toContain("Apollo Global");
    expect(call.prompt).toContain("Senior Analyst");
    expect(call.prompt).toContain("11");
    expect(call.prompt).toContain("64/100");
    expect(call.prompt).toContain("Morgan");
  });

  it("prompt flags unknown contact when contactName is absent", async () => {
    await generateFollowUpDraft({
      company: "Hines",
      role: "Analyst",
      daysSinceActivity: 8,
    });

    const firstCall = (generateObjectMock.mock.calls as unknown as unknown[][])[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as { prompt: string };
    expect(call.prompt).toContain("unknown");
  });

  it("system prompt forbids 'just following up'", async () => {
    await generateFollowUpDraft({
      company: "JLL",
      role: "Associate",
      daysSinceActivity: 10,
    });

    const firstCall = (generateObjectMock.mock.calls as unknown as unknown[][])[0];
    expect(firstCall).toBeDefined();
    const call = firstCall![0] as unknown as { system: string };
    expect(call.system.toLowerCase()).toContain("just following up");
    // The phrase appears as a banned example, not as permission.
    expect(call.system).toMatch(/ZERO|never|not|forbidden|banned|dead/i);
  });

  it("schema rejects body under 50 chars", () => {
    const bad = FollowUpDraftSchema.safeParse({
      subject: "Hi",
      body: "too short",
      tone: "warm",
    });
    expect(bad.success).toBe(false);
  });

  it("schema rejects unknown tone", () => {
    const bad = FollowUpDraftSchema.safeParse({
      subject: "Valid subject",
      body: "A".repeat(60),
      tone: "casual",
    });
    expect(bad.success).toBe(false);
  });
});
