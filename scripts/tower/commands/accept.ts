import { Command } from "commander";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { readLedger, writeLedger } from "../lib/ledger.js";
import { readRepoHead } from "../lib/git.js";
import { pushUndo } from "../lib/undo.js";
import { runVerify } from "../lib/verify.js";
import { advanceAutopilotScope } from "../lib/autopilot.js";

export function registerAccept(program: Command): void {
  program
    .command("accept <phase>")
    .description(
      "flip acceptance.met: true — runs full verify first, refuses on any ✗",
    )
    .option("--skip-tests", "skip vitest")
    .option("--skip-types", "skip tsc --noEmit")
    .option("--skip-build", "skip npm run build")
    .option("--skip-lint", "skip eslint")
    .option(
      "--skip-drift",
      "skip ledger/git reconciliation (use only for partial retroactive fixes)",
    )
    .option(
      "--force",
      "bypass verify gate — logs a loud warning and records bypass in ledger",
    )
    .action(
      async (
        phase: string,
        opts: {
          skipTests?: boolean;
          skipTypes?: boolean;
          skipBuild?: boolean;
          skipLint?: boolean;
          skipDrift?: boolean;
          force?: boolean;
        },
      ) => {
        const repo = await findRepoRoot();
        const led = await readLedger(repo, phase).catch(() => null);
        if (!led) {
          console.error(`no ledger for phase ${phase}`);
          process.exit(1);
        }

        if (led.acceptance.met && !opts.force) {
          console.log(
            `${phase} already has acceptance.met: true — nothing to do`,
          );
          return;
        }

        // Run full verify gate before flipping.
        const report = await runVerify(repo, { ...opts, phase });
        const failed = report.checks.filter((c) => !c.ok);

        if (failed.length > 0 && !opts.force) {
          console.error(`\n✗ cannot accept ${phase} — verify failed:`);
          for (const c of failed) {
            console.error(`  ${c.name.padEnd(14)} ${c.message}`);
          }
          console.error(
            `\nFix the ✗ items, or re-run with --force (records bypass in ledger).`,
          );
          process.exit(1);
        }

        await pushUndo(repo, {
          op: "accept",
          phase,
          snapshot: YAML.stringify(led),
        });

        const head = await readRepoHead(repo);
        const now = new Date().toISOString();

        led.acceptance.met = true;
        led.acceptance.verified_by_commit = head.sha;

        if (opts.force && failed.length > 0) {
          led.history.push({
            [now]: `acceptance_forced_bypass: ${failed.map((c) => c.name).join(", ")}`,
          });
          console.warn(
            `⚠ ACCEPTANCE FLIPPED VIA --force DESPITE ${failed.length} FAILED CHECK(S).`,
          );
        } else {
          led.history.push({ [now]: `acceptance_met verified_by ${head.sha}` });
        }

        await writeLedger(repo, led);
        console.log(
          `✓ ${phase} acceptance.met: true (verified_by_commit: ${head.sha})`,
        );

        // Auto-advance autopilot scope if .tower/autopilot.yml exists.
        const openBlockers = (led.blockers ?? [])
          .filter((b) => b.resolved === null)
          .map((b) => `${phase} ${b.id} (${b.task}) — ${b.text.slice(0, 80)}`);

        const outcome = `${phase} complete — ${Object.values(led.tasks).filter((t) => t.status === "complete").length}/${Object.keys(led.tasks).length} tasks, acceptance.met (verified_by_commit: ${head.sha}).`;

        const advanced = await advanceAutopilotScope(repo, phase, {
          previousOutcome: outcome,
          carryBlockers: openBlockers,
        });

        if (advanced) {
          console.log(
            `→ autopilot scope advanced: ${advanced.nextPhase} (paused, awaiting trigger)`,
          );
          console.log(`   ${advanced.brief}`);
        }
      },
    );
}
