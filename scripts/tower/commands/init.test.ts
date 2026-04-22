import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "fs-extra";
import {
  createFixtureRepo,
  cleanupFixture,
  runCLI,
} from "../test-helpers.js";

const ROADMAP = `
## §7 — The Briefs
### R0 — Hardening
**Intent:** fix the bug
**Anchors:** src/x.ts
**Proof:** works

### R1 — Observatory
**Intent:** analytics
**Anchors:** floor-2
**Proof:** live
`;

describe("tower init", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("creates .ledger files for each phase with seeded intent", async () => {
    repo = await createFixtureRepo({ "docs/NEXT-ROADMAP.md": ROADMAP });
    await runCLI(["init"], { cwd: repo });
    const files = await fs.readdir(path.join(repo, ".ledger"));
    expect(files.sort()).toEqual([
      "R0-hardening.yml",
      "R1-observatory.yml",
    ]);
    const r0 = await fs.readFile(
      path.join(repo, ".ledger/R0-hardening.yml"),
      "utf-8",
    );
    expect(r0).toContain("fix the bug");
  });

  it("creates .tower/config.yml with defaults", async () => {
    repo = await createFixtureRepo({ "docs/NEXT-ROADMAP.md": ROADMAP });
    await runCLI(["init"], { cwd: repo });
    expect(
      await fs.pathExists(path.join(repo, ".tower/config.yml")),
    ).toBe(true);
  });

  it("creates .handoff directory and gitignore entry for .tower/.cache", async () => {
    repo = await createFixtureRepo({ "docs/NEXT-ROADMAP.md": ROADMAP });
    await runCLI(["init"], { cwd: repo });
    expect(await fs.pathExists(path.join(repo, ".handoff"))).toBe(true);
    const gi = await fs
      .readFile(path.join(repo, ".gitignore"), "utf-8")
      .catch(() => "");
    expect(gi).toMatch(/\.tower\/\.cache/);
  });

  it("refuses to overwrite existing ledger", async () => {
    repo = await createFixtureRepo({
      "docs/NEXT-ROADMAP.md": ROADMAP,
      ".ledger/R0-hardening.yml":
        "phase: R0\nname: x\nstatus: in_progress\n",
    });
    const r = await runCLI(["init"], { cwd: repo, reject: false });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toMatch(/already/i);
  });
});
