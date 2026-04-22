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

function ledger(phase: string, tasks: Record<string, string>): string {
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

describe("tower done", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("marks task complete and records HEAD sha", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": ledger("R2", { "R2.3": "in_progress" }),
    });
    await commitFile(repo, "a.ts", "x", "[R2/2.3] feat: ship");
    await runCLI(["done", "R2.3"], {
      cwd: repo,
      env: { ...process.env, TOWER_SESSION_ID: "sess-done" },
    });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.tasks["R2.3"].status).toBe("complete");
    expect(led.tasks["R2.3"].commit).toMatch(/^[a-f0-9]+$/);
  });

  it("flips phase to complete when all tasks done", async () => {
    repo = await createFixtureRepo({
      ".ledger/R0-foo.yml": ledger("R0", { "R0.1": "in_progress" }),
    });
    await commitFile(repo, "a.ts", "x", "[R0/0.1] feat: last");
    await runCLI(["done", "R0.1"], {
      cwd: repo,
      env: { ...process.env, TOWER_SESSION_ID: "sess-x" },
    });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R0-foo.yml"), "utf-8"),
    );
    expect(led.status).toBe("complete");
    expect(led.completed).toBeTruthy();
  });
});
