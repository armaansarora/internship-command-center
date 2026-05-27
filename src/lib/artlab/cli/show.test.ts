// src/lib/artlab/cli/show.test.ts
//
// `artlab show <runId>` renders the concept-board.json under a run dir into a
// single HTML grid viewer so a human can compare the 5 lanes side-by-side and
// decide which to approve. These tests pin the HTML shape (must contain every
// PNG path + axis label + header metadata) and the CLI error/path-print
// contract.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderConceptBoardHtml, runShowSubcommand } from "./show";

const FIXTURE = {
  runId: "11111111-2222-3333-4444-555555555555",
  characterId: "cno",
  promptSource: "canonical-fallback",
  lanes: [
    { laneIndex: 1, pngPath: "/abs/runs/x/concept-slots/lane-1.png" },
    { laneIndex: 2, pngPath: "/abs/runs/x/concept-slots/lane-2.png" },
    { laneIndex: 3, pngPath: "/abs/runs/x/concept-slots/lane-3.png" },
    { laneIndex: 4, pngPath: "/abs/runs/x/concept-slots/lane-4.png" },
    { laneIndex: 5, pngPath: "/abs/runs/x/concept-slots/lane-5.png" },
  ],
  prompts: [
    { laneIndex: 1, variationAxis: "younger-sharp-crop" },
    { laneIndex: 2, variationAxis: "mid-career-textured" },
    { laneIndex: 3, variationAxis: "late-thirties-styled" },
    { laneIndex: 4, variationAxis: "senior-silver" },
    { laneIndex: 5, variationAxis: "characterful-glasses" },
  ],
  createdAt: "2026-05-27T00:00:00.000Z",
};

describe("renderConceptBoardHtml", () => {
  it("includes every PNG path substring in the rendered HTML", () => {
    const html = renderConceptBoardHtml(FIXTURE);
    for (const lane of FIXTURE.lanes) {
      expect(html).toContain(lane.pngPath);
    }
  });

  it("includes every variation-axis label in the rendered HTML", () => {
    const html = renderConceptBoardHtml(FIXTURE);
    for (const prompt of FIXTURE.prompts) {
      expect(html).toContain(prompt.variationAxis);
    }
  });

  it("includes runId, characterId, promptSource, doctype, and charset", () => {
    const html = renderConceptBoardHtml(FIXTURE);
    expect(html).toContain(FIXTURE.runId);
    expect(html).toContain("cno");
    expect(html).toContain("canonical-fallback");
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toContain('<meta charset="utf-8">');
  });

  it("renders all 5 lane indices as 'Lane N' labels", () => {
    const html = renderConceptBoardHtml(FIXTURE);
    for (let i = 1; i <= 5; i++) {
      expect(html).toContain(`Lane ${i}`);
    }
  });
});

describe("runShowSubcommand", () => {
  let tmp: string;
  let workspaceRoot: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "artlab-show-"));
    workspaceRoot = join(tmp, "engine");
  });

  afterEach(() => {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("exits 2 with usage on stderr when runId is missing", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runShowSubcommand({
      workspaceRoot,
      args: [],
      stdout: (l) => stdout.push(l),
      stderr: (l) => stderr.push(l),
    });
    expect(result.exitCode).toBe(2);
    expect(stderr.join("\n")).toMatch(/show .*<runId>/i);
    expect(stdout).toHaveLength(0);
  });

  it("exits 1 when concept-board.json is missing under the run dir", async () => {
    const runId = "missing-run";
    mkdirSync(join(workspaceRoot, "runs", runId), { recursive: true });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runShowSubcommand({
      workspaceRoot,
      args: [runId],
      stdout: (l) => stdout.push(l),
      stderr: (l) => stderr.push(l),
    });
    expect(result.exitCode).toBe(1);
    expect(stderr.join("\n")).toContain("show: concept-board not found at");
    expect(stderr.join("\n")).toContain(
      join(workspaceRoot, "runs", runId, "concept-board.json"),
    );
    expect(stdout).toHaveLength(0);
  });

  it("writes concept-board.html and prints the absolute path on success", async () => {
    const runId = FIXTURE.runId;
    const runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "concept-board.json"), JSON.stringify(FIXTURE));

    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runShowSubcommand({
      workspaceRoot,
      args: [runId],
      stdout: (l) => stdout.push(l),
      stderr: (l) => stderr.push(l),
    });

    expect(result.exitCode).toBe(0);
    const htmlPath = join(runDir, "concept-board.html");
    expect(existsSync(htmlPath)).toBe(true);
    expect(stdout).toEqual([htmlPath]);
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("lane-1.png");
    expect(html).toContain("younger-sharp-crop");
  });

  it("invokes the spawnOpen seam exactly once with the HTML path when --open is passed", async () => {
    const runId = FIXTURE.runId;
    const runDir = join(workspaceRoot, "runs", runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "concept-board.json"), JSON.stringify(FIXTURE));

    const opened: string[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runShowSubcommand({
      workspaceRoot,
      args: [runId, "--open"],
      stdout: (l) => stdout.push(l),
      stderr: (l) => stderr.push(l),
      spawnOpen: (p) => opened.push(p),
    });

    expect(result.exitCode).toBe(0);
    const htmlPath = join(runDir, "concept-board.html");
    expect(opened).toEqual([htmlPath]);
  });
});
