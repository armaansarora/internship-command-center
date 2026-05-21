import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TIMESTAMP_FIELDS = new Set(["at", "createdAt", "updatedAt", "promotedAt", "recordedAt", "decidedAt", "generatedAt"]);

function stripTimestamps(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripTimestamps);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (TIMESTAMP_FIELDS.has(k)) continue;
      out[k] = stripTimestamps(v);
    }
    return out;
  }
  return value;
}

function loadCanonicalJson(path: string): unknown {
  if (!existsSync(path)) return null;
  return stripTimestamps(JSON.parse(readFileSync(path, "utf8")));
}

export interface QualityEquivalenceInput {
  runDirA: string;
  runDirB: string;
}

export interface QualityEquivalenceResult {
  equivalent: boolean;
  differences: string[];
}

const COMPARED_FILES = ["asset-doctor.json", "repair-plan.json", "concept-board.json", "canary-gate.json", "run-state.json"];

export function assertQualityEquivalent(input: QualityEquivalenceInput): QualityEquivalenceResult {
  const differences: string[] = [];
  for (const file of COMPARED_FILES) {
    const a = loadCanonicalJson(join(input.runDirA, file));
    const b = loadCanonicalJson(join(input.runDirB, file));
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differences.push(file);
    }
  }
  return { equivalent: differences.length === 0, differences };
}
