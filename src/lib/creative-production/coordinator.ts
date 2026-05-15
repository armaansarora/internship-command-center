import type { CreativeParallelWavePlan } from "./parallel";
import { validateCreativeParallelLaneResult } from "./parallel";

const SECTION_TITLES = [
  "Strongest Idea Or Output",
  "What Is Meaningfully Different",
  "Files Or Prompts Created",
  "Quality Risks",
  "Housekeeping Notes",
  "Continuous-Improvement Notes",
] as const;

const IMAGE_OUTPUT_PATTERN = /\.(avif|gif|jpe?g|png|webp|mp4|mov|webm)$/i;

type SectionTitle = (typeof SECTION_TITLES)[number];

export interface CreativeLaneResultJson {
  laneId?: string;
  strongestIdea?: string;
  uniquenessClaim?: string;
  outputFiles?: string[];
  qualityRisks?: string[];
  fallbackModel?: string;
  fallbackReason?: string;
  promotionBlockers?: string[];
}

export interface CreativeLanePreflight {
  ok?: boolean;
  checks?: string[];
  warnings?: string[];
  blockers?: string[];
  files?: string[];
}

export interface CreativeCoordinatorLaneInput {
  laneId: string;
  strategyLabel: string;
  waveMandateLabel: string;
  resultMarkdown: string;
  resultJson?: CreativeLaneResultJson;
  outputFiles: string[];
  preflight?: CreativeLanePreflight;
  hasResultJson: boolean;
  hasPreflight: boolean;
}

export interface CreativeLaneScore {
  briefFit: number;
  distinctiveness: number;
  productionReadiness: number;
  qualityEvidence: number;
  styleConsistency: number;
  riskClarity: number;
  totalScore: number;
}

export interface CreativeCoordinatorLaneResult extends CreativeCoordinatorLaneInput {
  sections: Record<SectionTitle, string>;
  strongestIdea: string;
  uniquenessClaim: string;
  qualityRisks: string[];
  promotionBlockers: string[];
  validationMissing: string[];
  score: CreativeLaneScore;
  normalizedIdeaKey: string;
  status: "complete" | "blocked";
}

export interface CreativeDuplicateGroup {
  groupId: string;
  laneIds: string[];
  reason: string;
  winnerLaneId: string;
}

export interface CreativePromotionGateResult {
  status: "blocked" | "ready-for-final-approval";
  blockers: string[];
}

export interface CreativeCoordinatorReview {
  schemaVersion: "tower-creative-coordinator-review-v1";
  parentRunId: string;
  assetType: CreativeParallelWavePlan["assetType"];
  name: string;
  totalLanes: number;
  completedLaneCount: number;
  blockedLaneCount: number;
  lanes: CreativeCoordinatorLaneResult[];
  duplicateGroups: CreativeDuplicateGroup[];
  topCandidates: CreativeCoordinatorLaneResult[];
  promotionGate: CreativePromotionGateResult;
}

export function createCreativeCoordinatorReview(input: {
  plan: CreativeParallelWavePlan;
  lanes: CreativeCoordinatorLaneInput[];
  topCandidateCount?: number;
}): CreativeCoordinatorReview {
  const laneResults = input.lanes.map((lane) => normalizeLaneResult(lane, input.plan.brief));
  const duplicateGroups = dedupeCreativeLaneResults(laneResults);
  const duplicateWinners = new Set(duplicateGroups.map((group) => group.winnerLaneId));
  const groupedLaneIds = new Set(duplicateGroups.flatMap((group) => group.laneIds));
  const ranked = [...laneResults]
    .filter((lane) => lane.status === "complete")
    .filter((lane) => !groupedLaneIds.has(lane.laneId) || duplicateWinners.has(lane.laneId))
    .sort((left, right) => right.score.totalScore - left.score.totalScore || left.laneId.localeCompare(right.laneId));
  const topCandidates = ranked.slice(0, input.topCandidateCount ?? 5);
  const promotionGate = evaluateCreativePromotionGate({
    plan: input.plan,
    lanes: laneResults,
    topCandidates,
  });

  return {
    schemaVersion: "tower-creative-coordinator-review-v1",
    parentRunId: input.plan.parentRunId,
    assetType: input.plan.assetType,
    name: input.plan.name,
    totalLanes: input.plan.totalLanes,
    completedLaneCount: laneResults.filter((lane) => lane.status === "complete").length,
    blockedLaneCount: laneResults.filter((lane) => lane.status === "blocked").length,
    lanes: laneResults,
    duplicateGroups,
    topCandidates,
    promotionGate,
  };
}

export function normalizeLaneResult(
  lane: CreativeCoordinatorLaneInput,
  brief: string,
): CreativeCoordinatorLaneResult {
  const sections = extractSections(lane.resultMarkdown);
  const validation = validateCreativeParallelLaneResult({
    resultMarkdown: lane.resultMarkdown,
    hasResultJson: lane.hasResultJson,
    imageOutputCount: countImageLikeOutputs(lane.outputFiles),
    hasPreflight: lane.hasPreflight,
  });
  const strongestIdea = lane.resultJson?.strongestIdea?.trim() || sections["Strongest Idea Or Output"];
  const uniquenessClaim = lane.resultJson?.uniquenessClaim?.trim() || sections["What Is Meaningfully Different"];
  const qualityRisks = uniqueStrings([
    ...(lane.resultJson?.qualityRisks ?? []),
    ...linesFromSection(sections["Quality Risks"]),
  ]);
  const promotionBlockers = uniqueStrings([
    ...(lane.resultJson?.promotionBlockers ?? []),
    ...(lane.preflight?.blockers ?? []),
    ...(lane.preflight && lane.preflight.ok === false ? ["preflight not passing"] : []),
    ...(lane.outputFiles.length === 0 ? ["no concrete output artifacts"] : []),
    ...validation.missing,
  ]);
  const score = scoreCreativeLaneResult({
    brief,
    strongestIdea,
    uniquenessClaim,
    outputFiles: lane.outputFiles,
    preflight: lane.preflight,
    validationMissing: validation.missing,
    qualityRisks,
    promotionBlockers,
  });

  return {
    ...lane,
    sections,
    strongestIdea,
    uniquenessClaim,
    qualityRisks,
    promotionBlockers,
    validationMissing: validation.missing,
    score,
    normalizedIdeaKey: normalizeIdeaKey(strongestIdea),
    status: validation.missing.length === 0 && lane.outputFiles.length > 0 ? "complete" : "blocked",
  };
}

function countImageLikeOutputs(outputFiles: string[]): number {
  return outputFiles.filter((file) => IMAGE_OUTPUT_PATTERN.test(file)).length;
}

export function scoreCreativeLaneResult(input: {
  brief: string;
  strongestIdea: string;
  uniquenessClaim: string;
  outputFiles: string[];
  preflight?: CreativeLanePreflight;
  validationMissing: string[];
  qualityRisks: string[];
  promotionBlockers: string[];
}): CreativeLaneScore {
  const briefTerms = significantWords(input.brief);
  const ideaTerms = significantWords(input.strongestIdea);
  const briefOverlap = briefTerms.filter((term) => ideaTerms.includes(term)).length;
  const briefFit = clampScore(briefOverlap * 5 + (input.strongestIdea.length > 32 ? 10 : 0), 20);
  const distinctiveness = clampScore(input.uniquenessClaim.length > 40 ? 18 : input.uniquenessClaim.length / 3, 20);
  const productionReadiness = clampScore(
    input.outputFiles.length * 3 +
      (input.preflight?.ok ? 10 : 0) -
      input.promotionBlockers.length * 6,
    20,
  );
  const qualityEvidence = clampScore(
    (input.preflight?.ok ? 12 : 0) +
      (input.preflight?.checks?.length ?? 0) * 2 -
      (input.preflight?.warnings?.length ?? 0),
    20,
  );
  const styleConsistency = clampScore(
    /tower|style|canon|approved|visual|premium|sprite|ui|motion/i.test(input.strongestIdea)
      ? 18
      : 12,
    20,
  );
  const riskClarity = clampScore(
    input.qualityRisks.length > 0 && !input.qualityRisks.some((risk) => /^none$/i.test(risk.trim()))
      ? 18
      : 6,
    20,
  );
  const totalScore = briefFit + distinctiveness + productionReadiness + qualityEvidence + styleConsistency + riskClarity;

  return {
    briefFit,
    distinctiveness,
    productionReadiness,
    qualityEvidence,
    styleConsistency,
    riskClarity,
    totalScore,
  };
}

export function dedupeCreativeLaneResults(
  lanes: CreativeCoordinatorLaneResult[],
): CreativeDuplicateGroup[] {
  const groups: CreativeDuplicateGroup[] = [];
  const visited = new Set<string>();

  for (const lane of lanes) {
    if (visited.has(lane.laneId)) continue;

    const matches = lanes.filter((candidate) =>
      candidate.laneId !== lane.laneId &&
      !visited.has(candidate.laneId) &&
      areDuplicateLaneResults(lane, candidate),
    );

    if (!matches.length) continue;

    const members = [lane, ...matches].sort((left, right) => right.score.totalScore - left.score.totalScore);
    const laneIds = members.map((member) => member.laneId);

    laneIds.forEach((laneId) => visited.add(laneId));
    groups.push({
      groupId: `duplicate-${groups.length + 1}`,
      laneIds,
      reason: "matching output files or highly similar strongest idea",
      winnerLaneId: members[0]?.laneId ?? lane.laneId,
    });
  }

  return groups;
}

export function evaluateCreativePromotionGate(input: {
  plan: CreativeParallelWavePlan;
  lanes: CreativeCoordinatorLaneResult[];
  topCandidates: CreativeCoordinatorLaneResult[];
}): CreativePromotionGateResult {
  const blockers: string[] = [];
  const completed = input.lanes.filter((lane) => lane.status === "complete");

  if (input.lanes.length !== input.plan.totalLanes) {
    blockers.push(`expected ${input.plan.totalLanes} lanes but found ${input.lanes.length}`);
  }

  if (completed.length !== input.plan.totalLanes) {
    blockers.push(`expected ${input.plan.totalLanes} complete lanes but found ${completed.length}`);
  }

  for (const lane of input.lanes) {
    if (lane.promotionBlockers.length > 0) {
      blockers.push(`${lane.laneId}: ${lane.promotionBlockers.join(", ")}`);
    }
  }

  if (!input.topCandidates.length) {
    blockers.push("no ranked top candidates");
  }

  return {
    status: blockers.length ? "blocked" : "ready-for-final-approval",
    blockers,
  };
}

export function renderCoordinatorReportMarkdown(review: CreativeCoordinatorReview): string {
  return `# Creative Production Coordinator Report

Run: ${review.parentRunId}
Asset: ${review.name} (${review.assetType})
Completed lanes: ${review.completedLaneCount}/${review.totalLanes}
Promotion gate: ${review.promotionGate.status}

## Top Candidates

${review.topCandidates.map((candidate, index) => `${index + 1}. ${candidate.laneId} - ${candidate.score.totalScore}/120\n   ${candidate.strongestIdea}`).join("\n\n") || "- None"}

## Duplicate Groups

${review.duplicateGroups.map((group) => `- ${group.groupId}: winner ${group.winnerLaneId}; lanes ${group.laneIds.join(", ")}`).join("\n") || "- None"}

## Promotion Blockers

${review.promotionGate.blockers.map((blocker) => `- ${blocker}`).join("\n") || "- None"}
`;
}

export function renderCoordinatorReviewBoardHtml(review: CreativeCoordinatorReview): string {
  const candidateCards = review.topCandidates.map((candidate, index) => `
    <article class="candidate">
      <h2>#${index + 1} ${escapeHtml(candidate.laneId)}</h2>
      <p class="score">${candidate.score.totalScore}/120</p>
      <p>${escapeHtml(candidate.strongestIdea)}</p>
      <h3>Why It Is Different</h3>
      <p>${escapeHtml(candidate.uniquenessClaim)}</p>
      <h3>Risks</h3>
      <ul>${candidate.qualityRisks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
      <h3>Files</h3>
      <ul>${candidate.outputFiles.map((file) => `<li>${escapeHtml(file)}</li>`).join("") || "<li>No files recorded.</li>"}</ul>
    </article>
  `).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(review.name)} Review Board</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #111318; color: #f6f1e8; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px; }
    .meta, .candidate { border: 1px solid rgba(246,241,232,.18); border-radius: 8px; padding: 20px; margin: 16px 0; background: rgba(255,255,255,.04); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .score { color: #c9a84c; font-weight: 700; }
    li { margin: 6px 0; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(review.name)} Review Board</h1>
    <section class="meta">
      <p>Run: ${escapeHtml(review.parentRunId)}</p>
      <p>Completed lanes: ${review.completedLaneCount}/${review.totalLanes}</p>
      <p>Promotion gate: ${escapeHtml(review.promotionGate.status)}</p>
    </section>
    <section class="grid">
      ${candidateCards || "<p>No top candidates available.</p>"}
    </section>
    <section class="meta">
      <h2>Promotion Blockers</h2>
      <ul>${review.promotionGate.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("") || "<li>None</li>"}</ul>
    </section>
  </main>
</body>
</html>
`;
}

function extractSections(markdown: string): Record<SectionTitle, string> {
  return SECTION_TITLES.reduce((sections, title) => ({
    ...sections,
    [title]: extractSection(markdown, title),
  }), {} as Record<SectionTitle, string>);
}

function extractSection(markdown: string, title: string): string {
  const expression = new RegExp(`## ${escapeRegExp(title)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = markdown.match(expression);

  return match?.[1]?.trim() ?? "";
}

function linesFromSection(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function areDuplicateLaneResults(
  left: CreativeCoordinatorLaneResult,
  right: CreativeCoordinatorLaneResult,
): boolean {
  const sharedOutput = left.outputFiles.some((file) => right.outputFiles.includes(file));

  if (sharedOutput) return true;

  return jaccard(significantWords(left.strongestIdea), significantWords(right.strongestIdea)) >= 0.82;
}

function normalizeIdeaKey(value: string): string {
  return significantWords(value).join("-");
}

function significantWords(value: string): string[] {
  return uniqueStrings(value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function jaccard(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((value) => rightSet.has(value)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return intersection / union;
}

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
