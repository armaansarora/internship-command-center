import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { join } from "node:path";

const SCRIPT = join(__dirname, "artlab-sdk-mcp.ts");

function runBootstrap(
  args: string[],
  envOverrides: Record<string, string> = {},
  timeoutMs = 10_000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["tsx", SCRIPT, ...args], {
      env: { ...process.env, ...envOverrides },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString("utf8");
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8");
    });
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("timeout"));
    }, timeoutMs);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

describe("scripts/artlab-sdk-mcp.ts", () => {
  it("prints --help info and exits 0 when invoked with --help", async () => {
    const result = await runBootstrap(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/artlab/);
    expect(result.stdout).toMatch(/MCP stdio server/);
  }, 15_000);

  it("exits 0 with --version and prints a semver string", async () => {
    const result = await runBootstrap(["--version"]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  }, 15_000);

  it("refuses to start when FOUNDRY_WORKSPACE_ROOT is set and points operator to ARTLAB_WORKSPACE_ROOT", async () => {
    const result = await runBootstrap([], { FOUNDRY_WORKSPACE_ROOT: "/tmp/x" });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("deprecated");
    expect(result.stderr).toContain("FOUNDRY_WORKSPACE_ROOT");
    expect(result.stderr).toContain("ARTLAB_WORKSPACE_ROOT");
  }, 15_000);

  it("refuses to start when FOUNDRY_CANON_ROOT is set and points operator to ARTLAB_CANON_ROOT", async () => {
    const result = await runBootstrap([], { FOUNDRY_CANON_ROOT: "/tmp/x" });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("deprecated");
    expect(result.stderr).toContain("FOUNDRY_CANON_ROOT");
    expect(result.stderr).toContain("ARTLAB_CANON_ROOT");
  }, 15_000);
});
