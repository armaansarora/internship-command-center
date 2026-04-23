import { describe, it, expect, afterEach } from "vitest";
import { readLedger, writeLedger, listLedgers, ledgerPath } from "./ledger.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";
import path from "node:path";

function baseYaml(phase: string): string {
  return [
    `phase: ${phase}`,
    "name: Test",
    "status: not_started",
    "intent: test",
    "started: null",
    "completed: null",
    "tasks: {}",
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("ledger I/O", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("reads a valid ledger file", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war-room.yml": [
        "phase: R2",
        "name: War Room",
        "status: in_progress",
        "intent: pipeline heat map",
        "started: 2026-04-18T10:30:00Z",
        "completed: null",
        "tasks:",
        "  R2.1:",
        "    title: schema",
        "    status: complete",
        "    commit: abc123",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    const led = await readLedger(repo, "R2");
    expect(led.phase).toBe("R2");
    expect(led.tasks["R2.1"].status).toBe("complete");
  });

  it("throws on malformed yaml (invalid status)", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-x.yml": [
        "phase: R2",
        "name: x",
        "status: blah",
        "intent: x",
        "started: null",
        "completed: null",
        "tasks: {}",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    await expect(readLedger(repo, "R2")).rejects.toThrow();
  });

  it("writes ledger back round-trip", async () => {
    repo = await createFixtureRepo();
    const led = {
      phase: "R2",
      name: "War Room",
      status: "not_started" as const,
      intent: "test",
      started: null,
      completed: null,
      lock: null,
      acceptance: { criteria: [], met: false, verified_by_commit: null },
      tasks: {},
      blockers: [],
      decisions: [],
      history: [],
    };
    await writeLedger(repo, led);
    const readBack = await readLedger(repo, "R2");
    expect(readBack.phase).toBe("R2");
    expect(readBack.name).toBe("War Room");
    expect(readBack.status).toBe("not_started");
  });

  it("listLedgers enumerates phases", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-hardening.yml": baseYaml("R0"),
      ".ledger/R1-foo.yml": baseYaml("R1"),
    });
    const list = await listLedgers(repo);
    expect(list.sort()).toEqual(["R0", "R1"]);
  });

  it("ledgerPath finds existing file by phase id", async () => {
    repo = await createFixtureRepo({
      ".ledger/R5-writing.yml": baseYaml("R5"),
    });
    const p = await ledgerPath(repo, "R5");
    expect(p).toBe(path.join(repo, ".ledger/R5-writing.yml"));
  });
});
