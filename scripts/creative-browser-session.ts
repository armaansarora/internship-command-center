import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  assertCreativeBrowserSessionEngine,
  assertCreativeBrowserSessionProvider,
  assertSafeWorkspacePath,
  createCreativeBrowserSessionPlan,
  renderCreativeBrowserSessionRunbook,
  type CreativeBrowserSessionProvider,
  type CreativeBrowserSessionEngine,
} from "../src/lib/creative-production";

const KNOWN_COMMANDS = new Set(["plan", "open"]);
const KNOWN_FLAGS = new Set([
  "--session",
  "--provider",
  "--engine",
  "--artlab-root",
  "--remote-debugging-port",
]);
const FLAG_VALUES = new Set(KNOWN_FLAGS);

function validateKnownFlags(argv: string[]): void {
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) continue;
    if (!KNOWN_FLAGS.has(value)) throw new Error(`Unknown flag: ${value}`);
    if (FLAG_VALUES.has(value)) index += 1;
  }
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) return undefined;

  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function assertOptionalPort(argv: string[]): number | undefined {
  const value = flagValue(argv, "--remote-debugging-port");

  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("--remote-debugging-port must be an integer.");

  const port = Number(value);
  if (port < 1024 || port > 65535) throw new Error("--remote-debugging-port must be between 1024 and 65535.");

  return port;
}

function assertSafeArtlabPath(path: string): string {
  const allowedRoots = process.env.NODE_ENV === "test" ? [".artlab", "/tmp", "/var/folders"] : [".artlab"];

  return assertSafeWorkspacePath(path, allowedRoots);
}

async function runPlanMode(argv: string[], launch: boolean): Promise<void> {
  const sessionId = flagValue(argv, "--session") ?? "gemini-art-studio";
  const provider = assertCreativeBrowserSessionProvider(flagValue(argv, "--provider") ?? "gemini");
  const engine = assertCreativeBrowserSessionEngine(flagValue(argv, "--engine") ?? "playwright-chromium");
  const artlabRoot = assertSafeArtlabPath(flagValue(argv, "--artlab-root") ?? ".artlab");
  const remoteDebuggingPort = assertOptionalPort(argv);
  const browserExecutablePath = await resolveBrowserExecutablePath(engine);
  const plan = createCreativeBrowserSessionPlan({
    sessionId,
    provider: provider as CreativeBrowserSessionProvider,
    engine: engine as CreativeBrowserSessionEngine,
    browserExecutablePath,
    artlabRoot,
    ...(remoteDebuggingPort ? { remoteDebuggingPort } : {}),
  });

  await Promise.all([
    mkdir(plan.profileDirectory, { recursive: true }),
    mkdir(plan.downloadDirectory, { recursive: true }),
    mkdir(plan.queueDirectory, { recursive: true }),
    mkdir(dirname(plan.runbookPath), { recursive: true }),
  ]);
  await writeFile(plan.runbookPath.replace(/browser-session-runbook\.md$/, "browser-session.json"), `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(plan.runbookPath, renderCreativeBrowserSessionRunbook(plan));

  console.log(`Created isolated creative browser session: ${plan.runbookPath}`);
  console.log(`Provider: ${plan.provider}`);
  console.log(`Engine: ${plan.engine}`);
  console.log(`Browser executable: ${plan.browserExecutablePath}`);
  console.log(`Profile: ${plan.profileDirectory}`);
  console.log(`Downloads: ${plan.downloadDirectory}`);
  console.log(`Launch command: ${plan.launchCommandText}`);
  console.log("Rule: do not use Armaan's daily Chrome profile for image generation.");

  if (launch) {
    const { spawn } = await import("node:child_process");
    const child = spawn(plan.launchCommand[0]!, plan.launchCommand.slice(1), {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    console.log("Launched isolated browser session.");
  }
}

async function resolveBrowserExecutablePath(engine: CreativeBrowserSessionEngine): Promise<string> {
  if (engine === "google-chrome") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }

  const { chromium } = await import("@playwright/test");

  return chromium.executablePath();
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "plan";

  if (!KNOWN_COMMANDS.has(command)) {
    throw new Error(`Unknown creative browser session command: ${command}`);
  }

  validateKnownFlags(argv);
  await runPlanMode(argv, command === "open");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
