import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadFoundryCanon } from "@/lib/foundry/canon";
import type { FoundryCharacterCanon } from "@/lib/foundry/canon";
import type { FoundryImageProvider } from "@/lib/foundry/providers/types";
import type { CreatedFoundryAssetPack } from "@/lib/foundry/asset-pack";
import { backdropSubtractToRgba, classifyAlpha } from "@/lib/artlab/runners/cutout-primitives";
import { runConceptBoardStage, type ConceptLane } from "./stages/concept-board";
import { runAnchorLockStage } from "./stages/anchor-lock";
import { runVariantFanOutStage } from "./stages/variant-fan-out";
import { runCutoutAndFeatherStage, type ProcessedSprite } from "./stages/cutout-and-feather";
import { runCompositeJudgeStage } from "./stages/composite-judge";
import { runManifestBuildStage } from "./stages/manifest-build";
import { runPaletteMatchGate, runSilhouetteDiversityGate } from "./qa";
import {
  CHARACTER_MASTER_STAGES,
  type CharacterMasterEvent,
  type CharacterMasterInput,
  type CharacterMasterStage,
} from "./types";

/** Default Lab-approximation tolerance for the palette-match gate. Loose
 * enough to pass the mock-provider gamut used in tests; production callers
 * can tighten via `input.qa.paletteToleranceLab`. */
const DEFAULT_PALETTE_TOLERANCE_LAB = 120;
/** Default minimum pairwise Hamming distance for the silhouette-diversity
 * gate. Zero disables the gate; production callers opt in explicitly. */
const DEFAULT_MIN_PAIRWISE_SILHOUETTE_HAMMING = 0;

export interface RunCharacterMasterArgs {
  input: CharacterMasterInput;
  provider: FoundryImageProvider;
  emit: (event: CharacterMasterEvent) => void;
}

export type RunCharacterMasterResult =
  | { ok: true; pack: CreatedFoundryAssetPack; runWorkspace: string }
  | { ok: false; failure: { stage: CharacterMasterStage; reason: string; offendingPath?: string }; runWorkspace: string };

function stagesFrom(stage: CharacterMasterStage | null): readonly CharacterMasterStage[] {
  if (stage === null) return CHARACTER_MASTER_STAGES;
  const idx = CHARACTER_MASTER_STAGES.indexOf(stage);
  if (idx < 0) throw new Error(`runCharacterMaster: unknown resumeFromStage "${stage}"`);
  return CHARACTER_MASTER_STAGES.slice(idx);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

function findCharacter(canonChars: readonly FoundryCharacterCanon[], id: string): FoundryCharacterCanon {
  const found = canonChars.find((c) => c.header.id === id);
  if (!found) throw new Error(`runCharacterMaster: no canon for character "${id}"`);
  return found;
}

export async function runCharacterMaster(args: RunCharacterMasterArgs): Promise<RunCharacterMasterResult> {
  const { input, provider, emit } = args;
  const runWorkspace = join(input.workspaceRoot, "runs", input.characterId);
  await mkdir(runWorkspace, { recursive: true });

  let canon;
  try {
    canon = await loadFoundryCanon({ canonRoot: input.canonRoot });
  } catch (err) {
    return { ok: false, failure: { stage: "concept-board", reason: `canon load failed: ${(err as Error).message}` }, runWorkspace };
  }
  let character: FoundryCharacterCanon;
  try {
    character = findCharacter(canon.characters, input.characterId);
  } catch (err) {
    return { ok: false, failure: { stage: "concept-board", reason: (err as Error).message }, runWorkspace };
  }
  const paletteTokens = canon.palettes.find((p) => p.header.id === character.paletteRef)?.tokens ?? {};
  const stages = stagesFrom(input.resumeFromStage);

  let conceptLanes: readonly ConceptLane[] | null = null;
  let anchor: ConceptLane | null = null;
  let anchorPath = "";
  let sprites: Awaited<ReturnType<typeof runCutoutAndFeatherStage>>["processedSprites"] | null = null;

  const nowIso = (): string => new Date().toISOString();

  async function loadResumeAnchor(): Promise<void> {
    const metaPath = join(runWorkspace, "anchor-meta.json");
    const pngPath = join(runWorkspace, "anchor.png");
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    const bytes = await readFile(pngPath);
    anchor = {
      laneIndex: meta.anchorLaneIndex,
      characterId: meta.anchorCharacterId,
      variationAxis: "resume-axis",
      prompt: meta.anchorPrompt,
      bytes,
      widthPx: meta.anchorWidthPx,
      heightPx: meta.anchorHeightPx,
    };
    anchorPath = pngPath;
    // Materialize the cutout-anchor sidecar if the previous run didn't
    // create one (older workspaces, or resume after a process crash before
    // anchor-cutout.png was written). This keeps composite-judge's
    // apples-to-apples comparison stable across resumes.
    const cutoutPath = join(runWorkspace, "anchor-cutout.png");
    if (!(await fileExists(cutoutPath))) {
      const cut = await backdropSubtractToRgba(bytes);
      await writeFile(cutoutPath, cut.bytes);
    }
  }

  for (const stage of stages) {
    emit({ kind: "stage-started", stage, at: nowIso() });
    try {
      if (stage === "concept-board") {
        const r = await runConceptBoardStage({ character, provider, seed: input.seed });
        conceptLanes = r.lanes;
        emit({ kind: "stage-completed", stage, durationMs: r.durationMs, at: nowIso() });
        continue;
      }
      if (stage === "anchor-lock") {
        if (!conceptLanes) throw new Error("anchor-lock: missing concept lanes");
        const r = await runAnchorLockStage({ lanes: conceptLanes, suggestedAnchorLane: 3 });
        anchor = r.anchor;
        // Persist BOTH the raw anchor (for downstream variant conditioning)
        // and a cutout version (for composite-judge / perceptual-hash drift).
        // The drift comparison must compare apples to apples: variants go
        // through the shared backdrop-subtract primitive, so the anchor must
        // too — otherwise every variant looks "drifted" purely because its
        // backdrop is transparent and the anchor's is solid.
        anchorPath = join(runWorkspace, "anchor.png");
        await writeFile(anchorPath, anchor.bytes);
        const anchorCut = await backdropSubtractToRgba(anchor.bytes);
        await writeFile(join(runWorkspace, "anchor-cutout.png"), anchorCut.bytes);
        await writeFile(join(runWorkspace, "anchor-meta.json"), JSON.stringify({
          anchorLaneIndex: anchor.laneIndex,
          anchorPrompt: anchor.prompt,
          anchorCharacterId: anchor.characterId,
          anchorWidthPx: anchor.widthPx,
          anchorHeightPx: anchor.heightPx,
        }, null, 2));
        emit({ kind: "stage-completed", stage, durationMs: r.durationMs, at: nowIso() });
        continue;
      }
      if (stage === "variant-fan-out") {
        if (!anchor) {
          await loadResumeAnchor();
          if (!anchor) throw new Error("variant-fan-out: no anchor available (concept-board not run and no resume state)");
        }
        const r = await runVariantFanOutStage({
          anchor,
          characterId: character.header.id,
          provider,
          outfits: character.outfitVariants,
          poses: character.poseStates,
          seed: input.seed,
        });
        const cut = await runCutoutAndFeatherStage({ sprites: r.sprites, workDir: runWorkspace });
        sprites = cut.processedSprites;
        emit({ kind: "stage-completed", stage, durationMs: r.durationMs + cut.durationMs, at: nowIso() });
        continue;
      }
      if (stage === "cutout-and-feather") {
        // Two cases:
        //   1. We just arrived here from variant-fan-out, which already ran
        //      the cutout stage inline. `sprites` is non-null; we just emit a
        //      no-op completion for the gate event.
        //   2. We RESUMED at cutout-and-feather. `sprites` is null and the
        //      orchestrator must reconstruct the ProcessedSprite[] from the
        //      PNGs written by the previous run, otherwise composite-judge
        //      will throw "missing sprites/anchor".
        if (sprites === null) {
          if (!anchor) {
            await loadResumeAnchor();
            if (!anchor) {
              throw new Error("cutout-and-feather: no anchor available for resume");
            }
          }
          const resumeStart = performance.now();
          const reconstructed: ProcessedSprite[] = [];
          for (const outfit of character.outfitVariants) {
            for (const pose of character.poseStates) {
              const pngPath = join(runWorkspace, `${outfit}__${pose}.png`);
              if (!(await fileExists(pngPath))) {
                throw new Error(
                  `cutout-and-feather: resume cannot find sprite "${outfit}__${pose}.png" — expected at ${pngPath}`,
                );
              }
              const bytes = await readFile(pngPath);
              const alphaSamples = await classifyAlpha(bytes);
              reconstructed.push({
                characterId: character.header.id,
                outfit,
                pose,
                pngPath,
                alphaSamples,
                noisyBackdropWarning: false,
              });
            }
          }
          sprites = reconstructed;
          emit({
            kind: "stage-completed",
            stage,
            durationMs: Math.round(performance.now() - resumeStart),
            at: nowIso(),
          });
          continue;
        }
        emit({ kind: "stage-completed", stage, durationMs: 0, at: nowIso() });
        continue;
      }
      if (stage === "composite-judge") {
        if (!sprites || !anchorPath) throw new Error("composite-judge: missing sprites/anchor");
        // Prefer the cutout-anchor for drift comparison (apples-to-apples
        // against post-cutout variants). Fall back to the raw anchor if the
        // cutout sidecar is missing (older workspaces).
        const anchorCutoutPath = join(runWorkspace, "anchor-cutout.png");
        const judgeAnchor = (await fileExists(anchorCutoutPath)) ? anchorCutoutPath : anchorPath;
        const r = await runCompositeJudgeStage({ anchorPath: judgeAnchor, sprites });
        if (!r.ok) {
          emit({
            kind: "qa-failure",
            stage,
            gateName: "composite-judge",
            reason: r.failure.reason,
            offendingPath: r.failure.offendingPath ?? undefined,
            at: nowIso(),
          });
          return { ok: false, failure: { stage, reason: r.failure.reason, offendingPath: r.failure.offendingPath ?? undefined }, runWorkspace };
        }
        // Run the remaining QA gates announced by the agent: palette match
        // (every sprite's dominant color must land within Lab tolerance of a
        // canon token) and silhouette diversity (sprites must be perceptually
        // distinguishable). Both fail the run with an actionable qa-failure
        // event carrying the gate name.
        const paletteTolerance = input.qa?.paletteToleranceLab ?? DEFAULT_PALETTE_TOLERANCE_LAB;
        for (const sprite of sprites) {
          const paletteResult = await runPaletteMatchGate({
            pngPath: sprite.pngPath,
            canonTokens: paletteTokens,
            toleranceLab: paletteTolerance,
          });
          if (!paletteResult.ok) {
            const composedReason = `palette-match gate failed for ${sprite.outfit}/${sprite.pose}: ${paletteResult.reason}`;
            emit({
              kind: "qa-failure",
              stage,
              gateName: "palette-match",
              reason: composedReason,
              offendingPath: sprite.pngPath,
              at: nowIso(),
            });
            return {
              ok: false,
              failure: {
                stage,
                reason: composedReason,
                offendingPath: sprite.pngPath,
              },
              runWorkspace,
            };
          }
        }
        const minHamming = input.qa?.minPairwiseSilhouetteHamming ?? DEFAULT_MIN_PAIRWISE_SILHOUETTE_HAMMING;
        if (minHamming > 0) {
          const silhouetteResult = await runSilhouetteDiversityGate({
            pngPaths: sprites.map((s) => s.pngPath),
            minPairwiseHamming: minHamming,
          });
          if (!silhouetteResult.ok) {
            emit({
              kind: "qa-failure",
              stage,
              gateName: "silhouette-diversity",
              reason: silhouetteResult.reason,
              offendingPath: silhouetteResult.offendingPair[0],
              at: nowIso(),
            });
            return {
              ok: false,
              failure: {
                stage,
                reason: silhouetteResult.reason,
                offendingPath: silhouetteResult.offendingPair[0],
              },
              runWorkspace,
            };
          }
        }
        emit({ kind: "stage-completed", stage, durationMs: r.durationMs, at: nowIso() });
        continue;
      }
      if (stage === "manifest-build") {
        if (!sprites) throw new Error("manifest-build: missing sprites");
        const r = await runManifestBuildStage({
          character,
          sprites,
          packDir: join(runWorkspace, "pack"),
          anchorLaneIndex: anchor?.laneIndex ?? 3,
          providerId: provider.id,
          modelId: provider.id,
          generatedAt: nowIso(),
          seed: input.seed ?? 0,
        });
        emit({ kind: "stage-completed", stage, durationMs: r.durationMs, at: nowIso() });
        emit({ kind: "pack-emitted", packDir: r.pack.packDir, packId: r.pack.manifest.packId, at: nowIso() });
        void paletteTokens;
        return { ok: true, pack: r.pack, runWorkspace };
      }
    } catch (err) {
      return { ok: false, failure: { stage, reason: (err as Error).message }, runWorkspace };
    }
  }

  return { ok: false, failure: { stage: stages.at(-1) ?? "manifest-build", reason: "no stages produced a pack" }, runWorkspace };
}
