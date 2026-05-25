// src/lib/artlab/daemon/git-commit.ts
//
// After promotion-runner writes assets to public/art and updates the
// generated manifest JSON, the daemon stages the path-scoped diff,
// commits with an attributed message, and pushes to origin/main so
// Vercel auto-deploys.
//
// Path-scoping is the safety net: the daemon only ever stages files
// under `public/art/` or `src/lib/visual-assets/approved-character-assets.generated.json`
// (and a few other manifest JSONs). Any other working-tree modification is
// left untouched.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface AutoCommitInput {
  projectRoot: string;
  runId: string;
  displayName?: string;            // "Sol Navarro"
  promotedPaths: string[];         // absolute or workspace-relative paths
  manifestPath?: string;           // absolute or workspace-relative path to the manifest JSON
  skipPush?: boolean;              // for tests
}

export interface AutoCommitResult {
  status: "committed" | "no-changes" | "skipped" | "failed";
  sha?: string;
  pushedTo?: string;
  reason?: string;
  stagedPaths: string[];
}

const ALLOWED_PREFIXES = [
  "public/art/",
  "src/lib/visual-assets/approved-character-assets.generated.json",
  ".artlab/production-manifests/",
];

function isAllowed(relPath: string): boolean {
  const normalized = relPath.split("\\").join("/");
  return ALLOWED_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? normalized.startsWith(prefix) : normalized === prefix,
  );
}

function exec(projectRoot: string, args: string[]): { stdout: string; stderr: string; code: number } {
  const r = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
  return {
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    code: r.status ?? -1,
  };
}

function isGitRepo(projectRoot: string): boolean {
  return existsSync(join(projectRoot, ".git"));
}

export function autoCommitPromotion(input: AutoCommitInput): AutoCommitResult {
  if (!isGitRepo(input.projectRoot)) {
    return { status: "skipped", reason: "not-a-git-repo", stagedPaths: [] };
  }

  const candidates = [...input.promotedPaths, ...(input.manifestPath ? [input.manifestPath] : [])];
  const allowed: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const abs = resolve(input.projectRoot, candidate);
    const rel = relative(input.projectRoot, abs).split("\\").join("/");
    if (!rel || rel.startsWith("..")) continue;
    if (!isAllowed(rel)) continue;
    if (!existsSync(abs)) continue;
    allowed.push(rel);
  }

  if (allowed.length === 0) {
    return { status: "no-changes", reason: "no-allowed-paths-to-stage", stagedPaths: [] };
  }

  // Stage only allowed paths.
  const add = exec(input.projectRoot, ["add", "--", ...allowed]);
  if (add.code !== 0) {
    return { status: "failed", reason: `git add failed: ${add.stderr.trim()}`, stagedPaths: allowed };
  }

  // Check if there's anything actually staged for those paths.
  const diff = exec(input.projectRoot, ["diff", "--cached", "--name-only"]);
  const staged = diff.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
  const stagedAllowed = staged.filter(isAllowed);
  if (stagedAllowed.length === 0) {
    return { status: "no-changes", reason: "nothing-staged-after-add", stagedPaths: [] };
  }

  // If any staged path is NOT in the allowed prefix list, unstage everything and bail.
  if (staged.some((p) => !isAllowed(p))) {
    exec(input.projectRoot, ["reset", "--", ...staged]);
    return {
      status: "failed",
      reason: `refusing to commit — non-allowed paths in staging: ${staged.filter((p) => !isAllowed(p)).join(", ")}`,
      stagedPaths: stagedAllowed,
    };
  }

  const subject = input.displayName
    ? `ArtLab promotion: ${input.displayName} (${input.runId.slice(0, 8)})`
    : `ArtLab promotion: ${input.runId.slice(0, 8)}`;
  const commitMessage = [
    subject,
    "",
    `Run: ${input.runId}`,
    `Assets: ${stagedAllowed.length} files`,
    "",
    "Co-Authored-By: ArtLab daemon <artlab@interntower.com>",
  ].join("\n");

  const commit = exec(input.projectRoot, ["commit", "-m", commitMessage]);
  if (commit.code !== 0) {
    return { status: "failed", reason: `git commit failed: ${commit.stderr.trim()}`, stagedPaths: stagedAllowed };
  }
  const sha = exec(input.projectRoot, ["rev-parse", "HEAD"]).stdout.trim();

  if (input.skipPush) {
    return { status: "committed", sha, stagedPaths: stagedAllowed };
  }

  const push = exec(input.projectRoot, ["push", "origin", "HEAD:main"]);
  if (push.code !== 0) {
    return {
      status: "committed",
      sha,
      reason: `commit succeeded but push failed: ${push.stderr.trim()}`,
      stagedPaths: stagedAllowed,
    };
  }
  return { status: "committed", sha, pushedTo: "origin/main", stagedPaths: stagedAllowed };
}
