import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertSafeWorkspacePath,
  buildCreativeStudioOrientation,
  createCreativeProductionPacket,
  createDefaultCreativeStudioState,
  createHousekeepingEntry,
  createImprovementEntry,
  loadCreativeStudioStateWithRecovery,
  getCreativeAssetTypeDefinition,
  renderCreativeProductionNextAction,
  renderCreativeProductionPrompt,
  saveCreativeStudioState,
  validateRequiredPhaseGates,
  writeJsonlEntry,
  type CreativeAssetType,
  type CreativeLiveArtStatusInput,
  type CreativePhaseId,
} from "../src/lib/creative-production";

const KNOWN_FLAGS = new Set(["--state-root", "--asset-type", "--name", "--brief", "--run-id"]);
const FLAG_VALUES = new Set(KNOWN_FLAGS);

function validateKnownFlags(argv: string[]): void {
  for (let index = 0; index < argv.length; index += 1) {
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

function slugifyRunId(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (!slug) throw new Error("--run-id could not be inferred from --name.");

  return slug;
}

function assertSafeRunId(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(value)) {
    throw new Error("--run-id must use lowercase letters, numbers, and hyphens only.");
  }

  return value;
}

function assertAssetType(value: string): CreativeAssetType {
  try {
    getCreativeAssetTypeDefinition(value as CreativeAssetType);
    return value as CreativeAssetType;
  } catch {
    throw new Error(`Unknown creative asset type: ${value}`);
  }
}

function loadLiveArtStatus(): CreativeLiveArtStatusInput | undefined {
  try {
    const output = execFileSync("npm", ["--silent", "run", "art:status", "--", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(output) as CreativeLiveArtStatusInput;

    if (
      typeof parsed.approvedProductionSprites === "number" &&
      typeof parsed.expectedProductionSprites === "number" &&
      Array.isArray(parsed.fullyPromotedCharacters) &&
      parsed.nextRecommendedCharacter &&
      Array.isArray(parsed.runLedgers)
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function recordAndValidatePhaseGates(input: {
  stateRoot: string;
  runId: string;
  phase: CreativePhaseId;
  created: string[];
  kept: string[];
  housekeepingNotes: string;
  improvementFinding: string;
  improvementAction: string;
  ledgerRoot?: string;
}): Promise<void> {
  const housekeeping = createHousekeepingEntry({
    runId: input.runId,
    phase: input.phase,
    created: input.created,
    kept: input.kept,
    archived: [],
    deleted: [],
    notes: input.housekeepingNotes,
  });
  const improvement = createImprovementEntry({
    runId: input.runId,
    phase: input.phase,
    category: "confusion",
    severity: "low",
    finding: input.improvementFinding,
    action: input.improvementAction,
  });
  const validation = validateRequiredPhaseGates(input.runId, input.phase, [
    housekeeping,
    improvement,
  ]);

  if (!validation.ok) {
    throw new Error(`Missing required phase gates: ${validation.missing.join(", ")}`);
  }

  const ledgerRoot = input.ledgerRoot ?? join(input.stateRoot, "ledgers");

  await writeJsonlEntry(join(ledgerRoot, "housekeeping.jsonl"), housekeeping);
  await writeJsonlEntry(join(ledgerRoot, "improvements.jsonl"), improvement);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  validateKnownFlags(argv);

  const stateRootInput = flagValue(argv, "--state-root") ?? ".artlab/studio";
  const allowedStateRoots = process.env.NODE_ENV === "test" ? [".artlab/studio", tmpdir()] : [".artlab/studio"];
  const stateRoot = assertSafeWorkspacePath(stateRootInput, allowedStateRoots);
  const assetTypeValue = flagValue(argv, "--asset-type");
  const assetName = flagValue(argv, "--name");
  const brief = flagValue(argv, "--brief");
  const explicitRunId = flagValue(argv, "--run-id");
  const statePath = join(stateRoot, "state.json");
  const loadedState = await loadCreativeStudioStateWithRecovery(statePath);
  const state = createDefaultCreativeStudioState(new Date().toISOString(), loadLiveArtStatus());
  const orientation = buildCreativeStudioOrientation(state);

  if (loadedState.source === "recovered-corrupt" && loadedState.backupPath) {
    state.knownWarnings = [
      ...state.knownWarnings,
      `recovered-corrupt-state:${loadedState.backupPath}`,
    ];
  }

  await saveCreativeStudioState(statePath, state);
  await recordAndValidatePhaseGates({
    stateRoot,
    runId: "studio-orient",
    phase: "orient",
    created: [statePath],
    kept: [statePath],
    housekeepingNotes: "Studio orientation created or refreshed state and ledgers only.",
    improvementFinding: "Studio orientation checks whether the user needs a guided creative brief.",
    improvementAction: "Continue gathering creative intent before creating production packets.",
  });

  if (assetTypeValue || assetName || brief) {
    if (!assetTypeValue || !assetName || !brief) {
      throw new Error("--asset-type, --name, and --brief are required together.");
    }

    const assetType = assertAssetType(assetTypeValue);
    const runId = assertSafeRunId(explicitRunId ?? slugifyRunId(assetName));
    const packet = createCreativeProductionPacket({
      assetType,
      name: assetName,
      runId,
      brief,
      stateRoot,
    });
    const packetRoot = assertSafeWorkspacePath(
      join(stateRoot, `${getCreativeAssetTypeDefinition(assetType).outputRoot.split("/").at(-1)}`, runId),
      [stateRoot],
    );
    const packetPath = join(packetRoot, "creative-brief.json");
    const promptPath = join(packetRoot, "prompt.md");
    const nextActionPath = join(packetRoot, "next-action.md");

    await mkdir(packetRoot, { recursive: true });
    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(promptPath, renderCreativeProductionPrompt(packet));
    await writeFile(nextActionPath, renderCreativeProductionNextAction(packet));
    await recordAndValidatePhaseGates({
      stateRoot,
      ledgerRoot: join(packetRoot, "ledgers"),
      runId,
      phase: "production-packet",
      created: [packetPath, promptPath, nextActionPath],
      kept: [packetPath, promptPath, nextActionPath],
      housekeepingNotes: "Production packet files are grouped under the run folder; nothing was written to public/art.",
      improvementFinding: "Packet mode is now command-backed for any registered creative asset type.",
      improvementAction: "Use the packet prompt for concept generation, then record the next gate before promotion.",
    });

    console.log(`Created Creative Production Engine packet: ${assetName}`);
    console.log(`Packet: ${packetPath}`);
    console.log(`Prompt: ${promptPath}`);
    console.log(`Next action: ${nextActionPath}`);
    return;
  }

  console.log(orientation.openingQuestion);
  console.log("");
  console.log(orientation.soFar);
  console.log(orientation.recommendation);
  console.log(orientation.remaining);
  console.log(orientation.warnings);
  console.log(`Available asset types: ${orientation.availableAssetTypes.join(", ")}`);
  console.log("");
  console.log(`Studio state: ${resolve(stateRoot, "state.json")}`);
  if (loadedState.source === "recovered-corrupt" && loadedState.backupPath) {
    console.log(`Recovered corrupt state backup: ${resolve(loadedState.backupPath)}`);
  }
  console.log("Answer in natural language. The engine will convert your answer into a strict production packet after the guided brainstorm.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
