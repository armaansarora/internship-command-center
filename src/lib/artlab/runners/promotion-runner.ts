import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { readRunStateSnapshot, writeRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import { basename, join, resolve } from "node:path";
import {
  ArtLabPromotedPackManifestSchema,
  type ArtLabPromotedPackManifest,
} from "@/lib/artlab/sdk/asset-pack/promoted-manifest.schema";
import type { ArtLabAssetType } from "@/lib/artlab/types";
import type { ArtLabAssetKind } from "@/lib/artlab/sdk/mcp/tools";
import {
  evaluateCreativePromotionFirewall,
  promoteCreativeAssetsTransactionally,
  type CreativePromotionActionManifestSummary,
  type CreativePromotionStagedAsset,
} from "@/lib/artlab/promotion/promotion";
import { REQUIRED_PROMOTION_PHRASE } from "@/lib/artlab/promotion/constants";
import { appendStyleWin } from "@/lib/artlab/memory/style-ledger";
import { autoCommitPromotion } from "@/lib/artlab/daemon/git-commit";
import { displayFor } from "@/lib/artlab/intake/known-cast";
import { loadTowerContext, pickCharacterContext } from "@/lib/artlab/context/tower-context";
import { resolveCanonIdentity } from "@/lib/artlab/sdk/canon/canon-identity-map";
import { recordDaemonError } from "@/lib/artlab/daemon/entry";
import { buildArtLabBrain } from "@/lib/artlab/orchestrator/build-brain";
import type { ArtLabLlmBrain } from "@/lib/artlab/orchestrator/llm-brain";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

async function composeAndPersistPromotionCelebration(input: {
  workspaceRoot: string;
  runDir: string;
  characterId: string;
  assetCount: number;
  spendCents: number;
  capCents: number;
}): Promise<void> {
  const bundle = await loadTowerContext({ workspaceRoot: input.workspaceRoot });
  const ctx = pickCharacterContext(bundle, input.characterId);
  if (!ctx) return;
  const brain = buildBrainForPromotion(input.workspaceRoot);
  const result = await brain.decide({
    kind: "compose-promotion-celebration",
    input: {
      characterContext: {
        characterId: ctx.characterId,
        displayName: ctx.displayName,
        title: ctx.title,
        space: ctx.space,
        accent: ctx.accent,
        visualArchetype: ctx.visualArchetype,
      },
      runId: input.runDir.split("/").pop()?.slice(0, 8) ?? "",
      assetCount: input.assetCount,
      liveUrl: `https://www.interntower.com/${ctx.space}`,
      spendCents: input.spendCents,
      capCents: input.capCents,
      castContinuity: Object.values(bundle.characters)
        .filter((c) => c.characterId !== ctx.characterId)
        .slice(0, 6)
        .map((c) => ({ characterId: c.characterId, displayName: c.displayName, accent: c.accent, space: c.space })),
    },
  });
  const text = (result.outputJson as { text?: unknown }).text;
  if (typeof text === "string" && text.length > 0) {
    writeFileSync(join(input.runDir, "promotion-celebration.json"), JSON.stringify({ text }, null, 2));
  }
}

function buildBrainForPromotion(workspaceRoot: string): ArtLabLlmBrain {
  // FREE-first brain selection (Gemini default; Claude opt-in) — see build-brain.ts.
  return buildArtLabBrain({ workspaceRoot });
}

// Promotion-firewall phrase — kept as a local alias for readability; sourced
// from the single canonical constant so it can never drift from the value
// the firewall actually checks.
const REQUIRED_PHRASE = REQUIRED_PROMOTION_PHRASE;
const DEFAULT_CAP_CENTS = 350;

function readSpendFromRunState(runDir: string): { actualCents: number; capCents: number } {
  // run-state.json (when populated by the spend ledger) carries:
  //   spend: { actualCents, perRunCapCents?, monthlyCeilingCents? }
  // Promotion-celebration prefers per-run cap; falls back to monthly ceiling
  // and finally a sensible default so the message is never blank.
  try {
    const state = readRunStateSnapshot(runDir) as
      | (Awaited<ReturnType<typeof readRunStateSnapshot>> & {
          spend?: { actualCents?: number; perRunCapCents?: number; monthlyCeilingCents?: number };
        })
      | null;
    const spend = state?.spend;
    if (spend) {
      const actual = typeof spend.actualCents === "number" ? spend.actualCents : 0;
      const cap = typeof spend.perRunCapCents === "number"
        ? spend.perRunCapCents
        : (typeof spend.monthlyCeilingCents === "number" ? spend.monthlyCeilingCents : DEFAULT_CAP_CENTS);
      return { actualCents: actual, capCents: cap };
    }
  } catch { /* fall through */ }
  return { actualCents: 0, capCents: DEFAULT_CAP_CENTS };
}

function publicArtRoot(): string {
  if (process.env.ARTLAB_PUBLIC_ART_ROOT) return process.env.ARTLAB_PUBLIC_ART_ROOT;
  // Derive from the project root (consistent with promotedPacksRoot) instead
  // of a single contributor's absolute home path. Final fallback is the
  // running repo's public/art — at worst this writes under the current
  // checkout rather than a machine-specific Documents folder.
  if (process.env.ARTLAB_PROJECT_ROOT) {
    return join(process.env.ARTLAB_PROJECT_ROOT, "public", "art");
  }
  return join(process.cwd(), "public", "art");
}

/**
 * Resolve the directory under which we write `<packId>/manifest.json` so
 * the MCP `asset_pack_list` + `asset_pack_get` handlers can discover
 * promoted packs. Honours the explicit env override (used by tests + ops
 * runbooks); otherwise derives from `ARTLAB_PROJECT_ROOT`. Returns null
 * when neither env is set — promotion still completes, but the SDK
 * manifest write is skipped with telemetry. We intentionally do NOT
 * fall back to `process.cwd()` because the daemon's cwd in launchd is
 * unrelated to the repo, and silently writing under cwd would leak
 * `.artlab/engine/promoted/` directories into whoever's home dir
 * launchd happens to drop us in.
 */
function promotedPacksRoot(): string | null {
  if (process.env.ARTLAB_PROMOTED_PACKS_ROOT) {
    return process.env.ARTLAB_PROMOTED_PACKS_ROOT;
  }
  if (process.env.ARTLAB_PROJECT_ROOT) {
    return join(process.env.ARTLAB_PROJECT_ROOT, ".artlab", "engine", "promoted");
  }
  return null;
}

/**
 * Map runner-side asset types to MCP-side asset kinds. The runner uses a
 * production-shop taxonomy (character/environment/prop/ui-texture/animation/
 * scene/icon-system/marketing-hero/shader) — the MCP enum is a slimmer
 * agent-facing surface (character/floor/ui-texture/icon/sprite-animation/
 * lottie). Map deterministically so the same runner output always lands
 * on the same MCP kind.
 *
 * Returns null for runner types we don't yet ship an MCP kind for —
 * promotion still completes, but the SDK manifest is skipped so an
 * invalid `kind` cannot poison the MCP enum.
 */
function mapAssetTypeToMcpKind(assetType: ArtLabAssetType): ArtLabAssetKind | null {
  switch (assetType) {
    case "character":
      return "character";
    case "environment":
    case "scene":
      return "floor";
    case "ui-texture":
      return "ui-texture";
    case "icon-system":
      return "icon";
    case "animation":
      return "sprite-animation";
    case "prop":
    case "marketing-hero":
    case "shader":
      // Not yet mapped to an MCP kind — the strict enum has no slot for
      // these. Skip the SDK manifest rather than fabricating a wrong kind.
      return null;
  }
}

function sha256OfFileBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Atomic JSON write — write to `<path>.tmp`, then rename. POSIX rename is
 * atomic on the same filesystem, so a concurrent reader either sees the
 * old file or the new one but never a torn JSON document.
 */
function writeJsonAtomicSync(absPath: string, payload: unknown): void {
  const tmp = `${absPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
  renameSync(tmp, absPath);
}

/**
 * Hardlink `src` → `dest` for zero-copy promotion; fall back to copyFile
 * when crossing filesystems (e.g., `/tmp` to repo root in CI). Either way,
 * the bytes under `dest` are byte-identical to `src`.
 */
function hardlinkOrCopy(src: string, dest: string): void {
  try {
    if (existsSync(dest)) unlinkSync(dest);
    linkSync(src, dest);
  } catch {
    copyFileSync(src, dest);
  }
}

interface WrittenPackFile {
  /** Path under packDir (relative POSIX form) — what the manifest stores. */
  relPath: string;
  /** sha256 of the bytes we wrote. */
  sha256: string;
  /** Bytes on disk after write. */
  bytes: number;
}

/**
 * Materialise an SDK Asset Pack at `<promotedPacksRoot>/<packId>/`.
 *
 * Layout:
 *   <packId>/
 *     manifest.json     ← ArtLabPromotedPackManifestSchema-validated
 *     payload/<basename>… ← byte-identical to the public/art targets
 *
 * The manifest's `files[*].path` is `payload/<basename>` so asset-pack-get
 * (which resolves against packDir) finds the bytes without leaking absolute
 * paths into the on-disk manifest.
 */
function writeSdkAssetPack(args: {
  packId: string;
  kind: ArtLabAssetKind;
  slotId: string;
  promotedAt: string;
  characterId?: string;
  space?: string;
  publicPath: string;
  promotedAbsPaths: readonly string[];
  sourceRunId: string;
}): { packDir: string; manifest: ArtLabPromotedPackManifest } | null {
  const packsRoot = promotedPacksRoot();
  if (packsRoot === null) {
    return null;
  }
  const packDir = join(packsRoot, args.packId);
  const payloadDir = join(packDir, "payload");
  mkdirSync(payloadDir, { recursive: true });

  const written: WrittenPackFile[] = [];
  for (const abs of args.promotedAbsPaths) {
    if (!existsSync(abs)) continue;
    const fileName = basename(abs);
    const destAbs = join(payloadDir, fileName);
    hardlinkOrCopy(abs, destAbs);
    const bytes = readFileSync(destAbs);
    written.push({
      relPath: `payload/${fileName}`,
      sha256: sha256OfFileBytes(bytes),
      bytes: bytes.length,
    });
  }

  if (written.length === 0) {
    throw new Error(
      `promotion-runner: refusing to write SDK Asset Pack for "${args.packId}" — no promoted files materialised on disk`,
    );
  }

  const manifestObj = {
    packId: args.packId,
    kind: args.kind,
    slotId: args.slotId,
    promotedAt: args.promotedAt,
    ...(args.characterId ? { characterId: args.characterId } : {}),
    ...(args.space ? { space: args.space } : {}),
    publicPath: args.publicPath,
    files: written.map((w) => ({
      path: w.relPath,
      role: w === written[0] ? "primary" : "secondary",
      sha256: w.sha256,
      bytes: w.bytes,
    })),
    sourceRunId: args.sourceRunId,
  };

  const validated = ArtLabPromotedPackManifestSchema.safeParse(manifestObj);
  if (!validated.success) {
    throw new Error(
      `promotion-runner: ArtLabPromotedPackManifestSchema validation failed for "${args.packId}": ${validated.error.message}`,
    );
  }

  const manifestPath = join(packDir, "manifest.json");
  writeJsonAtomicSync(manifestPath, validated.data);
  return { packDir, manifest: validated.data };
}

function targetRelativeDir(input: ArtLabRunnerInput): string {
  if (input.assetType === "character" && input.characterId) {
    // Resolve canon to land assets in their canonical floor — e.g. Sol's
    // sprite goes to `public/art/rolodex-lounge/sol-navarro/`, NOT
    // `public/art/lobby/cno/`. The hardcoded "lobby" fallback predates
    // canon and was the root cause of the `ls public/art/lobby/` returning
    // `cno otis` symptom called out by 4 auditors.
    // Surface canon load failures (malformed YAML, missing dir) into
    // daemon-errors.jsonl alongside the canon-not-found fallback so silent
    // YAML drift can't reach this critical promotion path without operator
    // visibility.
    const workspaceRootForTelemetry = process.env.ARTLAB_WORKSPACE_ROOT;
    const canon = resolveCanonIdentity(input.characterId, {
      onError: workspaceRootForTelemetry
        ? (err, file) =>
            recordDaemonError(
              workspaceRootForTelemetry,
              "canon-identity-load-degraded",
              new Error(`canon-identity ${file}: ${err.message}`),
            )
        : undefined,
    });
    if (canon) {
      return join(canon.floorId, canon.headerId);
    }
    // Canon unreachable — record so we can debug the canon-load failure
    // and fall back to the legacy `lobby/<id>` shape so the run still
    // promotes rather than crashing on the missing dir.
    try {
      if (workspaceRootForTelemetry) {
        recordDaemonError(
          workspaceRootForTelemetry,
          "promotion-runner:canon-fallback",
          new Error(`canon identity not found for characterId="${input.characterId}" — promotion falling back to lobby/`),
        );
      }
    } catch {
      // recordDaemonError must never break promotion — at this point we
      // already have approved assets staged and the user is waiting on
      // the receipt.
    }
    return join("lobby", input.characterId);
  }
  if (input.assetType === "environment") return join("backgrounds", input.runId);
  if (input.assetType === "ui-texture") return join("ui", input.runId);
  if (input.assetType === "animation") return join("animations", input.runId);
  return join("misc", input.runId);
}

function manifestPath(input: ArtLabRunnerInput): string {
  const root = publicArtRoot();
  if (input.assetType === "character") {
    return join(root, "..", "..", "src", "lib", "visual-assets", "approved-character-assets.generated.json");
  }
  return join(root, "..", "production-manifests", `${input.assetType}.json`);
}

function loadActionManifest(runDir: string, fileName: string): CreativePromotionActionManifestSummary {
  const path = join(runDir, "boards", fileName);
  if (!existsSync(path)) {
    return { exists: false, promotesOnAction: false, localImagePaths: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      promotesOnAction?: boolean;
      localImagePaths?: string[];
    };
    return {
      exists: true,
      promotesOnAction: parsed.promotesOnAction === true,
      localImagePaths: Array.isArray(parsed.localImagePaths) ? parsed.localImagePaths : [],
    };
  } catch {
    return { exists: false, promotesOnAction: false, localImagePaths: [] };
  }
}

function loadStrictQaPassed(runDir: string): boolean {
  const repair = join(runDir, "repair-plan.json");
  if (!existsSync(repair)) return false;
  try {
    const parsed = JSON.parse(readFileSync(repair, "utf8")) as { repairs?: unknown[] };
    return Array.isArray(parsed.repairs) && parsed.repairs.length === 0;
  } catch {
    return false;
  }
}

function loadApprovalPhrase(runDir: string): string {
  const approval = join(runDir, "approval.json");
  if (!existsSync(approval)) return "";
  try {
    const parsed = JSON.parse(readFileSync(approval, "utf8")) as { phrase?: string };
    return typeof parsed.phrase === "string" ? parsed.phrase.trim() : "";
  } catch {
    return "";
  }
}

function buildStagedAssets(runDir: string, targetDir: string): CreativePromotionStagedAsset[] {
  const cutouts = join(runDir, "cutouts");
  if (!existsSync(cutouts)) return [];
  return readdirSync(cutouts)
    .filter((file) => /\.(png|webp|jpe?g)$/i.test(file))
    .sort()
    .map((file, idx) => ({
      slotId: `slot-${idx + 1}`,
      sourcePath: join(cutouts, file),
      targetRelativePath: join(targetDir, file),
    }));
}

export const promotionRunner: ArtLabRunner = {
  kind: "promotion",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const phrase = loadApprovalPhrase(input.runDir);
    const strictQaPassed = loadStrictQaPassed(input.runDir);
    const finalBoard = loadActionManifest(input.runDir, "final-board.json");
    const appPreview = loadActionManifest(input.runDir, "app-preview.json");
    const targetDir = targetRelativeDir(input);
    const stagedAssets = buildStagedAssets(input.runDir, targetDir);

    const firewall = evaluateCreativePromotionFirewall({
      runId: input.runId,
      currentPhase: "promoting",
      approvalPhrase: phrase === REQUIRED_PHRASE ? REQUIRED_PHRASE : phrase,
      publicArtWritesAllowed: phrase === REQUIRED_PHRASE && strictQaPassed,
      strictQaPassed,
      finalBoardActionManifest: finalBoard,
      appPreviewActionManifest: appPreview,
      stagedAssets,
    });

    if (!firewall.allowed) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { firewallBlockers: firewall.blockers },
        blockerHint: "repair-required",
        failureCode: `firewall:${firewall.blockers.join(",")}`,
      };
    }

    const result = await promoteCreativeAssetsTransactionally({
      runId: input.runId,
      currentPhase: "promoting",
      approvalPhrase: REQUIRED_PHRASE,
      publicArtWritesAllowed: true,
      strictQaPassed: true,
      finalBoardActionManifest: finalBoard,
      appPreviewActionManifest: appPreview,
      stagedAssets,
      publicArtRoot: publicArtRoot(),
      manifestPath: manifestPath(input),
      receiptPath: join(input.runDir, "promotion-receipt.json"),
    });

    // Critical Finding 2 — write `promotedPackId` onto run-state.json so the
    // ArtLab `generate_status` MCP handler returns a non-undefined value
    // when callers poll for status=promoted. The packId is derived
    // deterministically from assetType + the first 8 hex chars of the runId
    // so the same run always resolves to the same packId across replays
    // (and operators can grep logs for it).
    //
    // Best-effort: a write failure here must NOT roll back the actual
    // promotion (cutouts have already been copied + manifests written).
    // We surface the failure via daemon-errors.jsonl indirectly when the
    // worker re-reads run-state and sees the missing field.
    const promotedPackId = derivePromotedPackId(input.assetType, input.runId);

    // Unit 6 — materialise the SDK Asset Pack under .artlab/engine/promoted/
    // BEFORE we stamp run-state with `promotedPackId`. Order matters: the
    // MCP `generate_status` handler reads run-state and then `asset_pack_get`
    // reads the manifest; if we wrote run-state first and the manifest write
    // crashed, a caller could observe `phase=promoted, promotedPackId=…`
    // pointing at a missing pack. Failing here BEFORE the run-state write
    // keeps `promotedPackId` absent, which is the well-understood
    // "promotion didn't finish recording" signal.
    const mcpKind = mapAssetTypeToMcpKind(input.assetType);
    let sdkManifestFailed = false;
    if (mcpKind !== null) {
      try {
        const primaryAbs = result.promotedPaths[0];
        const publicPath = primaryAbs
          ? `/art/${primaryAbs.split("public/art/").pop()?.replaceAll("\\", "/") ?? primaryAbs}`
          : `/art/${stagedAssets[0]?.targetRelativePath.replaceAll("\\", "/") ?? ""}`;
        const slotId = input.characterId
          ? `${input.characterId}.${mcpKind === "character" ? "idle" : mcpKind}`
          : `${input.assetType}.${input.runId.slice(0, 8)}`;
        const space = (() => {
          if (input.assetType !== "character" || !input.characterId) return undefined;
          const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT;
          const canon = resolveCanonIdentity(input.characterId, {
            onError: workspaceRoot
              ? (err, file) =>
                  recordDaemonError(
                    workspaceRoot,
                    "canon-identity-load-degraded",
                    new Error(`canon-identity ${file}: ${err.message}`),
                  )
              : undefined,
          });
          return canon?.floorId;
        })();
        // writeSdkAssetPack returns null when no packsRoot env is configured
        // — that's a deployment state, not a failure, so we don't flip
        // sdkManifestFailed in that branch.
        writeSdkAssetPack({
          packId: promotedPackId,
          kind: mcpKind,
          slotId,
          promotedAt: result.receipt.promotedAt,
          characterId: input.characterId,
          space,
          publicPath,
          promotedAbsPaths: result.promotedPaths,
          sourceRunId: input.runId,
        });
      } catch (err) {
        sdkManifestFailed = true;
        // SDK manifest write failed — record + return without stamping
        // run-state. The public/art files are already in place, so the
        // visible site still shows the new asset; only the SDK discovery
        // path is degraded until an operator re-runs promotion.
        try {
          const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT;
          if (workspaceRoot) {
            recordDaemonError(
              workspaceRoot,
              "promotion-runner:sdk-manifest-write-failed",
              err instanceof Error ? err : new Error(String(err)),
            );
          }
        } catch { /* telemetry must never break promotion */ }
      }
    }

    if (!sdkManifestFailed) {
      try {
        const current = readRunStateSnapshot(input.runDir);
        if (current) {
          writeRunStateSnapshot(input.runDir, {
            ...current,
            promotedPackId,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch { /* never let a state-snapshot rewrite fail a promotion */ }
    }

    if (input.assetType === "character" && input.characterId) {
      const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT;
      if (workspaceRoot) {
        const memoryDir = join(workspaceRoot, "memory");
        if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
        try {
          appendStyleWin(memoryDir, {
            characterId: input.characterId,
            promotedAt: result.receipt.promotedAt,
            winningTechniques: ["artlab-pipeline"],
            promptHash: `run:${input.runId}`,
            totalCostCents: 0,
            // Unit 4 — `memory-scope.ts` filters wins by `source` so the
            // per-agent brain only sees feedback from its own kind. Without
            // this field, every promotion win was invisible to scoped brain
            // calls and only character-master + character/floor/etc.-targeted
            // memory reads showed promotion data.
            source: "artlab-promotion",
          });
        } catch { /* memory write failure must not break promotion */ }

        // Brain-authored promotion celebration — phase-notifier picks this
        // up and renders it when state hits closed. Best-effort.
        // Read real spend from run-state.json so the celebration says the
        // actual cost instead of a placeholder $0.00.
        const realSpend = readSpendFromRunState(input.runDir);
        try {
          await composeAndPersistPromotionCelebration({
            workspaceRoot,
            runDir: input.runDir,
            characterId: input.characterId,
            assetCount: result.promotedPaths.length,
            spendCents: realSpend.actualCents,
            capCents: realSpend.capCents,
          });
        } catch { /* non-fatal */ }
      }
    }

    // Auto-commit + push so the user's "Live now" link actually resolves to
    // the new asset after Vercel deploys. Path-scoped staging is enforced
    // inside autoCommitPromotion — the daemon can ONLY stage files under
    // public/art/ or the generated manifest JSON.
    const projectRoot = process.env.ARTLAB_PROJECT_ROOT;
    let gitResult: ReturnType<typeof autoCommitPromotion> | null = null;
    if (projectRoot && process.env.ARTLAB_AUTO_COMMIT !== "off") {
      const promotedAbs = result.promotedPaths.map((p) => resolve(p));
      const manifestAbs = resolve(manifestPath(input));
      try {
        // Unit 6 — auto-push is now OPT-IN inside autoCommitPromotion (gated
        // on ARTLAB_AUTO_PUSH=on). We no longer pass `skipPush` from the
        // runner so the env-derived default takes effect; without that the
        // legacy `=== "off"` check would silently bypass the new gate.
        gitResult = autoCommitPromotion({
          projectRoot,
          runId: input.runId,
          displayName: input.characterId ? displayFor(input.characterId).displayName : undefined,
          promotedPaths: promotedAbs,
          manifestPath: manifestAbs,
        });
        writeFileSync(
          join(input.runDir, "git-commit-result.json"),
          JSON.stringify(gitResult, null, 2),
        );
      } catch (err) {
        // Auto-commit failures must not break promotion — record + continue.
        try {
          writeFileSync(
            join(input.runDir, "git-commit-result.json"),
            JSON.stringify({
              status: "failed",
              reason: err instanceof Error ? err.message : String(err),
              stagedPaths: [],
            }, null, 2),
          );
        } catch { /* ignore */ }
      }
    }

    return {
      runnerKind: "promotion",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: {
        promotedPaths: result.promotedPaths,
        receipt: result.receipt,
        gitResult,
        // Surface the same packId that landed on run-state.json so
        // downstream observers (phase-notifier, status MCP) don't have to
        // re-derive it from the runId.
        promotedPackId,
        // Promote-time push status flag — phase-notifier reads this to warn
        // the user when commit succeeded but push failed (so "Live now" link
        // won't actually deploy until manual push).
        pushFailed: pushFailed(gitResult),
        pushFailureReason: pushFailureReason(gitResult),
      },
    };
  },
};

/**
 * Deterministic packId derivation. The 8-char runId prefix is enough to
 * disambiguate runs in human-facing surfaces while staying short enough to
 * read. Keep this stable — both run-state.json and the runner's `artifacts`
 * payload depend on the same value.
 */
export function derivePromotedPackId(assetType: string, runId: string): string {
  return `${assetType}-${runId.slice(0, 8)}`;
}

function pushFailed(gitResult: ReturnType<typeof autoCommitPromotion> | null): boolean {
  if (!gitResult) return false;
  if (gitResult.status === "committed" && !gitResult.pushedTo) return true;
  if (gitResult.status === "failed") return true;
  return false;
}

function pushFailureReason(gitResult: ReturnType<typeof autoCommitPromotion> | null): string | undefined {
  if (!gitResult) return undefined;
  if (gitResult.status === "committed" && !gitResult.pushedTo) return gitResult.reason ?? "push failed";
  if (gitResult.status === "failed") return gitResult.reason ?? "commit failed";
  return undefined;
}
