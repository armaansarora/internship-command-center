import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";

function runNextBuild(timeoutMs = 240_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["next", "build"], {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString("utf8"); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString("utf8"); });
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("next build timed out")); }, timeoutMs);
    proc.on("exit", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

describe("foundry-demo page builds", () => {
  it("next build exits 0 with the foundry-demo route present", async () => {
    const result = await runNextBuild();
    expect(result.code).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/foundry-demo/);
  }, 240_000);
});
