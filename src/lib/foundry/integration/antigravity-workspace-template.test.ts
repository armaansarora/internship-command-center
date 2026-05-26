import { describe, expect, it } from "vitest";
import { renderFoundryAntigravityWorkspace } from "./antigravity-workspace-template";

describe("renderFoundryAntigravityWorkspace", () => {
  it("returns a workspace.yaml string with the foundry slug", () => {
    const yaml = renderFoundryAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/^workspace: tower-art-foundry/m);
  });

  it("declares byte-protected paths so the agent doesn't touch promoted packs", () => {
    const yaml = renderFoundryAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/byte-protected/i);
    expect(yaml).toMatch(/promoted/);
  });

  it("includes the MCP server reference", () => {
    const yaml = renderFoundryAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/tower-art-foundry/);
    expect(yaml).toMatch(/scripts\/foundry-mcp\.ts/);
  });

  it("includes the canon path", () => {
    const yaml = renderFoundryAntigravityWorkspace({ repoRoot: "/r" });
    expect(yaml).toMatch(/\.artlab\/canon/);
  });
});
