import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { renderArtLabClaudeSkill } from "../src/lib/artlab/sdk/integration/claude-skill-template";

export interface InstallArtLabClaudeSkillOpts {
  claudeHome: string;
  repoRoot: string;
  confirm: () => Promise<boolean>;
}

export function computeArtLabClaudeSkillTarget(opts: { claudeHome: string }): string {
  return join(opts.claudeHome, "skills", "tower-art-foundry", "SKILL.md");
}

function atomicWriteText(path: string, body: string): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, body, { encoding: "utf8" });
  renameSync(tmp, path);
}

export async function installArtLabClaudeSkill(opts: InstallArtLabClaudeSkillOpts): Promise<void> {
  const target = computeArtLabClaudeSkillTarget({ claudeHome: opts.claudeHome });
  const body = renderArtLabClaudeSkill({ repoRoot: opts.repoRoot });
  process.stdout.write(`About to write the Tower Art ArtLab skill to:\n  ${target}\n\n`);
  const ok = await opts.confirm();
  if (!ok) {
    process.stdout.write("Aborted. No changes made.\n");
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) {
    copyFileSync(target, `${target}.bak`);
  }
  atomicWriteText(target, body);
  process.stdout.write(`Wrote ${target}.\n`);
}

async function defaultConfirm(): Promise<boolean> {
  if (process.env.ARTLAB_INSTALL_YES === "1") return true;
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question("Proceed? [y/N]: ")).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}

async function main(): Promise<number> {
  const claudeHome = process.env.ARTLAB_CLAUDE_HOME ?? join(homedir(), ".claude");
  const repoRoot = process.cwd();
  await installArtLabClaudeSkill({ claudeHome, repoRoot, confirm: defaultConfirm });
  return 0;
}

const invokedPath = process.argv[1] ?? "";
const isDirectInvocation =
  invokedPath.endsWith("/foundry-install-claude-skill.ts") ||
  invokedPath.endsWith("\\foundry-install-claude-skill.ts") ||
  invokedPath.endsWith("/foundry-install-claude-skill.js") ||
  invokedPath.endsWith("\\foundry-install-claude-skill.js");

if (isDirectInvocation) {
  void main().then((code) => process.exit(code));
}
