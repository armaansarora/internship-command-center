import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildConceptBoardAttachments, buildFinalBoardAttachments } from "./board-attachments";

describe("board attachment builders", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-board-"));
    mkdirSync(join(runDir, "concept-slots"));
    for (let i = 1; i <= 5; i += 1) {
      writeFileSync(join(runDir, "concept-slots", `lane-${i}.png`), `mock-${i}`);
    }
  });

  it("concept board: 5 photos with numbered captions", () => {
    const result = buildConceptBoardAttachments({ runDir, characterId: "sol" });
    expect(result.media).toHaveLength(5);
    expect(result.media[0]!.caption).toBe("Sol · direction 1");
    expect(result.media[4]!.caption).toBe("Sol · direction 5");
  });

  it("final board: single grid image with sprite count", () => {
    writeFileSync(join(runDir, "final-board.png"), "mock-final");
    const result = buildFinalBoardAttachments({ runDir, characterId: "sol", spriteCount: 21 });
    expect(result.media).toHaveLength(1);
    expect(result.media[0]!.caption).toContain("21 sprites");
  });

  it("concept board throws when fewer than 5 lane files exist", () => {
    unlinkSync(join(runDir, "concept-slots", "lane-4.png"));
    unlinkSync(join(runDir, "concept-slots", "lane-5.png"));
    expect(() => buildConceptBoardAttachments({ runDir, characterId: "sol" })).toThrow(/expected 5/i);
  });
});
