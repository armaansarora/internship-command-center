import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeFoundryClaudeSnippet, mergeFoundryClaudeSnippet } from "./foundry-install-mcp";

let claudeHome: string;

beforeEach(() => {
  claudeHome = mkdtempSync(join(tmpdir(), "claude-home-"));
});

describe("foundry-install-mcp", () => {
  it("computeFoundryClaudeSnippet produces a tower-art-foundry mcpServers entry", () => {
    const snippet = computeFoundryClaudeSnippet({ repoRoot: "/tmp/repo" });
    expect(snippet).toEqual({
      mcpServers: {
        "tower-art-foundry": {
          command: "npx",
          args: ["tsx", "/tmp/repo/scripts/foundry-mcp.ts"],
          env: {
            FOUNDRY_WORKSPACE_ROOT: "/tmp/repo/.artlab/engine",
            FOUNDRY_CANON_ROOT: "/tmp/repo/.artlab/canon",
          },
        },
      },
    });
  });

  it("mergeFoundryClaudeSnippet preserves existing settings keys", () => {
    const existing = { theme: "dark", mcpServers: { existing: { command: "echo" } } };
    const merged = mergeFoundryClaudeSnippet(
      existing,
      computeFoundryClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(merged.theme).toBe("dark");
    expect((merged.mcpServers as Record<string, unknown>).existing).toBeDefined();
    expect((merged.mcpServers as Record<string, unknown>)["tower-art-foundry"]).toBeDefined();
  });

  it("mergeFoundryClaudeSnippet overwrites a stale tower-art-foundry entry", () => {
    const existing = {
      mcpServers: {
        "tower-art-foundry": { command: "STALE", args: [] },
      },
    };
    const merged = mergeFoundryClaudeSnippet(
      existing,
      computeFoundryClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(
      (merged.mcpServers as Record<string, { command: string }>)["tower-art-foundry"]?.command,
    ).toBe("npx");
  });

  it("write target defaults to ~/.claude/settings.json (dry-run mode just returns the merged object)", () => {
    const initial = { mcpServers: {} };
    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify(initial));
    const computed = computeFoundryClaudeSnippet({ repoRoot: "/tmp/repo" });
    const existing = JSON.parse(
      readFileSync(join(claudeHome, "settings.json"), "utf8"),
    ) as Record<string, unknown>;
    const merged = mergeFoundryClaudeSnippet(existing, computed);
    expect((merged.mcpServers as Record<string, unknown>)["tower-art-foundry"]).toBeDefined();
  });
});
