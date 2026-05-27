import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("ArtLab SDK phase-8 acceptance walkthrough", () => {
  it("PHASE-8-ACCEPTANCE.md exists and lists the 4 install scripts", () => {
    const path = join(ROOT, "docs", "artlab", "sdk", "PHASE-8-ACCEPTANCE.md");
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, "utf8");
    expect(body).toMatch(/artlab:sdk-mcp/);
    expect(body).toMatch(/artlab:sdk-install-mcp/);
    expect(body).toMatch(/artlab:sdk-install-claude-skill/);
    expect(body).toMatch(/artlab:sdk-install-antigravity-workspace/);
  });

  it("references the agent loop acceptance test", () => {
    const body = readFileSync(join(ROOT, "docs", "artlab", "sdk", "PHASE-8-ACCEPTANCE.md"), "utf8");
    expect(body).toMatch(/agent-loop\.acceptance/);
  });

  it("references the next build integration test", () => {
    const body = readFileSync(join(ROOT, "docs", "artlab", "sdk", "PHASE-8-ACCEPTANCE.md"), "utf8");
    expect(body).toMatch(/artlab-demo\/build\.integration/);
  });

  it("references all 9 MCP tool names", () => {
    const body = readFileSync(join(ROOT, "docs", "artlab", "sdk", "PHASE-8-ACCEPTANCE.md"), "utf8");
    const TOOLS = [
      "artlab/canon_list", "artlab/canon_get", "artlab/asset_pack_list",
      "artlab/asset_pack_get", "artlab/asset_pack_integration", "artlab/slot_audit",
      "artlab/generate", "artlab/generate_status", "artlab/diagnostics",
    ];
    for (const t of TOOLS) expect(body).toMatch(new RegExp(t.replace("/", "\\/")));
  });
});
