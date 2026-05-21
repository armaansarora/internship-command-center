import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface CoherenceThresholds {
  silhouette: { minPairwiseDistance: number; maxCohesionDistance: number };
  palette: { minPairwiseDistance: number; maxCohesionDistance: number };
  age: { maxImpressionGapYears: number };
}

function resolveThisDir(): string {
  if (typeof __dirname !== "undefined") return __dirname;
  return dirname(fileURLToPath(import.meta.url));
}

export function loadCoherenceThresholds(): CoherenceThresholds {
  const raw = readFileSync(join(resolveThisDir(), "thresholds.json"), "utf8");
  return JSON.parse(raw) as CoherenceThresholds;
}
