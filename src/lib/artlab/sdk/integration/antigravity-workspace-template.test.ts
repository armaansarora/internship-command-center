import { describe, expect, it } from "vitest";
import { renderArtLabAntigravityWorkspace } from "./antigravity-workspace-template";

describe("renderArtLabAntigravityWorkspace", () => {
  it("returns a workspace.yaml string with the artlab slug", () => {
    const yaml = renderArtLabAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/^workspace: artlab/m);
  });

  it("declares byte-protected paths so the agent doesn't touch promoted packs", () => {
    const yaml = renderArtLabAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/byte-protected/i);
    expect(yaml).toMatch(/promoted/);
  });

  it("includes the MCP server reference", () => {
    const yaml = renderArtLabAntigravityWorkspace({ repoRoot: "/repo" });
    expect(yaml).toMatch(/artlab/);
    expect(yaml).toMatch(/scripts\/artlab-sdk-mcp\.ts/);
  });

  it("includes the canon path", () => {
    const yaml = renderArtLabAntigravityWorkspace({ repoRoot: "/r" });
    expect(yaml).toMatch(/\/r\/docs\/artlab\/sdk\/canon/);
  });

  it("declares canon as read-only so the agent cannot byte-edit canon YAML", () => {
    const yaml = renderArtLabAntigravityWorkspace({ repoRoot: "/repo" });
    // Canon must NOT appear under read-write.
    const readWriteBlock = yaml.match(/read-write:\n((?:    - .+\n)+)/);
    expect(readWriteBlock).not.toBeNull();
    expect(readWriteBlock?.[1] ?? "").not.toMatch(/docs\/artlab\/sdk\/canon/);
    // Canon must appear under read-only.
    expect(yaml).toMatch(/read-only:[\s\S]*\/repo\/docs\/artlab\/sdk\/canon/);
  });
});
