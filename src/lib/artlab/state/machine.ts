import type { ArtLabBlocker, ArtLabPhase, ArtLabRunState } from "../types";

export type ArtLabTransitionTrigger = "auto" | "human" | "blocker" | "cancel" | "resume";

export interface ArtLabTransitionContext {
  workspaceRoot: string;
  now: () => Date;
}

export interface ArtLabTransition {
  from: ArtLabPhase;
  to: ArtLabPhase;
  blocker?: ArtLabBlocker;
  trigger: ArtLabTransitionTrigger;
  validate(state: ArtLabRunState, ctx: ArtLabTransitionContext): Promise<void>;
  apply(state: ArtLabRunState, ctx: ArtLabTransitionContext): Promise<ArtLabRunState>;
}

function patch(state: ArtLabRunState, to: ArtLabPhase, ctx: ArtLabTransitionContext, blocker?: ArtLabBlocker): ArtLabRunState {
  return {
    ...state,
    phase: to,
    blocker,
    updatedAt: ctx.now().toISOString(),
  };
}

const auto = (from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition => ({
  from,
  to,
  trigger: "auto",
  async validate() {},
  async apply(state, ctx) { return patch(state, to, ctx); },
});

const human = (from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition => ({
  from,
  to,
  trigger: "human",
  async validate(state) {
    if (from === "concept-review" && !state.approvedConcept) {
      throw new Error(`concept-review→${to} requires approvedConcept`);
    }
  },
  async apply(state, ctx) { return patch(state, to, ctx); },
});

export const ARTLAB_TRANSITIONS: readonly ArtLabTransition[] = [
  // Brainstorm flow: routed → briefing → brief-review (gate) → generating-concepts.
  // When brainstorm mode is off, brief-runner auto-approves and the gate is a no-op.
  auto("routed", "briefing"),
  auto("briefing", "brief-review"),
  human("brief-review", "briefing"),            // user adjusts brief → re-author
  human("brief-review", "generating-concepts"), // user approves brief → generate lanes
  auto("generating-concepts", "concept-review"),
  human("concept-review", "canary"),            // user approves lane N → existing path
  human("concept-review", "refining-concepts"), // user wants refinement loop
  auto("refining-concepts", "concept-review"),  // regenerated lanes loop back to gate
  auto("canary", "production"),
  auto("production", "strict-qa"),
  auto("strict-qa", "final-review"),
  human("final-review", "promoting"),
  auto("promoting", "verifying"),
  auto("verifying", "closed"),
];

const BLOCKER_PHASES_NONTERMINAL: ArtLabPhase[] = [
  "routed",
  "briefing",
  "brief-review",
  "generating-concepts",
  "concept-review",
  "refining-concepts",
  "canary",
  "production",
  "strict-qa",
  "final-review",
  "promoting",
  "verifying",
];

const BLOCKERS_FOR_TRANSITIONS = [
  "needs-human",
  "budget-blocked",
  "provider-blocked",
  "repair-required",
  "style-failed",
  "upgrade-required",
  "cancelled",
  // `concept-critique-fallback` is emitted by `concept-runner` when the
  // multimodal critique brain throws or laneImages count mismatches. The
  // blocker pins the run in concept-review with a loud signal so operators
  // can choose to /cancel or continue without the quality gate.
  "concept-critique-fallback",
] as const satisfies readonly ArtLabBlocker[];

export const BLOCKER_TRANSITIONS: readonly ArtLabTransition[] = BLOCKER_PHASES_NONTERMINAL.flatMap(
  (phase) =>
    BLOCKERS_FOR_TRANSITIONS.map<ArtLabTransition>((blocker) => ({
      from: phase,
      to: phase,
      blocker,
      trigger: blocker === "cancelled" ? "cancel" : "blocker",
      async validate() {},
      async apply(state, ctx) {
        return patch(state, phase, ctx, blocker);
      },
    })),
);

export function isLegalTransition(from: ArtLabPhase, to: ArtLabPhase, blocker?: ArtLabBlocker): boolean {
  if (blocker) {
    return BLOCKER_TRANSITIONS.some((t) => t.from === from && t.to === to && t.blocker === blocker);
  }
  return ARTLAB_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function legalNextPhases(from: ArtLabPhase): ArtLabPhase[] {
  return ARTLAB_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export function getTransition(from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition | undefined {
  return ARTLAB_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function findBlockerTransition(phase: ArtLabPhase, blocker: ArtLabBlocker): ArtLabTransition | undefined {
  return BLOCKER_TRANSITIONS.find((t) => t.from === phase && t.blocker === blocker);
}
