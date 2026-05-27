import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeArtLabClaudeSnippet, mergeArtLabClaudeSnippet } from "./artlab-sdk-install-mcp";

let claudeHome: string;

beforeEach(() => {
  claudeHome = mkdtempSync(join(tmpdir(), "claude-home-"));
});

describe("artlab-sdk-install-mcp", () => {
  it("computeArtLabClaudeSnippet produces a tower-art-foundry mcpServers entry", () => {
    const snippet = computeArtLabClaudeSnippet({ repoRoot: "/tmp/repo" });
    expect(snippet).toEqual({
      mcpServers: {
        "tower-art-foundry": {
          command: "npx",
          args: ["tsx", "/tmp/repo/scripts/artlab-sdk-mcp.ts"],
          env: {
            ARTLAB_WORKSPACE_ROOT: "/tmp/repo/.artlab/engine",
            ARTLAB_CANON_ROOT: "/tmp/repo/.artlab/canon",
          },
        },
      },
    });
  });

  it("mergeArtLabClaudeSnippet preserves existing settings keys", () => {
    const existing = { theme: "dark", mcpServers: { existing: { command: "echo" } } };
    const merged = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(merged.theme).toBe("dark");
    expect((merged.mcpServers as Record<string, unknown>).existing).toBeDefined();
    expect((merged.mcpServers as Record<string, unknown>)["tower-art-foundry"]).toBeDefined();
  });

  it("mergeArtLabClaudeSnippet overwrites a stale tower-art-foundry entry", () => {
    const existing = {
      mcpServers: {
        "tower-art-foundry": { command: "STALE", args: [] },
      },
    };
    const merged = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(
      (merged.mcpServers as Record<string, { command: string }>)["tower-art-foundry"]?.command,
    ).toBe("npx");
  });

  it("write target defaults to ~/.claude/settings.json (dry-run mode just returns the merged object)", () => {
    const initial = { mcpServers: {} };
    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify(initial));
    const computed = computeArtLabClaudeSnippet({ repoRoot: "/tmp/repo" });
    const existing = JSON.parse(
      readFileSync(join(claudeHome, "settings.json"), "utf8"),
    ) as Record<string, unknown>;
    const merged = mergeArtLabClaudeSnippet(existing, computed);
    expect((merged.mcpServers as Record<string, unknown>)["tower-art-foundry"]).toBeDefined();
  });
});
