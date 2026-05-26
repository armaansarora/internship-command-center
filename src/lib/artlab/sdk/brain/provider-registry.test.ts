import { describe, expect, it } from "vitest";
import { resolveFoundryAgentProvider, DEFAULT_FOUNDRY_AGENT_MODEL } from "./provider-registry";

describe("resolveFoundryAgentProvider", () => {
  it("returns the default Claude Opus model when no override is set", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "character-master" }, {});
    expect(cfg.model).toBe(DEFAULT_FOUNDRY_AGENT_MODEL);
  });

  it("honours a per-agent env override", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "character-master" }, {
      FOUNDRY_BRAIN_MODEL_CHARACTER_MASTER: "claude-haiku-x",
    });
    expect(cfg.model).toBe("claude-haiku-x");
  });

  it("honours a global env override when no per-agent override is set", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "floor-environment" }, {
      FOUNDRY_BRAIN_MODEL: "claude-sonnet-y",
    });
    expect(cfg.model).toBe("claude-sonnet-y");
  });

  it("per-agent override wins over global override", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "floor-environment" }, {
      FOUNDRY_BRAIN_MODEL: "claude-sonnet-y",
      FOUNDRY_BRAIN_MODEL_FLOOR_ENVIRONMENT: "claude-opus-z",
    });
    expect(cfg.model).toBe("claude-opus-z");
  });

  it("returns dryRun=true when ANTHROPIC_API_KEY is unset", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "ui-texture" }, {});
    expect(cfg.dryRun).toBe(true);
    expect(cfg.apiKey).toBe("");
  });

  it("returns dryRun=false when ANTHROPIC_API_KEY is set", () => {
    const cfg = resolveFoundryAgentProvider({ agent: "ui-texture" }, { ANTHROPIC_API_KEY: "sk-x" });
    expect(cfg.dryRun).toBe(false);
    expect(cfg.apiKey).toBe("sk-x");
  });
});
