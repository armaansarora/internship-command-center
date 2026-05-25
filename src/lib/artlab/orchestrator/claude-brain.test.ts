import { describe, expect, it } from "vitest";
import { createClaudeBrain } from "./claude-brain";

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
});
