import { describe, it, expect, afterEach } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";

const CLI = path.join(process.cwd(), "scripts/tower/index.ts");

const SAMPLE = `
## §7 — The Briefs
### R1 — The Observatory
**Intent:** x
### R2 — The War Room
**Intent:** pipeline heat map
`;

describe("tower brief", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("prints only that phase's section", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": SAMPLE,
    });
    const { stdout } = await execa("npx", ["tsx", CLI, "brief", "R2"], {
      cwd: repo,
    });
    expect(stdout).toContain("War Room");
    expect(stdout).not.toContain("Observatory");
  });

  it("exits nonzero on unknown phase", async () => {
    repo = await createFixtureRepo({ "docs/NEXT-ROADMAP.md": SAMPLE });
    const r = await execa("npx", ["tsx", CLI, "brief", "R99"], {
      cwd: repo,
      reject: false,
    });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toMatch(/R99/);
  });
});
