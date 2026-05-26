import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installFoundryAntigravityWorkspace } from "./foundry-install-antigravity-workspace";

let repoRoot: string;

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "foundry-ag-"));
});

describe("installFoundryAntigravityWorkspace", () => {
  it("writes .antigravity/workspaces/tower-art-foundry/workspace.yaml on confirm", async () => {
    await installFoundryAntigravityWorkspace({
      repoRoot,
      confirm: () => Promise.resolve(true),
    });
    const path = join(repoRoot, ".antigravity", "workspaces", "tower-art-foundry", "workspace.yaml");
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toMatch(/^workspace: tower-art-foundry/m);
  });

  it("aborts when user declines", async () => {
    await installFoundryAntigravityWorkspace({
      repoRoot,
      confirm: () => Promise.resolve(false),
    });
    const path = join(repoRoot, ".antigravity", "workspaces", "tower-art-foundry", "workspace.yaml");
    expect(existsSync(path)).toBe(false);
  });
});
