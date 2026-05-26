import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export interface FoundryClaudeSnippet {
  mcpServers: {
    "tower-art-foundry": {
      command: "npx";
      args: string[];
      env: Record<string, string>;
    };
  };
}

export function computeFoundryClaudeSnippet(opts: { repoRoot: string }): FoundryClaudeSnippet {
  return {
    mcpServers: {
      "tower-art-foundry": {
        command: "npx",
        args: ["tsx", join(opts.repoRoot, "scripts", "foundry-mcp.ts")],
        env: {
          FOUNDRY_WORKSPACE_ROOT: join(opts.repoRoot, ".artlab", "engine"),
          FOUNDRY_CANON_ROOT: join(opts.repoRoot, ".artlab", "canon"),
        },
      },
    },
  };
}

export function mergeFoundryClaudeSnippet(
  existing: Record<string, unknown>,
  snippet: FoundryClaudeSnippet,
): Record<string, unknown> {
  const merged = { ...existing };
  const existingServers = (existing.mcpServers as Record<string, unknown> | undefined) ?? {};
  merged.mcpServers = {
    ...existingServers,
    "tower-art-foundry": snippet.mcpServers["tower-art-foundry"],
  };
  return merged;
}

function atomicWriteJson(path: string, payload: unknown): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: "utf8" });
  renameSync(tmp, path);
}

async function confirm(prompt: string): Promise<boolean> {
  if (process.env.FOUNDRY_INSTALL_YES === "1") return true;
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${prompt} [y/N]: `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

async function main(): Promise<number> {
  const repoRoot = process.cwd();
  const settingsPath =
    process.env.FOUNDRY_CLAUDE_SETTINGS ?? join(homedir(), ".claude", "settings.json");
  const snippet = computeFoundryClaudeSnippet({ repoRoot });
  const existing: Record<string, unknown> = existsSync(settingsPath)
    ? (JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>)
    : {};
  const merged = mergeFoundryClaudeSnippet(existing, snippet);

  process.stdout.write(`About to write the following snippet to ${settingsPath}:\n\n`);
  process.stdout.write(`${JSON.stringify(snippet, null, 2)}\n\n`);
  const ok = await confirm("Proceed?");
  if (!ok) {
    process.stdout.write("Aborted. No changes made.\n");
    return 0;
  }
  atomicWriteJson(settingsPath, merged);
  process.stdout.write(`Wrote ${settingsPath}.\n`);
  return 0;
}

const invokedPath = process.argv[1] ?? "";
const isDirectInvocation =
  invokedPath.endsWith("/foundry-install-mcp.ts") ||
  invokedPath.endsWith("\\foundry-install-mcp.ts") ||
  invokedPath.endsWith("/foundry-install-mcp.js") ||
  invokedPath.endsWith("\\foundry-install-mcp.js");

if (isDirectInvocation) {
  void main().then((code) => process.exit(code));
}
