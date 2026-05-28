// src/lib/artlab/orchestrator/recommend-direction.ts
//
// After concept-runner produces 5 lanes the brain is asked to pick the
// strongest direction. The output drives the "💡 Recommended" line in
// the concept-board caption.

import type { ArtLabLlmBrain } from "./llm-brain";
import type { TowerCharacterContext } from "../context/tower-context";
import { recordDaemonError } from "../daemon/entry";

export interface RecommendDirectionInput {
  characterId: string;
  characterContext: TowerCharacterContext;
  lanes: Array<{
    laneIndex: number;
    variationAxis: string;
    prompt: string;
    pngPath: string;
  }>;
  brain: ArtLabLlmBrain;
}

export interface RecommendDirectionResult {
  laneIndex: number;
  reasoning: string;
  source: "brain" | "fallback";
}

export async function recommendDirection(input: RecommendDirectionInput): Promise<RecommendDirectionResult> {
  if (input.lanes.length === 0) {
    return { laneIndex: 1, reasoning: "No lanes available — defaulting to lane 1.", source: "fallback" };
  }
  try {
    const result = await input.brain.decide({
      kind: "recommend-direction",
      input: {
        characterId: input.characterContext.characterId,
        displayName: input.characterContext.displayName,
        title: input.characterContext.title,
        space: input.characterContext.space,
        canonicalProfile: {
          visualArchetype: input.characterContext.visualArchetype,
          silhouette: input.characterContext.silhouette,
          wardrobe: input.characterContext.wardrobe,
          props: input.characterContext.props,
          mobileRead: input.characterContext.mobileRead,
          accent: input.characterContext.accent,
          negativeDNA: input.characterContext.negativeDNA,
          forbiddenVisualTraits: input.characterContext.forbiddenVisualTraits,
          wound: input.characterContext.wound,
          doctrine: input.characterContext.doctrine,
        },
        lanes: input.lanes.map((l) => ({
          laneIndex: l.laneIndex,
          variationAxis: l.variationAxis,
          promptExcerpt: l.prompt.slice(0, 600),
        })),
      },
    });
    const parsed = parseRecommendation(result.outputJson, input.lanes.length);
    if (parsed) return { ...parsed, source: "brain" };
  } catch (err) {
    // Brain unreachable (network / 401 / 5xx) — surface the failure into
    // daemon-errors.jsonl so the operator can grep the model name that
    // failed. Without this the only signal a brain outage left was the
    // silent demotion to the deterministic middle-lane pick.
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT;
    if (workspaceRoot) {
      recordDaemonError(workspaceRoot, "recommend-direction-fallback", err);
    }
  }
  // Deterministic fallback: pick the middle lane (most "average", least drift)
  const fallbackIndex = Math.max(1, Math.min(input.lanes.length, Math.ceil(input.lanes.length / 2)));
  return {
    laneIndex: fallbackIndex,
    reasoning: "Default pick — middle lane keeps the canonical silhouette closest to bible.",
    source: "fallback",
  };
}

function parseRecommendation(json: unknown, maxLanes: number): { laneIndex: number; reasoning: string } | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { recommendedLane?: unknown; reasoning?: unknown };
  if (typeof o.recommendedLane !== "number") return null;
  const lane = Math.trunc(o.recommendedLane);
  if (lane < 1 || lane > maxLanes) return null;
  const reasoning = typeof o.reasoning === "string" ? o.reasoning.slice(0, 240) : "";
  return { laneIndex: lane, reasoning };
}
