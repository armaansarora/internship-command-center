import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import YAML from "yaml";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

function seed(phase: string, tasks: Record<string, string>): string {
  const t = Object.entries(tasks)
    .map(([id, s]) => `  ${id}: { title: t, status: ${s} }`)
    .join("\n");
  return [
    `phase: ${phase}`,
    "name: Test",
    "status: in_progress",
    "intent: test",
    "started: 2026-04-18T00:00:00Z",
    "completed: null",
    "tasks:",
    t,
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("tower block/unblock", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("records a blocker with auto-increment id", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", { "R2.3": "in_progress" }),
    });
    await runCLI(["block", "R2.3", "threshold ambiguous"], { cwd: repo });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.blockers).toHaveLength(1);
    expect(led.blockers[0].id).toBe("B1");
    expect(led.blockers[0].text).toBe("threshold ambiguous");
    expect(led.blockers[0].resolved).toBeNull();
  });

  it("second block gets B2", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", { "R2.3": "in_progress" }),
    });
    await runCLI(["block", "R2.3", "one"], { cwd: repo });
    await runCLI(["block", "R2.3", "two"], { cwd: repo });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.blockers.map((b: { id: string }) => b.id)).toEqual([
      "B1",
      "B2",
    ]);
  });

  it("unblock sets resolved timestamp", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", { "R2.3": "in_progress" }),
    });
    await runCLI(["block", "R2.3", "x"], { cwd: repo });
    await runCLI(["unblock", "R2", "B1"], { cwd: repo });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.blockers[0].resolved).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
