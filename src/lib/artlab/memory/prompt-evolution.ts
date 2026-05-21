import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const PromptEvolutionEntrySchema = z
  .object({
    promptComponent: z.string().min(1),
    version: z.string().min(1),
    changedAt: z.string().datetime({ offset: true }),
    diff: z.string().min(1),
    triggeredBy: z.string().min(1),
    outcomes: z.object({
      subsequentRejections: z.number().int().min(0),
      subsequentPromotions: z.number().int().min(0),
    }),
  })
  .strict();
export type PromptEvolutionEntry = z.infer<typeof PromptEvolutionEntrySchema>;

function path(memoryDir: string): string {
  return join(memoryDir, "prompt-evolution.jsonl");
}

export function appendPromptEvolution(memoryDir: string, entry: PromptEvolutionEntry): void {
  PromptEvolutionEntrySchema.parse(entry);
  appendFileSync(path(memoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readPromptEvolution(memoryDir: string): PromptEvolutionEntry[] {
  const p = path(memoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => PromptEvolutionEntrySchema.parse(JSON.parse(line)));
}
