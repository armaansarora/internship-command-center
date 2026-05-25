import { describe, expect, it, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { autoCommitPromotion } from "./git-commit";

function initRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "artlab-gitc-"));
  spawnSync("git", ["init", "-q"], { cwd: root });
  spawnSync("git", ["config", "user.email", "test@interntower.com"], { cwd: root });
  spawnSync("git", ["config", "user.name", "test"], { cwd: root });
  // Create an initial commit so HEAD exists.
  writeFileSync(join(root, "README.md"), "init\n");
  spawnSync("git", ["add", "README.md"], { cwd: root });
  spawnSync("git", ["commit", "-q", "-m", "init"], { cwd: root });
  return root;
}

describe("autoCommitPromotion path-scoping", () => {
  let projectRoot: string;
  beforeEach(() => {
    projectRoot = initRepo();
  });

  it("commits a public/art file but not a sibling outside the allowed prefix", () => {
    mkdirSync(join(projectRoot, "public", "art", "lobby", "cno"), { recursive: true });
    writeFileSync(join(projectRoot, "public", "art", "lobby", "cno", "slot-1.png"), "mock-png");
    // Also create an out-of-scope file (must NOT be staged)
    writeFileSync(join(projectRoot, "secret.txt"), "should-not-be-committed");
    const r = autoCommitPromotion({
      projectRoot,
      runId: "abc12345-aaaa-bbbb-cccc-ddddeeeeffff",
      displayName: "Sol Navarro",
      promotedPaths: [join(projectRoot, "public", "art", "lobby", "cno", "slot-1.png")],
      skipPush: true,
    });
    expect(r.status).toBe("committed");
    expect(r.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(r.stagedPaths).toContain("public/art/lobby/cno/slot-1.png");
    // Verify the working tree still has the secret file untracked.
    const statusOut = spawnSync("git", ["status", "--porcelain"], { cwd: projectRoot, encoding: "utf8" }).stdout;
    expect(statusOut).toMatch(/\?\? secret\.txt/);
  });

  it("returns no-changes when nothing in the allowed prefix exists", () => {
    writeFileSync(join(projectRoot, "outside.txt"), "x");
    const r = autoCommitPromotion({
      projectRoot,
      runId: "deadbeef-1111-2222-3333-444455556666",
      promotedPaths: [join(projectRoot, "outside.txt")],
      skipPush: true,
    });
    expect(r.status).toBe("no-changes");
  });

  it("rejects paths outside allowed prefixes (path traversal attempt)", () => {
    mkdirSync(join(projectRoot, "public", "art"), { recursive: true });
    writeFileSync(join(projectRoot, "public", "art", "ok.png"), "ok");
    writeFileSync(join(projectRoot, "evil.ts"), "bad");
    const r = autoCommitPromotion({
      projectRoot,
      runId: "feedbeef-1111-2222-3333-444455556666",
      promotedPaths: [
        join(projectRoot, "public", "art", "ok.png"),
        join(projectRoot, "evil.ts"),
      ],
      skipPush: true,
    });
    expect(r.status).toBe("committed");
    expect(r.stagedPaths).not.toContain("evil.ts");
    // Ensure the commit only contains the allowed path.
    const diff = spawnSync("git", ["show", "--name-only", "--pretty=format:"], { cwd: projectRoot, encoding: "utf8" }).stdout;
    expect(diff).toContain("public/art/ok.png");
    expect(diff).not.toContain("evil.ts");
  });

  it("commits the manifest JSON when promoted alongside public/art", () => {
    mkdirSync(join(projectRoot, "public", "art", "lobby", "cno"), { recursive: true });
    mkdirSync(join(projectRoot, "src", "lib", "visual-assets"), { recursive: true });
    writeFileSync(join(projectRoot, "public", "art", "lobby", "cno", "slot-1.png"), "mock");
    writeFileSync(join(projectRoot, "src", "lib", "visual-assets", "approved-character-assets.generated.json"), "{}");
    const r = autoCommitPromotion({
      projectRoot,
      runId: "cafebabe-1111-2222-3333-444455556666",
      promotedPaths: [join(projectRoot, "public", "art", "lobby", "cno", "slot-1.png")],
      manifestPath: join(projectRoot, "src", "lib", "visual-assets", "approved-character-assets.generated.json"),
      skipPush: true,
    });
    expect(r.status).toBe("committed");
    expect(r.stagedPaths).toEqual(expect.arrayContaining([
      "public/art/lobby/cno/slot-1.png",
      "src/lib/visual-assets/approved-character-assets.generated.json",
    ]));
  });

  it("returns skipped when not a git repo", () => {
    const nonRepoRoot = mkdtempSync(join(tmpdir(), "artlab-nonrepo-"));
    mkdirSync(join(nonRepoRoot, "public", "art"), { recursive: true });
    writeFileSync(join(nonRepoRoot, "public", "art", "x.png"), "x");
    const r = autoCommitPromotion({
      projectRoot: nonRepoRoot,
      runId: "11111111-1111-2222-3333-444455556666",
      promotedPaths: [join(nonRepoRoot, "public", "art", "x.png")],
      skipPush: true,
    });
    expect(r.status).toBe("skipped");
    expect(r.reason).toMatch(/not-a-git-repo/);
  });
});
