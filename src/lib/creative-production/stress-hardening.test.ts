import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeWorkspacePath,
  createDefaultCreativeStudioState,
  loadCreativeStudioState,
} from "./index";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

describe("creative production hardening", () => {
  it("rejects common path traversal attempts", () => {
    for (const path of ["../../outside", "/tmp/outside-tower", ".artlab/studio/../../public/art"]) {
      expect(() => assertSafeWorkspacePath(path, [".artlab/studio"])).toThrow(
        /must stay inside/,
      );
    }
  });

  it("rejects symlink escapes inside otherwise allowed roots", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-symlink-root-"));
    const allowedRoot = join(root, "studio");
    const outsideRoot = mkdtempSync(join(tmpdir(), "tower-symlink-outside-"));
    const linkPath = join(allowedRoot, "redirect");

    mkdirSync(allowedRoot, { recursive: true });
    symlinkSync(outsideRoot, linkPath, "dir");

    expect(() => assertSafeWorkspacePath(join(linkPath, "state.json"), [allowedRoot])).toThrow(
      /must stay inside/,
    );
  });

  it("survives repeated studio invocations without losing state shape", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-studio-loop-"));

    for (let index = 0; index < 25; index += 1) {
      const output = execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
      ], { cwd: process.cwd(), encoding: "utf8" });

      expect(output).toContain("What are we adding to The Tower today?");
    }
  }, 30000);

  it("falls back from corrupted state while preserving a valid state contract", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-corrupt-state-"));
    const statePath = join(root, "state.json");

    writeFileSync(statePath, "{ not json");

    const state = await loadCreativeStudioState(statePath);
    const fallback = createDefaultCreativeStudioState();

    expect(state.schemaVersion).toBe(fallback.schemaVersion);
    expect(state.recommendedNext.name).toBe("Otis Vale");
  });
});
