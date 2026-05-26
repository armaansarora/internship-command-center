import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("Foundry phase-8 acceptance walkthrough", () => {
  it("PHASE-8-ACCEPTANCE.md exists and lists the 4 install scripts", () => {
    const path = join(ROOT, "docs", "foundry", "PHASE-8-ACCEPTANCE.md");
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, "utf8");
    expect(body).toMatch(/foundry:mcp/);
    expect(body).toMatch(/foundry:install-mcp/);
    expect(body).toMatch(/foundry:install-claude-skill/);
    expect(body).toMatch(/foundry:install-antigravity-workspace/);
  });

  it("references the agent loop acceptance test", () => {
    const body = readFileSync(join(ROOT, "docs", "foundry", "PHASE-8-ACCEPTANCE.md"), "utf8");
    expect(body).toMatch(/agent-loop\.acceptance/);
  });

  it("references the next build integration test", () => {
    const body = readFileSync(join(ROOT, "docs", "foundry", "PHASE-8-ACCEPTANCE.md"), "utf8");
    expect(body).toMatch(/foundry-demo\/build\.integration/);
  });

  it("references all 9 MCP tool names", () => {
    const body = readFileSync(join(ROOT, "docs", "foundry", "PHASE-8-ACCEPTANCE.md"), "utf8");
    const TOOLS = [
      "foundry/canon_list", "foundry/canon_get", "foundry/asset_pack_list",
      "foundry/asset_pack_get", "foundry/asset_pack_integration", "foundry/slot_audit",
      "foundry/generate", "foundry/generate_status", "foundry/diagnostics",
    ];
    for (const t of TOOLS) expect(body).toMatch(new RegExp(t.replace("/", "\\/")));
  });
});
