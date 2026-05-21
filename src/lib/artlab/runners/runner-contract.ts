import { z } from "zod";
import { ARTLAB_BLOCKERS, type ArtLabAssetType } from "../types";

export const ARTLAB_RUNNER_KINDS = [
  "concept",
  "canary",
  "production",
  "cutout",
  "strict-qa",
  "promotion",
  "verifying",
] as const;
export type ArtLabRunnerKind = (typeof ARTLAB_RUNNER_KINDS)[number];

export interface ArtLabRunnerInput {
  runId: string;
  runDir: string;
  assetType: ArtLabAssetType;
  characterId?: string;
  approvedLaneIndex?: number;
  providerId: "gemini-api" | "local-mock";
  abortSignal?: AbortSignal;
}

export const ArtLabRunnerResultSchema = z
  .object({
    runnerKind: z.enum(ARTLAB_RUNNER_KINDS),
    status: z.enum(["ok", "failed", "needs-human"]),
    durationMs: z.number().int().min(0),
    artifacts: z.record(z.string(), z.unknown()),
    blockerHint: z.enum(ARTLAB_BLOCKERS).optional(),
    failureCode: z.string().optional(),
  })
  .strict();
export type ArtLabRunnerResult = z.infer<typeof ArtLabRunnerResultSchema>;

export interface ArtLabRunner {
  kind: ArtLabRunnerKind;
  run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult>;
}
