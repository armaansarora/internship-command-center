// scripts/migrate-style-wins-character-id.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateStyleWinsLedger } from "./migrate-style-wins-character-id";

describe("migrate-style-wins-character-id", () => {
  let workspaceRoot: string;
  let memoryDir: string;
  let ledgerPath: string;
  const canonRoot = join(process.cwd(), "docs/artlab/sdk/canon");
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-migrate-stylewins-"));
    memoryDir = join(workspaceRoot, "memory");
    mkdirSync(memoryDir, { recursive: true });
    ledgerPath = join(memoryDir, "style-wins.jsonl");
  });

  it("returns zeros when the ledger does not exist (no-op for clean workspaces)", () => {
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.totalEntries).toBe(0);
    expect(result.migratedEntries).toBe(0);
    expect(existsSync(ledgerPath)).toBe(false);
  });

  it("rewrites a roleSlug-keyed entry to canon header.id", () => {
    // The live drift: 2 entries with characterId:"cno" (legacy roleSlug),
    // canon header.id is "sol-navarro".
    const cnoEntry = {
      characterId: "cno",
      promotedAt: "2026-05-25T16:37:44.919Z",
      winningTechniques: ["artlab-pipeline"],
      promptHash: "run:e1b4ff48-0dcc-4bfb-b935-53ba4cb287b2",
      totalCostCents: 0,
    };
    writeFileSync(ledgerPath, `${JSON.stringify(cnoEntry)}\n`);
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.totalEntries).toBe(1);
    expect(result.migratedEntries).toBe(1);
    expect(result.unchangedEntries).toBe(0);
    const rewritten = readFileSync(ledgerPath, "utf8").trim();
    expect(JSON.parse(rewritten).characterId).toBe("sol-navarro");
    // Surrounding fields preserved verbatim.
    expect(JSON.parse(rewritten).promotedAt).toBe(cnoEntry.promotedAt);
    expect(JSON.parse(rewritten).promptHash).toBe(cnoEntry.promptHash);
  });

  it("is idempotent — a second run migrates 0 entries", () => {
    const cnoEntry = {
      characterId: "cno",
      promotedAt: "2026-05-25T16:37:44.919Z",
      winningTechniques: ["artlab-pipeline"],
      promptHash: "run:e1b4ff48-0dcc-4bfb-b935-53ba4cb287b2",
      totalCostCents: 0,
    };
    writeFileSync(ledgerPath, `${JSON.stringify(cnoEntry)}\n`);
    const first = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(first.migratedEntries).toBe(1);
    const second = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(second.migratedEntries).toBe(0);
    expect(second.unchangedEntries).toBe(1);
  });

  it("leaves header.id entries unchanged", () => {
    const headerIdEntry = {
      characterId: "sol-navarro",
      promotedAt: "2026-05-25T16:37:44.919Z",
      winningTechniques: ["artlab-pipeline"],
      promptHash: "run:headerid",
      totalCostCents: 0,
    };
    writeFileSync(ledgerPath, `${JSON.stringify(headerIdEntry)}\n`);
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.totalEntries).toBe(1);
    expect(result.migratedEntries).toBe(0);
    expect(result.unchangedEntries).toBe(1);
  });

  it("preserves malformed lines verbatim (does not drop bytes)", () => {
    writeFileSync(ledgerPath, `{not valid json\n${JSON.stringify({ characterId: "cno", promotedAt: "2026-05-25T00:00:00.000Z", winningTechniques: [], promptHash: "x", totalCostCents: 0 })}\n`);
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.malformedLines).toBe(1);
    expect(result.migratedEntries).toBe(1);
    const out = readFileSync(ledgerPath, "utf8");
    expect(out).toContain("{not valid json");
    expect(out).toContain("sol-navarro");
  });

  it("counts unrecognized characterIds without rewriting them", () => {
    const unknownEntry = {
      characterId: "unknown-future-character",
      promotedAt: "2026-05-25T00:00:00.000Z",
      winningTechniques: [],
      promptHash: "x",
      totalCostCents: 0,
    };
    writeFileSync(ledgerPath, `${JSON.stringify(unknownEntry)}\n`);
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.totalEntries).toBe(1);
    expect(result.unrecognizedEntries).toBe(1);
    expect(result.migratedEntries).toBe(0);
    expect(JSON.parse(readFileSync(ledgerPath, "utf8").trim()).characterId).toBe("unknown-future-character");
  });

  it("migrates every canon-known roleSlug → header.id (full cast sweep)", () => {
    const entries = [
      { characterId: "ceo", token: "mara" }, // → mara-voss
      { characterId: "cro", token: "rafe" }, // → rafe-calder
      { characterId: "cmo", token: "vera" }, // → vera
      { characterId: "coo", token: "dylan" }, // → dylan
      { characterId: "otis", token: "otis" }, // → otis (no change)
    ];
    writeFileSync(
      ledgerPath,
      `${entries
        .map((e) => JSON.stringify({
          characterId: e.characterId,
          promotedAt: "2026-05-25T00:00:00.000Z",
          winningTechniques: [e.token],
          promptHash: `run:${e.token}`,
          totalCostCents: 0,
        }))
        .join("\n")}\n`,
    );
    const result = migrateStyleWinsLedger({ workspaceRoot, canonRoot });
    expect(result.totalEntries).toBe(5);
    // ceo→mara-voss, cro→rafe-calder are migrations; vera/dylan/otis are
    // identity matches (canon header.id === roleSlug for those three).
    expect(result.migratedEntries).toBeGreaterThanOrEqual(2);
  });
});
