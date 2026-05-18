import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  assertSafeWorkspacePath,
  createGenerationBudgetLedger,
  getNextCreativeRunAction,
  type CreativeAssetType,
  type CreativeRunState,
} from "../src/lib/creative-production";

const ASSET_ROOTS: Record<CreativeAssetType, string> = {
  character: "characters",
  environment: "environments",
  prop: "props",
  "ui-texture": "ui-textures",
  animation: "animations",
  scene: "scenes",
  "icon-system": "icon-systems",
  "marketing-hero": "marketing-heroes",
  shader: "shaders",
};

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) return undefined;

  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function assertBudget(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--budget-cents must be a positive integer.");
  }

  return parsed;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "creative-run";
}

function inferAssetType(request: string): CreativeAssetType {
  const normalized = request.toLowerCase();

  if (/\b(shader|webgl|webgpu|three\.?js)\b/.test(normalized)) return "shader";
  if (/\b(animation|motion|animated|gsap|canvas)\b/.test(normalized)) return "animation";
  if (/\b(button|ui|control|texture|surface)\b/.test(normalized)) return "ui-texture";
  if (/\b(background|environment|room|lobby|screen)\b/.test(normalized)) return "environment";
  if (/\b(prop|object|item)\b/.test(normalized)) return "prop";
  if (/\b(icon|symbol)\b/.test(normalized)) return "icon-system";
  if (/\b(hero|marketing)\b/.test(normalized)) return "marketing-hero";
  if (/\b(scene|composition)\b/.test(normalized)) return "scene";

  return "character";
}

function inferName(request: string, assetType: CreativeAssetType): string {
  if (/\botis\b/i.test(request)) return "Otis Vale";
  if (/\bmara\b/i.test(request)) return "Mara Voss";
  if (/\brafe\b/i.test(request)) return "Rafe Calder";

  const cleaned = request.replace(/[.?!]+$/g, "").trim();

  return cleaned || assetType;
}

function safeStateRoot(input?: string): string {
  return assertSafeWorkspacePath(input ?? ".artlab/studio", [
    join(process.cwd(), ".artlab"),
    tmpdir(),
  ]);
}

async function findRunState(root: string, runId: string): Promise<string | undefined> {
  async function walk(directory: string): Promise<string | undefined> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        const found = await walk(fullPath);

        if (found) return found;
      } else if (entry.name === "run-state.json") {
        const state = JSON.parse(await readFile(fullPath, "utf8")) as { runId?: string };

        if (state.runId === runId) return fullPath;
      }
    }

    return undefined;
  }

  return walk(root);
}

async function createRun(argv: string[]): Promise<void> {
  const request = flagValue(argv, "--request");

  if (!request) throw new Error("art:produce requires --request or --continue.");

  const root = safeStateRoot(flagValue(argv, "--state-root"));
  const assetType = inferAssetType(request);
  const name = inferName(request, assetType);
  const runId = flagValue(argv, "--run-id") ?? `${new Date().toISOString().slice(0, 10)}-${slugify(name)}`;
  const budgetCents = assertBudget(flagValue(argv, "--budget-cents")) ?? 600;
  const runRoot = join(root, ASSET_ROOTS[assetType], runId);
  const state: {
    schemaVersion: "tower-creative-run-state-v1";
    runId: string;
    assetType: CreativeAssetType;
    name: string;
    state: CreativeRunState;
    budgetCents: number;
    gates: string[];
    nextLegalAction: string;
    promotionPhrase: "approved for app";
    publicArtWritesAllowed: false;
  } = {
    schemaVersion: "tower-creative-run-state-v1",
    runId,
    assetType,
    name,
    state: "initial-concepts",
    budgetCents,
    gates: ["initial-direction", "final-upload-ready-board"],
    nextLegalAction: getNextCreativeRunAction("initial-concepts"),
    promotionPhrase: "approved for app",
    publicArtWritesAllowed: false,
  };

  await mkdir(runRoot, { recursive: true });
  await writeFile(join(runRoot, "creative-brief.json"), `${JSON.stringify({
    schemaVersion: "tower-creative-brief-v1",
    runId,
    assetType,
    name,
    request,
    outputRoot: runRoot,
    budgetCents,
    gates: state.gates,
    promotionPhrase: state.promotionPhrase,
  }, null, 2)}\n`);
  await writeFile(join(runRoot, "run-state.json"), `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(runRoot, "generation-budget-ledger.json"), `${JSON.stringify(createGenerationBudgetLedger({
    runId,
    assetType,
  }), null, 2)}\n`);
  await writeFile(join(runRoot, "handoff.md"), [
    `# ${name} Creative Production Handoff`,
    "",
    `Run: \`${runId}\``,
    `State: \`${state.state}\``,
    "",
    "Two human gates: initial direction and final upload-ready board.",
    "Do not ask Armaan for intermediate approvals.",
    "Do not write public/art or promote until Armaan says `approved for app`.",
    "",
    `Next legal action: ${state.nextLegalAction}`,
    "",
  ].join("\n"));

  console.log("Creative Production Engine orchestrator");
  console.log("Two human gates: initial direction, final upload-ready board.");
  console.log(`Run root: ${runRoot}`);
  console.log(`Current state: ${state.state}`);
  console.log(`Next legal action: ${state.nextLegalAction}`);
}

async function continueRun(argv: string[]): Promise<void> {
  const runId = flagValue(argv, "--continue");

  if (!runId) throw new Error("--continue requires a run id.");

  const root = safeStateRoot(flagValue(argv, "--state-root"));
  const runStatePath = await findRunState(root, runId);

  if (!runStatePath) {
    throw new Error(`Could not find run-state.json for ${runId} under ${root}.`);
  }

  const state = JSON.parse(await readFile(runStatePath, "utf8")) as {
    state: CreativeRunState;
    name?: string;
    nextLegalAction?: string;
  };
  const nextLegalAction = state.nextLegalAction ?? getNextCreativeRunAction(state.state);

  console.log(`Continuing run: ${runId}`);
  console.log(`Run root: ${resolve(join(runStatePath, ".."))}`);
  console.log(`Current state: ${state.state}`);
  console.log(`Next legal action: ${nextLegalAction}`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--continue")) {
    await continueRun(argv);
    return;
  }

  await createRun(argv);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
