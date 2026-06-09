import { describe, expect, it } from "vitest";
import { renderArtLabClaudeSkill } from "./claude-skill-template";

describe("renderArtLabClaudeSkill", () => {
  it("references all 9 MCP tools by their harness-real mcp__artlab__ names", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    for (const t of [
      "canon_list", "canon_get", "asset_pack_list", "asset_pack_get",
      "asset_pack_integration", "slot_audit", "generate", "generate_status", "diagnostics",
    ]) {
      expect(md).toContain(`mcp__artlab__${t}`);
    }
  });

  it("includes the enrichment sections (Preflight, Troubleshooting, Tool naming note)", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    expect(md).toMatch(/Preflight/);
    expect(md).toMatch(/Troubleshooting/);
    expect(md).toMatch(/Tool naming note/);
    expect(md).toMatch(/when to use/i);
  });

  it("never contains the dead husk path (regression guard)", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/Users/x/Developer/The Tower" });
    expect(md).not.toMatch(/Documents\/The Tower/);
  });

  it("bakes the repo root into the canon path", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/repo" });
    expect(md).toMatch(/\/repo\/docs\/artlab\/sdk\/canon/);
  });

  it("opens with YAML frontmatter (Claude Code skill format)", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/^name: artlab/m);
  });
});
