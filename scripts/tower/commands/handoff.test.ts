import { describe, it, expect, afterEach } from "vitest";
import { execa } from "execa";
import path from "node:path";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  commitFile,
  runCLI,
} from "../test-helpers.js";

describe("tower handoff", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("writes a packet and commits it", async () => {
    repo = await createFixtureRepo({
      ".ledger/R2-war.yml": [
        "phase: R2",
        "name: War",
        "status: in_progress",
        "intent: t",
        "started: 2026-04-18T00:00:00Z",
        "completed: null",
        "tasks:",
        "  R2.1: { title: a, status: complete, commit: head }",
        "  R2.2: { title: b, status: in_progress }",
        "blockers: []",
        "decisions: []",
        "history: []",
        "",
      ].join("\n"),
    });
    await commitFile(repo, "a.ts", "x", "[R2/2.1] feat: a");

    const soft = JSON.stringify({
      decisions: [{ text: "use linear decay", why: "simpler" }],
      surprises: ["scheduled fns don't retry"],
      contextNotes: "assumes 7-day window",
      contextUsedPct: 72,
    });

    await runCLI(["handoff", "--stdin"], {
      cwd: repo,
      input: soft,
      env: { ...process.env, TOWER_SESSION_ID: "sess-handoff" },
    });

    const handoffDir = path.join(repo, ".handoff");
    const files = await fs.readdir(handoffDir);
    expect(files).toHaveLength(1);
    const content = await fs.readFile(
      path.join(handoffDir, files[0]),
      "utf-8",
    );
    expect(content).toContain("sess-handoff");
    expect(content).toContain("use linear decay");
    expect(content).toContain("scheduled fns don't retry");

    const { stdout: log } = await execa(
      "git",
      ["log", "-1", "--format=%s"],
      { cwd: repo },
    );
    expect(log).toMatch(/chore\(handoff\)/);
  });
});
