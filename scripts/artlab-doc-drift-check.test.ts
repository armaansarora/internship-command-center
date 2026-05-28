import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  runDocDriftCheck,
  loadCharacterCanonRoster,
  parseCharacterRosterTable,
  compareCharacterRosters,
  parseEnginePhaseChain,
  parseEngineBlockerList,
  compareEnginePhases,
  compareEngineBlockers,
} from "./artlab-doc-drift-check";

const REPO_ROOT = resolve(__dirname, "..");

/**
 * Build a self-contained shadow repo with the same canon + types layout as
 * the real repo so we can mutate the docs without touching anything that
 * persists. The shadow only copies the directories the drift check reads.
 */
function buildShadowRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "artlab-doc-drift-"));
  mkdirSync(join(root, "docs/artlab/sdk/canon/characters"), { recursive: true });
  mkdirSync(join(root, "docs/artlab"), { recursive: true });
  cpSync(
    join(REPO_ROOT, "docs/artlab/sdk/canon/characters"),
    join(root, "docs/artlab/sdk/canon/characters"),
    { recursive: true },
  );
  cpSync(
    join(REPO_ROOT, "docs/artlab/CHARACTER-PIPELINE.md"),
    join(root, "docs/artlab/CHARACTER-PIPELINE.md"),
  );
  cpSync(
    join(REPO_ROOT, "docs/artlab/ENGINE.md"),
    join(root, "docs/artlab/ENGINE.md"),
  );
  return root;
}

describe("artlab doc-drift check", () => {
  let shadow: string | undefined;

  beforeEach(() => {
    shadow = undefined;
  });

  afterEach(() => {
    if (shadow) {
      try { rmSync(shadow, { recursive: true, force: true }); } catch { /* leave it */ }
    }
  });

  it("passes against the current canon + types + docs (green baseline)", () => {
    const result = runDocDriftCheck({ repoRoot: REPO_ROOT });
    if (!result.ok) {
      // Surface every error so a regression is debuggable from the test output.
      throw new Error(
        `Expected drift check to pass. Errors:\n${result.errors.join("\n")}`,
      );
    }
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("loadCharacterCanonRoster returns every canon character sorted by id", () => {
    const rows = loadCharacterCanonRoster(REPO_ROOT);
    expect(rows.length).toBeGreaterThanOrEqual(12);
    const ids = rows.map((r) => r.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    // Spot-check the row that prompted the spec — sol-navarro must be CNO
    // on Floor 6 (the previous doc claimed COO on Floor 4).
    const sol = rows.find((r) => r.id === "sol-navarro");
    expect(sol).toBeDefined();
    expect(sol!.roleSlug).toBe("cno");
    expect(sol!.floorLabel).toBe("Floor 6 — The Rolodex Lounge");
  });

  it("compareCharacterRosters returns no errors when canon and doc agree", () => {
    const canon = loadCharacterCanonRoster(REPO_ROOT);
    const md = readFileSync(join(REPO_ROOT, "docs/artlab/CHARACTER-PIPELINE.md"), "utf8");
    const doc = parseCharacterRosterTable(md);
    const errors = compareCharacterRosters(canon, doc);
    expect(errors).toEqual([]);
  });

  it("fails (exit 1 semantics) when a character row is tampered to contradict canon", () => {
    shadow = buildShadowRepo();
    const pipelinePath = join(shadow, "docs/artlab/CHARACTER-PIPELINE.md");
    const before = readFileSync(pipelinePath, "utf8");
    // Flip sol-navarro back to the WRONG floor/role the spec called out
    // (Floor 4 + COO). Canon says Floor 6 + CNO — this must trigger drift.
    const after = before.replace(
      /\| sol-navarro \| Floor 6 — The Rolodex Lounge \| Chief Networking Officer \(CNO\) \| queued \|/,
      "| sol-navarro | Floor 4 — The Situation Room | Chief Operating Officer (COO) | queued |",
    );
    expect(after).not.toBe(before);
    writeFileSync(pipelinePath, after);
    const result = runDocDriftCheck({ repoRoot: shadow });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("sol-navarro") || e.includes("Floor 6"))).toBe(true);
  });

  it("fails when a canon character is removed from the doc table", () => {
    shadow = buildShadowRepo();
    const pipelinePath = join(shadow, "docs/artlab/CHARACTER-PIPELINE.md");
    const md = readFileSync(pipelinePath, "utf8");
    const stripped = md.replace(
      /\| etta \| The Vault \| Chief Trust Officer \(trust\) \| queued \|\n/,
      "",
    );
    expect(stripped).not.toBe(md);
    writeFileSync(pipelinePath, stripped);
    const result = runDocDriftCheck({ repoRoot: shadow });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("etta"))).toBe(true);
  });

  it("fails when ENGINE.md drops a phase from the chain", () => {
    shadow = buildShadowRepo();
    const enginePath = join(shadow, "docs/artlab/ENGINE.md");
    const md = readFileSync(enginePath, "utf8");
    // Remove "brief-review →" from the chain — canon has it, so the doc
    // would undercount phases by one.
    const tampered = md.replace(" → brief-review →", " →");
    expect(tampered).not.toBe(md);
    writeFileSync(enginePath, tampered);
    const result = runDocDriftCheck({ repoRoot: shadow });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("phase chain"))).toBe(true);
  });

  it("fails when ENGINE.md omits the concept-critique-fallback blocker", () => {
    shadow = buildShadowRepo();
    const enginePath = join(shadow, "docs/artlab/ENGINE.md");
    const md = readFileSync(enginePath, "utf8");
    const tampered = md.replace(", `concept-critique-fallback`", "");
    expect(tampered).not.toBe(md);
    writeFileSync(enginePath, tampered);
    const result = runDocDriftCheck({ repoRoot: shadow });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("concept-critique-fallback"))).toBe(true);
  });

  it("parseEnginePhaseChain matches ARTLAB_PHASES exactly today", async () => {
    const { ARTLAB_PHASES } = await import("../src/lib/artlab/types");
    const md = readFileSync(join(REPO_ROOT, "docs/artlab/ENGINE.md"), "utf8");
    const phases = parseEnginePhaseChain(md);
    expect(compareEnginePhases(ARTLAB_PHASES, phases)).toEqual([]);
  });

  it("parseEngineBlockerList matches ARTLAB_BLOCKERS exactly today", async () => {
    const { ARTLAB_BLOCKERS } = await import("../src/lib/artlab/types");
    const md = readFileSync(join(REPO_ROOT, "docs/artlab/ENGINE.md"), "utf8");
    const blockers = parseEngineBlockerList(md);
    expect(compareEngineBlockers(ARTLAB_BLOCKERS, blockers)).toEqual([]);
  });
});
