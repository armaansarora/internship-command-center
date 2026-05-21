import { describe, expect, it } from "vitest";
import { invokeCodex, type CodexInvokeInput } from "./codex";

describe("codex adapter", () => {
  it("uses ARTLAB_CODEX_MODE=mock to skip the real MCP call", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const result = await invokeCodex({
      goal: "test goal",
      sandboxLevel: "danger-full-access",
      cwd: "/tmp",
    } as CodexInvokeInput);
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.mode).toBe("mock");
    expect(result.summary).toContain("test goal");
  });
});
