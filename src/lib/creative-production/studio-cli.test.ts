import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATIVE_ASSET_TYPES,
  getCreativeAssetTypeDefinition,
  type CreativeAssetType,
} from "./index";

const tsx = join(process.cwd(), "node_modules/.bin/tsx");

function countOccurrences(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

describe("art:studio CLI", () => {
  it("prints the guided creative production opening and writes state", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("What are we adding to The Tower today?");
    expect(output).toContain("So far we have done");
    expect(output).toContain("I suggest we do Priya Sen");
    expect(output).toContain("63/252 approved production sprites");
    expect(output).toContain("Promoted characters: Otis Vale (otis), Mara Voss (ceo), Rafe Calder (cro)");
    expect(output).toContain("Still remaining");
    expect(output).toContain("Known warnings");
    expect(output).toContain("character, environment, prop, ui-texture, animation, scene, icon-system, marketing-hero, shader");

    const state = JSON.parse(readFileSync(join(root, "state.json"), "utf8")) as { schemaVersion: string };
    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
    expect(existsSync(join(root, "ledgers", "housekeeping.jsonl"))).toBe(true);
    expect(existsSync(join(root, "ledgers", "improvements.jsonl"))).toBe(true);
  });

  it("summarizes continuous-improvement ledgers into an upgrade report", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-improve-"));
    const ledgerRoot = join(root, "ledgers");

    mkdirSync(ledgerRoot, { recursive: true });
    for (let index = 1; index <= 5; index += 1) {
      writeFileSync(join(ledgerRoot, "improvements.jsonl"), `${JSON.stringify({
        gate: "continuous-improvement",
        recordedAt: "2026-05-15T00:00:00.000Z",
        runId: `run-${index}`,
        phase: index % 2 === 0 ? "qa" : "generation",
        category: index === 4 ? "quality-failure" : "manual-step",
        severity: index === 4 ? "high" : "medium",
        finding: "Repeated friction needs a pipeline patch.",
        action: "Turn the repeated friction into a command and test.",
      })}\n`, { flag: "a" });
    }

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "improve",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const reportPath = join(root, "continuous-improvement-report.json");
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      maturityStage: string;
      upgradeRequired: boolean;
      nextActions: string[];
    };

    expect(output).toContain("Continuous improvement report");
    expect(output).toContain("upgrade-required");
    expect(report.maturityStage).toBe("upgrade-required");
    expect(report.upgradeRequired).toBe(true);
    expect(report.nextActions.join(" ")).toContain("before continuing production");
  });

  it("rejects state roots outside the repo or art lab unless explicitly under temp for tests", () => {
    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        "../../outside",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/state-root must stay inside/);
  });

  it("creates a universal production packet after the guided brief is known", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-packet-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--asset-type",
      "environment",
      "--name",
      "War Room Background",
      "--brief",
      "A kinetic but premium applications command room background.",
      "--run-id",
      "war-room-bg-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Created Creative Production Engine packet");
    expect(output).toContain("Created Creative Production Engine parallel wave plan: 5 lanes");
    expect(output).toContain("War Room Background");

    const packetPath = join(root, "environments", "war-room-bg-v1", "creative-brief.json");
    const promptPath = join(root, "environments", "war-room-bg-v1", "prompt.md");
    const actionPath = join(root, "environments", "war-room-bg-v1", "next-action.md");
    const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
      assetType: string;
      name: string;
      gates: string[];
      promotionPhrase: string;
    };

    expect(packet.assetType).toBe("environment");
    expect(packet.name).toBe("War Room Background");
    expect(packet.gates).toEqual(["Housekeeping Gate", "Continuous Improvement Gate"]);
    expect(packet.promotionPhrase).toBe("approved for app");
    expect(readFileSync(promptPath, "utf8")).toContain("A kinetic but premium applications command room background.");
    expect(readFileSync(actionPath, "utf8")).toContain("Next Legal Action");
    expect(existsSync(join(root, "environments", "war-room-bg-v1", "parallel", "parallel-plan.json"))).toBe(true);
  });

  it("turns a natural-language background request into an organized environment run", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-request-bg-"));
    const today = new Date().toISOString().slice(0, 10);

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Create a new immersive background screen for the application war room.",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Routed request to environment");
    expect(output).toContain("Application War Room Background Screen");
    expect(output).toContain("Created Creative Production Engine parallel wave plan: 5 lanes");

    const runRoot = join(root, "environments", `${today}-application-war-room-background-screen`);
    const packet = JSON.parse(readFileSync(join(runRoot, "creative-brief.json"), "utf8")) as {
      assetType: string;
      name: string;
      intake: { rawRequest: string; routingReason: string };
      requiredOutputs: string[];
      acceptanceChecks: string[];
    };

    expect(packet.assetType).toBe("environment");
    expect(packet.name).toBe("Application War Room Background Screen");
    expect(packet.intake.rawRequest).toBe("Create a new immersive background screen for the application war room.");
    expect(packet.intake.routingReason).toContain("environment");
    expect(packet.requiredOutputs).toContain("desktop, tablet, and mobile crops");
    expect(packet.acceptanceChecks).toContain("approved lobby backgrounds are untouched unless the request explicitly targets a new replacement run");
    expect(readFileSync(join(runRoot, "prompt.md"), "utf8")).toContain("desktop, tablet, and mobile crops");
    expect(existsSync(join(runRoot, "parallel", "parallel-plan.json"))).toBe(true);
  });

  it("turns a natural-language UI request into a ui-texture run with state outputs", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-request-ui-"));
    const today = new Date().toISOString().slice(0, 10);

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Make a small premium UI button texture for the lobby controls.",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Routed request to ui-texture");

    const packetPath = join(root, "ui-textures", `${today}-lobby-controls-button-texture`, "creative-brief.json");
    const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
      assetType: string;
      requiredOutputs: string[];
      acceptanceChecks: string[];
    };

    expect(packet.assetType).toBe("ui-texture");
    expect(packet.requiredOutputs).toContain("normal, hover, active, focus, disabled, and reduced-motion states");
    expect(packet.acceptanceChecks).toContain("text, icon, and hit-area sizing remain controlled by app CSS, not baked into decorative art");
  });

  it("skips concept-board action when a request says the design is already approved", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-request-approved-"));

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Redo Otis with the same approved design and generate the production source sprites.",
      "--run-id",
      "approved-otis-redo",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const runRoot = join(root, "characters", "approved-otis-redo");
    const packet = JSON.parse(readFileSync(join(runRoot, "creative-brief.json"), "utf8")) as {
      nextAction: string;
      intake: { initialApprovalStatus: string };
    };

    expect(packet.nextAction).toBe("generate-production-sources");
    expect(packet.intake.initialApprovalStatus).toBe("already-approved");
    expect(readFileSync(join(runRoot, "next-action.md"), "utf8")).toContain("Generate production sources");
  });

  it("dispatches initial concept generation when the request is explicit and a budget cap is configured", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-request-budgeted-initial-"));

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Generate five prompt-only initial Otis designs from scratch.",
      "--run-id",
      "budgeted-otis-initial",
      "--budget-cents",
      "1000",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const runRoot = join(root, "characters", "budgeted-otis-initial");
    const packet = JSON.parse(readFileSync(join(runRoot, "creative-brief.json"), "utf8")) as {
      nextAction: string;
      promotionPhrase: string;
      intake: { initialApprovalStatus: string; apiBudgetCents?: number };
    };
    const plan = JSON.parse(readFileSync(join(runRoot, "parallel", "parallel-plan.json"), "utf8")) as {
      status: string;
      statusReason: string;
    };
    const directive = JSON.parse(readFileSync(join(runRoot, "next-image-generation-step.json"), "utf8")) as {
      directivePath: string;
      generateFirst: Array<{ slot: string }>;
    };

    expect(packet.nextAction).toBe("generate-concept-options");
    expect(packet.promotionPhrase).toBe("approved for app");
    expect(packet.intake.initialApprovalStatus).toBe("generation-approved");
    expect(packet.intake.apiBudgetCents).toBe(1000);
    expect(plan.status).toBe("ready-for-dispatch");
    expect(plan.statusReason).toContain("budget cap");
    expect(directive.generateFirst).toEqual([{ slot: "otis-design", sourceFilename: "otis__design__source-v001.png", targetDirectory: ".artlab/runs/otis/budgeted-otis-initial/incoming", reason: "Generate five prompt-only initial concept lanes before identity approval." }]);
    const directiveMarkdown = readFileSync(directive.directivePath, "utf8");

    expect(directiveMarkdown).toContain("Generate five prompt-only initial Otis designs from scratch.");
    expect(directiveMarkdown).toContain("warm front desk steward");
    expect(directiveMarkdown).toContain("No readable text on props");
    expect(directiveMarkdown).toContain("premium stylized high-detail app/game character art");
    expect(directiveMarkdown).toContain("Otis-compatible Tower character style");
    expect(directiveMarkdown).toContain("modern premium game UI dialogue-sprite finish");
    expect(directiveMarkdown).toContain("Shared lane quality floor");
    expect(directiveMarkdown).toContain("same premium finish");
    expect(directiveMarkdown).toContain("Allowed lane variation");
    expect(directiveMarkdown).toContain("Do not vary rendering style, quality, camera/framing, lighting, source model, or Tower-world fit");
    expect(directiveMarkdown).not.toMatch(/\b(hyperreal|photo|photograph|photoreal|actual person|real person|person-like|storybook|watercolor|pastel|flat cartoon|corporate stock|stock photo)\b/i);
    expect(directiveMarkdown).toContain("approved for app");
    expect(countOccurrences(directiveMarkdown, /clean raster shapes/gi)).toBeLessThanOrEqual(1);
    expect(countOccurrences(directiveMarkdown, /subtle controlled depth/gi)).toBeLessThanOrEqual(1);
  });

  it("creates a default parallel wave plan with isolated lane briefs and lane mode setup", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-parallel-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Redo Otis with the same approved design and generate lots of varied source options.",
      "--run-id",
      "otis-parallel-wave-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Created Creative Production Engine parallel wave plan: 5 lanes");

    const runRoot = join(root, "characters", "otis-parallel-wave-v1");
    const planPath = join(runRoot, "parallel", "parallel-plan.json");
    const dispatcherPromptPath = join(runRoot, "parallel", "dispatcher-prompt.md");
    const firstLaneRoot = join(runRoot, "parallel", "lanes", "wave-01-agent-01");
    const firstLaneBriefPath = join(firstLaneRoot, "lane-brief.json");
    const firstLanePromptPath = join(firstLaneRoot, "agent-prompt.md");
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
      status: string;
      statusReason: string;
      totalLanes: number;
      defaultAgentProfile: { model: string; reasoningEffort: string; executionMode: string; label: string };
      lanes: Array<{ outputRoot: string; laneId: string; recommendedAgentProfile: { model: string } }>;
    };

    expect(plan.status).toBe("ready-for-dispatch");
    expect(plan.statusReason).toContain("already approved");
    expect(plan.totalLanes).toBe(5);
    expect(plan.defaultAgentProfile).toEqual({
      model: "gpt-5.5",
      executionMode: "fast",
      reasoningEffort: "xhigh",
      label: "GPT-5.5 fast mode, extra-high reasoning",
    });
    expect(new Set(plan.lanes.map((lane) => lane.outputRoot)).size).toBe(5);
    expect(plan.lanes.every((lane) => lane.recommendedAgentProfile.model === "gpt-5.5")).toBe(true);
    expect(readFileSync(dispatcherPromptPath, "utf8")).toContain("5 agents x 1 wave = 5 lanes");
    expect(readFileSync(dispatcherPromptPath, "utf8")).toContain("model: \"gpt-5.5\"");
    expect(readFileSync(firstLanePromptPath, "utf8")).toContain("You may write only inside");
    expect(readFileSync(firstLanePromptPath, "utf8")).toContain("reasoning_effort: \"xhigh\"");

    const stateBeforeLane = readFileSync(join(root, "state.json"), "utf8");
    const laneOutput = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "lane",
      "--lane-brief",
      firstLaneBriefPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(laneOutput).toContain("Prepared isolated CPE lane: wave-01-agent-01");
    expect(readFileSync(join(root, "state.json"), "utf8")).toBe(stateBeforeLane);
    expect(existsSync(join(firstLaneRoot, "lane-status.json"))).toBe(true);
    expect(existsSync(join(firstLaneRoot, "result-template.md"))).toBe(true);
    expect(existsSync(join(firstLaneRoot, "outputs"))).toBe(true);
  }, 20000);

  it("validates lane results before coordinator merge", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-lane-validate-"));

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Redo Otis with the same approved design and generate source options.",
      "--run-id",
      "otis-lane-validate-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const firstLaneRoot = join(root, "characters", "otis-lane-validate-v1", "parallel", "lanes", "wave-01-agent-01");
    const firstLaneBriefPath = join(firstLaneRoot, "lane-brief.json");

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "lane",
      "--lane-brief",
      firstLaneBriefPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--mode",
        "validate-lane",
        "--lane-brief",
        firstLaneBriefPath,
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/Lane result is incomplete/);

    mkdirSync(join(firstLaneRoot, "outputs"), { recursive: true });
    writeFileSync(join(firstLaneRoot, "outputs", "source.png"), "fake image");
    writeFileSync(join(firstLaneRoot, "preflight.json"), "{\"ok\":true}\n");
    writeFileSync(join(firstLaneRoot, "result.json"), JSON.stringify({
      laneId: "wave-01-agent-01",
      strongestIdea: "Soft Otis source candidate.",
      uniquenessClaim: "Friendlier face and softer posture.",
      outputFiles: ["outputs/source.png"],
      qualityRisks: ["Needs real image QA after generation."],
      fallbackModel: "gpt-5.5",
      fallbackReason: "",
      promotionBlockers: [],
    }, null, 2));
    writeFileSync(join(firstLaneRoot, "result.md"), [
      "# wave-01-agent-01 Result",
      "## Strongest Idea Or Output",
      "Soft Otis source candidate.",
      "## What Is Meaningfully Different",
      "Friendlier face and softer posture.",
      "## Files Or Prompts Created",
      "- outputs/source.png",
      "## Quality Risks",
      "- Needs real image QA after generation.",
      "## Housekeeping Notes",
      "- Kept source prompt and preview.",
      "## Continuous-Improvement Notes",
      "- Preflight should be automated earlier.",
    ].join("\n\n"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "validate-lane",
      "--lane-brief",
      firstLaneBriefPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Validated isolated CPE lane result: wave-01-agent-01");
  }, 20000);

  it("validates prompt-only lane artifacts without image preflight", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-prompt-lane-"));

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Redo Otis with the same approved design and create prompt packets.",
      "--run-id",
      "otis-prompt-lane-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const firstLaneRoot = join(root, "characters", "otis-prompt-lane-v1", "parallel", "lanes", "wave-01-agent-01");
    const firstLaneBriefPath = join(firstLaneRoot, "lane-brief.json");

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "lane",
      "--lane-brief",
      firstLaneBriefPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    mkdirSync(join(firstLaneRoot, "outputs"), { recursive: true });
    writeFileSync(join(firstLaneRoot, "outputs", "prompt-packet.md"), "Prompt packet");
    writeFileSync(join(firstLaneRoot, "result.json"), JSON.stringify({
      laneId: "wave-01-agent-01",
      strongestIdea: "Soft Otis prompt packet.",
      uniquenessClaim: "Creates mergeable generation instructions without image binaries.",
      outputFiles: ["outputs/prompt-packet.md"],
      qualityRisks: ["Needs image generation later."],
      fallbackModel: "gpt-5.5",
      fallbackReason: "",
      promotionBlockers: ["No native image sources yet."],
    }, null, 2));
    writeFileSync(join(firstLaneRoot, "result.md"), [
      "# wave-01-agent-01 Result",
      "## Strongest Idea Or Output",
      "Soft Otis prompt packet.",
      "## What Is Meaningfully Different",
      "Creates mergeable generation instructions without image binaries.",
      "## Files Or Prompts Created",
      "- outputs/prompt-packet.md",
      "## Quality Risks",
      "- Needs image generation later.",
      "## Housekeeping Notes",
      "- Kept prompt-packet.md only.",
      "## Continuous-Improvement Notes",
      "- Prompt-only lanes should not require image preflight.",
    ].join("\n\n"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "validate-lane",
      "--lane-brief",
      firstLaneBriefPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Validated isolated CPE lane result: wave-01-agent-01");
    expect(output).toContain("Image outputs checked: 0");
  }, 20000);

  it("coordinates a complete five-lane run into review artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-coordinate-"));

    execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Redo Otis with the same approved design and generate source options.",
      "--run-id",
      "otis-coordinate-v1",
    ], { cwd: process.cwd(), encoding: "utf8" });

    const planPath = join(root, "characters", "otis-coordinate-v1", "parallel", "parallel-plan.json");
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
      lanes: Array<{
        laneId: string;
        outputRoot: string;
        outputsRoot: string;
        resultPath: string;
        resultJsonPath: string;
        preflightPath: string;
      }>;
    };

    plan.lanes.forEach((lane, index) => {
      mkdirSync(lane.outputsRoot, { recursive: true });
      writeFileSync(join(lane.outputsRoot, `source-${index}.png`), "fake image");
      writeFileSync(lane.preflightPath, JSON.stringify({
        ok: true,
        checks: ["resolution", "alpha", "app-preview"],
        warnings: [],
        blockers: [],
        files: [`outputs/source-${index}.png`],
      }, null, 2));
      writeFileSync(lane.resultJsonPath, JSON.stringify({
        laneId: lane.laneId,
        strongestIdea: `Tower approved Otis source option ${index}`,
        uniquenessClaim: `Distinct posture, warmth, and app preview route ${index}.`,
        outputFiles: [`outputs/source-${index}.png`],
        qualityRisks: ["Needs final visual inspection."],
        fallbackModel: "gpt-5.5",
        fallbackReason: "",
        promotionBlockers: [],
      }, null, 2));
      writeFileSync(lane.resultPath, [
        `# ${lane.laneId} Result`,
        "## Strongest Idea Or Output",
        `Tower approved Otis source option ${index}`,
        "## What Is Meaningfully Different",
        `Distinct posture, warmth, and app preview route ${index}.`,
        "## Files Or Prompts Created",
        `- outputs/source-${index}.png`,
        "## Quality Risks",
        "- Needs final visual inspection.",
        "## Housekeeping Notes",
        "- Kept labeled outputs only.",
        "## Continuous-Improvement Notes",
        "- Coordinator should compare candidates automatically.",
      ].join("\n\n"));
    });

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--mode",
      "coordinate",
      "--parallel-plan",
      planPath,
    ], { cwd: process.cwd(), encoding: "utf8" });

    const parallelRoot = join(root, "characters", "otis-coordinate-v1", "parallel");

    expect(output).toContain("Created coordinator review");
    expect(existsSync(join(parallelRoot, "coordinator-review.json"))).toBe(true);
    expect(existsSync(join(parallelRoot, "coordinator-report.md"))).toBe(true);
    expect(existsSync(join(parallelRoot, "review-board.html"))).toBe(true);
    expect(existsSync(join(parallelRoot, "promotion-gate.json"))).toBe(true);

    const gate = JSON.parse(readFileSync(join(parallelRoot, "promotion-gate.json"), "utf8")) as { status: string };

    expect(gate.status).toBe("ready-for-final-approval");
    expect(readFileSync(join(parallelRoot, "review-board.html"), "utf8")).toContain("Review Board");
  }, 20000);

  it("allows an explicit single-thread diagnostic escape hatch", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-no-parallel-"));

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
      "--request",
      "Create a diagnostic UI texture packet without fan-out.",
      "--run-id",
      "diagnostic-ui-texture",
      "--no-parallel",
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Created Creative Production Engine packet");
    expect(output).not.toContain("parallel wave plan");
    expect(existsSync(join(root, "ui-textures", "diagnostic-ui-texture", "parallel"))).toBe(false);
  });

  it("creates packets for every registered asset type without character-only assumptions", () => {
    for (const assetType of CREATIVE_ASSET_TYPES) {
      const root = mkdtempSync(join(tmpdir(), `tower-${assetType}-packet-`));
      const runId = `${assetType}-packet-v1`;

      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-type",
        assetType,
        "--name",
        `${assetType} packet`,
        "--brief",
        `Create a production packet for ${assetType}.`,
        "--run-id",
        runId,
        "--no-parallel",
      ], { cwd: process.cwd(), encoding: "utf8" });

      const folder = getCreativeAssetTypeDefinition(assetType as CreativeAssetType).outputRoot.split("/").at(-1) ?? assetType;
      const packetPath = join(root, folder, runId, "creative-brief.json");
      const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
        assetType: string;
        outputRoot: string;
      };

      expect(packet.assetType).toBe(assetType);
      expect(packet.outputRoot).toContain(join(root, folder, runId));
      expect(JSON.stringify(packet)).not.toContain("outfitVariant");
      expect(existsSync(join(root, folder, runId, "ledgers", "housekeeping.jsonl"))).toBe(true);
      expect(existsSync(join(root, folder, runId, "ledgers", "improvements.jsonl"))).toBe(true);
    }
  }, 20000);

  it("rejects unknown flags and unsafe run ids", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-invalid-"));

    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-typo",
        "environment",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/Unknown flag/);

    expect(() =>
      execFileSync(tsx, [
        "scripts/creative-production-engine.ts",
        "--state-root",
        root,
        "--asset-type",
        "environment",
        "--name",
        "Escape",
        "--brief",
        "Try to escape the packet root.",
        "--run-id",
        "../escape",
      ], { cwd: process.cwd(), encoding: "utf8" }),
    ).toThrow(/--run-id/);
  });

  it("backs up corrupt state instead of silently overwriting it", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-art-studio-corrupt-"));
    const statePath = join(root, "state.json");

    writeFileSync(statePath, "{ not json");

    const output = execFileSync(tsx, [
      "scripts/creative-production-engine.ts",
      "--state-root",
      root,
    ], { cwd: process.cwd(), encoding: "utf8" });

    expect(output).toContain("Recovered corrupt state backup");
    expect(readdirSync(root).some((name) => name.startsWith("state.json.corrupt-"))).toBe(true);
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-studio-state-v1",
    });
  });
});
