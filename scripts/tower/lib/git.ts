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
}

const TAG_RE = /\[(R\d+)\/(R?\d+\.\d+)\]/g;

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
        ? { sha: sha.slice(0, 8), subject, committedAt, tag: tags[0] }
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
