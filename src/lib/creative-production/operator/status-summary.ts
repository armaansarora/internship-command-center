import type {
  CreativeEnginePhase,
  CreativeEngineRunState,
  CreativeHumanActionPacket,
  CreativeProgressFile,
} from "./v1-final";

function humanizePhase(phase: CreativeEnginePhase): string {
  return phase.replaceAll("-", " ");
}

const PROMOTED_BASELINE_PHASES = new Set<CreativeEnginePhase>([
  "promoted",
  "integrated",
  "browser-verified",
  "closed",
]);

const HUMAN_ACTION_PHASES = new Set<CreativeEnginePhase>([
  "awaiting-initial-approval",
  "final-board-ready",
  "integration-briefing",
  "app-preview-ready",
  "needs-human",
  "budget-blocked",
  "provider-blocked",
  "repair-required",
  "upgrade-required",
  "unsafe-to-run",
]);

function nextAutomaticStepForState(
  state: CreativeEngineRunState,
  progress: CreativeProgressFile,
): string {
  if (state.nextLegalAction) return state.nextLegalAction;

  if (state.phase === "promoted") {
    return "Integrate promoted assets into the app runtime and verify desktop, mobile, reduced-motion, image loading, and overlap.";
  }

  if (state.phase === "integrated") {
    return "Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.";
  }

  if (state.phase === "browser-verified") {
    return "Close the run after housekeeping and continuous improvement gates pass.";
  }

  if (state.phase === "closed") {
    return "Run is closed; recommend the next highest-leverage creative target.";
  }

  return progress.nextAutomaticStep;
}

function humanActionLineForState(
  state: CreativeEngineRunState,
  humanAction: CreativeHumanActionPacket | undefined,
): string {
  if (PROMOTED_BASELINE_PHASES.has(state.phase) || !HUMAN_ACTION_PHASES.has(state.phase)) {
    return "Armaan action: none.";
  }

  return humanAction
    ? `Armaan action: ${humanAction.recommendation} Recommended response: ${humanAction.recommendedResponse}. Allowed responses: ${humanAction.allowedResponses.join("; ")}.`
    : "Armaan action: none.";
}

function promotionProtectionLineForState(state: CreativeEngineRunState): string {
  if (PROMOTED_BASELINE_PHASES.has(state.phase)) {
    return "Promoted baseline protected: public art and production manifests are already production truth; future replacement writes require a new exact approved for app gate.";
  }

  return `Promotion locked: ${state.publicArtWritesAllowed ? "no" : "yes, until exact phrase approved for app"}.`;
}

export function renderCreativeRunStatusLines(input: {
  state: CreativeEngineRunState;
  progress: CreativeProgressFile;
  humanAction?: CreativeHumanActionPacket;
}): string {
  return [
    `Run ${input.state.runId}: ${input.state.name} (${input.state.assetType})`,
    `Phase: ${humanizePhase(input.state.phase)}`,
    `Slots: ${input.progress.completed} completed, ${input.progress.failed} failed, ${input.progress.repairing} repairing, ${input.progress.pending} pending, ${input.progress.runningSlots.length} running.`,
    `Spend: $${(input.progress.spendSoFarCents / 100).toFixed(2)} spent, $${(input.progress.reservedSpendCents / 100).toFixed(2)} reserved.`,
    `Active locks: ${input.progress.activeLocks.length ? input.progress.activeLocks.join(", ") : "none"}.`,
    `Next automatic step: ${nextAutomaticStepForState(input.state, input.progress)}`,
    humanActionLineForState(input.state, input.humanAction),
    promotionProtectionLineForState(input.state),
  ].join("\n");
}
