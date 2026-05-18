import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import {
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  SEASON_ONE_CHARACTER_METADATA,
  buildApprovedCharacterVisualAssetsFromRun,
  createCharacterArtRunPlan,
  getCharacterArtRunQaIssues,
  markCharacterArtRunFinalApproved,
  markCharacterArtRunProcessed,
  markCharacterArtRunPromoted,
  markCharacterArtRunQaPassed,
  renderCharacterArtRunPromptPacket,
  type CharacterArtProcessedSprite,
  type CharacterArtHumanApprovalGateId,
  type CharacterArtRun,
} from "../src/lib/visual-assets";
import {
  inspectCharacterSourceImage,
  preflightCharacterSourceImage,
  prepareCharacterSpriteAsset,
  splitCharacterPoseSheet,
} from "../src/lib/visual-assets/art-processing";
import type {
  CharacterId,
  CharacterOutfitVariant,
  CharacterPose,
  VisualAsset,
} from "../src/lib/visual-assets/types";

const GENERATED_MANIFEST_PATH = "src/lib/visual-assets/approved-character-assets.generated.json";

type ArtPipelineCommand =
  | "plan"
  | "status"
  | "operate"
  | "clean"
  | "preflight"
  | "ingest"
  | "split"
  | "master"
  | "derive"
  | "qa"
  | "review"
  | "promote";

interface ParsedArgs {
  command: ArtPipelineCommand;
  positional: string[];
  flags: Map<string, string | boolean>;
}

function printUsage(): never {
  throw new Error(`Usage:
  npm run art:plan -- <characterId> --run-id <run-id> --identity-ref <path> [--asset-version <version>]
  npm run art:status [-- --json]
  npm run art:operate [-- --character <characterId>] [-- --run-id <run-id>] [-- --identity-ref <path>] [-- --asset-version <version>] [-- --run <run.json>] [-- --out-root <path>] [-- --dry-run] [-- --json]
  npm run art:clean -- <characterId> --run-id <run-id> [--include-legacy-shared-masters] [--dry-run]
  npm run art:preflight -- <source> [--minimum-long-edge 4096] [--chroma-key 00ff00] [--json]
  npm run art:ingest -- <run.json> --source <path> --kind <kind> [--id <id>] [--outfit <variant>] [--pose <pose>] [--columns 7] [--rows 1]
  npm run art:split -- <run.json> --source-asset <id>
  npm run art:master -- <run.json> [--master-long-edge 4096]
  npm run art:derive -- <run.json> [--master-long-edge 4096]
  npm run art:qa -- <run.json>
  npm run art:review -- <run.json>
  npm run art:promote -- <run.json> --approval-phrase "approved for app"`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [rawCommand, ...rest] = argv;
  const commands: ArtPipelineCommand[] = [
    "plan",
    "status",
    "operate",
    "clean",
    "preflight",
    "ingest",
    "split",
    "master",
    "derive",
    "qa",
    "review",
    "promote",
  ];

  if (!commands.includes(rawCommand as ArtPipelineCommand)) {
    printUsage();
  }

  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];

    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = rest[index + 1];

    if (!next || next.startsWith("--")) {
      flags.set(key, true);
      continue;
    }

    flags.set(key, next);
    index += 1;
  }

  return {
    command: rawCommand as ArtPipelineCommand,
    positional,
    flags,
  };
}

function requireFlag(args: ParsedArgs, key: string): string {
  const value = args.flags.get(key);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required --${key} flag.`);
  }

  return value;
}

function optionalNumberFlag(args: ParsedArgs, key: string): number | undefined {
  const value = args.flags.get(key);

  if (typeof value !== "string") return undefined;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive number.`);
  }

  return parsed;
}

function optionalStringFlag(args: ParsedArgs, key: string): string | undefined {
  const value = args.flags.get(key);

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function assertCharacterId(value: string): CharacterId {
  const ids = new Set(SEASON_ONE_CHARACTER_METADATA.map((character) => character.id));

  if (!ids.has(value as CharacterId)) {
    throw new Error(`Unknown Season 1 character id: ${value}`);
  }

  return value as CharacterId;
}

function assertOutfitVariant(value: string): CharacterOutfitVariant {
  if (!CHARACTER_OUTFIT_VARIANTS.includes(value as CharacterOutfitVariant)) {
    throw new Error(`Unknown outfit variant: ${value}`);
  }

  return value as CharacterOutfitVariant;
}

function assertPose(value: string): CharacterPose {
  if (!CHARACTER_POSES.includes(value as CharacterPose)) {
    throw new Error(`Unknown character pose: ${value}`);
  }

  return value as CharacterPose;
}

function assertSourceKind(value: string): CharacterArtRun["sourceAssets"][number]["kind"] {
  const kinds: Array<CharacterArtRun["sourceAssets"][number]["kind"]> = [
    "identity-reference",
    "production-packet",
    "pose-sheet",
    "individual-sprite",
    "final-review-board",
  ];

  if (!kinds.includes(value as CharacterArtRun["sourceAssets"][number]["kind"])) {
    throw new Error(`Unknown source asset kind: ${value}`);
  }

  return value as CharacterArtRun["sourceAssets"][number]["kind"];
}

function optionalChromaKeyFlag(args: ParsedArgs): { r: number; g: number; b: number } | undefined {
  const value = optionalStringFlag(args, "chroma-key");

  if (!value) return undefined;

  const normalized = value.replace(/^#/, "").toLowerCase();

  if (!/^[0-9a-f]{6}$/.test(normalized)) {
    throw new Error("--chroma-key must be a six-digit hex color such as 00ff00.");
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

async function ensureParentDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function checksumFile(path: string): Promise<string> {
  const file = await readFile(path);

  return `sha256:${createHash("sha256").update(file).digest("hex")}`;
}

async function readRun(path: string): Promise<CharacterArtRun> {
  return JSON.parse(await readFile(path, "utf8")) as CharacterArtRun;
}

async function writeRun(path: string, run: CharacterArtRun): Promise<void> {
  await ensureParentDirectory(path);
  await writeFile(path, `${JSON.stringify(run, null, 2)}\n`);
}

function getRunJsonPath(run: CharacterArtRun): string {
  return `${run.directories.runRoot}/run.json`;
}

async function commandPlan(args: ParsedArgs): Promise<void> {
  const characterId = assertCharacterId(args.positional[0] ?? "");
  const run = createCharacterArtRunPlan({
    characterId,
    runId: requireFlag(args, "run-id"),
    approvedIdentityRef: requireFlag(args, "identity-ref"),
    assetVersion:
      typeof args.flags.get("asset-version") === "string"
        ? (args.flags.get("asset-version") as string)
        : undefined,
  });
  const runJsonPath = getRunJsonPath(run);
  const promptPath = `${run.directories.prompts}/batch-prompt-packet.md`;

  await writeRun(runJsonPath, run);
  await ensureParentDirectory(promptPath);
  await writeFile(promptPath, renderCharacterArtRunPromptPacket(run));

  console.log(`Created character art run: ${runJsonPath}`);
  console.log(`Created prompt packet: ${promptPath}`);
}

async function commandPreflight(args: ParsedArgs): Promise<void> {
  const sourcePath = args.positional[0];

  if (!existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }

  const result = await preflightCharacterSourceImage(sourcePath, {
    minimumLongEdge: optionalNumberFlag(args, "minimum-long-edge") ?? 4096,
    chromaKey: optionalChromaKeyFlag(args),
  });

  if (args.flags.get("json")) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.passed) {
    console.log(`Source preflight passed: ${sourcePath}`);
  } else {
    console.error(`Source preflight failed: ${result.issues.join(", ")}`);
  }

  if (!result.passed) {
    process.exitCode = 1;
  }
}

async function commandIngest(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = await readRun(runPath);
  const sourcePath = requireFlag(args, "source");
  const kind = assertSourceKind(requireFlag(args, "kind"));
  const sourceName = args.flags.get("id");
  const id = typeof sourceName === "string" ? sourceName : `${kind}-${run.sourceAssets.length}`;
  const filename = sourcePath.split("/").at(-1) ?? `${id}.png`;
  const incomingPath = `${run.directories.incoming}/${id}-${filename}`;

  if (!existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }

  await ensureParentDirectory(incomingPath);
  await copyFile(sourcePath, incomingPath);

  const inspection = await inspectCharacterSourceImage(incomingPath, { minimumLongEdge: 1 });
  const outfitValue = args.flags.get("outfit");
  const poseValue = args.flags.get("pose");
  const columns = optionalNumberFlag(args, "columns");
  const rows = optionalNumberFlag(args, "rows");

  run.sourceAssets = [
    ...run.sourceAssets.filter((asset) => asset.id !== id),
    {
      id,
      kind,
      path: incomingPath,
      checksum: await checksumFile(incomingPath),
      width: inspection.width,
      height: inspection.height,
      outfitVariant: typeof outfitValue === "string" ? assertOutfitVariant(outfitValue) : undefined,
      pose: typeof poseValue === "string" ? assertPose(poseValue) : undefined,
      grid: columns && rows ? { columns, rows } : undefined,
    },
  ];
  run.status = "sources-ingested";

  await writeRun(runPath, run);
  console.log(`Ingested ${sourcePath} as ${id}`);
}

async function commandSplit(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = await readRun(runPath);
  const sourceAssetId = requireFlag(args, "source-asset");
  const sourceAsset = run.sourceAssets.find((asset) => asset.id === sourceAssetId);

  if (!sourceAsset) {
    throw new Error(`No source asset found for id ${sourceAssetId}.`);
  }

  if (sourceAsset.kind !== "pose-sheet" || !sourceAsset.outfitVariant || !sourceAsset.grid) {
    throw new Error("Split requires an ingested pose-sheet with outfit variant and grid metadata.");
  }

  const cellWidth = Math.floor((sourceAsset.width ?? 0) / sourceAsset.grid.columns);
  const cellHeight = Math.floor((sourceAsset.height ?? 0) / sourceAsset.grid.rows);

  if (cellWidth <= 0 || cellHeight <= 0) {
    throw new Error("Cannot split source sheet because dimensions are missing.");
  }

  if (sourceAsset.grid.columns * sourceAsset.grid.rows < CHARACTER_POSES.length) {
    throw new Error("Pose sheet grid must contain at least seven cells.");
  }

  const crops = CHARACTER_POSES.map((pose, index) => {
    const column = index % sourceAsset.grid!.columns;
    const row = Math.floor(index / sourceAsset.grid!.columns);

    return {
      outputPath: `${run.directories.split}/${sourceAsset.outfitVariant}/${pose}.png`,
      extract: {
        left: column * cellWidth,
        top: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
      },
    };
  });
  const outputs = await splitCharacterPoseSheet({
    sourcePath: sourceAsset.path,
    crops,
  });
  const individualAssets = await Promise.all(
    outputs.map(async (output, index) => {
      const pose = CHARACTER_POSES[index];

      return {
        id: `split-${sourceAsset.outfitVariant}-${pose}`,
        kind: "individual-sprite" as const,
        path: output.outputPath,
        checksum: await checksumFile(output.outputPath),
        width: output.width,
        height: output.height,
        outfitVariant: sourceAsset.outfitVariant,
        pose,
      };
    }),
  );
  const individualIds = new Set(individualAssets.map((asset) => asset.id));

  run.sourceAssets = [
    ...run.sourceAssets.filter((asset) => !individualIds.has(asset.id)),
    ...individualAssets,
  ];
  await writeRun(runPath, run);
  console.log(`Split ${sourceAssetId} into ${outputs.length} sprite sources.`);
}

async function processRunSprites(
  run: CharacterArtRun,
  masterLongEdge: number,
): Promise<CharacterArtProcessedSprite[]> {
  const processed: CharacterArtProcessedSprite[] = [];

  for (const sprite of run.expectedSprites) {
    const sourceAsset = run.sourceAssets.find(
      (asset) =>
        asset.kind === "individual-sprite" &&
        asset.outfitVariant === sprite.outfitVariant &&
        asset.pose === sprite.pose,
    );

    if (!sourceAsset) {
      throw new Error(`No individual sprite source found for ${sprite.outfitVariant}/${sprite.pose}.`);
    }

    const result = await prepareCharacterSpriteAsset({
      sourcePath: sourceAsset.path,
      masterPath: sprite.masterPath,
      stagedRenditionPaths: {
        default: sprite.stagedRenditions.default.src,
        retina2x: sprite.stagedRenditions.retina2x.src,
        retina3x: sprite.stagedRenditions.retina3x.src,
      },
      qaPreviewPaths: {
        dark: sprite.qaDarkPath,
        light: sprite.qaLightPath,
      },
      displayFrame: sprite.displayFrame,
      masterLongEdge,
    });
    const blockingIssues = result.issues.filter(
      (issue) =>
        issue === "source-missing-alpha" ||
        issue === "master-long-edge-below-contract" ||
        issue === "source-upscaled-to-master" ||
        issue.startsWith("source-long-edge-below-"),
    );

    processed.push({
      slotId: sprite.id,
      sourcePath: sourceAsset.path,
      sourceResolution: {
        width: result.source.width,
        height: result.source.height,
      },
      masterPath: sprite.masterPath,
      masterResolution: result.master,
      checksum: result.checksum,
      qaStatus: blockingIssues.length === 0 ? "passed" : "failed",
      issues: result.issues,
    });
  }

  return processed;
}

async function commandMasterOrDerive(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = await readRun(runPath);
  const masterLongEdge = optionalNumberFlag(args, "master-long-edge") ?? 4096;
  const processedSprites = await processRunSprites(run, masterLongEdge);

  await writeRun(runPath, markCharacterArtRunProcessed(run, processedSprites));
  console.log(`Processed ${processedSprites.length} sprite masters and staged derivatives.`);
}

async function commandQa(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = await readRun(runPath);
  const qaIssues = getCharacterArtRunQaIssues(run);

  if (qaIssues.length > 0) {
    run.qa = {
      status: "failed",
      checkedAt: new Date().toISOString(),
      issues: qaIssues,
    };
    await writeRun(runPath, run);
    throw new Error(`Art QA failed: ${qaIssues.join(" ")}`);
  }

  await writeRun(runPath, markCharacterArtRunQaPassed(run));
  console.log("Art QA passed.");
}

function getReviewBoardPreviewSrc(reviewRoot: string, publicSrc: string): string {
  const publicPath = join("public", publicSrc.replace(/^\/+/, ""));

  return relative(reviewRoot, publicPath).replaceAll("\\", "/");
}

function renderReviewHtml(run: CharacterArtRun): string {
  const cards = run.expectedSprites
    .map((sprite) => {
      const previewSrc = getReviewBoardPreviewSrc(
        run.directories.reviewRoot,
        sprite.publicRenditions.retina3x.src,
      );
      const processed = run.processedSprites.find((entry) => entry.slotId === sprite.id);
      const warnings = processed?.issues.length ? processed.issues.join(", ") : "none";

      return `<article class="card">
  <div class="preview dark"><img src="${previewSrc}" alt="${sprite.id} on dark background"></div>
  <div class="preview light"><img src="${previewSrc}" alt="${sprite.id} on light background"></div>
  <h2>${sprite.outfitVariant} / ${sprite.pose}</h2>
  <p>${sprite.publicRenditions.default.src}</p>
  <p class="warnings">QA notes: ${warnings}</p>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${run.characterId} final art review</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #111316; color: #f8f5ef; }
    header { position: sticky; top: 0; z-index: 1; padding: 20px 24px; background: #1b1d21; border-bottom: 1px solid #343842; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; padding: 24px; }
    .card { border: 1px solid #343842; border-radius: 8px; overflow: hidden; background: #1b1d21; }
    .preview { height: 310px; display: grid; place-items: end center; padding: 16px; }
    .preview img { max-width: 100%; max-height: 290px; object-fit: contain; image-rendering: auto; }
    .dark { background: #101114; }
    .light { background: #f4efe4; }
    h2, p { margin: 12px 14px; }
    h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
    p { color: #bfc3cc; font-size: 13px; overflow-wrap: anywhere; }
    .warnings { color: #f2c979; }
  </style>
</head>
<body>
  <header>
    <h1>${run.characterId} final upload-ready board</h1>
    <p>Approve only if every sprite is clean, human, consistent, uncropped, and ready for public/art promotion.</p>
  </header>
  <main>${cards}</main>
</body>
</html>
`;
}

async function commandReview(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = await readRun(runPath);
  const reviewPath = `${run.directories.reviewRoot}/final-upload-ready-board.html`;

  await ensureParentDirectory(reviewPath);
  await writeFile(reviewPath, renderReviewHtml(run));
  console.log(`Created final review board: ${reviewPath}`);
}

async function listImageFiles(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];

  const entries = await readdir(root, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /\.(png|webp|jpe?g)$/i.test(entry.name))
    .map((entry) => join(root, entry.name));
}

async function commandClean(args: ParsedArgs): Promise<void> {
  const characterId = assertCharacterId(args.positional[0] ?? "");
  const runId = requireFlag(args, "run-id");
  const dryRun = args.flags.get("dry-run") === true;
  const includeLegacySharedMasters = args.flags.get("include-legacy-shared-masters") === true;
  const volatileDirectories = [
    `.artlab/characters/${characterId}/masters/${runId}`,
    `.artlab/characters/${characterId}/qa/${runId}`,
    `.artlab/characters/${characterId}/staged-public/${runId}`,
    `.artlab/runs/${characterId}/${runId}/incoming`,
    `.artlab/runs/${characterId}/${runId}/split`,
  ];
  const legacyMasterDirectories = includeLegacySharedMasters
    ? CHARACTER_OUTFIT_VARIANTS.map((variant) => `.artlab/characters/${characterId}/masters/${variant}`)
    : [];
  const imageFiles = [
    ...(await listImageFiles(`.artlab/runs/${characterId}/${runId}/review`)),
    ...(await listImageFiles(`.artlab/runs/${characterId}/${runId}/browser-qa`)),
  ];
  const deleteTargets = [...volatileDirectories, ...legacyMasterDirectories, ...imageFiles].filter((path) =>
    existsSync(path),
  );
  const kept = [
    `.artlab/runs/${characterId}/${runId}/run.json`,
    `.artlab/runs/${characterId}/${runId}/prompts/`,
    `.artlab/runs/${characterId}/${runId}/review/final-upload-ready-board.html`,
    `.artlab/runs/${characterId}/${runId}/browser-qa/browser-qa.json`,
    `.artlab/characters/${characterId}/references/`,
    `public/art/lobby/${characterId}/`,
    GENERATED_MANIFEST_PATH,
  ];

  if (!dryRun) {
    for (const target of deleteTargets) {
      await rm(target, { recursive: true, force: true });
    }
  }

  console.log(
    JSON.stringify(
      {
        characterId,
        runId,
        dryRun,
        deleted: deleteTargets,
        kept,
        protected: [
          "production public/art files stay live until a replacement run is approved and promoted",
          "run ledgers, prompt packets, review HTML, browser QA JSON, and identity references stay as provenance",
        ],
      },
      null,
      2,
    ),
  );
}

async function readApprovedCharacterAssets(): Promise<VisualAsset[]> {
  if (!existsSync(GENERATED_MANIFEST_PATH)) return [];

  return JSON.parse(await readFile(GENERATED_MANIFEST_PATH, "utf8")) as VisualAsset[];
}

interface ArtRunLedgerSummary {
  characterId: CharacterId;
  displayName: string;
  runId: string;
  runPath: string;
  status: CharacterArtRun["status"];
  qaStatus: CharacterArtRun["qa"]["status"];
  promotionStatus: CharacterArtRun["promotion"]["status"];
  expectedSprites: number;
  processedSprites: number;
  finalApprovalStatus: CharacterArtRun["finalApproval"]["status"];
  warningCounts: Record<string, number>;
}

interface ArtCharacterStatus {
  characterId: CharacterId;
  displayName: string;
  shortLabel: string;
  expectedSprites: number;
  approvedSprites: number;
  productionState: "fully-promoted" | "partial" | "not-started";
  latestRun?: ArtRunLedgerSummary;
}

interface ArtPipelineStatusReport {
  styleId: "tower-flat-plus-depth-v1";
  tone: "Professional Scars";
  expectedCharacters: number;
  expectedSpritesPerCharacter: number;
  expectedProductionSprites: number;
  approvedProductionSprites: number;
  fullyPromotedCharacters: string[];
  nextRecommendedCharacter: {
    characterId: CharacterId;
    displayName: string;
    reason: string;
  };
  characters: ArtCharacterStatus[];
  runLedgers: ArtRunLedgerSummary[];
  commands: string[];
  continuationDocs: string[];
  nonNegotiables: string[];
}

type CharacterOperatorActionType =
  | "generate-concept-board"
  | "create-run-from-approved-identity"
  | "ingest-generated-sources"
  | "process-and-qa-run"
  | "review-final-board"
  | "promote-approved-run"
  | "complete";

interface CharacterOperatorPacket {
  operatorVersion: "tower-character-operator-v1";
  generatedAt: string;
  strictMode: true;
  characterId: CharacterId;
  displayName: string;
  runId: string;
  approvedIdentityRef?: string;
  nextAction: {
    type: CharacterOperatorActionType;
    status:
      | "blocked-on-human-choice"
      | "blocked-on-generated-sources"
      | "ready-to-execute"
      | "ready-for-final-approval"
      | "ready-to-promote"
      | "complete";
    humanGate?: CharacterArtHumanApprovalGateId;
    summary: string;
  };
  blockedUntil: string;
  files: {
    nextActionJson: string;
    nextActionMarkdown: string;
    conceptPrompt?: string;
    runJson?: string;
    promptPacket?: string;
  };
  stateContract: {
    approvalGates: CharacterArtHumanApprovalGateId[];
    productionPromotionPhrase: "approved for app";
    expectedOutfitVariants: typeof CHARACTER_OUTFIT_VARIANTS;
    expectedPoses: typeof CHARACTER_POSES;
    expectedSpritesPerCharacter: number;
  };
  allowedCommands: string[];
  forbiddenActions: string[];
}

const CHARACTER_GENERATION_ORDER: CharacterId[] = [
  "otis",
  "ceo",
  "cro",
  "cfo",
  "coo",
  "cmo",
  "cno",
  "cpo",
  "cio",
  "trust",
  "archivist",
  "red-team",
];

const expectedSpritesPerCharacter =
  CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length;

function countRunWarnings(run: CharacterArtRun): Record<string, number> {
  const warningCounts: Record<string, number> = {};

  for (const sprite of run.processedSprites) {
    for (const issue of sprite.issues) {
      warningCounts[issue] = (warningCounts[issue] ?? 0) + 1;
    }
  }

  return Object.fromEntries(
    Object.entries(warningCounts).sort(([issueA], [issueB]) => issueA.localeCompare(issueB)),
  );
}

function summarizeRunLedger(run: CharacterArtRun, runPath: string): ArtRunLedgerSummary {
  const character = SEASON_ONE_CHARACTER_METADATA.find((entry) => entry.id === run.characterId);

  return {
    characterId: run.characterId,
    displayName: character?.displayName ?? run.characterId,
    runId: run.runId,
    runPath,
    status: run.status,
    qaStatus: run.qa.status,
    promotionStatus: run.promotion.status,
    expectedSprites: run.expectedSprites.length,
    processedSprites: run.processedSprites.length,
    finalApprovalStatus: run.finalApproval.status,
    warningCounts: countRunWarnings(run),
  };
}

async function readRunLedgers(): Promise<ArtRunLedgerSummary[]> {
  const ledgers: ArtRunLedgerSummary[] = [];

  for (const characterId of CHARACTER_GENERATION_ORDER) {
    const characterRunRoot = `.artlab/runs/${characterId}`;

    if (!existsSync(characterRunRoot)) continue;

    const entries = await readdir(characterRunRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const runPath = join(characterRunRoot, entry.name, "run.json");

      if (!existsSync(runPath)) continue;

      ledgers.push(summarizeRunLedger(await readRun(runPath), runPath));
    }
  }

  return ledgers.sort((left, right) =>
    `${left.characterId}:${left.runId}`.localeCompare(`${right.characterId}:${right.runId}`),
  );
}

function getLatestRunForCharacter(
  runLedgers: ArtRunLedgerSummary[],
  characterId: CharacterId,
): ArtRunLedgerSummary | undefined {
  const runs = runLedgers
    .filter((run) => run.characterId === characterId)
    .sort((left, right) => right.runId.localeCompare(left.runId));

  return runs.find((run) => run.promotionStatus !== "promoted") ?? runs[0];
}

function getActiveReplacementRun(
  runLedgers: ArtRunLedgerSummary[],
  approvedCounts: Map<CharacterId, number>,
): ArtRunLedgerSummary | undefined {
  return runLedgers
    .filter(
      (run) =>
        (approvedCounts.get(run.characterId) ?? 0) >= expectedSpritesPerCharacter &&
        run.promotionStatus !== "promoted",
    )
    .sort((left, right) => right.runId.localeCompare(left.runId))[0];
}

async function buildArtPipelineStatusReport(): Promise<ArtPipelineStatusReport> {
  const approvedAssets = await readApprovedCharacterAssets();
  const runLedgers = await readRunLedgers();
  const approvedCounts = new Map<CharacterId, number>();

  for (const asset of approvedAssets) {
    if (!asset.characterId) continue;

    approvedCounts.set(asset.characterId, (approvedCounts.get(asset.characterId) ?? 0) + 1);
  }

  const characters = CHARACTER_GENERATION_ORDER.map((characterId): ArtCharacterStatus => {
    const character = SEASON_ONE_CHARACTER_METADATA.find((entry) => entry.id === characterId);
    const approvedSprites = approvedCounts.get(characterId) ?? 0;
    const productionState =
      approvedSprites >= expectedSpritesPerCharacter
        ? "fully-promoted"
        : approvedSprites > 0
          ? "partial"
          : "not-started";

    return {
      characterId,
      displayName: character?.displayName ?? characterId,
      shortLabel: character?.shortLabel ?? characterId.toUpperCase(),
      expectedSprites: expectedSpritesPerCharacter,
      approvedSprites,
      productionState,
      latestRun: getLatestRunForCharacter(runLedgers, characterId),
    };
  });
  const activeReplacementRun = getActiveReplacementRun(runLedgers, approvedCounts);
  const nextCharacter =
    characters.find((character) => character.characterId === activeReplacementRun?.characterId) ??
    characters.find((character) => character.productionState !== "fully-promoted") ??
    characters[0];
  const nextReason = activeReplacementRun
    ? `${nextCharacter.displayName} has an active replacement run (${activeReplacementRun.runId}) and should be completed before new characters.`
    : nextCharacter.characterId === "otis"
      ? "Fresh-start reset is active, so Otis should be regenerated from scratch as the first production pilot."
      : "This is the next unpromoted Season 1 character in the locked generation order.";

  return {
    styleId: "tower-flat-plus-depth-v1",
    tone: "Professional Scars",
    expectedCharacters: characters.length,
    expectedSpritesPerCharacter,
    expectedProductionSprites: characters.length * expectedSpritesPerCharacter,
    approvedProductionSprites: approvedAssets.filter((asset) => asset.characterId).length,
    fullyPromotedCharacters: characters
      .filter((character) => character.productionState === "fully-promoted")
      .map((character) => `${character.displayName} (${character.characterId})`),
    nextRecommendedCharacter: {
      characterId: nextCharacter.characterId,
      displayName: nextCharacter.displayName,
      reason: nextReason,
    },
    characters,
    runLedgers,
    commands: [
      "npm run art:produce -- --request \"<natural language creative request>\"",
      "npm run art:produce -- --continue <run-id>",
      "npm run art:operate",
      "npm run art:status",
      "npm --silent run art:status -- --json",
      "npm run art:generate prepare-api --phase production-pack --packet <creative-brief.json> --directive <next-image-generation-step.json>",
      "npm run art:generate verify-canary --plan <canary/gemini-api-plan.json>",
      "npm run art:generate repair-auto --plan <gemini-api-plan.json>",
      "npm run art:clean -- <characterId> --run-id <run-id>",
      "npm run art:plan -- <characterId> --run-id <yyyy-mm-dd-character-purpose> --identity-ref <approved-reference-path>",
      "npm run art:preflight -- <generated-file> --minimum-long-edge 4096 --chroma-key 00ff00",
      "npm run art:ingest -- <run.json> --source <generated-file> --kind individual-sprite --id source-regular-idle --outfit regular --pose idle",
      "npm run art:ingest -- <run.json> --source <generated-file> --kind pose-sheet --id pose-sheet-regular --outfit regular --columns 7 --rows 1",
      "npm run art:split -- <run.json> --source-asset <pose-sheet-id>",
      "npm run art:master -- <run.json>",
      "npm run art:qa -- <run.json>",
      "npm run art:review -- <run.json>",
      "npm run art:promote -- <run.json> --approval-phrase \"approved for app\"",
    ],
    continuationDocs: [
      "docs/CHARACTER-IMAGE-OPERATIONS.md",
      "docs/CHARACTER-IMAGE-SESSION-PROMPT.md",
      "docs/CHARACTER-ART-PIPELINE.md",
      "docs/CHARACTER-ASSET-HANDOFF.md",
      "docs/ART-BIBLE.md",
      "docs/CHARACTER-BIBLE.md",
      ".artlab/README.md",
    ],
    nonNegotiables: [
      "Only two human approval gates: initial character design, then final upload-ready board.",
      "No production manifest entry without the exact final phrase: approved for app.",
      "Production packs must pass the one-slot canary before full-pack paid generation.",
      "Whole-pack retries are banned; repair or regenerate only named failed slots.",
      "Do not hide source warnings; below-contract sources must be repaired or regenerated before promotion.",
      "When the pipeline needs a manual workaround twice, add a script, test, and doc update before continuing.",
    ],
  };
}

function renderWarningCounts(warningCounts: Record<string, number>): string {
  const entries = Object.entries(warningCounts);

  if (entries.length === 0) return "none";

  return entries.map(([issue, count]) => `${issue} x${count}`).join(", ");
}

function renderArtPipelineStatus(report: ArtPipelineStatusReport): string {
  const characterLines = report.characters
    .map((character) => {
      const run = character.latestRun;
      const runSummary = run
        ? `latest run ${run.runId}: ${run.status}, QA ${run.qaStatus}, promotion ${run.promotionStatus}, warnings ${renderWarningCounts(run.warningCounts)}`
        : "no run ledger yet";

      return `- ${character.displayName} (${character.characterId}): ${character.approvedSprites}/${character.expectedSprites} approved sprites, ${character.productionState}; ${runSummary}`;
    })
    .join("\n");
  const promoted = report.fullyPromotedCharacters.length
    ? report.fullyPromotedCharacters.join(", ")
    : "none";

  return `Tower Character Image Pipeline Status

Style: ${report.styleId}
Tone: ${report.tone}
Approved production sprites: ${report.approvedProductionSprites}/${report.expectedProductionSprites}
Fully promoted characters: ${promoted}

Next recommended character: ${report.nextRecommendedCharacter.displayName} (${report.nextRecommendedCharacter.characterId})
Reason: ${report.nextRecommendedCharacter.reason}

Character ledger:
${characterLines}

Start-here docs:
${report.continuationDocs.map((doc) => `- ${doc}`).join("\n")}

Commands:
${report.commands.map((command) => `- ${command}`).join("\n")}

Non-negotiables:
${report.nonNegotiables.map((rule) => `- ${rule}`).join("\n")}
`;
}

function renderConceptBoardPrompt(characterId: CharacterId): string {
  const character = SEASON_ONE_CHARACTER_METADATA.find((entry) => entry.id === characterId);

  if (!character) {
    throw new Error(`Unknown Season 1 character id: ${characterId}`);
  }

  return `# ${character.displayName} Concept Board Prompt

Prompt ref: ${character.conceptBoardPromptRef}
Style: tower-flat-plus-depth-v1
Tone: Professional Scars

Create exactly 5 distinct prompt-only concept options for ${character.displayName}, ${character.title} of The Tower.

Style rules:
- Premium adult web-game sprite.
- Clean raster shapes with subtle depth.
- Strong mobile-readable silhouette.
- Adult professional energy.
- No ultra-realism and no fake-perfect AI model look.

Character DNA:
- Visual archetype: ${character.visualArchetype}
- Silhouette: ${character.silhouette}
- Wardrobe: ${character.wardrobe}
- Props: ${character.props}
- Mobile read: ${character.mobileRead}
- Art direction: ${character.artDirectionNotes}

Variation requirements:
- The 5 options must vary meaningfully in silhouette, posture, age impression, wardrobe cut, warmth, expression, and prop handling.
- All options must still fit the Tower style and the existing cast.
- Show enough spread for Armaan to choose the actual identity, not just a palette preference.

Negative prompt:
- ${character.negativeDNA}
- No celebrity likeness, actor likeness, named fictional character styling, logo, watermark, fake text, photoreal render, superhero costume, sci-fi armor, mascot proportions, or random unrelated props.

Output:
- One reviewable concept board containing exactly 5 labeled visual options.
- Keep this as draft/reference art only. Do not place any generated output in public/art.
`;
}

function buildOperatorMarkdown(packet: CharacterOperatorPacket): string {
  const files = Object.entries(packet.files)
    .map(([label, file]) => `- ${label}: \`${file}\``)
    .join("\n");

  return `# Tower Character Operator Packet

## Next Legal Action

- Character: ${packet.displayName} (${packet.characterId})
- Run id: ${packet.runId}
- Action: ${packet.nextAction.type}
- Status: ${packet.nextAction.status}
- Human gate: ${packet.nextAction.humanGate ?? "none"}
- Blocked until: ${packet.blockedUntil}

${packet.nextAction.summary}

## Files

${files}

## Allowed Commands

${packet.allowedCommands.map((command) => `- \`${command}\``).join("\n")}

## Forbidden Actions

${packet.forbiddenActions.map((action) => `- ${action}`).join("\n")}
`;
}

function getDefaultOperatorRunId(characterId: CharacterId): string {
  const date = new Date().toISOString().slice(0, 10);

  return `${date}-${characterId}-operator`;
}

function buildOperatorPacket(args: ParsedArgs, report: ArtPipelineStatusReport): CharacterOperatorPacket {
  const characterId = optionalStringFlag(args, "character")
    ? assertCharacterId(optionalStringFlag(args, "character")!)
    : report.nextRecommendedCharacter.characterId;
  const character = SEASON_ONE_CHARACTER_METADATA.find((entry) => entry.id === characterId);
  const runId = optionalStringFlag(args, "run-id") ?? getDefaultOperatorRunId(characterId);
  const outRoot = optionalStringFlag(args, "out-root") ?? ".artlab/operators";
  const operatorRoot = join(outRoot, characterId, runId);
  const runPath = optionalStringFlag(args, "run");
  const identityRef = optionalStringFlag(args, "identity-ref");
  const assetVersion = optionalStringFlag(args, "asset-version");
  const characterStatus = report.characters.find((entry) => entry.characterId === characterId);
  const files: CharacterOperatorPacket["files"] = {
    nextActionJson: join(operatorRoot, "next-action.json"),
    nextActionMarkdown: join(operatorRoot, "next-action.md"),
  };
  let nextAction: CharacterOperatorPacket["nextAction"];
  let blockedUntil: string;

  if (!character) {
    throw new Error(`Unknown Season 1 character id: ${characterId}`);
  }

  if (runPath) {
    files.runJson = runPath;
    nextAction = {
      type: "ingest-generated-sources",
      status: "blocked-on-generated-sources",
      summary: "Continue from the existing run ledger and ingest the next required generated sources.",
    };
    blockedUntil = "Generated source sheets exist and are ingested into the run ledger.";
  } else if (identityRef) {
    const run = createCharacterArtRunPlan({
      characterId,
      runId,
      approvedIdentityRef: identityRef,
      assetVersion,
    });

    files.runJson = getRunJsonPath(run);
    files.promptPacket = `${run.directories.prompts}/batch-prompt-packet.md`;
    nextAction = {
      type: "create-run-from-approved-identity",
      status: "ready-to-execute",
      humanGate: "initial-character-design",
      summary:
        characterStatus?.productionState === "fully-promoted"
          ? "Create a strict replacement run from the already approved identity reference."
          : "Create the strict batch run ledger and prompt packet from the approved identity reference.",
    };
    blockedUntil = "Run ledger and prompt packet are created, then generated sources are ingested.";
  } else if (characterStatus?.productionState === "fully-promoted") {
    nextAction = {
      type: "complete",
      status: "complete",
      summary: `${character.displayName} already has all ${expectedSpritesPerCharacter} approved production sprites.`,
    };
    blockedUntil = "No block; this character is already promoted.";
  } else {
    files.conceptPrompt = join(operatorRoot, "concept-board-prompt.md");
    nextAction = {
      type: "generate-concept-board",
      status: "blocked-on-human-choice",
      humanGate: "initial-character-design",
      summary: "Generate exactly 5 prompt-only initial design concepts before any production run exists.",
    };
    blockedUntil = "Armaan chooses one initial character design from the 5-option concept board.";
  }

  return {
    operatorVersion: "tower-character-operator-v1",
    generatedAt: new Date().toISOString(),
    strictMode: true,
    characterId,
    displayName: character.displayName,
    runId,
    approvedIdentityRef: identityRef,
    nextAction,
    blockedUntil,
    files,
    stateContract: {
      approvalGates: ["initial-character-design", "final-upload-ready-board"],
      productionPromotionPhrase: "approved for app",
      expectedOutfitVariants: CHARACTER_OUTFIT_VARIANTS,
      expectedPoses: CHARACTER_POSES,
      expectedSpritesPerCharacter,
    },
    allowedCommands: [
      "npm run art:produce",
      "npm run art:operate",
      "npm run art:status",
      "npm run art:generate",
      "npm run art:clean",
      "npm run art:plan",
      "npm run art:preflight",
      "npm run art:ingest",
      "npm run art:split",
      "npm run art:master",
      "npm run art:qa",
      "npm run art:review",
      "npm run art:promote",
    ],
    forbiddenActions: [
      "Do not copy generated files directly into public/art.",
      "Do not update the approved manifest without a promoted QA-passed run.",
      "Do not proceed past the initial design gate without Armaan choosing one concept.",
      "Do not run a full production pack before the canary gate passes.",
      "Do not run whole-pack warning retries.",
      "Do not promote without the exact phrase approved for app.",
      "Do not hide source-quality warnings.",
    ],
  };
}

async function writeOperatorPacket(packet: CharacterOperatorPacket): Promise<void> {
  await ensureParentDirectory(packet.files.nextActionJson);
  await writeFile(packet.files.nextActionJson, `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(packet.files.nextActionMarkdown, buildOperatorMarkdown(packet));

  if (packet.files.conceptPrompt) {
    await writeFile(packet.files.conceptPrompt, renderConceptBoardPrompt(packet.characterId));
  }

  if (
    packet.nextAction.type === "create-run-from-approved-identity" &&
    packet.files.runJson &&
    packet.files.promptPacket &&
    packet.approvedIdentityRef
  ) {
    const run = createCharacterArtRunPlan({
      characterId: packet.characterId,
      runId: packet.runId,
      approvedIdentityRef: packet.approvedIdentityRef,
    });

    await writeRun(packet.files.runJson, run);
    await ensureParentDirectory(packet.files.promptPacket);
    await writeFile(packet.files.promptPacket, renderCharacterArtRunPromptPacket(run));
  }
}

async function commandOperate(args: ParsedArgs): Promise<void> {
  const report = await buildArtPipelineStatusReport();
  const packet = buildOperatorPacket(args, report);
  const dryRun = args.flags.get("dry-run") === true;

  if (!dryRun) {
    await writeOperatorPacket(packet);
  }

  if (args.flags.get("json")) {
    console.log(JSON.stringify(packet, null, 2));
    return;
  }

  console.log(buildOperatorMarkdown(packet));
}

async function commandStatus(args: ParsedArgs): Promise<void> {
  const report = await buildArtPipelineStatusReport();

  if (args.flags.get("json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(renderArtPipelineStatus(report));
}

async function writeApprovedCharacterAssets(assets: VisualAsset[]): Promise<void> {
  await writeFile(GENERATED_MANIFEST_PATH, `${JSON.stringify(assets, null, 2)}\n`);
}

async function commandPromote(args: ParsedArgs): Promise<void> {
  const runPath = args.positional[0];
  const run = markCharacterArtRunFinalApproved(
    await readRun(runPath),
    requireFlag(args, "approval-phrase"),
  );
  const promoted = markCharacterArtRunPromoted(run);

  for (const sprite of promoted.expectedSprites) {
    for (const rendition of Object.values(sprite.stagedRenditions)) {
      const publicPath = join("public", relative(promoted.directories.stagedPublicRoot, rendition.src));

      await ensureParentDirectory(publicPath);
      await copyFile(rendition.src, publicPath);
    }
  }

  const existingAssets = await readApprovedCharacterAssets();
  const promotedAssets = buildApprovedCharacterVisualAssetsFromRun(promoted);
  const promotedIds = new Set(promotedAssets.map((asset) => asset.id));
  const mergedAssets = [
    ...existingAssets.filter((asset) => !promotedIds.has(asset.id)),
    ...promotedAssets,
  ];

  await writeApprovedCharacterAssets(mergedAssets);
  await writeRun(runPath, promoted);
  console.log(`Promoted ${promotedAssets.length} character sprites into public/art and manifest data.`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (
    args.command !== "plan" &&
    args.command !== "status" &&
    args.command !== "operate" &&
    !args.positional[0]
  ) {
    printUsage();
  }

  if (args.command === "plan") await commandPlan(args);
  if (args.command === "status") await commandStatus(args);
  if (args.command === "operate") await commandOperate(args);
  if (args.command === "clean") await commandClean(args);
  if (args.command === "preflight") await commandPreflight(args);
  if (args.command === "ingest") await commandIngest(args);
  if (args.command === "split") await commandSplit(args);
  if (args.command === "master" || args.command === "derive") await commandMasterOrDerive(args);
  if (args.command === "qa") await commandQa(args);
  if (args.command === "review") await commandReview(args);
  if (args.command === "promote") await commandPromote(args);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
