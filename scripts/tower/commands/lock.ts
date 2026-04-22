import { Command } from "commander";
import { findRepoRoot } from "../lib/repo.js";
import { loadConfig } from "../lib/config.js";
import { acquireLock, releaseLock } from "../lib/lock.js";
import { getSessionId } from "../lib/session.js";

export function registerLock(program: Command): void {
  program
    .command("lock <phase>")
    .description("acquire a phase lock")
    .option("--force", "steal an existing lock (loud)")
    .action(async (phase: string, opts: { force?: boolean }) => {
      const repo = await findRepoRoot();
      const cfg = await loadConfig(repo);
      const sess = getSessionId();
      const res = await acquireLock(repo, phase, sess, cfg.lockTtlMinutes, {
        force: opts.force,
      });
      if (!res.acquired) {
        console.error(
          `${phase} held by ${res.heldBy} until ${res.expires}. Use --force to steal.`,
        );
        process.exit(1);
      }
      if (res.stolenFrom) console.log(`⚠ stole lock from ${res.stolenFrom}`);
      console.log(`locked ${phase} · holder=${sess} · expires ${res.expires}`);
    });

  program
    .command("unlock <phase>")
    .description("release a phase lock held by this session")
    .action(async (phase: string) => {
      const repo = await findRepoRoot();
      const sess = getSessionId();
      try {
        await releaseLock(repo, phase, sess);
        console.log(`unlocked ${phase}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
