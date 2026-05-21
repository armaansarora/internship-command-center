import { spawn } from "node:child_process";

export const ARTLAB_KEYCHAIN_PREFIX = "tower-artlab";

function runSecurity(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("security", args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout.on("data", (c: Buffer) => stdoutChunks.push(c.toString("utf8")));
    child.stderr.on("data", (c: Buffer) => stderrChunks.push(c.toString("utf8")));
    child.on("error", reject);
    child.on("exit", (exitCode) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdout: stdoutChunks.join(""),
        stderr: stderrChunks.join(""),
      });
    });
  });
}

export async function setKeychainSecret(service: string, value: string): Promise<void> {
  const result = await runSecurity([
    "add-generic-password",
    "-U",
    "-a", "artlab",
    "-s", service,
    "-w", value,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`failed to write Keychain secret ${service}`);
  }
}

export async function getKeychainSecret(service: string): Promise<string | null> {
  const result = await runSecurity([
    "find-generic-password",
    "-a", "artlab",
    "-s", service,
    "-w",
  ]);
  if (result.exitCode === 44) return null;
  if (result.exitCode !== 0) {
    throw new Error(`failed to read Keychain secret ${service}`);
  }
  return result.stdout.replace(/\n$/, "");
}

export async function deleteKeychainSecret(service: string): Promise<void> {
  const result = await runSecurity([
    "delete-generic-password",
    "-a", "artlab",
    "-s", service,
  ]);
  if (result.exitCode !== 0 && result.exitCode !== 44) {
    throw new Error(`failed to delete Keychain secret ${service}`);
  }
}
