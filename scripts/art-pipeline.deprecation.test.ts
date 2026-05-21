// scripts/art-pipeline.deprecation.test.ts
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

describe("legacy art-pipeline deprecation", () => {
  it("exits 1 with a deprecation banner referring users to artlab", () => {
    const result = spawnSync("npx", ["tsx", join("scripts", "art-pipeline.ts")], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
    expect(result.status).toBe(1);
    const stderr = result.stderr.toString("utf8");
    expect(stderr).toMatch(/DEPRECATED/i);
    expect(stderr).toMatch(/artlab/i);
    expect(stderr).toMatch(/npm run artlab/);
  });
});
