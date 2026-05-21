import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Measurement {
  label: string;
  durationMs: number;
  runId?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface WallClockResult<T> {
  label: string;
  durationMs: number;
  result: T;
}

export async function measureWallClock<T>(label: string, fn: () => Promise<T>): Promise<WallClockResult<T>> {
  const startedAt = Date.now();
  const result = await fn();
  return { label, durationMs: Date.now() - startedAt, result };
}

export async function recordMeasurement(input: { workspaceRoot: string; label: string; durationMs: number; runId?: string; meta?: Record<string, unknown> }): Promise<void> {
  const dir = join(input.workspaceRoot, "ledgers");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const entry: Measurement = {
    label: input.label,
    durationMs: input.durationMs,
    runId: input.runId,
    at: new Date().toISOString(),
    meta: input.meta,
  };
  appendFileSync(join(dir, "measurements.jsonl"), JSON.stringify(entry) + "\n");
}

export async function readMeasurements(input: { workspaceRoot: string; label?: string }): Promise<Measurement[]> {
  const path = join(input.workspaceRoot, "ledgers", "measurements.jsonl");
  if (!existsSync(path)) return [];
  const all = readFileSync(path, "utf8").trim().split("\n").filter((l) => l).map((l) => JSON.parse(l) as Measurement);
  return input.label ? all.filter((m) => m.label === input.label) : all;
}
