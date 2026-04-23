import { execa } from "execa";

export interface CommitTag {
  phase: string;
  task: string;
}

export interface TaggedCommit {
  sha: string;
  subject: string;
  committedAt: string;
  tag: CommitTag;
  tags: CommitTag[];
}

// Accepts [R6/6.6], [R6/R6.6], [R6/6.6a], [R6/6.6b] — letter suffix indicates
// the same logical task was split across multiple commits (the 'a'/'b' pattern
// autopilot uses when a single task's work lands in two commits).
const TAG_RE = /\[(R\d+)\/(R?\d+\.\d+)([a-z])?\]/g;

export function parseCommitTags(message: string): CommitTag[] {
  const tags: CommitTag[] = [];
  const re = new RegExp(TAG_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(message)) !== null) {
    const phase = m[1];
    const rawTask = m[2];
    const task = rawTask.startsWith("R") ? rawTask : `R${rawTask}`;
    const phaseNum = phase.slice(1);
    const taskPhaseNum = task.slice(1).split(".")[0];
    if (phaseNum === taskPhaseNum) {
      tags.push({ phase, task });
    }
  }
  return tags;
}

export async function taggedCommitsSince(
  repo: string,
  sinceIso?: string,
): Promise<TaggedCommit[]> {
  const args = ["log", "--format=%H%x1f%s%x1f%cI", "--no-merges"];
  if (sinceIso) args.push(`--since=${sinceIso}`);
  const { stdout } = await execa("git", args, { cwd: repo });
  if (!stdout.trim()) return [];
  return stdout
    .split("\n")
    .map((line) => {
      const [sha, subject, committedAt] = line.split("\x1f");
      const tags = parseCommitTags(subject);
      return tags.length > 0
        ? { sha: sha.slice(0, 8), subject, committedAt, tag: tags[0], tags }
        : null;
    })
    .filter((c): c is TaggedCommit => c !== null);
}

export async function readRepoHead(repo: string): Promise<{
  sha: string;
  subject: string;
  committedAt: string;
}> {
  const { stdout } = await execa(
    "git",
    ["log", "-1", "--format=%h%x1f%s%x1f%cI"],
    { cwd: repo },
  );
  const [sha, subject, committedAt] = stdout.split("\x1f");
  return { sha, subject, committedAt };
}

// Returns true iff the given commit SHA (full or short) exists in the repo.
// Used by drift detection to verify ledger-claimed commits are real, independent
// of whether the commit's subject line carries the expected [phase/task] tag.
export async function commitExists(repo: string, sha: string): Promise<boolean> {
  if (!sha) return false;
  try {
    const { exitCode } = await execa(
      "git",
      ["cat-file", "-e", `${sha}^{commit}`],
      { cwd: repo, reject: false },
    );
    return exitCode === 0;
  } catch {
    return false;
  }
}
