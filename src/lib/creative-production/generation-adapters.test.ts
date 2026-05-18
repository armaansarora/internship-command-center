import { describe, expect, it } from "vitest";
import {
  createGeminiSubscriptionBridgePlan,
  getCreativeGenerationAdapterDefinition,
  renderGeminiSubscriptionBridgeRunbook,
  assertAllowedCreativeStylePreset,
} from "./index";

describe("creative generation adapters", () => {
  it("treats Gemini subscription browser as no-API-billing but not unattended", () => {
    const adapter = getCreativeGenerationAdapterDefinition("gemini-subscription-browser");

    expect(adapter.billingPath).toBe("subscription-ui");
    expect(adapter.requiresApiBilling).toBe(false);
    expect(adapter.canUseCodexComputerUse).toBe(true);
    expect(adapter.canRunUnattendedFromNode).toBe(false);
    expect(adapter.directFileSave).toBe(false);
  });

  it("creates labeled subscription inbox slots without pretending direct file save exists", () => {
    const plan = createGeminiSubscriptionBridgePlan({
      runId: "otis-v2",
      assetType: "character",
      name: "Otis Vale",
      bridgeRoot: ".artlab/studio/characters/otis-v2/generation",
      inboxRoot: ".artlab/inbox/character/otis-v2",
      sourceRequirements: {
        minimumLongEdge: 4096,
        minimumShortEdge: 2300,
      },
      slots: [
        {
          slotId: "otis-regular-idle",
          prompt: "Generate Otis idle.",
          targetDirectory: ".artlab/runs/otis/otis-v2/incoming/regular",
          targetFilename: "otis__regular__idle__source-v001.png",
          reason: "Probe idle quality.",
        },
      ],
    });

    expect(plan.adapter).toBe("gemini-subscription-browser");
    expect(plan.billingPolicy).toBe("subscription-first-no-api-billing");
    expect(plan.directFileSave).toBe(false);
    expect(plan.uiSettings.qualityMode).toBe("highest-quality-available");
    expect(plan.uiSettings.stylePreset).toBe("none/default");
    expect(plan.uiSettings.stylePresetPolicy).toBe("none-by-default");
    expect(plan.sourceRequirements.minimumLongEdge).toBe(4096);
    expect(plan.slots[0]?.inboxDirectory).toBe(".artlab/inbox/character/otis-v2/otis-regular-idle");
    expect(plan.slots[0]?.expectedInboxFile).toBe(
      ".artlab/inbox/character/otis-v2/otis-regular-idle/otis__regular__idle__source-v001.png",
    );
    expect(plan.slots[0]?.captureCommand).toContain("npm run art:generate -- capture-download");
  });

  it("renders a runbook that names the subscription limits and capture command", () => {
    const plan = createGeminiSubscriptionBridgePlan({
      runId: "ui-button-v1",
      assetType: "ui-texture",
      name: "Lobby Button",
      bridgeRoot: ".artlab/studio/ui-textures/ui-button-v1/generation",
      inboxRoot: ".artlab/inbox/ui-texture/ui-button-v1",
      slots: [
        {
          slotId: "button-normal",
          prompt: "Generate a normal button state.",
          targetDirectory: ".artlab/runs/ui/button-v1/incoming",
          targetFilename: "button-normal.png",
          reason: "Normal state.",
        },
      ],
    });
    const runbook = renderGeminiSubscriptionBridgeRunbook(plan);

    expect(runbook).toContain("logged-in Gemini web app");
    expect(runbook).toContain("does not use a paid image API");
    expect(runbook).toContain("Fast mode is only allowed for rough draft exploration");
    expect(runbook).toContain("Never use the Color block preset");
    expect(runbook).toContain("npm run art:generate -- capture-download");
    expect(runbook).toContain("button-normal");
  });

  it("records intentional style preset locks instead of hiding them in the prompt", () => {
    const plan = createGeminiSubscriptionBridgePlan({
      runId: "otis-style-lock-v1",
      assetType: "character",
      name: "Otis Vale",
      bridgeRoot: ".artlab/studio/characters/otis-style-lock-v1/generation",
      inboxRoot: ".artlab/inbox/character/otis-style-lock-v1",
      uiSettings: {
        qualityMode: "pro",
        stylePreset: "Approved Tower preset",
        stylePresetPolicy: "approved-style-lock",
      },
      slots: [
        {
          slotId: "otis-regular-idle",
          prompt: "Generate Otis idle.",
          targetDirectory: ".artlab/runs/otis/otis-style-lock-v1/incoming/regular",
          targetFilename: "otis__regular__idle__source-v001.png",
          reason: "Test intentional preset recording.",
        },
      ],
    });

    expect(plan.uiSettings.qualityMode).toBe("pro");
    expect(plan.uiSettings.stylePreset).toBe("Approved Tower preset");
    expect(plan.uiSettings.stylePresetPolicy).toBe("approved-style-lock");
    expect(plan.nextCommands).toContain(
      "Set style preset to Approved Tower preset. Presets are art direction locks and must match the bridge plan.",
    );
  });

  it("blocks the Color block preset for Tower production", () => {
    expect(() => assertAllowedCreativeStylePreset("Color block")).toThrow("forbidden");
    expect(() => createGeminiSubscriptionBridgePlan({
      runId: "bad-style-v1",
      assetType: "character",
      name: "Bad Style",
      bridgeRoot: ".artlab/studio/characters/bad-style-v1/generation",
      inboxRoot: ".artlab/inbox/character/bad-style-v1",
      uiSettings: {
        stylePreset: "Color block",
      },
      slots: [
        {
          slotId: "bad-slot",
          prompt: "Generate a bad preset example.",
          targetDirectory: ".artlab/runs/bad-style-v1/incoming",
          targetFilename: "bad.png",
          reason: "Should fail.",
        },
      ],
    })).toThrow("forbidden");
  });
});
