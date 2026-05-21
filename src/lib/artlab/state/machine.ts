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
  auto("routed", "generating-concepts"),
  auto("generating-concepts", "concept-review"),
  human("concept-review", "canary"),
  auto("canary", "production"),
  auto("production", "strict-qa"),
  auto("strict-qa", "final-review"),
  human("final-review", "promoting"),
  auto("promoting", "verifying"),
  auto("verifying", "closed"),
];

export function isLegalTransition(from: ArtLabPhase, to: ArtLabPhase): boolean {
  return ARTLAB_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function legalNextPhases(from: ArtLabPhase): ArtLabPhase[] {
  return ARTLAB_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export function getTransition(from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition | undefined {
  return ARTLAB_TRANSITIONS.find((t) => t.from === from && t.to === to);
}
