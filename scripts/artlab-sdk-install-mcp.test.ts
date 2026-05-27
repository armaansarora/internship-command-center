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
  it("computeArtLabClaudeSnippet produces a artlab mcpServers entry", () => {
    const snippet = computeArtLabClaudeSnippet({ repoRoot: "/tmp/repo" });
    expect(snippet).toEqual({
      mcpServers: {
        "artlab": {
          command: "npx",
          args: ["tsx", "/tmp/repo/scripts/artlab-sdk-mcp.ts"],
          env: {
            ARTLAB_WORKSPACE_ROOT: "/tmp/repo/.artlab/engine",
            ARTLAB_CANON_ROOT: "/tmp/repo/docs/artlab/sdk/canon",
          },
        },
      },
    });
  });

  it("mergeArtLabClaudeSnippet preserves existing settings keys", () => {
    const existing = { theme: "dark", mcpServers: { existing: { command: "echo" } } };
    const { merged } = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(merged.theme).toBe("dark");
    expect((merged.mcpServers as Record<string, unknown>).existing).toBeDefined();
    expect((merged.mcpServers as Record<string, unknown>)["artlab"]).toBeDefined();
  });

  it("mergeArtLabClaudeSnippet overwrites a stale artlab entry", () => {
    const existing = {
      mcpServers: {
        "artlab": { command: "STALE", args: [] },
      },
    };
    const { merged } = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(
      (merged.mcpServers as Record<string, { command: string }>)["artlab"]?.command,
    ).toBe("npx");
  });

  it("write target defaults to ~/.claude/settings.json (dry-run mode just returns the merged object)", () => {
    const initial = { mcpServers: {} };
    writeFileSync(join(claudeHome, "settings.json"), JSON.stringify(initial));
    const computed = computeArtLabClaudeSnippet({ repoRoot: "/tmp/repo" });
    const existing = JSON.parse(
      readFileSync(join(claudeHome, "settings.json"), "utf8"),
    ) as Record<string, unknown>;
    const { merged } = mergeArtLabClaudeSnippet(existing, computed);
    expect((merged.mcpServers as Record<string, unknown>)["artlab"]).toBeDefined();
  });

  it("mergeArtLabClaudeSnippet purges stale tower-art-foundry entry while preserving unrelated entries", () => {
    const existing = {
      theme: "dark",
      mcpServers: {
        "tower-art-foundry": { command: "STALE", args: ["legacy"] },
        othertool: { command: "echo", args: ["hello"] },
      },
    };
    const result = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    const servers = result.merged.mcpServers as Record<string, unknown>;
    expect(servers["artlab"]).toBeDefined();
    expect(servers.othertool).toBeDefined();
    expect(servers["tower-art-foundry"]).toBeUndefined();
    expect(result.purgedLegacy).toBe(true);
    // unrelated top-level keys still preserved
    expect(result.merged.theme).toBe("dark");
  });

  it("mergeArtLabClaudeSnippet reports purgedLegacy=false when no stale entry exists", () => {
    const existing = { mcpServers: { othertool: { command: "echo" } } };
    const result = mergeArtLabClaudeSnippet(
      existing,
      computeArtLabClaudeSnippet({ repoRoot: "/r" }),
    );
    expect(result.purgedLegacy).toBe(false);
    expect((result.merged.mcpServers as Record<string, unknown>).othertool).toBeDefined();
    expect((result.merged.mcpServers as Record<string, unknown>)["artlab"]).toBeDefined();
  });
});
