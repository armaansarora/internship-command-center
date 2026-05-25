// src/lib/artlab/cli/daemon-control.ts
//
// Maps `artlab daemon start|stop|restart|status|logs` onto launchctl
// operations against the Tower ArtLab launchd plist. The actual "run
// forever" loop is in daemon-run.ts; the launchd plist invokes it.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { ARTLAB_LAUNCHD_LABEL, renderLaunchdPlist } from "@/lib/artlab/daemon/launchd";

export type DaemonControlVerb = "start" | "stop" | "restart" | "status" | "logs";

export interface DaemonControlInput {
  verb: DaemonControlVerb;
  workspaceRoot: string;
  log(line: string): void;
  err(line: string): void;
}

function plistDir(): string { return join(homedir(), "Library", "LaunchAgents"); }
function plistPath(): string { return join(plistDir(), `${ARTLAB_LAUNCHD_LABEL}.plist`); }
function logRoot(workspaceRoot: string): string { return join(workspaceRoot, "logs"); }
function gid(): string { return `gui/${process.getuid?.() ?? 0}`; }

function findTsxLoaderPath(): string | undefined {
  const candidate = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  return existsSync(candidate) ? candidate : undefined;
}

function tryLaunchctl(args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync("launchctl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: msg };
  }
}

function start(input: DaemonControlInput): number {
  const path = plistPath();
  if (!existsSync(plistDir())) mkdirSync(plistDir(), { recursive: true });
  const absWorkspaceRoot = resolve(input.workspaceRoot);
  const absLogRoot = logRoot(absWorkspaceRoot);
  if (!existsSync(absLogRoot)) mkdirSync(absLogRoot, { recursive: true });
  const entryScript = resolve(process.argv[1] ?? join(process.cwd(), "scripts", "artlab.ts"));
  const tsxLoaderPath = findTsxLoaderPath();
  if (!tsxLoaderPath) {
    input.err(`artlab daemon: cannot find node_modules/tsx/dist/cli.mjs — run \`npm install\` from the project root.`);
    return 1;
  }
  const plist = renderLaunchdPlist({
    nodeBinary: process.execPath,
    daemonEntry: entryScript,
    workspaceRoot: absWorkspaceRoot,
    logRoot: absLogRoot,
    tsxLoaderPath,
  });
  writeFileSync(path, plist);
  tryLaunchctl(["bootout", `${gid()}/${ARTLAB_LAUNCHD_LABEL}`]);
  const boot = tryLaunchctl(["bootstrap", gid(), path]);
  if (!boot.ok) {
    input.err(`artlab daemon: launchctl bootstrap failed — ${boot.output}`);
    return 1;
  }
  input.log(`artlab daemon: started (plist=${path})`);
  return 0;
}

function stop(input: DaemonControlInput): number {
  const result = tryLaunchctl(["bootout", `${gid()}/${ARTLAB_LAUNCHD_LABEL}`]);
  if (!result.ok) {
    input.log(`artlab daemon: was not running`);
  } else {
    input.log(`artlab daemon: stopped`);
  }
  const path = plistPath();
  if (existsSync(path)) {
    try { unlinkSync(path); } catch { /* leave plist in place if unlink fails */ }
  }
  return 0;
}

function status(input: DaemonControlInput): number {
  const result = tryLaunchctl(["print", `${gid()}/${ARTLAB_LAUNCHD_LABEL}`]);
  if (!result.ok) {
    input.log(`artlab daemon: not loaded`);
    return 0;
  }
  const stateMatch = result.output.match(/state\s*=\s*(\S+)/);
  const pidMatch = result.output.match(/pid\s*=\s*(\d+)/);
  input.log(`artlab daemon: state=${stateMatch?.[1] ?? "unknown"}${pidMatch ? ` pid=${pidMatch[1]}` : ""}`);
  return 0;
}

function tailLogs(input: DaemonControlInput): number {
  const out = join(logRoot(input.workspaceRoot), "artlab.out.log");
  const err = join(logRoot(input.workspaceRoot), "artlab.err.log");
  for (const [label, path] of [["stdout", out], ["stderr", err]] as const) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const tail = text.split("\n").slice(-100).join("\n");
    input.log(`--- ${label} (${path}) ---\n${tail}`);
  }
  return 0;
}

export function runDaemonControlSubcommand(input: DaemonControlInput): number {
  switch (input.verb) {
    case "start": return start(input);
    case "stop": return stop(input);
    case "restart": {
      stop(input);
      return start(input);
    }
    case "status": return status(input);
    case "logs": return tailLogs(input);
  }
}
