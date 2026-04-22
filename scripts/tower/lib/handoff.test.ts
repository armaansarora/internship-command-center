import { describe, it, expect, afterEach } from "vitest";
import {
  renderHandoff,
  writeHandoff,
  findLatestHandoff,
  type HandoffInput,
} from "./handoff.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";
import fs from "fs-extra";
import path from "node:path";

function sample(): HandoffInput {
  return {
    sessionId: "sess-x",
    phase: "R2",
    started: "2026-04-21T15:30:00Z",
    ended: "2026-04-21T17:45:00Z",
    contextUsedPct: 72,
    shipped: [{ task: "R2.2", commit: "abc1234" }],
    inProgress: "R2.3 — CRO trigger tuning",
    next: ["Resolve B1", "Ship R2.3"],
    decisions: [{ text: "linear decay model", why: "simpler" }],
    surprises: ["Vercel scheduled fns don't retry"],
    filesInPlay: ["src/lib/decay.ts"],
    blockers: [{ id: "B1", task: "R2.3", text: "threshold ambiguous" }],
    contextNotes: "trigger assumes 7-day window",
    commits: ["abc1234", "b3c9d8e"],
    tasksCompleted: ["R2.2"],
    tasksStarted: ["R2.3"],
    blockersOpened: ["B1"],
  };
}

describe("renderHandoff", () => {
  it("produces frontmatter + sections", () => {
    const md = renderHandoff(sample());
    expect(md).toMatch(/^---/);
    expect(md).toContain("session_id: sess-x");
    expect(md).toContain("## Shipped");
    expect(md).toContain("- R2.2 — commit `abc1234`");
    expect(md).toContain("## Decisions this session");
  });

  it("omits empty sections gracefully", () => {
    const md = renderHandoff({
      ...sample(),
      decisions: [],
      surprises: [],
    });
    expect(md).not.toContain("## Decisions this session");
    expect(md).not.toContain("## Surprises");
  });
});

describe("writeHandoff + findLatestHandoff", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("writes to .handoff/YYYY-MM-DD-HHMM.md", async () => {
    repo = await createFixtureRepo();
    const p = await writeHandoff(repo, sample());
    expect(p).toMatch(/\.handoff\/\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
    expect(await fs.pathExists(p)).toBe(true);
  });

  it("findLatestHandoff returns newest by filename", async () => {
    repo = await createFixtureRepo();
    await fs.ensureDir(path.join(repo, ".handoff"));
    await fs.writeFile(
      path.join(repo, ".handoff/2026-04-20-1500.md"),
      "old",
    );
    await fs.writeFile(
      path.join(repo, ".handoff/2026-04-21-0900.md"),
      "new",
    );
    const latest = await findLatestHandoff(repo);
    expect(latest?.endsWith("2026-04-21-0900.md")).toBe(true);
  });
});
