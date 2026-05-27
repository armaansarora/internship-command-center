import { existsSync, mkdirSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { renderArtLabAntigravityWorkspace } from "../src/lib/artlab/sdk/integration/antigravity-workspace-template";

export interface InstallArtLabAntigravityWorkspaceOpts {
  repoRoot: string;
  confirm: () => Promise<boolean>;
}

function atomicWriteText(path: string, body: string): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, body, { encoding: "utf8" });
  renameSync(tmp, path);
}

export async function installArtLabAntigravityWorkspace(opts: InstallArtLabAntigravityWorkspaceOpts): Promise<void> {
  const target = join(opts.repoRoot, ".antigravity", "workspaces", "artlab", "workspace.yaml");
  const body = renderArtLabAntigravityWorkspace({ repoRoot: opts.repoRoot });
  process.stdout.write(`About to write the Antigravity workspace to:\n  ${target}\n\n`);
  const ok = await opts.confirm();
  if (!ok) {
    process.stdout.write("Aborted. No changes made.\n");
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) copyFileSync(target, `${target}.bak`);
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
  await installArtLabAntigravityWorkspace({ repoRoot: process.cwd(), confirm: defaultConfirm });
  return 0;
}

const invokedPath = process.argv[1] ?? "";
const isDirectInvocation =
  invokedPath.endsWith("/artlab-sdk-install-antigravity-workspace.ts") ||
  invokedPath.endsWith("\\artlab-sdk-install-antigravity-workspace.ts") ||
  invokedPath.endsWith("/artlab-sdk-install-antigravity-workspace.js") ||
  invokedPath.endsWith("\\artlab-sdk-install-antigravity-workspace.js");

if (isDirectInvocation) {
  void main().then((code) => process.exit(code));
}
