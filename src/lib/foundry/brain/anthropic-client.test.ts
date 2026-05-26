import { describe, expect, it, vi } from "vitest";
import { callFoundryAnthropic } from "./anthropic-client";

describe("callFoundryAnthropic", () => {
  it("dry-run mode short-circuits without a real key", async () => {
    const result = await callFoundryAnthropic({
      systemPrompt: "you are an oracle",
      userJson: { question: "x" },
      model: "claude-opus-4-7",
      apiKey: "sk-fake-DRY",
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(typeof result.text).toBe("string");
    expect(result.tokensIn).toBe(0);
    expect(result.tokensOut).toBe(0);
  });

  it("when not in dry-run mode, calls generateText with prompt caching on the system message", async () => {
    const recorded: { lastSystem?: { providerOptions?: { anthropic?: { cacheControl?: { type: string } } } } } = {};
    const fakeGenerate = vi.fn().mockResolvedValue({
      text: '{"plan": "ok"}',
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const result = await callFoundryAnthropic({
      systemPrompt: "you are an oracle",
      userJson: { x: 1 },
      model: "claude-opus-4-7",
      apiKey: "sk-real",
      generateTextOverride: async (req) => {
        recorded.lastSystem = (req.messages as Array<{ role: string; content: string; providerOptions?: { anthropic?: { cacheControl?: { type: string } } } }>).find((m) => m.role === "system");
        return fakeGenerate(req);
      },
    });
    expect(recorded.lastSystem?.providerOptions?.anthropic?.cacheControl?.type).toBe("ephemeral");
    expect(result.text).toBe('{"plan": "ok"}');
  });

  it("populates durationMs on the response", async () => {
    const result = await callFoundryAnthropic({
      systemPrompt: "x",
      userJson: {},
      model: "claude-opus-4-7",
      apiKey: "sk-real",
      generateTextOverride: async () => ({ text: "{}", usage: { inputTokens: 1, outputTokens: 1 } }),
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
