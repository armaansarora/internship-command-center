import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryGenerateStatusInputSchema,
  FoundryGenerateStatusOutputSchema,
  type FoundryGenerateStatusOutput,
  type FoundryRunStatus,
} from "../tools";
import type { FoundryGenerateContext } from "./generate";

interface ArtLabRunStateLite {
  runId: string;
  phase: string;
  blocker: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: {
    phaseElapsedMs?: number;
    estimatedRemainingMs?: number;
    expectedSlotCount?: number;
    renderedSlotCount?: number;
  };
  promotedPackId?: string;
}

function mapStatus(phase: string, blocker: string | null): FoundryRunStatus {
  if (blocker && blocker !== "null") return "blocked";
  if (phase === "closed") return "promoted";
  if (phase === "cancelled") return "cancelled";
  if (phase === "failed") return "failed";
  return "running";
}

function computePercent(state: ArtLabRunStateLite): number {
  if (state.phase === "closed") return 100;
  const expected = state.progress?.expectedSlotCount ?? 0;
  const rendered = state.progress?.renderedSlotCount ?? 0;
  if (expected > 0) return Math.min(99, Math.round((rendered / expected) * 100));
  return 25;
}

function computeEta(state: ArtLabRunStateLite): number | undefined {
  const remaining = state.progress?.estimatedRemainingMs;
  if (typeof remaining === "number" && remaining > 0) return Math.round(remaining / 1000);
  return undefined;
}

export async function handleFoundryGenerateStatus(
  rawInput: unknown,
  ctx: FoundryGenerateContext,
): Promise<FoundryGenerateStatusOutput> {
  const input = FoundryGenerateStatusInputSchema.parse(rawInput);
  const statePath = join(ctx.workspaceRoot, "runs", input.runId, "run-state.json");
  if (!existsSync(statePath)) {
    throw new Error(`run not found: ${input.runId}`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8")) as ArtLabRunStateLite;
  const status = mapStatus(state.phase, state.blocker);
  return FoundryGenerateStatusOutputSchema.parse({
    runId: input.runId,
    status,
    phase: state.phase,
    percentComplete: computePercent(state),
    blockers: state.blocker ? [state.blocker] : [],
    etaSeconds: computeEta(state),
    promotedPackId: state.promotedPackId,
    updatedAt: state.updatedAt,
  });
}
