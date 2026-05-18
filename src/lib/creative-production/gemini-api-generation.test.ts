import { describe, expect, it } from "vitest";
import {
  CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE,
  CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR,
  GEMINI_API_DEFAULT_LANE_COUNT,
  GEMINI_NANO_BANANA_2_MODEL,
  assertGeminiNanoBanana2Model,
  createGeminiApiGenerationPlan,
  createGeminiApiProductionFirewallPlans,
  createGeminiGenerateContentPayload,
  estimateGeminiApiCostCents,
  renderGeminiApiRunbook,
} from "./index";

describe("Gemini API v3 generation", () => {
  it("locks Tower paid generation to Nano Banana 2 with five parallel 4K identity concepts by default", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-api-v3",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-api-v3/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-api-v3/gemini-api-v3",
      slots: [
        {
          slotId: "otis-regular-idle",
          prompt: "Generate Otis.",
          targetDirectory: ".artlab/runs/otis/otis-api-v3/incoming/regular",
          targetFilename: "otis__regular__idle__source-v001.png",
          reason: "Pilot source.",
        },
      ],
    });

    expect(plan.schemaVersion).toBe("tower-gemini-api-generation-plan-v3");
    expect(plan.adapter).toBe("gemini-api");
    expect(plan.model).toBe(GEMINI_NANO_BANANA_2_MODEL);
    expect(plan.modelLabel).toBe("Nano Banana 2");
    expect(plan.imageSize).toBe("4K");
    expect(plan.aspectRatio).toBe("9:16");
    expect(plan.laneCount).toBe(GEMINI_API_DEFAULT_LANE_COUNT);
    expect(plan.maxConcurrency).toBe(5);
    expect(plan.slots).toHaveLength(5);
    expect(new Set(plan.slots.map((slot) => slot.laneId)).size).toBe(5);
    expect(plan.costGuard.maxBaseSlotsForInitialDesign).toBe(1);
    expect(plan.costGuard.defaultInitialDesignTotalImages).toBe(5);
    expect(plan.secretPolicy.keyIsNeverStoredInRepo).toBe(true);
    expect(plan.secretPolicy.acceptedEnvVars).toContain("GEMINI_API_KEY");
    expect(plan.costGuard.disableGroundingByDefault).toBe(true);
    expect(plan.slots[0]?.request.responseModalities).toEqual(["IMAGE"]);
  });

  it("uses broad prompt-only lane mandates during initial design instead of approved-identity constraints", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-prompt-only",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-prompt-only/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-prompt-only/gemini-api-v3",
      phase: "initial-design",
      slots: [
        {
          slotId: "otis-design",
          prompt: "Generate Otis from prompt only.",
          targetDirectory: ".artlab/runs/otis/otis-prompt-only/incoming",
          targetFilename: "otis__design__source-v001.png",
          reason: "Initial prompt-only concept.",
        },
      ],
    });

    expect(plan.lanes.map((lane) => lane.label)).toEqual([
      "Warm Classic Concierge",
      "Retired Showman",
      "Neighborhood Elder",
      "Elegant Old Guard",
      "Cozy Oddball Mentor",
    ]);
    expect(plan.slots[0]?.prompt).toContain("No character identity has been approved yet");
    expect(plan.slots[0]?.prompt).not.toContain("Do not redesign the approved character identity");
  });

  it("keeps a shared high-detail quality floor separate from every unique initial-design identity mandate", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-no-quality-ramp",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-no-quality-ramp/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-no-quality-ramp/gemini-api-v3",
      phase: "initial-design",
      slots: [
        {
          slotId: "otis-design",
          prompt: "Generate Otis from prompt only.",
          targetDirectory: ".artlab/runs/otis/otis-no-quality-ramp/incoming",
          targetFilename: "otis__design__source-v001.png",
          reason: "Initial prompt-only concept.",
        },
      ],
    });

    plan.slots.forEach((slot, index) => {
      const lane = plan.lanes[index]!;

      expect(slot.prompt).toContain(`Shared initial-concept lane quality floor: ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}`);
      expect(slot.prompt).toContain("Lane 05-level material detail");
      expect(slot.prompt).toContain("fabric seams, buttons, hair/beard rendering, brass highlights");
      expect(slot.prompt).toContain("confident contrast, dimensional lighting, and high-resolution premium game-sprite finish");
      expect(slot.prompt).toContain(`Initial-concept lane variation rule: ${CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE}`);
      expect(slot.prompt).toContain("Lane variation must not change rendering quality, amount of detail, sharpness, contrast, or polish");
      expect(slot.prompt).toContain(`Unique identity mandate (${lane.label}): ${lane.mandate}`);
    });
  });

  it("keeps approved identity constraints for production packs", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-production-pack",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-production-pack/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-production-pack/gemini-api-v3",
      phase: "production-pack",
      referenceImages: [
        {
          path: ".artlab/characters/otis/references/identity/otis.png",
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      slots: [
        {
          slotId: "otis-regular-idle",
          prompt: "Generate approved Otis idle.",
          targetDirectory: ".artlab/runs/otis/production/incoming",
          targetFilename: "otis__regular__idle.png",
          reason: "Production pose.",
        },
      ],
    });

    expect(plan.lanes[0]?.label).toBe("Canonical Safe");
    expect(plan.slots[0]?.prompt).toContain("Do not redesign the approved character identity");
  });

  it("lets production packs generate one locked lane across many assets with five-way API concurrency", () => {
    const productionSlots = Array.from({ length: 24 }, (_, index) => ({
      slotId: `otis-production-${index + 1}`,
      prompt: `Generate approved Otis production asset ${index + 1}.`,
      targetDirectory: ".artlab/runs/otis/production/incoming",
      targetFilename: `otis__production_${index + 1}__source-v001.png`,
      reason: "Production packet asset.",
    }));
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-production-one-lane",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-production-one-lane/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-production-one-lane/gemini-api-v3",
      phase: "production-pack",
      laneCount: 1,
      maxConcurrency: 5,
      referenceImages: [
        {
          path: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      slots: productionSlots,
    });

    expect(plan.laneCount).toBe(1);
    expect(plan.maxConcurrency).toBe(5);
    expect(plan.slots).toHaveLength(24);
    expect(new Set(plan.slots.map((slot) => slot.laneId))).toEqual(new Set(["api-lane-01"]));
    expect(plan.estimatedCostCents).toBeCloseTo(362.4);
  });

  it("splits production packs into a one-slot canary plan and a blocked full plan", () => {
    const productionSlots = Array.from({ length: 24 }, (_, index) => ({
      slotId: index === 0 ? "otis-regular-idle" : `otis-production-${index + 1}`,
      prompt: `Generate approved Otis production asset ${index + 1}.`,
      targetDirectory: ".artlab/runs/otis/production/incoming",
      targetFilename: `otis__production_${index + 1}__source-v001.png`,
      reason: "Production packet asset.",
    }));
    const { canaryPlan, fullPlan, canaryGatePath, budgetLedgerPath } = createGeminiApiProductionFirewallPlans({
      runId: "otis-production-firewall",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-production-firewall/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-production-firewall/gemini-api-v3",
      phase: "production-pack",
      laneCount: 1,
      maxConcurrency: 5,
      budgetCents: 600,
      referenceImages: [
        {
          path: ".artlab/characters/otis/model/otis_winner-ref_v001.png",
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      slots: productionSlots,
    });

    expect(canaryPlan.status).toBe("ready-for-api-generation");
    expect(canaryPlan.firewall?.planRole).toBe("canary");
    expect(canaryPlan.slots).toHaveLength(1);
    expect(canaryPlan.slots[0]?.baseSlotId).toBe("otis-regular-idle");
    expect(fullPlan.status).toBe("blocked-pending-canary");
    expect(fullPlan.firewall?.planRole).toBe("full");
    expect(fullPlan.firewall?.requiresCanary).toBe(true);
    expect(fullPlan.firewall?.canaryGatePath).toBe(canaryGatePath);
    expect(fullPlan.firewall?.budgetLedgerPath).toBe(budgetLedgerPath);
    expect(fullPlan.slots).toHaveLength(24);
  });

  it("rejects initial design plans with more than one base slot so concept selection stays five total images", () => {
    expect(() => createGeminiApiGenerationPlan({
      runId: "otis-too-many-probes",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-too-many-probes/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-too-many-probes/gemini-api-v3",
      phase: "initial-design",
      slots: [
        {
          slotId: "otis-design-idle",
          prompt: "Generate Otis idle.",
          targetDirectory: ".artlab/runs/otis/initial/incoming",
          targetFilename: "otis__design__idle.png",
          reason: "Initial concept.",
        },
        {
          slotId: "otis-design-greeting",
          prompt: "Generate Otis greeting.",
          targetDirectory: ".artlab/runs/otis/initial/incoming",
          targetFilename: "otis__design__greeting.png",
          reason: "Initial concept.",
        },
      ],
    })).toThrow("Initial design API runs must use exactly one base slot");
  });

  it("rejects identity references during initial design so the five concepts can be meaningfully different", () => {
    expect(() => createGeminiApiGenerationPlan({
      runId: "otis-reference-locked",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-reference-locked/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-reference-locked/gemini-api-v3",
      phase: "initial-design",
      referenceImages: [
        {
          path: ".artlab/characters/otis/references/identity/otis.png",
          mimeType: "image/png",
          role: "identity-reference",
        },
      ],
      slots: [
        {
          slotId: "otis-design",
          prompt: "Generate Otis.",
          targetDirectory: ".artlab/runs/otis/initial/incoming",
          targetFilename: "otis__design.png",
          reason: "Initial concept.",
        },
      ],
    })).toThrow("Initial design API runs cannot include reference images");
  });

  it("rejects non Nano Banana 2 models before plan creation", () => {
    expect(() => assertGeminiNanoBanana2Model("gemini-3-pro-image-preview")).toThrow("locked");
    expect(() => createGeminiApiGenerationPlan({
      runId: "wrong-model",
      assetType: "character",
      name: "Wrong",
      planRoot: ".artlab/studio/characters/wrong/generation",
      inboxRoot: ".artlab/inbox/character/wrong",
      model: "gemini-3-pro-image-preview",
      slots: [
        {
          slotId: "slot-a",
          prompt: "Generate.",
          targetDirectory: ".artlab/runs/wrong/incoming",
          targetFilename: "slot-a.png",
          reason: "Wrong model.",
        },
      ],
    })).toThrow("locked");
  });

  it("blocks estimated cost above the run budget", () => {
    expect(() => createGeminiApiGenerationPlan({
      runId: "expensive",
      assetType: "character",
      name: "Expensive",
      planRoot: ".artlab/studio/characters/expensive/generation",
      inboxRoot: ".artlab/inbox/character/expensive",
      budgetCents: 10,
      slots: [
        {
          slotId: "slot-a",
          prompt: "Generate.",
          targetDirectory: ".artlab/runs/expensive/incoming",
          targetFilename: "slot-a.png",
          reason: "Should exceed budget.",
        },
      ],
    })).toThrow("exceeds budget");
  });

  it("creates a Gemini generateContent payload with image-only response and optional references", () => {
    const payload = createGeminiGenerateContentPayload({
      prompt: "Generate Otis.",
      aspectRatio: "9:16",
      imageSize: "4K",
      referenceImages: [
        {
          mimeType: "image/png",
          dataBase64: "abc123",
        },
      ],
    });

    expect(payload.generationConfig.responseModalities).toEqual(["IMAGE"]);
    expect(payload.generationConfig.imageConfig).toEqual({
      aspectRatio: "9:16",
      imageSize: "4K",
    });
    expect(payload.contents[0]?.role).toBe("user");
    expect(payload.contents[0]?.parts).toContainEqual({
      inline_data: {
        mime_type: "image/png",
        data: "abc123",
      },
    });
  });

  it("renders a runbook that teaches secret handling and approval gating", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-api-v3",
      assetType: "character",
      name: "Otis",
      planRoot: ".artlab/studio/characters/otis-api-v3/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-api-v3/gemini-api-v3",
      slots: [
        {
          slotId: "otis-regular-idle",
          prompt: "Generate Otis.",
          targetDirectory: ".artlab/runs/otis/otis-api-v3/incoming/regular",
          targetFilename: "otis__regular__idle__source-v001.png",
          reason: "Pilot source.",
        },
      ],
    });
    const runbook = renderGeminiApiRunbook(plan);

    expect(runbook).toContain("gemini-3.1-flash-image-preview");
    expect(runbook).toContain("Never write API keys");
    expect(runbook).toContain("approved for app");
    expect(runbook).toContain("npm run art:generate -- run-api");
  });

  it("estimates cost from billable image count", () => {
    expect(estimateGeminiApiCostCents({ billableImages: 5, costPerImageCents: 15.1 })).toBe(75.5);
  });
});
