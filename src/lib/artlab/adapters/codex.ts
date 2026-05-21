import { spawn } from "node:child_process";

export interface CodexInvokeInput {
  goal: string;
  sandboxLevel: "danger-full-access" | "workspace-write" | "read-only";
  cwd: string;
  approvalPolicy?: "never" | "on-failure" | "always";
  timeoutMs?: number;
}

export interface CodexInvokeResult {
  mode: "real" | "mock";
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  summary: string;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export async function invokeCodex(input: CodexInvokeInput): Promise<CodexInvokeResult> {
  if (process.env.ARTLAB_CODEX_MODE === "mock") {
    return {
      mode: "mock",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 0,
      summary: `mock codex received: ${input.goal}`,
    };
  }
  const startedAt = Date.now();
  return await new Promise<CodexInvokeResult>((resolve, reject) => {
    const args = ["exec", "--sandbox", input.sandboxLevel, "--cwd", input.cwd];
    if (input.approvalPolicy) args.push("--approval-policy", input.approvalPolicy);
    args.push(input.goal);
    const child = spawn("codex", args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout.on("data", (c: Buffer) => stdoutChunks.push(c.toString("utf8")));
    child.stderr.on("data", (c: Buffer) => stderrChunks.push(c.toString("utf8")));
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`codex exec timed out after ${input.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`));
    }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (exitCode) => {
      clearTimeout(timer);
      const fullStdout = stdoutChunks.join("");
      const fullStderr = stderrChunks.join("");
      resolve({
        mode: "real",
        exitCode: exitCode ?? -1,
        stdout: fullStdout,
        stderr: fullStderr,
        durationMs: Date.now() - startedAt,
        summary: fullStdout.split("\n").slice(-20).join("\n"),
      });
    });
  });
}
