import { describe, expect, it } from "vitest";
import { renderArtLabClaudeSkill } from "./claude-skill-template";
import { ARTLAB_SUBCOMMANDS } from "../../../../../scripts/artlab";

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

  it("every rendered `npm run artlab -- <sub>` is a REAL scripts/artlab.ts subcommand", () => {
    // Source of truth: the subcommands scripts/artlab.ts actually dispatches. Derive from the
    // exported ARTLAB_SUBCOMMANDS so a rename/removal in the CLI is caught here (minus `help`,
    // which the rendered doc never invokes as `npm run artlab -- help`).
    const REAL = new Set<string>(ARTLAB_SUBCOMMANDS.filter((s) => s !== "help"));
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    const subs = [...md.matchAll(/npm run artlab -- ([a-z][a-z-]*)/g)].map((m) => m[1]);
    expect(subs.length).toBeGreaterThan(0); // guards against the regex silently matching nothing
    for (const sub of subs) expect(REAL.has(sub), `fictional CLI subcommand: ${sub}`).toBe(true);
    // Regression guard: the old draft invented canon/pack/integrate/audit CLI verbs.
    for (const fake of ["canon", "pack", "integrate", "audit"]) {
      expect(md).not.toContain(`npm run artlab -- ${fake}`);
    }
  });

  it("does not contradict itself by promising a CLI twin for MCP-only tools", () => {
    const md = renderArtLabClaudeSkill({ repoRoot: "/r" });
    // asset_pack_integration + slot_audit are MCP-only — the doc must not claim
    // "every MCP tool has a CLI equivalent / is fully functional without the MCP server".
    expect(md).not.toMatch(/[Ee]very MCP tool has a CLI equivalent/);
    expect(md).toMatch(/MCP-only/);
  });
});
