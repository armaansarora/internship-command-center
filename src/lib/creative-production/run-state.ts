export const CREATIVE_RUN_STATES = [
  "briefing",
  "initial-concepts",
  "identity-locked",
  "canary-required",
  "canary-running",
  "canary-passed",
  "production-running",
  "repairing",
  "strict-qa",
  "final-board-ready",
  "approved-for-app",
  "promoted",
  "integrated",
  "browser-verified",
  "closed",
] as const;

export type CreativeRunState = (typeof CREATIVE_RUN_STATES)[number];

const LEGAL_NEXT_STATE: Partial<Record<CreativeRunState, readonly CreativeRunState[]>> = {
  "briefing": ["initial-concepts"],
  "initial-concepts": ["identity-locked"],
  "identity-locked": ["canary-required"],
  "canary-required": ["canary-running"],
  "canary-running": ["canary-passed", "repairing"],
  "canary-passed": ["production-running"],
  "production-running": ["repairing", "strict-qa"],
  "repairing": ["strict-qa", "production-running"],
  "strict-qa": ["final-board-ready"],
  "final-board-ready": ["approved-for-app"],
  "approved-for-app": ["promoted"],
  "promoted": ["integrated"],
  "integrated": ["browser-verified"],
  "browser-verified": ["closed"],
};

export function assertCreativeRunTransition(input: {
  from: CreativeRunState;
  to: CreativeRunState;
  approvalPhrase?: string;
}): CreativeRunState {
  if (input.to === "promoted" && input.from !== "approved-for-app") {
    throw new Error("Promotion is blocked until the run reaches approved-for-app.");
  }

  const allowed = LEGAL_NEXT_STATE[input.from] ?? [];

  if (!allowed.includes(input.to)) {
    throw new Error(`Illegal creative run transition from ${input.from} to ${input.to}.`);
  }

  if (input.to === "approved-for-app" && input.approvalPhrase !== "approved for app") {
    throw new Error("Transition to approved-for-app requires the exact phrase approved for app.");
  }

  return input.to;
}

export function getNextCreativeRunAction(state: CreativeRunState): string {
  switch (state) {
    case "briefing":
      return "Create or route the creative brief, then generate the initial concept options.";
    case "initial-concepts":
      return "Wait for Armaan to choose the initial direction; do not ask for intermediate approvals.";
    case "identity-locked":
      return "Prepare production canary and full-pack plans from the locked identity reference.";
    case "canary-required":
      return "run the one-slot production canary before any full-pack paid generation.";
    case "canary-running":
      return "Let the canary finish, run non-paid repair, then verify strict QA.";
    case "canary-passed":
      return "Full-production-ready: run the full production pack from the full plan only; retry or regenerate only named failed slots.";
    case "production-running":
      return "Let production finish, then run auto repair and strict doctor.";
    case "repairing":
      return "Run non-paid repairs first; regenerate only named failed slots if required.";
    case "strict-qa":
      return "Build the final upload-ready review board only after strict QA passes.";
    case "final-board-ready":
      return "Wait for Armaan to inspect the final board and say approved for app.";
    case "approved-for-app":
      return "Promote approved assets into public/art and update the approved manifest.";
    case "promoted":
      return "integrate promoted assets into the app runtime and verify routes.";
    case "integrated":
      return "Run browser QA for desktop, mobile, reduced motion, image loading, and overlap.";
    case "browser-verified":
      return "Close the run after housekeeping and continuous improvement gates pass.";
    case "closed":
      return "Run is closed; recommend the next highest-leverage creative target.";
  }
}
