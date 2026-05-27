import { describe, expect, it } from "vitest";
import { renderArtLabClaudeSkill } from "./claude-skill-template";

describe("renderArtLabClaudeSkill", () => {
  it("returns a markdown body referencing all 9 MCP tools", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    expect(md).toMatch(/artlab\/canon_list/);
    expect(md).toMatch(/artlab\/canon_get/);
    expect(md).toMatch(/artlab\/asset_pack_list/);
    expect(md).toMatch(/artlab\/asset_pack_get/);
    expect(md).toMatch(/artlab\/asset_pack_integration/);
    expect(md).toMatch(/artlab\/slot_audit/);
    expect(md).toMatch(/artlab\/generate/);
    expect(md).toMatch(/artlab\/generate_status/);
    expect(md).toMatch(/artlab\/diagnostics/);
  });

  it("includes a 'when to use' decision table", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    expect(md).toMatch(/when to use/i);
  });

  it("includes the canon path so the agent knows where YAML lives", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/repo" });
    expect(md).toMatch(/\/repo\/\.artlab\/canon/);
  });

  it("opens with a YAML frontmatter block (Claude Code skill format)", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/^name: artlab/m);
  });
});
