import { describe, expect, it } from "vitest";
import { renderFoundryClaudeSkill } from "./claude-skill-template";

describe("renderFoundryClaudeSkill", () => {
  it("returns a markdown body referencing all 9 MCP tools", () => {
    const md = renderFoundryClaudeSkill({ repoRoot: "/r" });
    expect(md).toMatch(/foundry\/canon_list/);
    expect(md).toMatch(/foundry\/canon_get/);
    expect(md).toMatch(/foundry\/asset_pack_list/);
    expect(md).toMatch(/foundry\/asset_pack_get/);
    expect(md).toMatch(/foundry\/asset_pack_integration/);
    expect(md).toMatch(/foundry\/slot_audit/);
    expect(md).toMatch(/foundry\/generate/);
    expect(md).toMatch(/foundry\/generate_status/);
    expect(md).toMatch(/foundry\/diagnostics/);
  });

  it("includes a 'when to use' decision table", () => {
    const md = renderFoundryClaudeSkill({ repoRoot: "/r" });
    expect(md).toMatch(/when to use/i);
  });

  it("includes the canon path so the agent knows where YAML lives", () => {
    const md = renderFoundryClaudeSkill({ repoRoot: "/repo" });
    expect(md).toMatch(/\/repo\/\.artlab\/canon/);
  });

  it("opens with a YAML frontmatter block (Claude Code skill format)", () => {
    const md = renderFoundryClaudeSkill({ repoRoot: "/r" });
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/^name: tower-art-foundry/m);
  });
});
