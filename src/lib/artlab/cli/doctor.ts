// src/lib/artlab/cli/doctor.ts
//
// `artlab doctor` — five pass/fail checks that catch the most common
// "fresh Claude Code session" misconfigurations in one shot. Each check
// prints exactly one line; exit code 0 iff all five pass.
//
// Why: a fresh session debugging "why isn't ArtLab responding?" used to burn
// 15+ bash calls discovering misconfigured `~/.claude/settings.json` paths,
// a dead daemon, an empty canon, or missing workspace dirs. `doctor` makes
// those checks one command.
//
// The settings.json path is injectable so tests can point at a tmp file
// instead of mutating the operator's real settings.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { scanDaemonErrors, formatDaemonBanner } from "@/lib/artlab/health/scanners/daemon-errors";
import { loadArtLabCanon } from "@/lib/artlab/sdk/canon/load-canon";

export interface DoctorSubcommandInput {
  workspaceRoot: string;
  repoRoot: string;
  /** Override the path to `~/.claude/settings.json`. Defaults to the real one. */
  settingsPath?: string;
  /** Override the canon root used by check 3. Defaults to `<repoRoot>/docs/artlab/sdk/canon`. */
  canonRoot?: string;
  log(line: string): void;
}

export interface DoctorSubcommandResult { exitCode: number; }

const EXPECTED_CHARACTER_COUNT = 12;

function defaultSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

function checkSettings(settingsPath: string): string {
  if (!existsSync(settingsPath)) {
    return `✗ settings.json mcpServers.artlab: ${settingsPath} not found`;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `✗ settings.json mcpServers.artlab: ${settingsPath} is not valid JSON (${msg})`;
  }
  const mcpServers = parsed.mcpServers as Record<string, unknown> | undefined;
  if (!mcpServers || typeof mcpServers !== "object") {
    return `✗ settings.json mcpServers.artlab: no mcpServers block in ${settingsPath}`;
  }
  const artlab = mcpServers.artlab as { env?: Record<string, string> } | undefined;
  if (!artlab || typeof artlab !== "object") {
    return `✗ settings.json mcpServers.artlab: mcpServers.artlab block missing from ${settingsPath}`;
  }
  const env = artlab.env ?? {};
  const workspace = env.ARTLAB_WORKSPACE_ROOT;
  const canon = env.ARTLAB_CANON_ROOT;
  if (!workspace) {
    return "✗ settings.json mcpServers.artlab: ARTLAB_WORKSPACE_ROOT is not set in env";
  }
  if (!existsSync(workspace)) {
    return `✗ settings.json mcpServers.artlab: ARTLAB_WORKSPACE_ROOT points at ${workspace} which does not exist`;
  }
  if (!canon) {
    return "✗ settings.json mcpServers.artlab: ARTLAB_CANON_ROOT is not set in env";
  }
  if (!existsSync(canon)) {
    return `✗ settings.json mcpServers.artlab: ARTLAB_CANON_ROOT points at ${canon} which does not exist`;
  }
  return "✓ settings.json mcpServers.artlab valid (workspace + canon paths exist)";
}

function checkDaemon(workspaceRoot: string): string {
  const scan = scanDaemonErrors(workspaceRoot);
  return formatDaemonBanner(scan);
}

async function checkCanon(canonRoot: string): Promise<string> {
  try {
    const canon = await loadArtLabCanon({ canonRoot });
    if (canon.characters.length !== EXPECTED_CHARACTER_COUNT) {
      return `✗ Canon has ${canon.characters.length} characters (expected ${EXPECTED_CHARACTER_COUNT})`;
    }
    return `✓ Canon loadable (${EXPECTED_CHARACTER_COUNT} characters)`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `✗ Canon not loadable: ${msg}`;
  }
}

function checkPromoted(workspaceRoot: string): string {
  const dir = join(workspaceRoot, "promoted");
  return existsSync(dir)
    ? `✓ Promoted packs dir exists (${dir}/)`
    : `✗ Promoted packs dir missing (${dir})`;
}

function checkSdkInbox(workspaceRoot: string): string {
  const dir = join(workspaceRoot, "inbox", "sdk");
  return existsSync(dir)
    ? `✓ SDK inbox dir exists (${dir}/)`
    : `✗ SDK inbox dir missing (${dir})`;
}

export async function runDoctorSubcommand(
  input: DoctorSubcommandInput,
): Promise<DoctorSubcommandResult> {
  const settingsPath = input.settingsPath ?? defaultSettingsPath();
  const canonRoot = input.canonRoot ?? join(input.repoRoot, "docs", "artlab", "sdk", "canon");

  const lines: string[] = [
    checkSettings(settingsPath),
    checkDaemon(input.workspaceRoot),
    await checkCanon(canonRoot),
    checkPromoted(input.workspaceRoot),
    checkSdkInbox(input.workspaceRoot),
  ];

  for (const line of lines) input.log(line);

  const allPass = lines.every((line) => line.startsWith("✓"));
  return { exitCode: allPass ? 0 : 1 };
}
