import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import YAML from "yaml";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
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
    "intent: t",
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

describe("tower undo", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("reverts the last state mutation", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": seed("R2", { "R2.3": "in_progress" }),
    });
    await commitFile(repo, "a.ts", "a", "[R2/2.3] feat: ship");
    await runCLI(["done", "R2.3"], { cwd: repo });
    let led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.tasks["R2.3"].status).toBe("complete");

    await runCLI(["undo"], { cwd: repo });
    led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.tasks["R2.3"].status).toBe("in_progress");
  });

  it("exits 1 with message when nothing to undo", async () => {
    repo = await createFixtureRepo();
    const r = await runCLI(["undo"], { cwd: repo, reject: false });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/nothing to undo/i);
  });
});
