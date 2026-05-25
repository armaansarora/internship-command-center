import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ARTLAB_LLM_DECISION_KINDS } from "./llm-brain";

export const LlmDecisionEntrySchema = z
  .object({
    decisionAt: z.string().datetime({ offset: true }),
    kind: z.enum(ARTLAB_LLM_DECISION_KINDS),
    input: z.unknown(),
    prompt: z.string(),
    output: z.record(z.string(), z.unknown()),
    tokensIn: z.number().int().min(0),
    tokensOut: z.number().int().min(0),
    model: z.string().min(1),
    confidence: z.number().min(0).max(1),
    // Optional reliability metadata. When present, /decisions surfaces
    // transient flakiness + structured-output validation failures so the
    // user can see WHY a brain call degraded to canonical fallback.
    retryCount: z.number().int().min(0).optional(),
    lastTransientError: z.string().optional(),
    validationError: z.string().optional(),
    durationMs: z.number().int().min(0).optional(),
  })
  .strict();
export type LlmDecisionEntry = z.infer<typeof LlmDecisionEntrySchema>;

function path(workspaceMemoryDir: string): string {
  return join(workspaceMemoryDir, "decision-log.jsonl");
}

export function appendLlmDecision(workspaceMemoryDir: string, entry: LlmDecisionEntry): void {
  LlmDecisionEntrySchema.parse(entry);
  appendFileSync(path(workspaceMemoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readLlmDecisions(workspaceMemoryDir: string): LlmDecisionEntry[] {
  const p = path(workspaceMemoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => LlmDecisionEntrySchema.parse(JSON.parse(line)));
}
