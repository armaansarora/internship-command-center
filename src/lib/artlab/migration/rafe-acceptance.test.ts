// src/lib/artlab/migration/rafe-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runProduceSubcommand } from "@/lib/artlab/cli/produce";

// =============================================================================
// POST-/goal ARTIFACT — runs in Appendix D Post-/goal Manual Validation, never
// during /goal execution.
//
// Three layers of protection:
//   1. describe.skip — vitest skips the whole block by default.
//   2. Env guard — even if someone un-skips, the test throws immediately
//      unless ARTLAB_ALLOW_REAL_MONEY_VALIDATION === "yes".
//   3. Appendix D runbook is the only documented path that sets the env var.
//
// Real money: this triggers a full Rafe Calder run via the real Gemini API.
// =============================================================================
describe.skip("Phase 4 acceptance — first real Rafe run via ArtLab", () => {
  it("artlab produce 'make Rafe Calder' completes through closed phase", async () => {
    if (process.env.ARTLAB_ALLOW_REAL_MONEY_VALIDATION !== "yes") {
      throw new Error(
        "Refusing to run real-money acceptance test. " +
        "This test costs real Gemini API spend. " +
        "If you intentionally want to run it, follow Appendix D of the plan, " +
        "which sets ARTLAB_ALLOW_REAL_MONEY_VALIDATION=yes before un-skipping.",
      );
    }
    expect(process.env.ARTLAB_GEMINI_MODE).toBeFalsy();
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? join(process.cwd(), ".artlab", "engine");
    const result = await runProduceSubcommand({
      workspaceRoot,
      args: ["make", "Rafe", "Calder"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.runId).toBeTruthy();
    // Actual phase progression happens via the running daemon. This test only
    // verifies the produce intent was accepted; Armaan watches Telegram to
    // confirm the two gates land (`approve direction <n>` then
    // `approved for app`).
    expect(existsSync(join(workspaceRoot, "inbox", "cli", `produce-${result.runId}.json`))).toBe(true);
  }, 30 * 60_000);
});
