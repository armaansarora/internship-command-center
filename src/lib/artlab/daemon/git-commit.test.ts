import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  // ─────────────────────────────────────────────────────────────────────
  // Unit 6 — auto-push must be OPT-IN. Before this fix, the daemon
  // unconditionally `git push origin HEAD:main` on every promotion, which
  // bypassed the byte-diff CI gate (CI only runs on PRs) and surprised
  // any operator who didn't realise the daemon was pushing to main.
  //
  // New contract: push only runs when ARTLAB_AUTO_PUSH=on. When the env
  // var is unset (or anything other than "on"), the commit is recorded
  // locally and the result reports the opt-in requirement. Tests that
  // explicitly pass `skipPush: true` continue to work — they short-circuit
  // before the env check.
  // ─────────────────────────────────────────────────────────────────────
  describe("Unit 6 — ARTLAB_AUTO_PUSH opt-in gate", () => {
    let prevAutoPush: string | undefined;
    beforeEach(() => {
      prevAutoPush = process.env.ARTLAB_AUTO_PUSH;
      delete process.env.ARTLAB_AUTO_PUSH;
    });
    afterEach(() => {
      if (prevAutoPush === undefined) delete process.env.ARTLAB_AUTO_PUSH;
      else process.env.ARTLAB_AUTO_PUSH = prevAutoPush;
    });

    it("with ARTLAB_AUTO_PUSH unset: commits locally and reports push-opt-in-required (no push spawned)", () => {
      mkdirSync(join(projectRoot, "public", "art"), { recursive: true });
      writeFileSync(join(projectRoot, "public", "art", "optin.png"), "mock");
      // Stage a fake origin remote so we can detect whether push was
      // attempted — if push ran, it would fail with the bogus URL and
      // return status:"committed" with a different `reason`. We assert
      // the reason matches the opt-in marker AND the working tree shows
      // no `git push` artefact.
      spawnSync("git", ["remote", "add", "origin", "file:///dev/null"], { cwd: projectRoot });
      const r = autoCommitPromotion({
        projectRoot,
        runId: "0a0b0c0d-1111-2222-3333-444455556666",
        promotedPaths: [join(projectRoot, "public", "art", "optin.png")],
        // Do NOT pass skipPush — exercise the env-derived default.
      });
      expect(r.status).toBe("committed");
      expect(r.pushedTo).toBeUndefined();
      expect(r.reason).toMatch(/push-opt-in-required/);
      expect(r.reason).toMatch(/ARTLAB_AUTO_PUSH=on/);
    });

    it("with ARTLAB_AUTO_PUSH=on: attempts to push (push failure is reported but commit succeeds)", () => {
      process.env.ARTLAB_AUTO_PUSH = "on";
      mkdirSync(join(projectRoot, "public", "art"), { recursive: true });
      writeFileSync(join(projectRoot, "public", "art", "pushed.png"), "mock");
      // No real remote — push must fail. We assert the function ATTEMPTED
      // a push (i.e., reason mentions push failure, NOT the opt-in marker).
      spawnSync("git", ["remote", "add", "origin", "file:///dev/null/nope"], { cwd: projectRoot });
      const r = autoCommitPromotion({
        projectRoot,
        runId: "0b0c0d0e-1111-2222-3333-444455556666",
        promotedPaths: [join(projectRoot, "public", "art", "pushed.png")],
      });
      expect(r.status).toBe("committed");
      expect(r.pushedTo).toBeUndefined();
      expect(r.reason).toMatch(/push failed/);
      expect(r.reason ?? "").not.toMatch(/push-opt-in-required/);
    });

    it("preserves the test-only skipPush:true short-circuit even when ARTLAB_AUTO_PUSH=on", () => {
      process.env.ARTLAB_AUTO_PUSH = "on";
      mkdirSync(join(projectRoot, "public", "art"), { recursive: true });
      writeFileSync(join(projectRoot, "public", "art", "test-bypass.png"), "mock");
      spawnSync("git", ["remote", "add", "origin", "file:///dev/null/nope"], { cwd: projectRoot });
      const r = autoCommitPromotion({
        projectRoot,
        runId: "0c0d0e0f-1111-2222-3333-444455556666",
        promotedPaths: [join(projectRoot, "public", "art", "test-bypass.png")],
        skipPush: true,
      });
      expect(r.status).toBe("committed");
      // Test path: NO reason at all (commit clean, push intentionally skipped).
      expect(r.reason).toBeUndefined();
      expect(r.pushedTo).toBeUndefined();
    });
  });
});
