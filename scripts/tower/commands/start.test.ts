import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import YAML from "yaml";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

function baseLedger(phase: string, tasks: Record<string, string>): string {
  const t = Object.entries(tasks)
    .map(([id, s]) => `  ${id}: { title: t, status: ${s} }`)
    .join("\n");
  return [
    `phase: ${phase}`,
    "name: War Room",
    "status: not_started",
    "intent: test",
    "started: null",
    "completed: null",
    "tasks:",
    t || "  {}",
    "blockers: []",
    "decisions: []",
    "history: []",
    "",
  ].join("\n");
}

describe("tower start", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("flips task to in_progress and acquires lock", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": baseLedger("R2", { "R2.3": "not_started" }),
    });
    await runCLI(["start", "R2.3"], {
      cwd: repo,
      env: { ...process.env, TOWER_SESSION_ID: "sess-test" },
    });
    const led = YAML.parse(
      await fs.readFile(path.join(repo, ".ledger/R2-war.yml"), "utf-8"),
    );
    expect(led.tasks["R2.3"].status).toBe("in_progress");
    expect(led.tasks["R2.3"].started).toBeTruthy();
    expect(led.status).toBe("in_progress");
    expect(led.lock?.holder).toBe("sess-test");
  });

  it("errors on unknown task id", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": baseLedger("R2", {}),
    });
    const r = await runCLI(["start", "R2.99"], { cwd: repo, reject: false });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toMatch(/R2\.99/);
  });
});
