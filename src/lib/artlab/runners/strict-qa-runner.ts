import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

interface AssetDoctorEntry {
  cutoutPath: string;
  alpha: boolean;
  notes: string[];
}

interface RepairPlanEntry {
  cutoutPath: string;
  reason: string;
  remediation: string;
}

export const strictQaRunner: ArtLabRunner = {
  kind: "strict-qa",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const cutoutDir = join(input.runDir, "cutouts");
    const entries: AssetDoctorEntry[] = [];
    const repairs: RepairPlanEntry[] = [];
    if (existsSync(cutoutDir)) {
      for (const file of readdirSync(cutoutDir).filter((f) => f.endsWith(".png"))) {
        const path = join(cutoutDir, file);
        let alpha = false;
        try {
          const parsed = JSON.parse(readFileSync(path, "utf8")) as { alpha?: boolean };
          alpha = parsed.alpha === true;
        } catch {
          alpha = false;
        }
        entries.push({ cutoutPath: path, alpha, notes: alpha ? [] : ["missing alpha"] });
        if (!alpha) {
          repairs.push({ cutoutPath: path, reason: "alpha-missing", remediation: "rerun-cutout" });
        }
      }
    }
    writeFileSync(join(input.runDir, "asset-doctor.json"), JSON.stringify({ entries }, null, 2));
    writeFileSync(join(input.runDir, "repair-plan.json"), JSON.stringify({ repairs }, null, 2));
    if (repairs.length > 0) {
      return {
        runnerKind: "strict-qa",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { entries, repairs },
        blockerHint: "repair-required",
        failureCode: "repair-plan-nonempty",
      };
    }
    return {
      runnerKind: "strict-qa",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { entries, repairs },
    };
  },
};
