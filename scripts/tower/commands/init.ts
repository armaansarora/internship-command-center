import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { findRepoRoot } from "../lib/repo.js";
import { loadConfig, DEFAULT_CONFIG } from "../lib/config.js";
import { parseRoadmap } from "../lib/roadmap.js";
import { writeLedger } from "../lib/ledger.js";
import type { Ledger } from "../lib/ledger-schema.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("seed ledger from NEXT-ROADMAP.md, create .tower config")
    .option("--force", "overwrite existing ledger")
    .action(async (opts: { force?: boolean }) => {
      const repo = await findRepoRoot();
      const cfg = await loadConfig(repo);

      const ledgerDir = path.join(repo, cfg.ledgerDir);
      if (!opts.force && (await fs.pathExists(ledgerDir))) {
        const existing = (await fs.readdir(ledgerDir)).filter((f) =>
          f.endsWith(".yml"),
        );
        if (existing.length > 0) {
          console.error(
            `ledger already exists (${existing.length} files). Use --force to overwrite.`,
          );
          process.exit(1);
        }
      }

      const roadmapPath = path.join(repo, cfg.roadmapPath);
      if (!(await fs.pathExists(roadmapPath))) {
        console.error(`roadmap not found at ${cfg.roadmapPath}`);
        process.exit(1);
      }
      const raw = await fs.readFile(roadmapPath, "utf-8");
      const briefs = parseRoadmap(raw);

      await fs.ensureDir(ledgerDir);
      for (const [phase, brief] of Object.entries(briefs)) {
        const led: Ledger = {
          phase,
          name: brief.name,
          status: "not_started",
          intent: brief.intent,
          started: null,
          completed: null,
          lock: null,
          acceptance: {
            criteria: brief.proof ? [brief.proof] : [],
            met: false,
            verified_by_commit: null,
          },
          tasks: {},
          blockers: [],
          decisions: [],
          history: [],
        };
        await writeLedger(repo, led);
      }

      const cfgPath = path.join(repo, ".tower/config.yml");
      if (!(await fs.pathExists(cfgPath))) {
        await fs.ensureDir(path.dirname(cfgPath));
        await fs.writeFile(cfgPath, YAML.stringify(DEFAULT_CONFIG), "utf-8");
      }

      await fs.ensureDir(path.join(repo, cfg.handoffDir));

      const giPath = path.join(repo, ".gitignore");
      const giExisting = (await fs
        .readFile(giPath, "utf-8")
        .catch(() => ""));
      if (!giExisting.includes(".tower/.cache")) {
        await fs.writeFile(giPath, `${giExisting}\n.tower/.cache\n`);
      }

      console.log(
        `tower initialised · ${Object.keys(briefs).length} phases seeded`,
      );
      console.log("Next: `tower status`");
    });
}
