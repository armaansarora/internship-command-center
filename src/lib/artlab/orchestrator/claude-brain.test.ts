import { describe, expect, it } from "vitest";
import { createClaudeBrain, createOAuthFetch } from "./claude-brain";

describe("Claude Opus brain", () => {
  it("returns a brain instance with the expected model id", () => {
    const brain = createClaudeBrain({ apiKey: "test-key", model: "claude-opus-4-7" });
    expect(brain.modelId).toBe("claude-opus-4-7");
  });

  it("dry-run mode short-circuits without calling the API", async () => {
    process.env.ARTLAB_CLAUDE_MODE = "dry-run";
    const brain = createClaudeBrain({ apiKey: "test", model: "claude-opus-4-7" });
    const result = await brain.decide({
      kind: "route-ambiguous-brief",
      input: { request: "make Sol" },
    });
    delete process.env.ARTLAB_CLAUDE_MODE;
    expect(result.model).toBe("claude-opus-4-7");
    expect(result.outputJson.dryRun).toBe(true);
    // Dry-run path skips retry/validation — those fields should be absent.
    expect(result.retryCount).toBeUndefined();
    expect(result.validationError).toBeUndefined();
  });

  it("constructs against the Claude Max subscription when given an OAuth token", () => {
    const brain = createClaudeBrain({ oauthToken: "oauth-tok", model: "claude-opus-4-7" });
    expect(brain.modelId).toBe("claude-opus-4-7");
  });
});

describe("createOAuthFetch — subscription auth header shaping", () => {
  it("swaps x-api-key for a Bearer token + the oauth beta header", async () => {
    const seen: Array<{ url: unknown; headers: Headers }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: unknown, init?: { headers?: HeadersInit }) => {
      seen.push({ url: input, headers: new Headers(init?.headers) });
      return new Response("{}", { status: 200 });
    }) as typeof globalThis.fetch;
    try {
      const oauthFetch = createOAuthFetch("tok-123");
      await oauthFetch("https://api.anthropic.com/v1/messages", {
        headers: { "x-api-key": "should-be-stripped" },
      });
    } finally {
      globalThis.fetch = original;
    }
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headers.get("authorization")).toBe("Bearer tok-123");
    expect(seen[0]!.headers.get("anthropic-beta")).toBe("oauth-2025-04-20");
    expect(seen[0]!.headers.get("x-api-key")).toBeNull();
  });
});
