import { describe, expect, it } from "vitest";
import { resolveBrainProvider } from "./build-brain";

const env = (o: Record<string, string>): NodeJS.ProcessEnv => o as NodeJS.ProcessEnv;

describe("resolveBrainProvider — FREE-first policy", () => {
  it("defaults to mock when no keys are present", () => {
    expect(resolveBrainProvider(env({}))).toBe("mock");
  });

  it("prefers FREE Gemini over paid Anthropic when both keys are present", () => {
    expect(resolveBrainProvider(env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }))).toBe("gemini");
  });

  it("uses Gemini when only the Gemini key is present", () => {
    expect(resolveBrainProvider(env({ GEMINI_API_KEY: "g" }))).toBe("gemini");
  });

  it("uses Claude (API) when only the Anthropic key is present", () => {
    expect(resolveBrainProvider(env({ ANTHROPIC_API_KEY: "a" }))).toBe("claude");
  });

  it("uses Claude OAuth (subscription) when only the OAuth token is present", () => {
    expect(resolveBrainProvider(env({ CLAUDE_CODE_OAUTH_TOKEN: "t" }))).toBe("claude-oauth");
  });

  it("ignores placeholder Gemini keys (leading __)", () => {
    expect(resolveBrainProvider(env({ GEMINI_API_KEY: "__missing__" }))).toBe("mock");
  });

  it("honours explicit ARTLAB_BRAIN_PROVIDER=claude even when a Gemini key exists", () => {
    expect(
      resolveBrainProvider(env({ ARTLAB_BRAIN_PROVIDER: "claude", GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" })),
    ).toBe("claude");
  });

  it("honours explicit ARTLAB_BRAIN_PROVIDER=claude-oauth", () => {
    expect(
      resolveBrainProvider(
        env({ ARTLAB_BRAIN_PROVIDER: "claude-oauth", CLAUDE_CODE_OAUTH_TOKEN: "t", GEMINI_API_KEY: "g" }),
      ),
    ).toBe("claude-oauth");
  });

  it("explicit claude with no Anthropic key falls back to Gemini", () => {
    expect(resolveBrainProvider(env({ ARTLAB_BRAIN_PROVIDER: "claude", GEMINI_API_KEY: "g" }))).toBe("gemini");
  });

  it("explicit gemini with no Gemini key falls back to mock", () => {
    expect(resolveBrainProvider(env({ ARTLAB_BRAIN_PROVIDER: "gemini", ANTHROPIC_API_KEY: "a" }))).toBe("mock");
  });

  it("explicit claude-oauth without a token never silently bills paid Claude — falls to FREE Gemini", () => {
    expect(
      resolveBrainProvider(env({ ARTLAB_BRAIN_PROVIDER: "claude-oauth", ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g" })),
    ).toBe("gemini");
  });
});
