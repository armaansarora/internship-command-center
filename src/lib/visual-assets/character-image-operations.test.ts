import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("character image operations continuity", () => {
  it("documents the future-session entrypoint and current Otis state", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const operations = readProjectFile("docs/CHARACTER-IMAGE-OPERATIONS.md");
    const prompt = readProjectFile("docs/CHARACTER-IMAGE-SESSION-PROMPT.md");
    const artLab = readProjectFile(".artlab/README.md");
    const claude = readProjectFile("CLAUDE.md");
    const structure = readProjectFile("STRUCTURE.md");
    const otisArtifacts = readProjectFile(".artlab/characters/otis/ARTIFACTS.md");

    expect(packageJson.scripts["art:status"]).toBe("tsx scripts/art-pipeline.ts status");
    expect(packageJson.scripts["art:operate"]).toBe("tsx scripts/art-pipeline.ts operate");

    for (const document of [operations, prompt, artLab, claude, structure]) {
      expect(document).toContain("npm run art:status");
      expect(document).toContain("npm run art:operate");
    }

    for (const document of [operations, prompt, artLab, claude, otisArtifacts]) {
      expect(document).toContain("approved for app");
      expect(document).toContain("2026-05-14-otis-pilot");
      expect(document).toContain("source-upscaled-to-master");
    }

    expect(operations).toContain("Self-Improvement Loop");
    expect(operations).toContain("Mara Voss");
    expect(operations).toContain("ceo");
    expect(prompt).toContain("The next recommended character after Otis is Mara Voss (ceo)");
    expect(structure).toContain(".artlab/runs/otis/2026-05-14-otis-pilot/run.json");
    expect(otisArtifacts).toContain("Status: promoted");
  });

  it("prints a machine-readable status report for fresh Codex sessions", () => {
    const tsx = join(process.cwd(), "node_modules/.bin/tsx");
    const rawStatus = execFileSync(tsx, ["scripts/art-pipeline.ts", "status", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    const status = JSON.parse(rawStatus) as {
      styleId: string;
      approvedProductionSprites: number;
      expectedProductionSprites: number;
      fullyPromotedCharacters: string[];
      nextRecommendedCharacter: { characterId: string; displayName: string };
      commands: string[];
      continuationDocs: string[];
      runLedgers: Array<{
        characterId: string;
        runId: string;
        status: string;
        promotionStatus: string;
        warningCounts: Record<string, number>;
      }>;
    };

    expect(status.styleId).toBe("tower-flat-plus-depth-v1");
    expect(status.approvedProductionSprites).toBeGreaterThanOrEqual(21);
    expect(status.expectedProductionSprites).toBe(252);
    expect(status.fullyPromotedCharacters.join(" ")).toContain("Otis Vale (otis)");
    expect(status.nextRecommendedCharacter).toMatchObject({
      characterId: "ceo",
      displayName: "Mara Voss",
    });
    expect(status.commands).toContain("npm run art:status");
    expect(status.commands.join("\n")).toContain("approved for app");
    expect(status.continuationDocs).toContain("docs/CHARACTER-IMAGE-OPERATIONS.md");

    const otisRun = status.runLedgers.find(
      (run) => run.characterId === "otis" && run.runId === "2026-05-14-otis-pilot",
    );

    expect(otisRun?.status).toBe("promoted");
    expect(otisRun?.promotionStatus).toBe("promoted");
    expect(otisRun?.warningCounts["source-upscaled-to-master"]).toBe(21);
    expect(otisRun?.warningCounts["source-long-edge-below-4096"]).toBe(21);
  });

  it("materializes a strict operator packet for the next character gate", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "tower-art-operator-"));
    const tsx = join(process.cwd(), "node_modules/.bin/tsx");
    const rawOperation = execFileSync(
      tsx,
      [
        "scripts/art-pipeline.ts",
        "operate",
        "--character",
        "ceo",
        "--run-id",
        "test-mara-operator",
        "--out-root",
        tempRoot,
        "--json",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    const operation = JSON.parse(rawOperation) as {
      operatorVersion: string;
      strictMode: boolean;
      characterId: string;
      displayName: string;
      nextAction: {
        type: string;
        humanGate: string;
        status: string;
      };
      blockedUntil: string;
      files: {
        nextActionJson: string;
        nextActionMarkdown: string;
        conceptPrompt?: string;
      };
      allowedCommands: string[];
      forbiddenActions: string[];
    };

    expect(operation.operatorVersion).toBe("tower-character-operator-v1");
    expect(operation.strictMode).toBe(true);
    expect(operation.characterId).toBe("ceo");
    expect(operation.displayName).toBe("Mara Voss");
    expect(operation.nextAction).toMatchObject({
      type: "generate-concept-board",
      humanGate: "initial-character-design",
      status: "blocked-on-human-choice",
    });
    expect(operation.blockedUntil).toContain("Armaan chooses one initial character design");
    expect(operation.allowedCommands).toContain("npm run art:operate");
    expect(operation.forbiddenActions.join(" ")).toContain("public/art");

    expect(existsSync(operation.files.nextActionJson)).toBe(true);
    expect(existsSync(operation.files.nextActionMarkdown)).toBe(true);
    expect(operation.files.conceptPrompt && existsSync(operation.files.conceptPrompt)).toBe(true);

    const actionPacket = JSON.parse(readFileSync(operation.files.nextActionJson, "utf8")) as {
      nextAction: { type: string };
      stateContract: { approvalGates: string[]; productionPromotionPhrase: string };
    };
    const promptPacket = readFileSync(operation.files.conceptPrompt!, "utf8");
    const markdownPacket = readFileSync(operation.files.nextActionMarkdown, "utf8");

    expect(actionPacket.nextAction.type).toBe("generate-concept-board");
    expect(actionPacket.stateContract.approvalGates).toEqual([
      "initial-character-design",
      "final-upload-ready-board",
    ]);
    expect(actionPacket.stateContract.productionPromotionPhrase).toBe("approved for app");
    expect(promptPacket).toContain("Create exactly 12 distinct concept options for Mara Voss");
    expect(promptPacket).toContain("tower-flat-plus-depth-v1");
    expect(promptPacket).toContain("No celebrity likeness");
    expect(markdownPacket).toContain("Next Legal Action");
    expect(markdownPacket).toContain("blocked-on-human-choice");
  });
});
