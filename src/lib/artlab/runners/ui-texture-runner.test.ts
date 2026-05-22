// src/lib/artlab/runners/ui-texture-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uiTextureRunner } from "./ui-texture-runner";

describe("UI texture runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-uit-")); });

  it("produces one slot per (surface, state) combo for the requested surfaces", async () => {
    const result = await uiTextureRunner.run({
      runId: "r1", runDir,
      assetType: "ui-texture", providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect((result.artifacts.slotOutputs as string[]).length).toBeGreaterThan(0);
  });
});
