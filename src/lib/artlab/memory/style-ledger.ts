import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const StyleWinEntrySchema = z
  .object({
    characterId: z.string().min(1),
    promotedAt: z.string().datetime({ offset: true }),
    winningTechniques: z.array(z.string()),
    promptHash: z.string().min(1),
    cutoutModelUsed: z.string().optional(),
    totalCostCents: z.number().int().min(0),
    source: z.string().optional(),
    fileCount: z.number().int().min(0).optional(),
    note: z.string().optional(),
  })
  .strict();
export type StyleWinEntry = z.infer<typeof StyleWinEntrySchema>;

function path(workspaceMemoryDir: string): string {
  return join(workspaceMemoryDir, "style-wins.jsonl");
}

export function appendStyleWin(workspaceMemoryDir: string, entry: StyleWinEntry): void {
  StyleWinEntrySchema.parse(entry);
  appendFileSync(path(workspaceMemoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readStyleWins(workspaceMemoryDir: string, filter?: { characterId?: string }): StyleWinEntry[] {
  const p = path(workspaceMemoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  const all = raw.split("\n").map((line) => StyleWinEntrySchema.parse(JSON.parse(line)));
  if (filter?.characterId) return all.filter((w) => w.characterId === filter.characterId);
  return all;
}
