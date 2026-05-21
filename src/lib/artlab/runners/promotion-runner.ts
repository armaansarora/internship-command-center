import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const REQUIRED_PHRASE = "approved for app";

function publicArtRoot(): string {
  return process.env.ARTLAB_PUBLIC_ART_ROOT ?? "/Users/armaanarora/Documents/The Tower/public/art";
}

function targetDir(input: ArtLabRunnerInput): string {
  if (input.assetType === "character" && input.characterId) {
    return join(publicArtRoot(), "lobby", input.characterId);
  }
  if (input.assetType === "environment") {
    return join(publicArtRoot(), "backgrounds", input.runId);
  }
  if (input.assetType === "ui-texture") {
    return join(publicArtRoot(), "ui", input.runId);
  }
  return join(publicArtRoot(), "misc", input.runId);
}

export const promotionRunner: ArtLabRunner = {
  kind: "promotion",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const approvalPath = join(input.runDir, "approval.json");
    if (!existsSync(approvalPath)) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "approval-missing",
      };
    }
    const parsed = JSON.parse(readFileSync(approvalPath, "utf8")) as { phrase?: string };
    const phrase = (parsed.phrase ?? "").trim().toLowerCase();
    if (phrase !== REQUIRED_PHRASE) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "approval-phrase-mismatch",
      };
    }
    const target = targetDir(input);
    mkdirSync(target, { recursive: true });
    const source = join(input.runDir, "cutouts");
    const copied: string[] = [];
    if (existsSync(source)) {
      for (const file of readdirSync(source)) {
        const dst = join(target, file);
        copyFileSync(join(source, file), dst);
        copied.push(dst);
      }
    }
    return {
      runnerKind: "promotion",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { promotedTo: target, copied },
    };
  },
};
