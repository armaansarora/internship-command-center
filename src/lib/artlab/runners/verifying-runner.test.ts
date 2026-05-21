import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyingRunner } from "./verifying-runner";

describe("verifying runner (Phase 1 stub)", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-verify-")); });

  it("returns ok when ARTLAB_PLAYWRIGHT_MODE=mock", async () => {
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
    const result = await verifyingRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PLAYWRIGHT_MODE;
    expect(result.status).toBe("ok");
    expect(result.artifacts.mode).toBe("mock");
  });

  it("returns failed when failure marker file exists", async () => {
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
    writeFileSync(join(runDir, "playwright-force-fail.flag"), "");
    const result = await verifyingRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PLAYWRIGHT_MODE;
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("playwright-forced-failure");
  });
});
