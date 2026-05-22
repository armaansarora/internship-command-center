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

export interface ReadArtLabEventsResult {
  events: ArtLabEvent[];
  malformedLines: number;
}

export function readArtLabEventsWithDiagnostics(runDir: string): ReadArtLabEventsResult {
  const path = join(runDir, "events.jsonl");
  if (!existsSync(path)) return { events: [], malformedLines: 0 };
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return { events: [], malformedLines: 0 };
  const events: ArtLabEvent[] = [];
  let malformedLines = 0;
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      events.push(ArtLabEventSchema.parse(JSON.parse(line)));
    } catch {
      malformedLines += 1;
    }
  }
  return { events, malformedLines };
}

export function readArtLabEvents(runDir: string): ArtLabEvent[] {
  return readArtLabEventsWithDiagnostics(runDir).events;
}
