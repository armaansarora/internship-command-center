import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runCharacterMaster } from "./index";
import { registerArtLabSlot } from "@/lib/artlab/sdk/asset-pack";
import type {
  ArtLabImageProvider,
  ArtLabImageProviderInput,
  ArtLabImageProviderResult,
} from "@/lib/artlab/sdk/providers/types";

const CHARACTER_YAML = (id: string) => `
header:
  kind: character
  schemaVersion: "1.0.0"
  id: ${id}
  revisedAt: "2026-05-25T00:00:00.000Z"
displayName: "Sol Navarro"
shortLabel: Sol
title: "Chief Networking Officer"
floorId: rolodex-lounge
floorLabel: "Floor 6"
styleEnvelope: tower-flat-plus-depth-v1
visualArchetype: x
silhouette: x
wardrobe: x
props: [x]
mobileRead: x
negativeDNA: x
accent: x
doctrine: x
flaw: x
secretStrength: x
wound: x
outfitVariants: [regular, summer-light, winter-layered]
poseStates: [idle, greeting, listening, thinking, talking, alert, working]
promotionStatus: queued
paletteRef: tower-default
motionProfile: x
artDirectionNotes: x
`;

const PALETTE_YAML = `
header:
  kind: palette
  schemaVersion: "1.0.0"
  id: tower-default
  revisedAt: "2026-05-25T00:00:00.000Z"
scope: global
tokens:
  primaryDark: "#1A1A2E"
`;

function setupCanon(canonRoot: string): void {
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  mkdirSync(join(canonRoot, "palettes"), { recursive: true });
  writeFileSync(join(canonRoot, "characters", "sol-navarro.yaml"), CHARACTER_YAML("sol-navarro"), "utf8");
  writeFileSync(join(canonRoot, "palettes", "tower-default.yaml"), PALETTE_YAML, "utf8");
}

function ensureSlotsRegistered(): void {
  const OUTFITS = ["regular", "summer-light", "winter-layered"];
  const POSES = ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"];
  for (const outfit of OUTFITS) {
    for (const pose of POSES) {
      try {
        registerArtLabSlot({
          slotId: `rolodex-lounge/sol-navarro/${outfit}/${pose}`,
          appPath: `public/art/rolodex-lounge/sol-navarro/${outfit}/${pose}.webp`,
          kind: "character-sprite",
          component: "SolCharacter",
          requiresGsap: false,
        });
      } catch {
        // already registered
      }
    }
  }
}

function dimensionsFor(aspect: ArtLabImageProviderInput["aspectRatio"]): { widthPx: number; heightPx: number } {
  switch (aspect) {
    case "9:16": return { widthPx: 1024, heightPx: 1792 };
    case "16:9": return { widthPx: 1792, heightPx: 1024 };
    case "1:1": return { widthPx: 1024, heightPx: 1024 };
    case "4:3": return { widthPx: 1024, heightPx: 768 };
    case "3:4": return { widthPx: 768, heightPx: 1024 };
  }
}

function createPngArtLabImageProvider(): ArtLabImageProvider {
  const id = "mock-foundry-image";
  return {
    id,
    async generate(input: ArtLabImageProviderInput): Promise<ArtLabImageProviderResult> {
      const dims = dimensionsFor(input.aspectRatio);
      const bytes = await sharp({
        create: { width: 64, height: 64, channels: 4, background: { r: 30, g: 30, b: 50, alpha: 1 } },
      })
        .composite([
          {
            input: await sharp({
              create: { width: 24, height: 24, channels: 4, background: { r: 200, g: 180, b: 80, alpha: 1 } },
            }).png().toBuffer(),
            top: 16,
            left: 20,
          },
        ])
        .png()
        .toBuffer();
      return {
        mode: "mock",
        bytes,
        contentType: "image/png",
        widthPx: dims.widthPx,
        heightPx: dims.heightPx,
        costCents: 0,
        durationMs: 1,
        providerId: id,
        seed: input.seed,
      };
    },
  };
}

describe("runCharacterMaster", () => {
  let tmpDir: string;
  let canonRoot: string;
  let workspaceRoot: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "artlab-cm-"));
    canonRoot = join(tmpDir, "canon");
    workspaceRoot = join(tmpDir, "ws");
    setupCanon(canonRoot);
    mkdirSync(workspaceRoot, { recursive: true });
    ensureSlotsRegistered();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("runs all 6 stages end-to-end with a mock provider and returns a valid pack", async () => {
    const events: string[] = [];
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot, workspaceRoot, providerId: "mock-foundry-image", resumeFromStage: null, seed: 42 },
      provider: createPngArtLabImageProvider(),
      emit: (e) => events.push(e.kind),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.manifest.payload.files.length).toBe(21);
      expect(events.filter((e) => e === "stage-completed").length).toBe(6);
      expect(events).toContain("pack-emitted");
    }
  });

  it("returns a QA-failure result when the provider deliberately fails composite-judge", async () => {
    const result = await runCharacterMaster({
      input: { characterId: "missing-character", canonRoot, workspaceRoot, providerId: "mock-foundry-image", resumeFromStage: null, seed: 42 },
      provider: createPngArtLabImageProvider(),
      emit: () => {},
    });
    expect(result.ok).toBe(false);
  });

  it("resumes from cutout-and-feather end-to-end and produces a valid pack", async () => {
    // Bootstrap a complete cutout-stage workspace: anchor + 21 sprite PNGs
    // already on disk, then resume from `cutout-and-feather`. The orchestrator
    // must reconstruct the sprite list from disk so composite-judge has
    // something to compare against — without this it would throw
    // "composite-judge: missing sprites/anchor".
    const runWorkspace = join(workspaceRoot, "runs", "sol-navarro");
    mkdirSync(runWorkspace, { recursive: true });
    const anchorPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 240, g: 235, b: 220, alpha: 1 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 24, height: 24, channels: 4, background: { r: 30, g: 30, b: 60, alpha: 1 } },
          }).png().toBuffer(),
          top: 20,
          left: 20,
        },
      ])
      .png()
      .toBuffer();
    writeFileSync(join(runWorkspace, "anchor.png"), anchorPng);
    writeFileSync(join(runWorkspace, "anchor-meta.json"), JSON.stringify({
      anchorLaneIndex: 3,
      anchorPrompt: "previous anchor",
      anchorCharacterId: "sol-navarro",
      anchorWidthPx: 64,
      anchorHeightPx: 64,
    }));
    for (const outfit of ["regular", "summer-light", "winter-layered"]) {
      for (const pose of ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"]) {
        const sprite = await sharp({
          create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        })
          .composite([
            {
              input: await sharp({
                create: { width: 24, height: 24, channels: 4, background: { r: 30, g: 30, b: 60, alpha: 1 } },
              }).png().toBuffer(),
              top: 20,
              left: 20,
            },
          ])
          .png()
          .toBuffer();
        writeFileSync(join(runWorkspace, `${outfit}__${pose}.png`), sprite);
      }
    }
    const events: string[] = [];
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot, workspaceRoot, providerId: "mock-foundry-image", resumeFromStage: "cutout-and-feather", seed: 42 },
      provider: createPngArtLabImageProvider(),
      emit: (e) => events.push(e.kind),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(events.filter((e) => e === "stage-completed").length).toBeGreaterThanOrEqual(3);
      expect(events).toContain("pack-emitted");
      expect(result.pack.manifest.payload.files.length).toBe(21);
    }
  });

  it("returns an actionable error if a sprite PNG is missing when resuming at cutout-and-feather", async () => {
    const runWorkspace = join(workspaceRoot, "runs", "sol-navarro");
    mkdirSync(runWorkspace, { recursive: true });
    const anchorPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 240, g: 235, b: 220, alpha: 1 } },
    }).png().toBuffer();
    writeFileSync(join(runWorkspace, "anchor.png"), anchorPng);
    writeFileSync(join(runWorkspace, "anchor-meta.json"), JSON.stringify({
      anchorLaneIndex: 3,
      anchorPrompt: "previous anchor",
      anchorCharacterId: "sol-navarro",
      anchorWidthPx: 64,
      anchorHeightPx: 64,
    }));
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot, workspaceRoot, providerId: "mock-foundry-image", resumeFromStage: "cutout-and-feather", seed: 42 },
      provider: createPngArtLabImageProvider(),
      emit: () => {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.stage).toBe("cutout-and-feather");
      expect(result.failure.reason).toMatch(/regular__idle\.png/);
    }
  });

  it("fails the run with a palette-match qa-failure when canon tolerance is impossible", async () => {
    // Force the palette gate to fail by demanding a near-zero Lab tolerance —
    // the mock sprite's dominant color cannot possibly land that close to the
    // single canon token, so the orchestrator must abort with an actionable
    // gateName="palette-match" reason rather than emit a pack.
    const events: Array<{ kind: string; gateName?: string; reason?: string }> = [];
    const result = await runCharacterMaster({
      input: {
        characterId: "sol-navarro",
        canonRoot,
        workspaceRoot,
        providerId: "mock-foundry-image",
        resumeFromStage: null,
        seed: 42,
        qa: { paletteToleranceLab: 0.001, minPairwiseSilhouetteHamming: 0 },
      },
      provider: createPngArtLabImageProvider(),
      emit: (e) => events.push(e as { kind: string; gateName?: string; reason?: string }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason.toLowerCase()).toMatch(/palette/);
    }
    const qaFailures = events.filter((e) => e.kind === "qa-failure");
    expect(qaFailures.some((e) => e.gateName === "palette-match")).toBe(true);
    expect(qaFailures.some((e) => (e.reason ?? "").toLowerCase().includes("palette"))).toBe(true);
  });

  it("fails the run with a silhouette-diversity qa-failure when sprites are too similar", async () => {
    // Force the silhouette gate to fail by demanding an impossibly high
    // pairwise Hamming threshold. The mock provider seeds bytes per prompt
    // but the 21 sprites' perceptual hashes cannot all be > 60 bits apart on
    // a 64-bit hash space.
    const events: Array<{ kind: string; gateName?: string; reason?: string }> = [];
    const result = await runCharacterMaster({
      input: {
        characterId: "sol-navarro",
        canonRoot,
        workspaceRoot,
        providerId: "mock-foundry-image",
        resumeFromStage: null,
        seed: 42,
        qa: { paletteToleranceLab: 250, minPairwiseSilhouetteHamming: 60 },
      },
      provider: createPngArtLabImageProvider(),
      emit: (e) => events.push(e as { kind: string; gateName?: string; reason?: string }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.reason.toLowerCase()).toMatch(/silhouette|diversity|hamming/);
    }
    const qaFailures = events.filter((e) => e.kind === "qa-failure");
    expect(qaFailures.some((e) => e.gateName === "silhouette-diversity")).toBe(true);
  });

  it("skips concept-board + anchor-lock when resumeFromStage is variant-fan-out", async () => {
    const events: string[] = [];
    const runWorkspace = join(workspaceRoot, "runs", "sol-navarro");
    mkdirSync(runWorkspace, { recursive: true });
    const anchorPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 30, g: 30, b: 50, alpha: 1 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 24, height: 24, channels: 4, background: { r: 200, g: 180, b: 80, alpha: 1 } },
          }).png().toBuffer(),
          top: 16,
          left: 20,
        },
      ])
      .png()
      .toBuffer();
    writeFileSync(join(runWorkspace, "anchor.png"), anchorPng);
    writeFileSync(join(runWorkspace, "anchor-meta.json"), JSON.stringify({
      anchorLaneIndex: 3,
      anchorPrompt: "previous anchor",
      anchorCharacterId: "sol-navarro",
      anchorWidthPx: 1024,
      anchorHeightPx: 1792,
    }));
    const result = await runCharacterMaster({
      input: { characterId: "sol-navarro", canonRoot, workspaceRoot, providerId: "mock-foundry-image", resumeFromStage: "variant-fan-out", seed: 42 },
      provider: createPngArtLabImageProvider(),
      emit: (e) => { if (e.kind === "stage-started") events.push(e.stage); },
    });
    expect(result.ok).toBe(true);
    expect(events).not.toContain("concept-board");
    expect(events).not.toContain("anchor-lock");
    expect(events).toContain("variant-fan-out");
  });
});
