import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import YAML from "yaml";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

describe("tower init — SESSION-STATE.json migration", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("imports in-progress task notes into the matching phase ledger", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md":
        "## §7 — The Briefs\n### R2 — War Room\n**Intent:** test\n**Anchors:** x\n**Proof:** y\n",
      "SESSION-STATE.json": JSON.stringify({
        currentTask: "R2: CRO stall trigger",
        deliverable: "R2.3",
        status: "in_progress",
        blocker: null,
        notes: "threshold TBD",
        updatedAt: "2026-04-21T10:00:00Z",
      }),
    });
    await runCLI(["init"], { cwd: repo });
    const led = YAML.parse(
      await fs.readFile(
        path.join(repo, ".ledger/R2-war-room.yml"),
        "utf-8",
      ),
    );
    expect(led.decisions[0].text).toContain("threshold TBD");
    expect(
      await fs.pathExists(path.join(repo, "SESSION-STATE.json.bak")),
    ).toBe(true);
  });
});
