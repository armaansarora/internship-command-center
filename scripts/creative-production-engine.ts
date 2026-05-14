import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import {
  assertSafeWorkspacePath,
  buildCreativeStudioOrientation,
  createCreativeCoordinatorReview,
  createCreativeProductionPacket,
  createDefaultCreativeStudioState,
  CREATIVE_PARALLEL_DEFAULT_AGENTS,
  CREATIVE_PARALLEL_DEFAULT_WAVES,
  createCreativeParallelLaneBrief,
  createCreativeParallelWavePlan,
  createHousekeepingEntry,
  createImprovementEntry,
  assertCreativeParallelCount,
  assertCreativeParallelLaneBrief,
  validateCreativeParallelLaneResult,
  loadCreativeStudioStateWithRecovery,
  getCreativeAssetTypeDefinition,
  inferCreativeProductionRequest,
  renderCoordinatorReportMarkdown,
  renderCoordinatorReviewBoardHtml,
  renderCreativeParallelDispatcherPrompt,
  renderCreativeParallelLanePrompt,
  renderCreativeProductionNextAction,
  renderCreativeProductionPrompt,
  saveCreativeStudioState,
  validateRequiredPhaseGates,
  writeJsonlEntry,
  type CreativeAssetType,
  type CreativeLiveArtStatusInput,
  type CreativePhaseId,
  type CreativeParallelLaneBrief,
  type CreativeParallelWavePlan,
  type CreativeCoordinatorLaneInput,
  type CreativeLanePreflight,
  type CreativeLaneResultJson,
} from "../src/lib/creative-production";

const KNOWN_FLAGS = new Set([
  "--state-root",
  "--asset-type",
  "--name",
  "--brief",
  "--run-id",
  "--request",
  "--mode",
  "--parallel-agents",
  "--agents",
  "--waves",
  "--lane-brief",
  "--parallel-plan",
  "--no-parallel",
]);
const FLAG_VALUES = new Set([
  "--state-root",
  "--asset-type",
  "--name",
  "--brief",
  "--run-id",
  "--request",
  "--mode",
  "--parallel-agents",
  "--agents",
  "--waves",
  "--lane-brief",
  "--parallel-plan",
]);

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

function assertMode(value: string | undefined): "coordinator" | "lane" | "validate-lane" | "coordinate" {
  const mode = value ?? "coordinator";

  if (mode !== "coordinator" && mode !== "lane" && mode !== "validate-lane" && mode !== "coordinate") {
    throw new Error("--mode must be coordinator, lane, validate-lane, or coordinate.");
  }

  return mode;
}

function assertIntegerFlag(
  argv: string[],
  flag: "--parallel-agents" | "--agents" | "--waves",
): number | undefined {
  const value = flagValue(argv, flag);

  if (value === undefined) return undefined;

  if (!/^\d+$/.test(value)) {
    throw new Error(`${flag} must be an integer.`);
  }

  return Number(value);
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

function isInsidePath(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
}

function toPortableLedgerPath(path: string): string {
  const workspaceRoot = resolve(process.cwd());
  const absolutePath = resolve(path);

  if (isInsidePath(workspaceRoot, absolutePath)) {
    return relative(workspaceRoot, absolutePath) || ".";
  }

  return path;
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
  const created = input.created.map(toPortableLedgerPath);
  const kept = input.kept.map(toPortableLedgerPath);
  const housekeeping = createHousekeepingEntry({
    runId: input.runId,
    phase: input.phase,
    created,
    kept,
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

async function writeParallelWavePlanFiles(input: {
  stateRoot: string;
  packetRoot: string;
  plan: CreativeParallelWavePlan;
}): Promise<{
  planPath: string;
  dispatcherPromptPath: string;
  laneBriefPaths: string[];
  lanePromptPaths: string[];
}> {
  const planRoot = assertSafeWorkspacePath(input.plan.parallelRoot, [input.packetRoot]);
  const planPath = join(planRoot, "parallel-plan.json");
  const laneBriefPaths: string[] = [];
  const lanePromptPaths: string[] = [];

  await mkdir(planRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(input.plan, null, 2)}\n`);
  await writeFile(input.plan.dispatcherPromptPath, renderCreativeParallelDispatcherPrompt(input.plan));

  for (const lane of input.plan.lanes) {
    const laneRoot = assertSafeWorkspacePath(lane.outputRoot, [planRoot]);
    const laneBrief = createCreativeParallelLaneBrief(input.plan, lane);

    await mkdir(lane.outputsRoot, { recursive: true });
    await mkdir(laneRoot, { recursive: true });
    await writeFile(lane.laneBriefPath, `${JSON.stringify(laneBrief, null, 2)}\n`);
    await writeFile(lane.agentPromptPath, renderCreativeParallelLanePrompt(input.plan, lane));
    laneBriefPaths.push(lane.laneBriefPath);
    lanePromptPaths.push(lane.agentPromptPath);
  }

  await recordAndValidatePhaseGates({
    stateRoot: input.stateRoot,
    ledgerRoot: join(planRoot, "ledgers"),
    runId: input.plan.parentRunId,
    phase: "plan",
    created: [planPath, input.plan.dispatcherPromptPath, ...laneBriefPaths, ...lanePromptPaths],
    kept: [planPath, input.plan.dispatcherPromptPath, ...laneBriefPaths, ...lanePromptPaths],
    housekeepingNotes: "Parallel wave packet created isolated lane roots only; production and shared manifest writes remain parent-owned.",
    improvementFinding: "Parallel generation needs explicit lane boundaries so subagents can produce more options without colliding.",
    improvementAction: "Use the dispatcher prompt and one lane prompt per subagent; merge only in the parent coordinator.",
  });

  return {
    planPath,
    dispatcherPromptPath: input.plan.dispatcherPromptPath,
    laneBriefPaths,
    lanePromptPaths,
  };
}

async function runLaneMode(input: {
  stateRoot: string;
  laneBriefPath: string;
}): Promise<void> {
  const safeBriefPath = assertSafeWorkspacePath(input.laneBriefPath, [input.stateRoot]);
  const parsed = JSON.parse(await readFile(safeBriefPath, "utf8")) as unknown;
  const laneBrief = assertCreativeParallelLaneBrief(parsed);
  const laneRoot = assertSafeWorkspacePath(laneBrief.lane.outputRoot, [input.stateRoot]);
  const outputsRoot = assertSafeWorkspacePath(laneBrief.lane.outputsRoot, [laneRoot]);
  const laneStatusPath = join(laneRoot, "lane-status.json");
  const resultTemplatePath = join(laneRoot, "result-template.md");
  const laneRunId = `${laneBrief.parentRunId}-${laneBrief.lane.laneId}`;

  await mkdir(outputsRoot, { recursive: true });
  await writeFile(laneStatusPath, `${JSON.stringify(createLaneStatus(laneBrief), null, 2)}\n`);
  await writeFile(resultTemplatePath, renderLaneResultTemplate(laneBrief));
  await recordAndValidatePhaseGates({
    stateRoot: input.stateRoot,
    ledgerRoot: join(laneRoot, "ledgers"),
    runId: laneRunId,
    phase: "generation",
    created: [laneStatusPath, resultTemplatePath, outputsRoot],
    kept: [laneStatusPath, resultTemplatePath, outputsRoot],
    housekeepingNotes: "Lane mode prepared only its own isolated output root and did not mutate shared studio state.",
    improvementFinding: "Lane runs need their own status and result template so parallel agents return mergeable work.",
    improvementAction: "Keep lane agents inside the lane root and let the coordinator merge after all results land.",
  });

  console.log(`Prepared isolated CPE lane: ${laneBrief.lane.laneId}`);
  console.log(`Parent run: ${laneBrief.parentRunId}`);
  console.log(`Strategy: ${laneBrief.lane.strategy.label}`);
  console.log(`Lane root: ${laneRoot}`);
  console.log(`Result template: ${resultTemplatePath}`);
  console.log("Coordinator-only actions: merge, final review, approval, promotion, and app integration.");
}

async function runValidateLaneMode(input: {
  stateRoot: string;
  laneBriefPath: string;
}): Promise<void> {
  const safeBriefPath = assertSafeWorkspacePath(input.laneBriefPath, [input.stateRoot]);
  const parsed = JSON.parse(await readFile(safeBriefPath, "utf8")) as unknown;
  const laneBrief = assertCreativeParallelLaneBrief(parsed);
  const laneRoot = assertSafeWorkspacePath(laneBrief.lane.outputRoot, [input.stateRoot]);
  const resultPath = assertSafeWorkspacePath(laneBrief.lane.resultPath, [laneRoot]);
  const preflightPath = assertSafeWorkspacePath(laneBrief.lane.preflightPath, [laneRoot]);
  const outputsRoot = assertSafeWorkspacePath(laneBrief.lane.outputsRoot, [laneRoot]);
  const resultMarkdown = await readFile(resultPath, "utf8").catch(() => "");
  const resultJsonPath = assertSafeWorkspacePath(laneBrief.lane.resultJsonPath, [laneRoot]);
  const hasResultJson = await pathExists(resultJsonPath);
  const imageOutputCount = await countImmediateFiles(outputsRoot);
  const hasPreflight = await pathExists(preflightPath);
  const validation = validateCreativeParallelLaneResult({
    resultMarkdown,
    hasResultJson,
    imageOutputCount,
    hasPreflight,
  });

  if (!validation.ok) {
    throw new Error(`Lane result is incomplete: ${validation.missing.join(", ")}`);
  }

  await recordAndValidatePhaseGates({
    stateRoot: input.stateRoot,
    ledgerRoot: join(laneRoot, "ledgers"),
    runId: `${laneBrief.parentRunId}-${laneBrief.lane.laneId}`,
    phase: "qa",
    created: [],
    kept: [resultPath, ...(hasResultJson ? [resultJsonPath] : []), ...(hasPreflight ? [preflightPath] : [])],
    housekeepingNotes: "Lane result validation confirmed the lane has merge-ready notes and required QA evidence.",
    improvementFinding: "Lane validation prevents 15x output from overwhelming the coordinator with incomplete placeholders.",
    improvementAction: "Keep validating lane result bundles before coordinator review.",
  });

  console.log(`Validated isolated CPE lane result: ${laneBrief.lane.laneId}`);
  console.log(`Result: ${resultPath}`);
  console.log(`Image outputs checked: ${imageOutputCount}`);
}

async function runCoordinateMode(input: {
  stateRoot: string;
  parallelPlanPath: string;
}): Promise<void> {
  const safePlanPath = assertSafeWorkspacePath(input.parallelPlanPath, [input.stateRoot]);
  const planRoot = dirname(safePlanPath);
  const parsed = JSON.parse(await readFile(safePlanPath, "utf8")) as CreativeParallelWavePlan;

  if (parsed.schemaVersion !== "tower-creative-parallel-wave-plan-v1") {
    throw new Error("--parallel-plan must point at a Creative Production Engine parallel plan.");
  }

  const laneInputs = await Promise.all(parsed.lanes.map((lane) =>
    readCoordinatorLaneInput({
      planRoot,
      lane,
    }),
  ));
  const review = createCreativeCoordinatorReview({
    plan: parsed,
    lanes: laneInputs,
  });
  const reviewPath = join(planRoot, "coordinator-review.json");
  const reportPath = join(planRoot, "coordinator-report.md");
  const boardPath = join(planRoot, "review-board.html");
  const gatePath = join(planRoot, "promotion-gate.json");

  await writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  await writeFile(reportPath, renderCoordinatorReportMarkdown(review));
  await writeFile(boardPath, renderCoordinatorReviewBoardHtml(review));
  await writeFile(gatePath, `${JSON.stringify(review.promotionGate, null, 2)}\n`);
  await recordAndValidatePhaseGates({
    stateRoot: input.stateRoot,
    ledgerRoot: join(planRoot, "ledgers"),
    runId: parsed.parentRunId,
    phase: "final-review",
    created: [reviewPath, reportPath, boardPath, gatePath],
    kept: [reviewPath, reportPath, boardPath, gatePath],
    housekeepingNotes: "Coordinator gathered lane outputs into review artifacts without touching public/art.",
    improvementFinding: "Coordinator mode prevents 15x output from becoming unranked folder noise.",
    improvementAction: "Use coordinator artifacts as the merge gate before asking for final approval.",
  });

  console.log(`Created coordinator review: ${reviewPath}`);
  console.log(`Created coordinator report: ${reportPath}`);
  console.log(`Created review board: ${boardPath}`);
  console.log(`Created promotion gate: ${gatePath}`);

  if (review.promotionGate.status === "blocked") {
    throw new Error(`Coordinator promotion gate blocked: ${review.promotionGate.blockers.join("; ")}`);
  }
}

async function readCoordinatorLaneInput(input: {
  planRoot: string;
  lane: CreativeParallelWavePlan["lanes"][number];
}): Promise<CreativeCoordinatorLaneInput> {
  const laneRoot = assertSafeWorkspacePath(input.lane.outputRoot, [input.planRoot]);
  const resultPath = assertSafeWorkspacePath(input.lane.resultPath, [laneRoot]);
  const resultJsonPath = assertSafeWorkspacePath(input.lane.resultJsonPath, [laneRoot]);
  const preflightPath = assertSafeWorkspacePath(input.lane.preflightPath, [laneRoot]);
  const outputsRoot = assertSafeWorkspacePath(input.lane.outputsRoot, [laneRoot]);
  const resultMarkdown = await readFile(resultPath, "utf8").catch(() => "");
  const resultJson = await readOptionalJson<CreativeLaneResultJson>(resultJsonPath);
  const preflight = await readOptionalJson<CreativeLanePreflight>(preflightPath);
  const outputFiles = await listImmediateFileNames(outputsRoot);

  return {
    laneId: input.lane.laneId,
    strategyLabel: input.lane.strategy.label,
    waveMandateLabel: input.lane.waveMandate.label,
    resultMarkdown,
    ...(resultJson ? { resultJson } : {}),
    outputFiles,
    ...(preflight ? { preflight } : {}),
    hasResultJson: !!resultJson,
    hasPreflight: !!preflight,
  };
}

async function countImmediateFiles(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);

  return entries.filter((entry) => entry.isFile()).length;
}

async function listImmediateFileNames(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => `outputs/${entry.name}`)
    .sort();
}

async function readOptionalJson<T>(path: string): Promise<T | undefined> {
  const raw = await readFile(path, "utf8").catch(() => undefined);

  if (!raw) return undefined;

  return JSON.parse(raw) as T;
}

async function pathExists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

function createLaneStatus(laneBrief: CreativeParallelLaneBrief): Record<string, unknown> {
  return {
    schemaVersion: "tower-creative-parallel-lane-status-v1",
    status: "ready-for-agent-work",
    parentRunId: laneBrief.parentRunId,
    laneId: laneBrief.lane.laneId,
    assetType: laneBrief.assetType,
    name: laneBrief.name,
    strategy: laneBrief.lane.strategy,
    waveMandate: laneBrief.lane.waveMandate,
    recommendedAgentProfile: laneBrief.recommendedAgentProfile,
    outputRoot: laneBrief.lane.outputRoot,
    resultPath: laneBrief.lane.resultPath,
    resultJsonPath: laneBrief.lane.resultJsonPath,
    preflightPath: laneBrief.lane.preflightPath,
    promotionLockedToCoordinator: true,
    forbiddenActions: laneBrief.lane.forbiddenActions,
    updatedAt: new Date().toISOString(),
  };
}

function renderLaneResultTemplate(laneBrief: CreativeParallelLaneBrief): string {
  return `# ${laneBrief.lane.laneId} Result

Parent run: ${laneBrief.parentRunId}
Asset: ${laneBrief.name} (${laneBrief.assetType})
Strategy: ${laneBrief.lane.strategy.label}

## Strongest Idea Or Output

TBD

## What Is Meaningfully Different

TBD

## Files Or Prompts Created

- TBD

## Structured Result

Write this JSON to \`${laneBrief.lane.resultJsonPath}\`:

\`\`\`json
{
  "laneId": "${laneBrief.lane.laneId}",
  "strongestIdea": "Replace this with the strongest idea.",
  "uniquenessClaim": "Replace this with why it is meaningfully different.",
  "outputFiles": [],
  "qualityRisks": ["Replace this with real quality risks."],
  "fallbackModel": "${laneBrief.recommendedAgentProfile.model}",
  "fallbackReason": "",
  "promotionBlockers": []
}
\`\`\`

## Quality Risks

- TBD

## Housekeeping Notes

- Kept:
- Deleted or archived:
- Loose files:

## Continuous-Improvement Notes

- Slow step:
- Error or confusion:
- Engine improvement recommended:

Coordinator reminder: this lane cannot approve, promote, edit public/art, edit manifests, delete live assets, or integrate the app.
`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  validateKnownFlags(argv);

  const stateRootInput = flagValue(argv, "--state-root") ?? ".artlab/studio";
  const allowedStateRoots = process.env.NODE_ENV === "test" ? [".artlab/studio", tmpdir()] : [".artlab/studio"];
  const stateRoot = assertSafeWorkspacePath(stateRootInput, allowedStateRoots);
  const mode = assertMode(flagValue(argv, "--mode"));
  const laneBriefPath = flagValue(argv, "--lane-brief");
  const parallelPlanPath = flagValue(argv, "--parallel-plan");

  if (mode === "lane") {
    if (!laneBriefPath) throw new Error("--mode lane requires --lane-brief.");

    await runLaneMode({ stateRoot, laneBriefPath });
    return;
  }

  if (mode === "validate-lane") {
    if (!laneBriefPath) throw new Error("--mode validate-lane requires --lane-brief.");

    await runValidateLaneMode({ stateRoot, laneBriefPath });
    return;
  }

  if (mode === "coordinate") {
    if (!parallelPlanPath) throw new Error("--mode coordinate requires --parallel-plan.");

    await runCoordinateMode({ stateRoot, parallelPlanPath });
    return;
  }

  if (laneBriefPath) {
    throw new Error("--lane-brief can only be used with --mode lane or --mode validate-lane.");
  }

  if (parallelPlanPath) {
    throw new Error("--parallel-plan can only be used with --mode coordinate.");
  }

  const assetTypeValue = flagValue(argv, "--asset-type");
  const assetName = flagValue(argv, "--name");
  const brief = flagValue(argv, "--brief");
  const explicitRunId = flagValue(argv, "--run-id");
  const request = flagValue(argv, "--request");
  const parallelAgentsValue = assertIntegerFlag(argv, "--parallel-agents") ?? assertIntegerFlag(argv, "--agents");
  const wavesValue = assertIntegerFlag(argv, "--waves");
  const noParallel = argv.includes("--no-parallel");
  const packetRequested = Boolean(assetTypeValue || assetName || brief || explicitRunId || request);
  const wantsParallelWave = !noParallel && packetRequested;

  if (noParallel && (parallelAgentsValue !== undefined || wavesValue !== undefined)) {
    throw new Error("--no-parallel cannot be combined with --parallel-agents, --agents, or --waves.");
  }

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

  if (packetRequested || parallelAgentsValue !== undefined || wavesValue !== undefined) {
    const inferred = request ? inferCreativeProductionRequest(request) : undefined;

    if (!inferred && (!assetTypeValue || !assetName || !brief)) {
      throw new Error("--asset-type, --name, and --brief are required together unless --request is provided.");
    }

    const assetType = assertAssetType(assetTypeValue ?? inferred?.assetType ?? "");
    const resolvedAssetName = assetName ?? inferred?.name;
    const resolvedBrief = brief ?? inferred?.brief;

    if (!resolvedAssetName || !resolvedBrief) {
      throw new Error("Could not resolve a creative production name and brief from the provided input.");
    }

    const runId = assertSafeRunId(explicitRunId ?? inferred?.runId ?? slugifyRunId(resolvedAssetName));
    const packetInput = {
      assetType,
      name: resolvedAssetName,
      runId,
      brief: resolvedBrief,
      stateRoot: toPortableLedgerPath(stateRoot),
    };
    const packet = createCreativeProductionPacket(inferred
      ? {
          ...packetInput,
          intake: {
            rawRequest: inferred.rawRequest,
            inferredAssetType: inferred.assetType,
            routingReason: inferred.routingReason,
            confidence: inferred.confidence,
            matchedSignals: inferred.matchedSignals,
            initialApprovalStatus: inferred.initialApprovalStatus,
          },
        }
      : packetInput);
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
      improvementFinding: inferred
        ? "Adaptive request mode routed natural language into a strict production packet."
        : "Packet mode is command-backed for any registered creative asset type.",
      improvementAction: inferred
        ? "Review request-routing accuracy after the concept phase and add intake signals when the route felt slow or surprising."
        : "Use the packet prompt for concept generation, then record the next gate before promotion.",
    });

    let parallelOutputs:
      | {
        planPath: string;
        dispatcherPromptPath: string;
        laneBriefPaths: string[];
        lanePromptPaths: string[];
      }
      | undefined;

    if (wantsParallelWave) {
      const agentsPerWave = assertCreativeParallelCount(
        "--parallel-agents",
        parallelAgentsValue ?? CREATIVE_PARALLEL_DEFAULT_AGENTS,
      );
      const waves = assertCreativeParallelCount("--waves", wavesValue ?? CREATIVE_PARALLEL_DEFAULT_WAVES);
      const plan = createCreativeParallelWavePlan({
        packet,
        agentsPerWave,
        waves,
        parallelRoot: join(packet.outputRoot, "parallel"),
      });

      parallelOutputs = await writeParallelWavePlanFiles({
        stateRoot,
        packetRoot,
        plan,
      });
    }

    if (inferred) {
      console.log(`Routed request to ${assetType}: ${inferred.routingReason}`);
    }

    console.log(`Created Creative Production Engine packet: ${resolvedAssetName}`);
    console.log(`Packet: ${packetPath}`);
    console.log(`Prompt: ${promptPath}`);
    console.log(`Next action: ${nextActionPath}`);
    if (parallelOutputs) {
      console.log(`Created Creative Production Engine parallel wave plan: ${parallelOutputs.laneBriefPaths.length} lanes`);
      console.log(`Parallel plan: ${parallelOutputs.planPath}`);
      console.log(`Dispatcher prompt: ${parallelOutputs.dispatcherPromptPath}`);
      console.log(`First lane prompt: ${parallelOutputs.lanePromptPaths[0] ?? "none"}`);
    }
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
