import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const RejectionEntrySchema = z
  .object({
    characterId: z.string().min(1),
    runId: z.string().min(1),
    lane: z.number().int().min(1),
    rejectedAt: z.string().datetime({ offset: true }),
    reason: z.string().min(1),
    qaFailureCodes: z.array(z.string()),
    promptHashRejected: z.string().min(1),
  })
  .strict();
export type RejectionEntry = z.infer<typeof RejectionEntrySchema>;

function path(memoryDir: string): string {
  return join(memoryDir, "style-rejections.jsonl");
}

export function appendRejection(memoryDir: string, entry: RejectionEntry): void {
  RejectionEntrySchema.parse(entry);
  appendFileSync(path(memoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readRejections(memoryDir: string, filter?: { characterId?: string }): RejectionEntry[] {
  const p = path(memoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  const all = raw.split("\n").map((line) => RejectionEntrySchema.parse(JSON.parse(line)));
  if (filter?.characterId) return all.filter((r) => r.characterId === filter.characterId);
  return all;
}
