import { describe, expect, it } from "vitest";
import { resolveArtLabAgentProvider, DEFAULT_ARTLAB_AGENT_MODEL } from "./provider-registry";

describe("resolveArtLabAgentProvider", () => {
  it("returns the default Claude Opus model when no override is set", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "character-master" }, {});
    expect(cfg.model).toBe(DEFAULT_ARTLAB_AGENT_MODEL);
  });

  it("honours a per-agent env override", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "character-master" }, {
      ARTLAB_BRAIN_MODEL_CHARACTER_MASTER: "claude-haiku-x",
    });
    expect(cfg.model).toBe("claude-haiku-x");
  });

  it("honours a global env override when no per-agent override is set", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "floor-environment" }, {
      ARTLAB_BRAIN_MODEL: "claude-sonnet-y",
    });
    expect(cfg.model).toBe("claude-sonnet-y");
  });

  it("per-agent override wins over global override", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "floor-environment" }, {
      ARTLAB_BRAIN_MODEL: "claude-sonnet-y",
      ARTLAB_BRAIN_MODEL_FLOOR_ENVIRONMENT: "claude-opus-z",
    });
    expect(cfg.model).toBe("claude-opus-z");
  });

  it("returns dryRun=true when ANTHROPIC_API_KEY is unset", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "ui-texture" }, {});
    expect(cfg.dryRun).toBe(true);
    expect(cfg.apiKey).toBe("");
  });

  it("FREE-by-default: dry-runs when ANTHROPIC_API_KEY is set but Claude is not opted into", () => {
    const cfg = resolveArtLabAgentProvider({ agent: "ui-texture" }, { ANTHROPIC_API_KEY: "sk-x" });
    expect(cfg.dryRun).toBe(true);
    expect(cfg.apiKey).toBe("sk-x");
  });

  it("returns dryRun=false only when ANTHROPIC_API_KEY is set AND ARTLAB_BRAIN_PROVIDER opts into Claude", () => {
    const cfg = resolveArtLabAgentProvider(
      { agent: "ui-texture" },
      { ANTHROPIC_API_KEY: "sk-x", ARTLAB_BRAIN_PROVIDER: "claude" },
    );
    expect(cfg.dryRun).toBe(false);
    expect(cfg.apiKey).toBe("sk-x");
  });

  it("claude-oauth also opts into a live (non-dry-run) brain", () => {
    const cfg = resolveArtLabAgentProvider(
      { agent: "ui-texture" },
      { ANTHROPIC_API_KEY: "sk-x", ARTLAB_BRAIN_PROVIDER: "claude-oauth" },
    );
    expect(cfg.dryRun).toBe(false);
  });
});
