import { Command } from "commander";
import { execa } from "execa";
import { findRepoRoot } from "../lib/repo.js";
import { listLedgers, readLedger } from "../lib/ledger.js";
import { taggedCommitsSince } from "../lib/git.js";
import { writeHandoff, type HandoffInput } from "../lib/handoff.js";
import { releaseLock, readLocks } from "../lib/lock.js";
import { getSessionId } from "../lib/session.js";

interface SoftFields {
  decisions?: { text: string; why?: string }[];
  surprises?: string[];
  contextNotes?: string;
  contextUsedPct?: number;
  filesInPlay?: string[];
  inProgress?: string;
  next?: string[];
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => {
      data += c;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function inferInProgress(
  led: Awaited<ReturnType<typeof readLedger>> | null,
): string {
  if (!led) return "";
  const ip = Object.entries(led.tasks).find(
    ([, t]) => t.status === "in_progress",
  );
  return ip ? `${ip[0]} — ${ip[1].title}` : "";
}

async function pickActivePhase(
  repo: string,
  phases: string[],
): Promise<string | null> {
  for (const p of phases) {
    const led = await readLedger(repo, p);
    if (led.status === "in_progress") return p;
  }
  return phases[0] ?? null;
}

export function registerHandoff(program: Command): void {
  program
    .command("handoff")
    .description("generate + commit end-of-session packet")
    .option(
      "--stdin",
      "read soft fields (decisions, surprises, notes) as JSON from stdin",
    )
    .option("--since <iso>", "session-start timestamp for commit scan")
    .action(async (opts: { stdin?: boolean; since?: string }) => {
      const repo = await findRepoRoot();
      const sess = getSessionId();
      const soft: SoftFields = opts.stdin
        ? JSON.parse((await readStdin()) || "{}")
        : {};

      const phases = await listLedgers(repo);
      const activePhase = await pickActivePhase(repo, phases);
      const led = activePhase ? await readLedger(repo, activePhase) : null;

      const since =
        opts.since ??
        new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString();
      const commits = await taggedCommitsSince(repo, since);

      const shipped = commits
        .filter((c) => led && led.tasks[c.tag.task]?.status === "complete")
        .map((c) => ({ task: c.tag.task, commit: c.sha }));

      const tasksCompleted = shipped.map((s) => s.task);
      const tasksStarted = led
        ? Object.entries(led.tasks)
            .filter(
              ([, t]) =>
                t.status === "in_progress" && t.started && t.started > since,
            )
            .map(([id]) => id)
        : [];
      const blockersOpened = led
        ? led.blockers
            .filter((b) => b.opened > since && !b.resolved)
            .map((b) => b.id)
        : [];
      const openBlockers = led
        ? led.blockers
            .filter((b) => !b.resolved)
            .map((b) => ({ id: b.id, task: b.task, text: b.text }))
        : [];

      const input: HandoffInput = {
        sessionId: sess,
        phase: activePhase ?? "unknown",
        started: since,
        ended: new Date().toISOString(),
        contextUsedPct: soft.contextUsedPct ?? 0,
        shipped,
        inProgress: soft.inProgress ?? inferInProgress(led),
        next: soft.next ?? ["(next session decides)"],
        decisions: soft.decisions ?? [],
        surprises: soft.surprises ?? [],
        filesInPlay: soft.filesInPlay ?? [],
        blockers: openBlockers,
        contextNotes: soft.contextNotes ?? "",
        commits: commits.map((c) => c.sha),
        tasksCompleted,
        tasksStarted,
        blockersOpened,
      };

      const p = await writeHandoff(repo, input);

      const locks = await readLocks(repo);
      if (activePhase && locks[activePhase]?.holder === sess) {
        await releaseLock(repo, activePhase, sess);
      }

      for (const rel of [".handoff", ".ledger", ".tower"]) {
        await execa("git", ["add", rel], { cwd: repo }).catch(() => {});
      }
      await execa(
        "git",
        [
          "commit",
          "-m",
          `chore(handoff): session ${sess} — ${activePhase ?? "meta"}`,
        ],
        { cwd: repo },
      ).catch(() => {});

      console.log(`handoff written: ${p}`);
    });
}
