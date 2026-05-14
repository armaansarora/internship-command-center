import { join } from "node:path";
import type { CreativeProductionPacket } from "./prompts";

export const CREATIVE_PARALLEL_DEFAULT_AGENTS = 5;
export const CREATIVE_PARALLEL_DEFAULT_WAVES = 3;
export const CREATIVE_PARALLEL_DEFAULT_TOTAL_LANES =
  CREATIVE_PARALLEL_DEFAULT_AGENTS * CREATIVE_PARALLEL_DEFAULT_WAVES;
export const CREATIVE_PARALLEL_MAX_TOTAL_LANES = CREATIVE_PARALLEL_DEFAULT_TOTAL_LANES;

export const CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE = {
  model: "gpt-5.5",
  executionMode: "fast",
  reasoningEffort: "xhigh",
  label: "GPT-5.5 fast mode, extra-high reasoning",
} as const;

export const CREATIVE_PARALLEL_STRATEGIES = [
  {
    id: "canonical-safe",
    label: "Canonical Safe",
    mandate: "Stay closest to approved Tower canon while still finding one useful new angle.",
  },
  {
    id: "silhouette-breaker",
    label: "Silhouette Breaker",
    mandate: "Push shape language, posture, and read-at-a-distance variety harder than the baseline.",
  },
  {
    id: "human-imperfection",
    label: "Human Imperfection",
    mandate: "Prioritize lovable lived-in specificity over fake-perfect AI polish.",
  },
  {
    id: "game-sprite",
    label: "Premium Game Sprite",
    mandate: "Lean into Fortnite-adjacent readable game character energy without childish cartooning.",
  },
  {
    id: "material-simplifier",
    label: "Material Simplifier",
    mandate: "Reduce visual noise and prove the asset works cleanly at app scale.",
  },
  {
    id: "prop-forward",
    label: "Prop Forward",
    mandate: "Use a signature object, costume detail, or environmental prop to sharpen story identity.",
  },
  {
    id: "comedic-engine",
    label: "Comedic Engine",
    mandate: "Expose the character or asset's funny recurring behavior through visual design choices.",
  },
  {
    id: "mobile-first-read",
    label: "Mobile First Read",
    mandate: "Optimize for instant recognition and clean composition on a small phone viewport.",
  },
  {
    id: "animation-minded",
    label: "Animation Minded",
    mandate: "Design for later motion states, pose readability, and reusable production slots.",
  },
  {
    id: "dramatic-lighting",
    label: "Dramatic Lighting",
    mandate: "Explore mood, depth, and premium lighting while staying usable behind app UI.",
  },
  {
    id: "weird-but-usable",
    label: "Weird But Usable",
    mandate: "Take one unusual creative swing, then constrain it back into a shippable Tower asset.",
  },
  {
    id: "technical-cleanroom",
    label: "Technical Cleanroom",
    mandate: "Prioritize transparent edges, crop safety, derivative readiness, and manifest cleanliness.",
  },
  {
    id: "relationship-aware",
    label: "Relationship Aware",
    mandate: "Design with the asset's relationship to other Tower characters, rooms, and workflows in mind.",
  },
  {
    id: "editorial-premium",
    label: "Editorial Premium",
    mandate: "Push taste, tailoring, composition, and restraint for a more expensive product feel.",
  },
  {
    id: "wild-card",
    label: "Wild Card",
    mandate: "Make the boldest useful variation that still obeys the asset contract and quality bar.",
  },
] as const;

export const CREATIVE_PARALLEL_WAVE_MANDATES = [
  {
    id: "wide-divergence",
    label: "Wide Divergence",
    mandate: "Generate meaningfully different directions, not near-duplicates.",
  },
  {
    id: "stress-the-brief",
    label: "Stress The Brief",
    mandate: "Challenge assumptions, identify weak spots, and produce better alternatives.",
  },
  {
    id: "ship-ready-filter",
    label: "Ship-Ready Filter",
    mandate: "Favor options that can survive app integration, QA, and future asset scaling.",
  },
] as const;

export type CreativeParallelStrategyId = (typeof CREATIVE_PARALLEL_STRATEGIES)[number]["id"];
export type CreativeParallelWaveMandateId = (typeof CREATIVE_PARALLEL_WAVE_MANDATES)[number]["id"];

export interface CreativeParallelAgentProfile {
  model: typeof CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.model;
  executionMode: typeof CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.executionMode;
  reasoningEffort: typeof CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.reasoningEffort;
  label: typeof CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.label;
}

export interface CreativeParallelLane {
  laneId: string;
  waveNumber: number;
  agentNumber: number;
  strategy: {
    id: CreativeParallelStrategyId;
    label: string;
    mandate: string;
  };
  waveMandate: {
    id: CreativeParallelWaveMandateId;
    label: string;
    mandate: string;
  };
  outputRoot: string;
  laneBriefPath: string;
  agentPromptPath: string;
  outputsRoot: string;
  resultPath: string;
  resultJsonPath: string;
  preflightPath: string;
  status: "ready-for-agent";
  recommendedAgentProfile: CreativeParallelAgentProfile;
  allowedActions: string[];
  forbiddenActions: string[];
}

export interface CreativeParallelWavePlan {
  schemaVersion: "tower-creative-parallel-wave-plan-v1";
  engineVersion: CreativeProductionPacket["engineVersion"];
  parentRunId: string;
  parentOutputRoot: string;
  assetType: CreativeProductionPacket["assetType"];
  name: string;
  brief: string;
  agentsPerWave: number;
  waves: number;
  totalLanes: number;
  parallelRoot: string;
  dispatcherPromptPath: string;
  status: "awaiting-initial-approval" | "ready-for-dispatch";
  statusReason: string;
  defaultAgentProfile: CreativeParallelAgentProfile;
  laneContract: {
    ownsWriteAccessOnlyInsideLane: true;
    parentOwnsMergeReviewPromotion: true;
    requiresResultMarkdown: true;
    requiresHousekeepingNotes: true;
    requiresImprovementNotes: true;
  };
  mergePolicy: string[];
  safetyRules: string[];
  lanes: CreativeParallelLane[];
}

export interface CreativeParallelLaneResultValidationResult {
  ok: boolean;
  missing: string[];
}

export interface CreativeParallelLaneBrief {
  schemaVersion: "tower-creative-parallel-lane-brief-v1";
  parentRunId: string;
  assetType: CreativeProductionPacket["assetType"];
  name: string;
  brief: string;
  promotionPhrase: CreativeProductionPacket["promotionPhrase"];
  lane: CreativeParallelLane;
  parentOwnsMergeReviewPromotion: true;
  recommendedAgentProfile: CreativeParallelAgentProfile;
}

export function assertCreativeParallelCount(
  label: "--parallel-agents" | "--waves",
  value: number,
): number {
  const max = label === "--parallel-agents" ? 8 : 6;

  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${label} must be an integer from 1 to ${max}.`);
  }

  return value;
}

export function assertCreativeParallelShape(
  agentsPerWave: number,
  waves: number,
): { agentsPerWave: number; waves: number; totalLanes: number } {
  const checkedAgents = assertCreativeParallelCount("--parallel-agents", agentsPerWave);
  const checkedWaves = assertCreativeParallelCount("--waves", waves);
  const totalLanes = checkedAgents * checkedWaves;

  if (totalLanes > CREATIVE_PARALLEL_MAX_TOTAL_LANES) {
    throw new Error(`Parallel wave plans are capped at ${CREATIVE_PARALLEL_MAX_TOTAL_LANES} lanes by default.`);
  }

  return {
    agentsPerWave: checkedAgents,
    waves: checkedWaves,
    totalLanes,
  };
}

export function createCreativeParallelLaneBrief(
  plan: CreativeParallelWavePlan,
  lane: CreativeParallelLane,
): CreativeParallelLaneBrief {
  return {
    schemaVersion: "tower-creative-parallel-lane-brief-v1",
    parentRunId: plan.parentRunId,
    assetType: plan.assetType,
    name: plan.name,
    brief: plan.brief,
    promotionPhrase: "approved for app",
    lane,
    recommendedAgentProfile: plan.defaultAgentProfile,
    parentOwnsMergeReviewPromotion: true,
  };
}

export function assertCreativeParallelLaneBrief(value: unknown): CreativeParallelLaneBrief {
  if (!value || typeof value !== "object") {
    throw new Error("Lane brief must be a JSON object.");
  }

  const brief = value as Partial<CreativeParallelLaneBrief>;

  if (brief.schemaVersion !== "tower-creative-parallel-lane-brief-v1") {
    throw new Error("Lane brief schema is invalid.");
  }

  if (
    typeof brief.parentRunId !== "string" ||
    typeof brief.name !== "string" ||
    typeof brief.brief !== "string" ||
    brief.promotionPhrase !== "approved for app" ||
    brief.parentOwnsMergeReviewPromotion !== true ||
    !brief.lane ||
    typeof brief.lane !== "object" ||
    typeof brief.lane.laneId !== "string" ||
    typeof brief.lane.outputRoot !== "string" ||
    typeof brief.lane.resultPath !== "string" ||
    typeof brief.lane.resultJsonPath !== "string"
  ) {
    throw new Error("Lane brief is missing required fields.");
  }

  const recommendedAgentProfile =
    brief.recommendedAgentProfile ?? CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE;

  if (
    recommendedAgentProfile.model !== CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.model ||
    recommendedAgentProfile.reasoningEffort !== CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.reasoningEffort
  ) {
    throw new Error("Lane brief does not use the required default subagent profile.");
  }

  return {
    ...brief,
    recommendedAgentProfile,
  } as CreativeParallelLaneBrief;
}

export function createCreativeParallelWavePlan(input: {
  packet: CreativeProductionPacket;
  agentsPerWave: number;
  waves: number;
  parallelRoot?: string;
}): CreativeParallelWavePlan {
  const shape = assertCreativeParallelShape(input.agentsPerWave, input.waves);
  const agentsPerWave = shape.agentsPerWave;
  const waves = shape.waves;
  const parallelRoot = input.parallelRoot ?? join(input.packet.outputRoot, "parallel");
  const lanes: CreativeParallelLane[] = [];
  const status = input.packet.nextAction === "generate-production-sources"
    ? "ready-for-dispatch"
    : "awaiting-initial-approval";

  for (let waveIndex = 0; waveIndex < waves; waveIndex += 1) {
    for (let agentIndex = 0; agentIndex < agentsPerWave; agentIndex += 1) {
      const laneIndex = waveIndex * agentsPerWave + agentIndex;
      const laneId = `wave-${pad(waveIndex + 1)}-agent-${pad(agentIndex + 1)}`;
      const outputRoot = join(parallelRoot, "lanes", laneId);
      const strategy = CREATIVE_PARALLEL_STRATEGIES[laneIndex % CREATIVE_PARALLEL_STRATEGIES.length];
      const waveMandate = CREATIVE_PARALLEL_WAVE_MANDATES[waveIndex % CREATIVE_PARALLEL_WAVE_MANDATES.length];

      lanes.push({
        laneId,
        waveNumber: waveIndex + 1,
        agentNumber: agentIndex + 1,
        strategy: {
          id: strategy.id,
          label: strategy.label,
          mandate: strategy.mandate,
        },
        waveMandate: {
          id: waveMandate.id,
          label: waveMandate.label,
          mandate: waveMandate.mandate,
        },
        outputRoot,
        laneBriefPath: join(outputRoot, "lane-brief.json"),
        agentPromptPath: join(outputRoot, "agent-prompt.md"),
        outputsRoot: join(outputRoot, "outputs"),
        resultPath: join(outputRoot, "result.md"),
        resultJsonPath: join(outputRoot, "result.json"),
        preflightPath: join(outputRoot, "preflight.json"),
        status: "ready-for-agent",
        recommendedAgentProfile: CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE,
        allowedActions: [
          "read the parent creative packet",
          "create exploratory prompts, notes, previews, and QA observations inside this lane only",
          "write a final result.md with recommendation, risks, and files created",
          "record housekeeping and continuous-improvement notes in the lane result",
        ],
        forbiddenActions: [
          "do not edit sibling lanes",
          "do not write to public/art",
          "do not update the production manifest",
          "do not promote assets",
          "do not delete approved or live assets",
          "do not change the parent creative-brief.json",
        ],
      });
    }
  }

  return {
    schemaVersion: "tower-creative-parallel-wave-plan-v1",
    engineVersion: input.packet.engineVersion,
    parentRunId: input.packet.runId,
    parentOutputRoot: input.packet.outputRoot,
    assetType: input.packet.assetType,
    name: input.packet.name,
    brief: input.packet.brief,
    agentsPerWave,
    waves,
    totalLanes: shape.totalLanes,
    parallelRoot,
    dispatcherPromptPath: join(parallelRoot, "dispatcher-prompt.md"),
    status,
    statusReason: status === "ready-for-dispatch"
      ? "Initial direction is already approved, so lane subagents may be dispatched."
      : "Initial direction approval is required before launching lane subagents.",
    defaultAgentProfile: CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE,
    laneContract: {
      ownsWriteAccessOnlyInsideLane: true,
      parentOwnsMergeReviewPromotion: true,
      requiresResultMarkdown: true,
      requiresHousekeepingNotes: true,
      requiresImprovementNotes: true,
    },
    mergePolicy: [
      "dispatch one subagent per lane prompt, grouped by wave",
      `use ${CREATIVE_PARALLEL_DEFAULT_AGENT_PROFILE.label} for lane subagents when the client exposes that model profile`,
      "run lanes in the same wave concurrently only when compute and image-generation limits allow it",
      "do not let lane agents edit shared code, manifests, public/art, or parent packet files",
      "parent session compares lane results and builds one review board or next packet",
      "human approval remains initial direction approval and final upload-ready approval only",
    ],
    safetyRules: [
      "each lane owns exactly one isolated outputRoot",
      "all generated drafts remain in .artlab until parent review",
      "promotion requires the parent pipeline and the exact phrase approved for app",
      "every lane must include housekeeping and continuous-improvement notes",
      "wacky creative swings are welcome only when the output remains technically usable",
      "15x output may increase variety, never lower the source-quality, QA, approval, or organization bar",
    ],
    lanes,
  };
}

export function validateCreativeParallelLaneResult(input: {
  resultMarkdown: string;
  hasResultJson?: boolean;
  imageOutputCount: number;
  hasPreflight: boolean;
}): CreativeParallelLaneResultValidationResult {
  const text = input.resultMarkdown.trim();
  const missing: string[] = [];

  if (!text) missing.push("result.md content");

  for (const section of [
    "## Strongest Idea Or Output",
    "## What Is Meaningfully Different",
    "## Files Or Prompts Created",
    "## Quality Risks",
    "## Housekeeping Notes",
    "## Continuous-Improvement Notes",
  ]) {
    if (!text.includes(section)) missing.push(section);
  }

  if (/\bTBD\b/i.test(text)) missing.push("resolved non-placeholder content");
  if (!input.hasResultJson) missing.push("result.json");
  if (input.imageOutputCount > 0 && !input.hasPreflight) missing.push("preflight.json for image outputs");

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function renderCreativeParallelDispatcherPrompt(plan: CreativeParallelWavePlan): string {
  return `# Creative Production Engine Parallel Dispatcher

Parent run: ${plan.parentRunId}
Asset: ${plan.name} (${plan.assetType})
Parallel shape: ${plan.agentsPerWave} agents x ${plan.waves} waves = ${plan.totalLanes} lanes
Default lane agent profile: ${plan.defaultAgentProfile.label}
Status: ${plan.status}
Status reason: ${plan.statusReason}

## Goal

Use the lane prompts to create a larger, stranger, more useful option set without sacrificing organization or production safety.

## Dispatch Rules

${renderList(plan.mergePolicy)}

When dispatching from Codex, prefer \`model: "${plan.defaultAgentProfile.model}"\` with \`reasoning_effort: "${plan.defaultAgentProfile.reasoningEffort}"\`. Use fast execution mode where the current client exposes it.
${plan.status === "awaiting-initial-approval" ? "\nDo not launch lane subagents yet. First get Armaan's initial direction approval, then use this packet for 15x execution.\n" : ""}

## Safety Rules

${renderList(plan.safetyRules)}

## Lane Queue

${plan.lanes.map((lane) => `- ${lane.laneId}: ${lane.strategy.label} / ${lane.waveMandate.label} -> ${lane.agentPromptPath}`).join("\n")}

## Merge Gate

After a wave finishes, read every lane \`result.md\`, compare the strongest outputs, record slow or broken steps, and decide whether the next wave should broaden, repair, or converge. Only the parent session may build the final review board, ask Armaan for approval, promote assets, or integrate the app.
`;
}

export function renderCreativeParallelLanePrompt(
  plan: CreativeParallelWavePlan,
  lane: CreativeParallelLane,
): string {
  return `# Creative Production Engine Lane: ${lane.laneId}

You are one parallel lane for The Tower Creative Production Engine.

Parent run: ${plan.parentRunId}
Asset: ${plan.name} (${plan.assetType})
Brief: ${plan.brief}
Required subagent profile: ${lane.recommendedAgentProfile.label}
Machine hint: model: "${lane.recommendedAgentProfile.model}", reasoning_effort: "${lane.recommendedAgentProfile.reasoningEffort}", executionMode: "${lane.recommendedAgentProfile.executionMode}" when available.
If this profile is unavailable, record the fallback model and reason in \`result.md\`.
Wave mandate: ${lane.waveMandate.label} - ${lane.waveMandate.mandate}
Creative strategy: ${lane.strategy.label} - ${lane.strategy.mandate}

## Write Scope

You may write only inside:

\`${lane.outputRoot}\`

Expected files:
- \`${lane.resultPath}\`
- \`${lane.resultJsonPath}\`
- \`${lane.preflightPath}\` if you create or inspect images
- generated or staged exploratory outputs under \`${lane.outputsRoot}\`

## Allowed Actions

${renderList(lane.allowedActions)}

## Forbidden Actions

${renderList(lane.forbiddenActions)}

## Required Result Format

Write \`result.md\` with:
- strongest idea or output
- what is meaningfully different from the other lanes
- generated files or prompts created
- quality risks
- housekeeping notes
- continuous-improvement notes

Also write \`result.json\` with:
- laneId
- strongestIdea
- uniquenessClaim
- outputFiles
- qualityRisks
- fallbackModel
- fallbackReason
- promotionBlockers

Keep the work bold but usable. The parent session owns merge, final review, approval, promotion, and app integration.
Do not trade quality for volume: this lane must meet the same source quality, labeling, QA, and organization standards as a single-run production packet.
`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function renderList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}
