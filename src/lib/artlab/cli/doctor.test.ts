// src/lib/artlab/cli/doctor.test.ts
//
// `artlab doctor` runs five pass/fail checks that catch the most common
// "fresh Claude Code session" failures — misconfigured settings.json, dead
// daemon, broken canon, missing workspace dirs. Each test below exercises one
// path so we can pin the exact line format and exit-code contract.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDoctorSubcommand } from "./doctor";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const REAL_CANON_ROOT = join(REPO_ROOT, "docs", "artlab", "sdk", "canon");

function seedHealthyWorkspace(workspaceRoot: string): void {
  mkdirSync(join(workspaceRoot, "promoted"), { recursive: true });
  mkdirSync(join(workspaceRoot, "inbox", "sdk"), { recursive: true });
  writeFileSync(
    join(workspaceRoot, "daemon-heartbeat.json"),
    JSON.stringify({
      pid: 4242,
      at: new Date(Date.now() - 1_000).toISOString(),
      engineVersion: "abc123",
    }),
  );
}

function writeSettings(
  settingsPath: string,
  artlabBlock: Record<string, unknown> | null,
): void {
  mkdirSync(join(settingsPath, ".."), { recursive: true });
  const payload: Record<string, unknown> = {};
  if (artlabBlock !== null) {
    payload.mcpServers = { artlab: artlabBlock };
  }
  writeFileSync(settingsPath, JSON.stringify(payload, null, 2));
}

describe("runDoctorSubcommand", () => {
  let tmp: string;
  let workspaceRoot: string;
  let settingsPath: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "artlab-doctor-"));
    workspaceRoot = join(tmp, "workspace");
    settingsPath = join(tmp, "fake-claude", "settings.json");
  });

  afterEach(() => {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("exits 0 with five ✓ lines when everything is healthy", async () => {
    seedHealthyWorkspace(workspaceRoot);
    writeSettings(settingsPath, {
      command: "npx",
      args: ["tsx", "scripts/artlab-sdk-mcp.ts"],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: REAL_CANON_ROOT,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(0);
    expect(logs).toHaveLength(5);
    expect(logs.every((line) => line.startsWith("✓"))).toBe(true);
    expect(logs[0]).toBe(
      "✓ settings.json mcpServers.artlab valid (workspace + canon paths exist)",
    );
    expect(logs[1]).toMatch(/^✓ Daemon alive \(pid 4242, heartbeat \d+s old\)$/);
    expect(logs[2]).toBe("✓ Canon loadable (12 characters)");
    expect(logs[3]).toBe(
      `✓ Promoted packs dir exists (${join(workspaceRoot, "promoted")}/)`,
    );
    expect(logs[4]).toBe(
      `✓ SDK inbox dir exists (${join(workspaceRoot, "inbox", "sdk")}/)`,
    );
  });

  it("flags ✗ on the settings line when settings.json is missing", async () => {
    seedHealthyWorkspace(workspaceRoot);
    // settingsPath intentionally absent

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs).toHaveLength(5);
    expect(logs[0]).toMatch(/^✗ settings\.json mcpServers\.artlab:/);
    expect(logs[0]).toMatch(/not found|does not exist|missing/i);
  });

  it("flags ✗ on the settings line when settings.json lacks mcpServers.artlab", async () => {
    seedHealthyWorkspace(workspaceRoot);
    writeSettings(settingsPath, null); // mcpServers.artlab absent

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[0]).toMatch(/^✗ settings\.json mcpServers\.artlab:/);
    expect(logs[0]).toMatch(/mcpServers\.artlab/);
  });

  it("flags ✗ on the settings line when ARTLAB_CANON_ROOT path does not exist on disk", async () => {
    seedHealthyWorkspace(workspaceRoot);
    const badCanon = join(tmp, "nope-canon");
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: badCanon,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[0]).toMatch(/^✗ settings\.json mcpServers\.artlab:/);
    expect(logs[0]).toContain("ARTLAB_CANON_ROOT");
    expect(logs[0]).toContain(badCanon);
  });

  it("flags ✗ on the daemon line when daemon-heartbeat.json is missing", async () => {
    mkdirSync(join(workspaceRoot, "promoted"), { recursive: true });
    mkdirSync(join(workspaceRoot, "inbox", "sdk"), { recursive: true });
    // heartbeat intentionally absent
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: REAL_CANON_ROOT,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[1]).toBe("✗ Daemon down (no heartbeat)");
  });

  it("flags ✗ on the daemon line when the heartbeat is older than 10s", async () => {
    seedHealthyWorkspace(workspaceRoot);
    writeFileSync(
      join(workspaceRoot, "daemon-heartbeat.json"),
      JSON.stringify({
        pid: 9999,
        at: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: REAL_CANON_ROOT,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[1]).toMatch(/^✗ Daemon down \(pid 9999 dead, heartbeat \d+s old\)$/);
  });

  it("flags ✗ on the canon line when canonRoot points at an empty dir", async () => {
    seedHealthyWorkspace(workspaceRoot);
    const emptyCanon = join(tmp, "empty-canon");
    mkdirSync(emptyCanon, { recursive: true });
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: emptyCanon,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: emptyCanon,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[2]).toMatch(/^✗ Canon has 0 characters \(expected 12\)$/);
  });

  it("flags ✗ on the promoted line when the dir is missing", async () => {
    mkdirSync(join(workspaceRoot, "inbox", "sdk"), { recursive: true });
    writeFileSync(
      join(workspaceRoot, "daemon-heartbeat.json"),
      JSON.stringify({ pid: 1, at: new Date().toISOString() }),
    );
    // promoted/ intentionally absent
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: REAL_CANON_ROOT,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[3]).toBe(
      `✗ Promoted packs dir missing (${join(workspaceRoot, "promoted")})`,
    );
  });

  it("flags ✗ on the SDK inbox line when the dir is missing", async () => {
    mkdirSync(join(workspaceRoot, "promoted"), { recursive: true });
    writeFileSync(
      join(workspaceRoot, "daemon-heartbeat.json"),
      JSON.stringify({ pid: 1, at: new Date().toISOString() }),
    );
    // inbox/sdk intentionally absent
    writeSettings(settingsPath, {
      command: "npx",
      args: [],
      env: {
        ARTLAB_WORKSPACE_ROOT: workspaceRoot,
        ARTLAB_CANON_ROOT: REAL_CANON_ROOT,
      },
    });

    const logs: string[] = [];
    const result = await runDoctorSubcommand({
      workspaceRoot,
      repoRoot: REPO_ROOT,
      settingsPath,
      canonRoot: REAL_CANON_ROOT,
      log: (line) => logs.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(logs[4]).toBe(
      `✗ SDK inbox dir missing (${join(workspaceRoot, "inbox", "sdk")})`,
    );
  });
});
