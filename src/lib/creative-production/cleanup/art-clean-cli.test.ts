import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("art:clean registry integration", () => {
  it("writes a durable artifact registry and reports cleanup through registry rules", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-clean-"));

    const output = execFileSync(tsx, [
      join(process.cwd(), "scripts/art-pipeline.ts"),
      "clean",
      "otis",
      "--run-id",
      "otis-clean-v1",
      "--dry-run",
    ], { cwd: root, encoding: "utf8" });
    const parsed = JSON.parse(output) as {
      registryPath: string;
      cleanupPlan: {
        protected: string[];
        delete: string[];
      };
    };

    expect(parsed.registryPath).toBe(".artlab/studio/artifact-registry.json");
    expect(parsed.cleanupPlan.protected).toContain("public/art/lobby/otis/");
    expect(existsSync(join(root, parsed.registryPath))).toBe(true);
    expect(JSON.parse(readFileSync(join(root, parsed.registryPath), "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-retention-registry-v1",
    });
  });
});
