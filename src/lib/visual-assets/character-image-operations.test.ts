import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("character image operations fresh start", () => {
  it("documents the future-session entrypoint and reset state", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const operations = readProjectFile("docs/CHARACTER-IMAGE-OPERATIONS.md");
    const prompt = readProjectFile("docs/CHARACTER-IMAGE-SESSION-PROMPT.md");
    const artLab = readProjectFile(".artlab/README.md");
    const claude = readProjectFile("CLAUDE.md");
    const structure = readProjectFile("STRUCTURE.md");

    expect(packageJson.scripts["art:status"]).toBe("tsx scripts/art-pipeline.ts status");
    expect(packageJson.scripts["art:operate"]).toBe("tsx scripts/art-pipeline.ts operate");
    expect(packageJson.scripts["art:clean"]).toBe("tsx scripts/art-pipeline.ts clean");
    expect(packageJson.scripts["art:preflight"]).toBe("tsx scripts/art-pipeline.ts preflight");

    for (const document of [operations, prompt, artLab, claude, structure]) {
      expect(document).toContain("npm run art:status");
      expect(document).toContain("Otis");
      expect(document.toLowerCase()).toContain("fresh-start");
    }

    for (const document of [operations, prompt, artLab, claude]) {
      expect(document).toContain("approved for app");
      expect(document).toContain("from scratch");
      expect(document).toContain("Lobby backgrounds");
    }

    expect(operations).toContain("Self-Improvement Loop");
    expect(operations).toContain("Mara Voss");
    expect(operations).toContain("ceo");
    expect(prompt).toContain("Generate exactly 5 prompt-only initial designs");
    expect(structure).toContain("no Season 1 character");
  });

  it("keeps current art-operation docs portable and free of stale run history", () => {
    const fileUrlPrefix = ["file", "://"].join("");
    const localUserRoot = ["/", "Users", "/"].join("");
    const staleRunMarkers = [
      ["2026-05-14", "otis", "pilot"].join("-"),
      ["2026-05-14", "otis", "native-v2"].join("-"),
      ["2026-05-14", "otis", "production-redo-v1"].join("-"),
    ];
    const documents = [
      "scripts/art-pipeline.ts",
      "docs/CHARACTER-IMAGE-OPERATIONS.md",
      "docs/CHARACTER-IMAGE-SESSION-PROMPT.md",
      ".artlab/README.md",
      "CLAUDE.md",
      "STRUCTURE.md",
    ];

    for (const path of documents) {
      const document = readProjectFile(path);

      expect(document).not.toContain("pathToFileURL");
      expect(document).not.toContain(fileUrlPrefix);
      expect(document).not.toContain(localUserRoot);
      for (const marker of staleRunMarkers) {
        expect(document).not.toContain(marker);
      }
    }
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
      nextRecommendedCharacter: { characterId: string; displayName: string; reason: string };
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
    expect(status.approvedProductionSprites).toBe(0);
    expect(status.expectedProductionSprites).toBe(252);
    expect(status.fullyPromotedCharacters).toEqual([]);
    expect(status.runLedgers.every((run) => run.promotionStatus === "not-promoted")).toBe(true);
    expect(status.runLedgers.every((run) => Object.keys(run.warningCounts).length === 0 || run.status !== "promoted")).toBe(true);
    expect(status.nextRecommendedCharacter).toMatchObject({
      characterId: "otis",
      displayName: "Otis Vale",
    });
    expect(status.nextRecommendedCharacter.reason).toContain("Fresh-start reset");
    expect(status.commands).toContain("npm run art:status");
    expect(status.commands).toContain("npm run art:produce -- --request \"<natural language creative request>\"");
    expect(status.commands).toContain("npm run art:generate verify-canary --plan <canary/gemini-api-plan.json>");
    expect(status.commands).toContain("npm run art:preflight -- <generated-file> --minimum-long-edge 4096 --chroma-key 00ff00");
    expect(status.commands.join("\n")).toContain("approved for app");
    expect(status.continuationDocs).toContain("docs/CHARACTER-IMAGE-OPERATIONS.md");
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
        "otis",
        "--run-id",
        "test-otis-operator",
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
    expect(operation.characterId).toBe("otis");
    expect(operation.displayName).toBe("Otis Vale");
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
    expect(promptPacket).toContain("Create exactly 5 distinct prompt-only concept options for Otis Vale");
    expect(promptPacket).toContain("tower-flat-plus-depth-v1");
    expect(promptPacket).toContain("No celebrity likeness");
    expect(markdownPacket).toContain("Next Legal Action");
    expect(markdownPacket).toContain("blocked-on-human-choice");
  });

  it("dry-runs volatile cleanup without deleting shared production gates", () => {
    const tsx = join(process.cwd(), "node_modules/.bin/tsx");
    const rawCleanup = execFileSync(
      tsx,
      [
        "scripts/art-pipeline.ts",
        "clean",
        "otis",
        "--run-id",
        "future-otis-run",
        "--dry-run",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );
    const cleanup = JSON.parse(rawCleanup) as {
      characterId: string;
      runId: string;
      dryRun: boolean;
      kept: string[];
      protected: string[];
    };

    expect(cleanup).toMatchObject({
      characterId: "otis",
      runId: "future-otis-run",
      dryRun: true,
    });
    expect(cleanup.kept).toContain("src/lib/visual-assets/approved-character-assets.generated.json");
    expect(cleanup.protected.join(" ")).toContain("production public/art files stay live");
  });
});
