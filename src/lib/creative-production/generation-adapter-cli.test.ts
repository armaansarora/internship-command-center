import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

function countOccurrences(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

describe("art:generate CLI", () => {
  it("prepares a Gemini subscription bridge from an existing packet and directive", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");
    const directiveMarkdownPath = join(root, "directive.md");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-v2",
      outputRoot: join(root, "studio", "characters", "otis-v2"),
    }));
    writeFileSync(directiveMarkdownPath, "# Directive\n\nGenerate Otis carefully.\n");
    writeFileSync(directivePath, JSON.stringify({
      directivePath: directiveMarkdownPath,
      sourceRequirements: {
        minimumLongEdge: 4096,
        minimumShortEdge: 2300,
      },
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-v2/incoming/regular",
          reason: "Probe native source quality.",
          outfit: "regular",
          pose: "idle",
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-subscription",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Created Gemini subscription bridge");
    expect(output).toContain("Billing: subscription-first, no API billing.");

    const bridgeRoot = join(root, "studio", "characters", "otis-v2", "generation");
    const bridge = JSON.parse(readFileSync(join(bridgeRoot, "generation-bridge.json"), "utf8")) as {
      adapter: string;
      uiSettings: { qualityMode: string; stylePreset: string; stylePresetPolicy: string };
      slots: Array<{ slotId: string; expectedInboxFile: string; prompt: string }>;
    };

    expect(bridge.adapter).toBe("gemini-subscription-browser");
    expect(bridge.uiSettings.qualityMode).toBe("highest-quality-available");
    expect(bridge.uiSettings.stylePreset).toBe("none/default");
    expect(bridge.uiSettings.stylePresetPolicy).toBe("none-by-default");
    expect(bridge.slots[0]?.slotId).toBe("otis-regular-idle");
    expect(bridge.slots[0]?.prompt).toContain("Generate exactly one production source image");
    expect(bridge.slots[0]?.prompt).toContain("If the style preset is none/default, do not select Color block");
    expect(existsSync(join(bridgeRoot, "gemini-subscription-runbook.md"))).toBe(true);
    expect(existsSync(join(bridgeRoot, "prompt-deck.md"))).toBe(true);
  });

  it("records explicit quality mode and style preset settings for subscription bridges", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-ui-settings-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-style-lock-v1",
      outputRoot: join(root, "studio", "characters", "otis-style-lock-v1"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-style-lock-v1/incoming/regular",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-subscription",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--quality-mode",
      "pro",
      "--style-preset",
      "Approved Tower preset",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const bridgeRoot = join(root, "studio", "characters", "otis-style-lock-v1", "generation");
    const bridge = JSON.parse(readFileSync(join(bridgeRoot, "generation-bridge.json"), "utf8")) as {
      uiSettings: { qualityMode: string; stylePreset: string; stylePresetPolicy: string };
      slots: Array<{ prompt: string }>;
    };

    expect(bridge.uiSettings).toMatchObject({
      qualityMode: "pro",
      stylePreset: "Approved Tower preset",
      stylePresetPolicy: "approved-style-lock",
    });
    expect(bridge.slots[0]?.prompt).toContain("Gemini UI quality mode: pro");
    expect(bridge.slots[0]?.prompt).toContain("Gemini UI style preset: Approved Tower preset");
  });

  it("rejects forbidden subscription style presets before creating a bridge", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-forbidden-preset-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-forbidden-preset-v1",
      outputRoot: join(root, "studio", "characters", "otis-forbidden-preset-v1"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-forbidden-preset-v1/incoming/regular",
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-subscription",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--style-preset",
      "Color block",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow();
  });

  it("prepares a five-lane Nano Banana 2 API plan without storing secrets", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");
    const directiveMarkdownPath = join(root, "directive.md");
    const referencePath = join(root, "otis-reference.png");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-api-v3",
      outputRoot: join(root, "studio", "characters", "otis-api-v3"),
    }));
    writeFileSync(directiveMarkdownPath, "# Directive\n\nGenerate Otis as a production sprite.\n");
    writeFileSync(referencePath, "not-a-real-image-but-plan-only");
    writeFileSync(directivePath, JSON.stringify({
      directivePath: directiveMarkdownPath,
      referenceImages: [
        {
          path: referencePath,
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      sourceRequirements: {
        minimumLongEdge: 4096,
        minimumShortEdge: 2300,
        preferredFormat: "transparent PNG",
      },
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-api-v3/incoming/regular",
          reason: "Probe native source quality.",
          outfit: "regular",
          pose: "idle",
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--phase",
      "production-pack",
      "--budget-cents",
      "1000",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Created Gemini API v3 plan");
    expect(output).toContain("gemini-3.1-flash-image-preview");
    expect(output).toContain("Slots: 5 (5 lanes x 1 base slots)");
    expect(output).toContain("Billing: API-billed");

    const planRoot = join(root, "studio", "characters", "otis-api-v3", "generation", "gemini-api-v3");
    const plan = JSON.parse(readFileSync(join(planRoot, "gemini-api-plan.json"), "utf8")) as {
      model: string;
      imageSize: string;
      laneCount: number;
      maxConcurrency: number;
      phase: string;
      secretPolicy: { acceptedEnvVars: string[] };
      slots: Array<{ prompt: string; expectedInboxFile: string; request: { responseModalities: string[] } }>;
      referenceImages: Array<{ path: string }>;
    };

    expect(plan.model).toBe("gemini-3.1-flash-image-preview");
    expect(plan.imageSize).toBe("4K");
    expect(plan.laneCount).toBe(5);
    expect(plan.maxConcurrency).toBe(5);
    expect(plan.phase).toBe("production-pack");
    expect(plan.secretPolicy.acceptedEnvVars).toContain("GEMINI_API_KEY");
    expect(JSON.stringify(plan)).not.toContain(["AI", "za"].join(""));
    expect(plan.referenceImages[0]?.path).toBe(referencePath);
    expect(plan.slots[0]?.request.responseModalities).toEqual(["IMAGE"]);
    expect(plan.slots[0]?.prompt).toContain("Nano Banana 2 only");
    expect(existsSync(join(planRoot, "gemini-api-runbook.md"))).toBe(true);
    expect(existsSync(join(planRoot, "prompt-deck.md"))).toBe(true);
  });

  it("prepares production-pack API plans behind a canary gate", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-firewall-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");
    const referencePath = join(root, "otis-reference.png");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-firewall-v1",
      outputRoot: join(root, "studio", "characters", "otis-firewall-v1"),
    }));
    writeFileSync(referencePath, "not-a-real-image-but-plan-only");
    writeFileSync(directivePath, JSON.stringify({
      referenceImages: [
        {
          path: referencePath,
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      sourceRequirements: {
        minimumLongEdge: 4096,
        minimumShortEdge: 2300,
      },
      generateFirst: Array.from({ length: 24 }, (_, index) => ({
        slot: index === 0 ? "otis-regular-idle" : `otis-slot-${index + 1}`,
        sourceFilename: `otis__slot_${index + 1}__source-v001.png`,
        targetDirectory: ".artlab/runs/otis/otis-firewall-v1/incoming",
        reason: "Production source.",
      })),
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--phase",
      "production-pack",
      "--lane-count",
      "1",
      "--concurrency",
      "5",
      "--budget-cents",
      "600",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Created Gemini API production firewall");
    expect(output).toContain("Canary plan");
    expect(output).toContain("Full plan");

    const planRoot = join(root, "studio", "characters", "otis-firewall-v1", "generation", "gemini-api-v3");
    const canaryPlan = JSON.parse(readFileSync(join(planRoot, "canary", "gemini-api-plan.json"), "utf8")) as {
      status: string;
      slots: unknown[];
      firewall: { planRole: string };
    };
    const fullPlan = JSON.parse(readFileSync(join(planRoot, "full", "gemini-api-plan.json"), "utf8")) as {
      status: string;
      slots: unknown[];
      firewall: { planRole: string; requiresCanary: boolean; canaryGatePath: string };
    };

    expect(canaryPlan.status).toBe("ready-for-api-generation");
    expect(canaryPlan.firewall.planRole).toBe("canary");
    expect(canaryPlan.slots).toHaveLength(1);
    expect(fullPlan.status).toBe("blocked-pending-canary");
    expect(fullPlan.firewall.requiresCanary).toBe(true);
    expect(fullPlan.slots).toHaveLength(24);
    expect(existsSync(fullPlan.firewall.canaryGatePath)).toBe(true);
    expect(existsSync(join(planRoot, "generation-budget-ledger.json"))).toBe(true);
  });

  it("blocks a full production API plan before the canary gate passes", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-run-api-full-blocked-"));
    const planRoot = join(root, "generation", "gemini-api-v3", "full");
    const gatePath = join(root, "generation", "gemini-api-v3", "canary-gate.json");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const inboxRoot = join(root, "inbox");
    const inboxDirectory = join(inboxRoot, "api-lane-01", "slot-a");

    mkdirSync(inboxDirectory, { recursive: true });
    mkdirSync(planRoot, { recursive: true });
    writeFileSync(gatePath, JSON.stringify({ status: "blocked-prompt" }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "blocked-pending-canary",
      phase: "production-pack",
      billingPolicy: "api-billed-explicitly-approved",
      secretPolicy: {
        keyIsNeverStoredInRepo: true,
        acceptedEnvVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        keychainService: "tower-gemini-api-key",
        forbiddenInputs: [],
      },
      runId: "blocked-full",
      assetType: "character",
      name: "Blocked Full",
      createdAt: "2026-05-18T00:00:00.000Z",
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "9:16",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      budgetCents: 600,
      estimatedCostCents: 15.1,
      costGuard: {
        failIfEstimateExceedsBudget: true,
        maxBillableImages: 1,
        maxBaseSlotsForInitialDesign: 1,
        defaultInitialDesignTotalImages: 5,
        disableGroundingByDefault: true,
      },
      sourceRequirements: {},
      referenceImages: [],
      inboxRoot,
      planRoot,
      lanes: [{ laneId: "api-lane-01", laneNumber: 1, label: "Canonical Safe", mandate: "Safe." }],
      firewall: {
        planRole: "full",
        requiresCanary: true,
        canaryGatePath: gatePath,
        budgetLedgerPath: join(root, "generation", "gemini-api-v3", "generation-budget-ledger.json"),
        promptContractHash: "abc",
        referenceContractHash: "def",
        sourceContractHash: "ghi",
      },
      slots: [{
        slotId: "api-lane-01__slot-a",
        baseSlotId: "slot-a",
        laneId: "api-lane-01",
        status: "ready-for-api-generation",
        prompt: "Generate.",
        promptHash: "hash",
        reason: "Blocked.",
        inboxDirectory,
        expectedInboxFile: join(inboxDirectory, "slot-a.png"),
        targetDirectory: ".artlab/runs/blocked/incoming",
        targetFilename: "slot-a.png",
        request: {
          model: "gemini-3.1-flash-image-preview",
          aspectRatio: "9:16",
          imageSize: "4K",
          responseModalities: ["IMAGE"],
          includeGoogleSearch: false,
        },
      }],
      nextCommands: [],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/canary/i);
  });

  it("verifies a clean production canary and unlocks the matching full-plan contract", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-verify-canary-"));
    const planRoot = join(root, "generation", "gemini-api-v3", "canary");
    const gatePath = join(root, "generation", "gemini-api-v3", "canary-gate.json");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-a");
    const imagePath = join(inboxDirectory, "slot-a.png");
    const receiptPath = join(inboxDirectory, "api-receipt.json");

    mkdirSync(inboxDirectory, { recursive: true });
    mkdirSync(planRoot, { recursive: true });
    await sharp({
      create: {
        width: 64,
        height: 96,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 0 },
      },
    }).png().toFile(imagePath);
    writeFileSync(receiptPath, JSON.stringify({
      slotId: "api-lane-01__slot-a",
      attempt: 1,
      capturedFile: imagePath,
      qualityWarnings: [],
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      billingPolicy: "api-billed-explicitly-approved",
      secretPolicy: {
        keyIsNeverStoredInRepo: true,
        acceptedEnvVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
        keychainService: "tower-gemini-api-key",
        forbiddenInputs: [],
      },
      runId: "verify-canary",
      assetType: "character",
      name: "Verify Canary",
      createdAt: "2026-05-18T00:00:00.000Z",
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "9:16",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      budgetCents: 600,
      estimatedCostCents: 15.1,
      costGuard: {
        failIfEstimateExceedsBudget: true,
        maxBillableImages: 1,
        maxBaseSlotsForInitialDesign: 1,
        defaultInitialDesignTotalImages: 5,
        disableGroundingByDefault: true,
      },
      sourceRequirements: {},
      referenceImages: [],
      inboxRoot: join(root, "inbox"),
      planRoot,
      firewall: {
        planRole: "canary",
        requiresCanary: false,
        canaryGatePath: gatePath,
        budgetLedgerPath: join(root, "generation", "gemini-api-v3", "generation-budget-ledger.json"),
        promptContractHash: "prompt-hash",
        referenceContractHash: "reference-hash",
        sourceContractHash: "source-hash",
      },
      lanes: [{ laneId: "api-lane-01", laneNumber: 1, label: "Canonical Safe", mandate: "Safe." }],
      slots: [{
        slotId: "api-lane-01__slot-a",
        baseSlotId: "slot-a",
        laneId: "api-lane-01",
        status: "ready-for-api-generation",
        prompt: "Generate.",
        promptHash: "hash",
        reason: "Canary.",
        inboxDirectory,
        expectedInboxFile: imagePath,
        targetDirectory: ".artlab/runs/canary/incoming",
        targetFilename: "slot-a.png",
        request: {
          model: "gemini-3.1-flash-image-preview",
          aspectRatio: "9:16",
          imageSize: "4K",
          responseModalities: ["IMAGE"],
          includeGoogleSearch: false,
        },
      }],
      nextCommands: [],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "verify-canary",
      "--plan",
      planPath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const gate = JSON.parse(readFileSync(gatePath, "utf8")) as {
      status: string;
      promptContractHash: string;
    };

    expect(output).toContain("Canary gate: passed");
    expect(gate.status).toBe("passed");
    expect(gate.promptContractHash).toBe("prompt-hash");
  });

  it("refuses live API runs when the key is not in the local environment", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-no-key-"));
    const planPath = join(root, "gemini-api-plan.json");

    mkdirSync(root, { recursive: true });
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "no-key",
      assetType: "prop",
      name: "No Key",
      planRoot: root,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "1:1",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      estimatedCostCents: 15.1,
      budgetCents: 100,
      sourceRequirements: {},
      referenceImages: [],
      slots: [
        {
          slotId: "slot-a",
          laneId: "api-lane-01",
          baseSlotId: "slot-a",
          expectedInboxFile: join(root, "inbox", "slot-a.png"),
          inboxDirectory: join(root, "inbox"),
          prompt: "Generate.",
          promptHash: "abc",
          request: {
            model: "gemini-3.1-flash-image-preview",
            aspectRatio: "1:1",
            imageSize: "4K",
            responseModalities: ["IMAGE"],
            includeGoogleSearch: false,
          },
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        GEMINI_API_KEY: "",
        GOOGLE_API_KEY: "",
      },
    })).toThrow(/Missing Gemini API key/);
  });

  it("refuses stale API plans that predate explicit phase gating", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-stale-plan-"));
    const planPath = join(root, "gemini-api-plan.json");

    mkdirSync(root, { recursive: true });
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      runId: "stale-plan",
      assetType: "prop",
      name: "Stale Plan",
      planRoot: root,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "1:1",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      estimatedCostCents: 15.1,
      budgetCents: 100,
      sourceRequirements: {},
      referenceImages: [],
      slots: [],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/outdated Gemini API plan/);
  });

  it("refuses malformed API keys before making live generation requests", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-bad-key-"));
    const planPath = join(root, "gemini-api-plan.json");

    mkdirSync(root, { recursive: true });
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "bad-key",
      assetType: "prop",
      name: "Bad Key",
      planRoot: root,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "1:1",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      estimatedCostCents: 15.1,
      budgetCents: 100,
      sourceRequirements: {},
      referenceImages: [],
      slots: [
        {
          slotId: "slot-a",
          laneId: "api-lane-01",
          baseSlotId: "slot-a",
          expectedInboxFile: join(root, "inbox", "slot-a.png"),
          inboxDirectory: join(root, "inbox"),
          prompt: "Generate.",
          promptHash: "abc",
          request: {
            model: "gemini-3.1-flash-image-preview",
            aspectRatio: "1:1",
            imageSize: "4K",
            responseModalities: ["IMAGE"],
            includeGoogleSearch: false,
          },
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        GEMINI_API_KEY: "shorty",
        GOOGLE_API_KEY: "",
      },
    })).toThrow(/does not look like a valid Google API key/);
  });

  it("dry-runs API generation into labeled inbox slots without billing", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-dry-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-api-dry",
      outputRoot: join(root, "studio", "characters", "otis-api-dry"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-api-dry/incoming/regular",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--lane-count",
      "2",
      "--concurrency",
      "2",
      "--budget-cents",
      "100",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planPath = join(root, "studio", "characters", "otis-api-dry", "generation", "gemini-api-v3", "gemini-api-plan.json");
    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test", GEMINI_API_KEY: "" } });

    expect(output).toContain("dryRun: yes");
    expect(output).toContain("dry-run-not-production-art");

    const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
      slots: Array<{ expectedInboxFile: string }>;
    };

    for (const slot of plan.slots) {
      expect(existsSync(slot.expectedInboxFile)).toBe(true);
      expect(existsSync(join(slot.expectedInboxFile, "..", "api-receipt.json"))).toBe(true);
    }
  });

  it("extracts a solid chroma matte into a true transparent PNG from the CLI", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-alpha-cli-"));
    const source = join(root, "source.png");
    const outputPath = join(root, "transparent.png");

    const pixels = Buffer.alloc(8 * 8 * 3);

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = ((y * 8) + x) * 3;
        const inSubject = x >= 2 && x <= 5 && y >= 2 && y <= 5;

        pixels[offset] = inSubject ? 155 : 0;
        pixels[offset + 1] = inSubject ? 36 : 255;
        pixels[offset + 2] = inSubject ? 36 : 0;
      }
    }

    await sharp(pixels, { raw: { width: 8, height: 8, channels: 3 } }).png().toFile(source);

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "extract-alpha",
      "--source",
      source,
      "--output",
      outputPath,
      "--matte-color",
      "00ff00",
      "--border-sample-pixels",
      "1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const metadata = await sharp(outputPath).metadata();

    expect(output).toContain("Extracted alpha");
    expect(metadata.hasAlpha).toBe(true);
    expect(metadata.width).toBe(8);
    expect(metadata.height).toBe(8);
  });

  it("writes a clean local repair receipt so strict doctor can verify alpha-repaired sources", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-alpha-receipt-"));
    const planRoot = join(root, "generation");
    const inboxDirectory = join(root, "inbox", "slot-alpha");
    const source = join(inboxDirectory, "slot-alpha.png");
    const outputPath = join(inboxDirectory, "slot-alpha__alpha-repaired.png");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const pixels = Buffer.alloc(8 * 8 * 3);

    mkdirSync(planRoot, { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = ((y * 8) + x) * 3;
        const inSubject = x >= 2 && x <= 5 && y >= 2 && y <= 5;

        pixels[offset] = inSubject ? 155 : 0;
        pixels[offset + 1] = inSubject ? 36 : 255;
        pixels[offset + 2] = inSubject ? 36 : 0;
      }
    }

    await sharp(pixels, { raw: { width: 8, height: 8, channels: 3 } }).png().toFile(source);
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "slot-alpha",
      attempt: 1,
      capturedFile: source,
      qualityWarnings: ["source-missing-alpha"],
      metadata: {
        width: 8,
        height: 8,
        format: "png",
        hasAlpha: false,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "alpha-repair-doctor",
      assetType: "character",
      name: "Alpha Repair Doctor",
      planRoot,
      sourceRequirements: {},
      slots: [
        {
          slotId: "slot-alpha",
          expectedInboxFile: source,
          inboxDirectory,
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "extract-alpha",
      "--source",
      source,
      "--output",
      outputPath,
      "--matte-color",
      "00ff00",
      "--border-sample-pixels",
      "1",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const repairReceiptPath = join(inboxDirectory, "download-receipt-v002.json");
    const repairReceipt = JSON.parse(readFileSync(repairReceiptPath, "utf8")) as {
      capturedFile: string;
      qualityWarnings: string[];
    };
    const doctorOutput = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "doctor",
      "--plan",
      planPath,
      "--strict",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(repairReceipt.capturedFile).toBe(outputPath);
    expect(repairReceipt.qualityWarnings).toEqual([]);
    expect(doctorOutput).toContain("Asset doctor: passed");
  });

  it("prepares initial design API plans as five total prompt-only concepts", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-initial-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-initial-design",
      outputRoot: join(root, "studio", "characters", "otis-initial-design"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-design",
          sourceFilename: "otis__design__source-v001.png",
          targetDirectory: ".artlab/runs/otis/initial/incoming",
          reason: "Choose the character identity.",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planPath = join(root, "studio", "characters", "otis-initial-design", "generation", "gemini-api-v3", "gemini-api-plan.json");
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
      phase: string;
      laneCount: number;
      maxConcurrency: number;
      slots: Array<{ prompt: string }>;
      referenceImages: unknown[];
    };
    const prompts = plan.slots.map((slot) => slot.prompt).join("\n\n");

    expect(plan.phase).toBe("initial-design");
    expect(plan.laneCount).toBe(5);
    expect(plan.maxConcurrency).toBe(5);
    expect(plan.slots).toHaveLength(5);
    expect(plan.referenceImages).toEqual([]);
    expect(prompts).toContain("simple solid neutral approval background");
    expect(prompts).not.toContain("solid #00ff00 chroma matte background");
    expect(prompts).not.toContain("production source image");
    expect(countOccurrences(prompts, /clean raster shapes/gi)).toBeLessThanOrEqual(1);
    expect(countOccurrences(prompts, /subtle controlled depth/gi)).toBeLessThanOrEqual(1);
    expect(prompts).toContain("premium web-game dialogue sprite");
    expect(prompts).toContain("crisp non-photoreal character render");
    expect(prompts).toContain("high-contrast lobby lighting");
    expect(prompts).toContain("rich burgundy/brass/deep navy palette");
    expect(prompts).toContain("detailed fabric seams/buttons/hair/beard");
    expect(prompts).toContain("sharp readable silhouette");
    expect(prompts).toContain("polished modern game UI character art");
    expect(prompts).toContain("Shared lane quality floor");
    expect(prompts).toContain("Lane 05-level material detail");
    expect(prompts).toContain("Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish");
    expect(plan.slots.every((slot) => slot.prompt.includes("Shared initial-concept lane quality floor"))).toBe(true);
    expect(plan.slots.every((slot) => slot.prompt.includes("Unique identity mandate"))).toBe(true);
    expect(prompts).toContain("no storybook illustration");
    expect(prompts).toContain("no children’s book");
    expect(prompts).toContain("no watercolor");
    expect(prompts).toContain("no muted pastel palette");
    expect(prompts).toContain("no beige editorial board");
    expect(prompts).toContain("no flat vector simplicity");
    expect(prompts).toContain("no low-detail soft linework");
    expect(prompts).toContain("Keep natural human imperfections");
  });

  it("rejects multi-pose API directives unless the run is explicitly a production pack", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-multipose-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-multipose",
      outputRoot: join(root, "studio", "characters", "otis-multipose"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-idle",
          sourceFilename: "otis__idle.png",
          targetDirectory: ".artlab/runs/otis/multipose/incoming",
        },
        {
          slot: "otis-greeting",
          sourceFilename: "otis__greeting.png",
          targetDirectory: ".artlab/runs/otis/multipose/incoming",
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/Initial design API runs must use exactly one base slot/);

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--phase",
      "production-pack",
      "--lane-count",
      "1",
      "--concurrency",
      "5",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planPath = join(root, "studio", "characters", "otis-multipose", "generation", "gemini-api-v3", "full", "gemini-api-plan.json");
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as { status: string; phase: string; laneCount: number; maxConcurrency: number; slots: unknown[] };

    expect(plan.status).toBe("blocked-pending-canary");
    expect(plan.phase).toBe("production-pack");
    expect(plan.laneCount).toBe(1);
    expect(plan.maxConcurrency).toBe(5);
    expect(plan.slots).toHaveLength(2);
    expect(JSON.stringify(plan.slots)).toContain("solid #00ff00 chroma matte background");
  });

  it("allows production packet sheet slots without forbidding their required multi-view layout", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-sheet-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-production-sheet",
      outputRoot: join(root, "studio", "characters", "otis-production-sheet"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-turnaround",
          sourceFilename: "otis__turnaround__source-v001.png",
          targetDirectory: ".artlab/runs/otis/production/incoming/model",
          reason: "Turnaround sheet.",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--phase",
      "production-pack",
      "--lane-count",
      "1",
      "--concurrency",
      "5",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planPath = join(root, "studio", "characters", "otis-production-sheet", "generation", "gemini-api-v3", "gemini-api-plan.json");
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as { slots: Array<{ prompt: string }> };
    const prompt = plan.slots[0]?.prompt ?? "";

    expect(prompt).toContain("production packet sheet image");
    expect(prompt).toContain("Multiple Otis figures are allowed only as required by this sheet");
    expect(prompt).toContain("every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill");
    expect(prompt).toContain("Do not draw a floor plane, ground shadow, contact shadow");
    expect(prompt).not.toContain("not a contact sheet");
    expect(prompt).not.toContain("or pose sheet");
  });

  it("refuses an API run when a run lock already exists", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-lock-"));
    const planRoot = join(root, "generation", "gemini-api-v3");
    const planPath = join(planRoot, "gemini-api-plan.json");

    mkdirSync(planRoot, { recursive: true });
    writeFileSync(join(planRoot, "api-run.lock"), JSON.stringify({
      pid: 123,
      createdAt: "2026-05-15T00:00:00.000Z",
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "locked",
      assetType: "prop",
      name: "Locked",
      planRoot,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-3.1-flash-image-preview",
      modelLabel: "Nano Banana 2",
      imageSize: "4K",
      aspectRatio: "1:1",
      laneCount: 1,
      maxConcurrency: 1,
      costPerImageCents: 15.1,
      estimatedCostCents: 15.1,
      budgetCents: 100,
      sourceRequirements: {},
      referenceImages: [],
      slots: [
        {
          slotId: "slot-a",
          laneId: "api-lane-01",
          baseSlotId: "slot-a",
          expectedInboxFile: join(root, "inbox", "slot-a.png"),
          inboxDirectory: join(root, "inbox"),
          prompt: "Generate.",
          promptHash: "abc",
          request: {
            model: "gemini-3.1-flash-image-preview",
            aspectRatio: "1:1",
            imageSize: "4K",
            responseModalities: ["IMAGE"],
            includeGoogleSearch: false,
          },
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/already locked/);
  });

  it("retries warned API dry-run receipts as versioned attempts and writes run state", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-retry-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-api-retry",
      outputRoot: join(root, "studio", "characters", "otis-api-retry"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      generateFirst: [
        {
          slot: "otis-regular-idle",
          sourceFilename: "otis__regular__idle__source-v001.png",
          targetDirectory: ".artlab/runs/otis/otis-api-retry/incoming/regular",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--lane-count",
      "1",
      "--concurrency",
      "1",
      "--budget-cents",
      "100",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planRoot = join(root, "studio", "characters", "otis-api-retry", "generation", "gemini-api-v3");
    const planPath = join(planRoot, "gemini-api-plan.json");

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
      "--max-attempts",
      "2",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const retryOutput = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
      "--max-attempts",
      "2",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
      slots: Array<{ expectedInboxFile: string }>;
    };
    const inboxDirectory = join(plan.slots[0]!.expectedInboxFile, "..");

    expect(retryOutput).toContain("retry-warning-receipt");
    expect(existsSync(join(inboxDirectory, "api-receipt-v002.json"))).toBe(true);
    expect(existsSync(join(planRoot, "api-run-state.json"))).toBe(true);
    expect(existsSync(join(planRoot, "api-run.lock"))).toBe(false);
  });

  it("marks API runs with warning receipts as completed-with-warnings instead of cleanly completed", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-generate-api-warning-state-"));
    const packetPath = join(root, "creative-brief.json");
    const directivePath = join(root, "next-image-generation-step.json");

    writeFileSync(packetPath, JSON.stringify({
      assetType: "character",
      name: "Otis",
      runId: "otis-api-warning-state",
      outputRoot: join(root, "studio", "characters", "otis-api-warning-state"),
    }));
    writeFileSync(directivePath, JSON.stringify({
      sourceRequirements: {
        minimumLongEdge: 4096,
        minimumShortEdge: 2300,
      },
      generateFirst: [
        {
          slot: "otis-design",
          sourceFilename: "otis__design.png",
          targetDirectory: ".artlab/runs/otis/warning-state/incoming",
        },
      ],
    }));

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "prepare-api",
      "--packet",
      packetPath,
      "--directive",
      directivePath,
      "--artlab-root",
      root,
      "--lane-count",
      "1",
      "--concurrency",
      "1",
      "--budget-cents",
      "100",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const planRoot = join(root, "studio", "characters", "otis-api-warning-state", "generation", "gemini-api-v3");
    const planPath = join(planRoot, "gemini-api-plan.json");

    execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "run-api",
      "--plan",
      planPath,
      "--dry-run",
      "--max-attempts",
      "2",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    const state = JSON.parse(readFileSync(join(planRoot, "api-run-state.json"), "utf8")) as {
      status: string;
    };

    expect(state.status).toBe("completed-with-warnings");
  });

  it("doctor blocks missing generated images before review or promotion", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-doctor-missing-"));
    const planPath = join(root, "generation", "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-a");

    mkdirSync(join(root, "generation"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "initial-design",
      runId: "doctor-missing",
      assetType: "character",
      name: "Doctor Missing",
      planRoot: join(root, "generation"),
      slots: [
        {
          slotId: "slot-a",
          expectedInboxFile: join(inboxDirectory, "missing.png"),
          inboxDirectory,
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "doctor",
      "--plan",
      planPath,
      "--json",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/missing-generated-image/);
  });

  it("doctor blocks broken review board image references", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-doctor-board-"));
    const planPath = join(root, "generation", "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-a");
    const imagePath = join(inboxDirectory, "source.png");
    const boardPath = join(root, "review", "board.html");

    mkdirSync(join(root, "generation"), { recursive: true });
    mkdirSync(join(root, "review"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    await sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#aa8844",
      },
    }).png().toFile(imagePath);
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "slot-a",
      attempt: 1,
      capturedFile: imagePath,
      qualityWarnings: [],
      metadata: {
        width: 128,
        height: 192,
        format: "png",
        hasAlpha: true,
      },
    }));
    writeFileSync(boardPath, `<img src="../review/missing.png" alt="Missing">`);
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "initial-design",
      runId: "doctor-board",
      assetType: "character",
      name: "Doctor Board",
      planRoot: join(root, "generation"),
      slots: [
        {
          slotId: "slot-a",
          expectedInboxFile: imagePath,
          inboxDirectory,
        },
      ],
    }));

    expect(() => execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "doctor",
      "--plan",
      planPath,
      "--board",
      boardPath,
      "--json",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } })).toThrow(/missing-review-image/);
  });

  it("status recognizes clean versioned API retry receipts instead of stale warning attempts", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-status-api-versioned-"));
    const planPath = join(root, "generation", "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-a");
    const firstAttemptPath = join(inboxDirectory, "slot-a.png");
    const secondAttemptPath = join(inboxDirectory, "slot-a__v002.png");

    mkdirSync(join(root, "generation"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    await sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#aa8844",
      },
    }).png().toFile(secondAttemptPath);
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "slot-a",
      attempt: 1,
      capturedFile: firstAttemptPath,
      qualityWarnings: ["source-missing-alpha"],
    }));
    writeFileSync(join(inboxDirectory, "api-receipt-v002.json"), JSON.stringify({
      slotId: "slot-a",
      attempt: 2,
      capturedFile: secondAttemptPath,
      qualityWarnings: [],
      metadata: {
        width: 128,
        height: 192,
        format: "png",
        hasAlpha: true,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "initial-design",
      runId: "status-versioned",
      assetType: "character",
      name: "Status Versioned",
      planRoot: join(root, "generation"),
      slots: [
        {
          slotId: "slot-a",
          expectedInboxFile: firstAttemptPath,
          inboxDirectory,
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "status",
      "--bridge",
      planPath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const status = JSON.parse(output) as {
      status: string;
      captured: string[];
      capturedWithWarnings: string[];
    };

    expect(status.status).toBe("ready-to-ingest");
    expect(status.captured).toEqual(["slot-a"]);
    expect(status.capturedWithWarnings).toEqual([]);
  });

  it("doctor validates the latest captured retry file instead of the original expected path", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-doctor-versioned-"));
    const planPath = join(root, "generation", "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-a");
    const firstAttemptPath = join(inboxDirectory, "slot-a.png");
    const secondAttemptPath = join(inboxDirectory, "slot-a__v002.png");

    mkdirSync(join(root, "generation"), { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    await sharp({
      create: {
        width: 128,
        height: 192,
        channels: 4,
        background: "#aa8844",
      },
    }).png().toFile(secondAttemptPath);
    writeFileSync(join(inboxDirectory, "api-receipt-v002.json"), JSON.stringify({
      slotId: "slot-a",
      attempt: 2,
      capturedFile: secondAttemptPath,
      qualityWarnings: [],
      metadata: {
        width: 128,
        height: 192,
        format: "png",
        hasAlpha: true,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "initial-design",
      runId: "doctor-versioned",
      assetType: "character",
      name: "Doctor Versioned",
      planRoot: join(root, "generation"),
      slots: [
        {
          slotId: "slot-a",
          expectedInboxFile: firstAttemptPath,
          inboxDirectory,
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "doctor",
      "--plan",
      planPath,
      "--strict",
      "--json",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const report = JSON.parse(output) as {
      status: string;
      checkedGeneratedImages: Array<{ path: string; latestReceiptWarnings: string[] }>;
    };

    expect(report.status).toBe("passed");
    expect(report.checkedGeneratedImages[0]?.path).toBe(secondAttemptPath);
    expect(report.checkedGeneratedImages[0]?.latestReceiptWarnings).toEqual([]);
  });

  it("captures a downloaded subscription image and reports quality warnings", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-capture-"));
    const bridgeRoot = join(root, "generation");
    const sourcePath = join(root, "download.png");
    const bridgePath = join(bridgeRoot, "generation-bridge.json");
    const expectedInboxFile = join(root, "inbox", "slot-a", "slot-a.png");

    mkdirSync(bridgeRoot, { recursive: true });

    await sharp({
      create: {
        width: 64,
        height: 48,
        channels: 4,
        background: "#ccaa66",
      },
    }).png().toFile(sourcePath);

    writeFileSync(bridgePath, JSON.stringify({
      schemaVersion: "tower-creative-generation-bridge-v1",
      adapter: "gemini-subscription-browser",
      status: "awaiting-subscription-generation",
      runId: "smoke",
      assetType: "prop",
      name: "Smoke",
      sourceRequirements: {
        minimumLongEdge: 4096,
      },
      slots: [
        {
          slotId: "slot-a",
          inboxDirectory: join(root, "inbox", "slot-a"),
          expectedInboxFile,
          targetFilename: "slot-a.png",
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "capture-download",
      "--bridge",
      bridgePath,
      "--slot",
      "slot-a",
      "--source",
      sourcePath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(output).toContain("Captured slot-a");
    expect(output).toContain("source-long-edge-below-4096");
    expect(existsSync(expectedInboxFile)).toBe(true);
    expect(existsSync(join(root, "inbox", "slot-a", "download-receipt.json"))).toBe(true);

    const status = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "status",
      "--bridge",
      bridgePath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });

    expect(status).toContain("\"status\": \"awaiting-clean-downloads\"");
    expect(status).toContain("\"capturedWithWarnings\"");
  });

  it("captures character downloads with missing alpha or non-PNG format as quality warnings", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-capture-alpha-warning-"));
    const bridgeRoot = join(root, "generation");
    const sourcePath = join(root, "download.jpg");
    const bridgePath = join(bridgeRoot, "generation-bridge.json");
    const expectedInboxFile = join(root, "inbox", "slot-a", "slot-a.png");

    mkdirSync(bridgeRoot, { recursive: true });

    await sharp({
      create: {
        width: 512,
        height: 768,
        channels: 3,
        background: "#ccaa66",
      },
    }).jpeg().toFile(sourcePath);

    writeFileSync(bridgePath, JSON.stringify({
      schemaVersion: "tower-creative-generation-bridge-v1",
      adapter: "gemini-subscription-browser",
      status: "awaiting-subscription-generation",
      runId: "character-alpha-warning",
      assetType: "character",
      name: "Character Alpha Warning",
      sourceRequirements: {},
      slots: [
        {
          slotId: "slot-a",
          inboxDirectory: join(root, "inbox", "slot-a"),
          expectedInboxFile,
          targetFilename: "slot-a.png",
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "capture-download",
      "--bridge",
      bridgePath,
      "--slot",
      "slot-a",
      "--source",
      sourcePath,
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const receipt = JSON.parse(readFileSync(join(root, "inbox", "slot-a", "download-receipt.json"), "utf8")) as {
      qualityWarnings: string[];
    };

    expect(output).toContain("source-missing-alpha");
    expect(output).toContain("source-mime-image-jpeg");
    expect(receipt.qualityWarnings).toContain("source-missing-alpha");
    expect(receipt.qualityWarnings).toContain("source-mime-image-jpeg");
  });

  it("writes a repair plan that turns doctor failures into exact next commands per slot", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-repair-plan-"));
    const planRoot = join(root, "generation");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const warningInbox = join(root, "inbox", "slot-alpha");
    const missingInbox = join(root, "inbox", "slot-missing");
    const warningFile = join(warningInbox, "slot-alpha.png");
    const missingFile = join(missingInbox, "slot-missing.png");

    mkdirSync(planRoot, { recursive: true });
    mkdirSync(warningInbox, { recursive: true });
    mkdirSync(missingInbox, { recursive: true });
    await sharp({
      create: {
        width: 512,
        height: 768,
        channels: 3,
        background: "#00ff00",
      },
    }).png().toFile(warningFile);
    writeFileSync(join(warningInbox, "api-receipt.json"), JSON.stringify({
      slotId: "slot-alpha",
      attempt: 1,
      capturedFile: warningFile,
      qualityWarnings: ["source-missing-alpha"],
      metadata: {
        width: 512,
        height: 768,
        format: "png",
        hasAlpha: false,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "repair-plan",
      assetType: "character",
      name: "Repair Plan",
      planRoot,
      slots: [
        {
          slotId: "slot-alpha",
          expectedInboxFile: warningFile,
          inboxDirectory: warningInbox,
        },
        {
          slotId: "slot-missing",
          expectedInboxFile: missingFile,
          inboxDirectory: missingInbox,
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "repair-plan",
      "--plan",
      planPath,
      "--strict",
      "--json",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const repairPlan = JSON.parse(output) as {
      status: string;
      slots: Array<{
        slotId: string;
        status: string;
        recommendedAction: {
          type: string;
          command?: string;
          fallbackCommand?: string;
        };
      }>;
    };

    expect(repairPlan.status).toBe("repair-required");
    expect(repairPlan.slots).toContainEqual(expect.objectContaining({
      slotId: "slot-alpha",
      status: "repair-required",
      recommendedAction: expect.objectContaining({
        type: "extract-alpha",
        command: expect.stringContaining("extract-alpha"),
        fallbackCommand: expect.stringContaining("run-api"),
      }),
    }));
    expect(repairPlan.slots).toContainEqual(expect.objectContaining({
      slotId: "slot-missing",
      status: "repair-required",
      recommendedAction: expect.objectContaining({
        type: "regenerate-slot",
        command: expect.stringContaining("run-api"),
      }),
    }));
    expect(existsSync(join(planRoot, "repair-plan.json"))).toBe(true);
  });

  it("refuses alpha extraction repair when a missing-alpha image is not a flat matte source", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-repair-plan-no-matte-"));
    const planRoot = join(root, "generation");
    const planPath = join(planRoot, "gemini-api-plan.json");
    const inboxDirectory = join(root, "inbox", "slot-no-matte");
    const warningFile = join(inboxDirectory, "slot-no-matte.jpg");

    mkdirSync(planRoot, { recursive: true });
    mkdirSync(inboxDirectory, { recursive: true });
    await sharp({
      create: {
        width: 512,
        height: 768,
        channels: 3,
        background: "#ccaa66",
      },
    }).jpeg().toFile(warningFile);
    writeFileSync(join(inboxDirectory, "api-receipt.json"), JSON.stringify({
      slotId: "slot-no-matte",
      attempt: 1,
      capturedFile: warningFile,
      qualityWarnings: ["source-missing-alpha", "source-mime-image-jpeg"],
      metadata: {
        width: 512,
        height: 768,
        format: "jpeg",
        hasAlpha: false,
      },
    }));
    writeFileSync(planPath, JSON.stringify({
      schemaVersion: "tower-gemini-api-generation-plan-v3",
      adapter: "gemini-api",
      status: "ready-for-api-generation",
      phase: "production-pack",
      runId: "repair-plan-no-matte",
      assetType: "character",
      name: "Repair Plan No Matte",
      planRoot,
      slots: [
        {
          slotId: "slot-no-matte",
          expectedInboxFile: warningFile,
          inboxDirectory,
        },
      ],
    }));

    const output = execFileSync(tsx, [
      "scripts/creative-generation-adapter.ts",
      "repair-plan",
      "--plan",
      planPath,
      "--strict",
      "--json",
    ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
    const repairPlan = JSON.parse(output) as {
      slots: Array<{
        recommendedAction: {
          type: string;
          command?: string;
          fallbackCommand?: string;
          reason: string;
        };
        matteReadiness?: {
          safe: boolean;
        };
      }>;
    };

    expect(repairPlan.slots[0]?.matteReadiness?.safe).toBe(false);
    expect(repairPlan.slots[0]?.recommendedAction).toMatchObject({
      type: "regenerate-slot",
      command: expect.stringContaining("run-api"),
    });
    expect(repairPlan.slots[0]?.recommendedAction.command).not.toContain("extract-alpha");
    expect(repairPlan.slots[0]?.recommendedAction.reason).toContain("not a safe flat matte");
  });
});
