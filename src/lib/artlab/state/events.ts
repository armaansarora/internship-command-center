import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const ArtLabEventSchema = z
  .object({
    runId: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    kind: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabEvent = z.infer<typeof ArtLabEventSchema>;

export function appendArtLabEvent(runDir: string, event: ArtLabEvent): void {
  ArtLabEventSchema.parse(event);
  const path = join(runDir, "events.jsonl");
  appendFileSync(path, `${JSON.stringify(event)}\n`, { encoding: "utf8" });
}

export function readArtLabEvents(runDir: string): ArtLabEvent[] {
  const path = join(runDir, "events.jsonl");
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => ArtLabEventSchema.parse(JSON.parse(line)));
}
