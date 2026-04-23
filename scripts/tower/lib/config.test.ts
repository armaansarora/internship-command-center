import { describe, it, expect, afterEach } from "vitest";
import { loadConfig, DEFAULT_CONFIG } from "./config.js";
import { findRepoRoot } from "./repo.js";
import { createFixtureRepo, cleanupFixture } from "../test-helpers.js";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

describe("findRepoRoot", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("walks up to find .git", async () => {
    repo = await createFixtureRepo();
    const sub = path.join(repo, "a/b/c");
    await fs.ensureDir(sub);
    expect(await findRepoRoot(sub)).toBe(repo);
  });

  it("throws outside a repo", async () => {
    const tmpNoGit = await fs.mkdtemp(path.join(os.tmpdir(), "no-git-"));
    try {
      await expect(findRepoRoot(tmpNoGit)).rejects.toThrow();
    } finally {
      await fs.remove(tmpNoGit);
    }
  });
});

describe("loadConfig", () => {
  let repo: string | undefined;
  afterEach(async () => {
    if (repo) await cleanupFixture(repo);
    repo = undefined;
  });

  it("returns defaults when no config file", async () => {
    repo = await createFixtureRepo();
    const cfg = await loadConfig(repo);
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });

  it("overrides defaults from .tower/config.yml", async () => {
    repo = await createFixtureRepo({
      ".tower/config.yml": "lockTtlMinutes: 60\nroadmapPath: docs/X.md\n",
    });
    const cfg = await loadConfig(repo);
    expect(cfg.lockTtlMinutes).toBe(60);
    expect(cfg.roadmapPath).toBe("docs/X.md");
    expect(cfg.handoffDir).toBe(DEFAULT_CONFIG.handoffDir);
  });
});
