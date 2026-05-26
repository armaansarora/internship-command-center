// scripts/foundry.ts
import { runCanonValidateSubcommand } from "@/lib/foundry/cli/canon-validate";
import { runCharacterSubcommand } from "@/lib/foundry/cli/character";
import { runFoundryFloorCli } from "@/lib/foundry/agents/floor-environment/cli";
import { join } from "node:path";

const HELP = `foundry — Tower Art Foundry CLI
Usage:
  foundry canon validate           validate every YAML canon file against its schema
  foundry character <name>         run the character-master agent (Phase 2)
  foundry floor <slug>             run the floor-environment agent (Phase 3)
                                     flags: --dry-run, --seed <n>,
                                            --reported <csv>, --run-dir <path>
  foundry help                     print this help
`;

const DEFAULT_CANON_ROOT = join(process.cwd(), "docs/foundry/canon");

function resolveWorkspaceRoot(): string {
  return process.env.FOUNDRY_WORKSPACE_ROOT ?? join(process.cwd(), ".foundry-workspace");
}

function resolveProviderMode(): "mock" | "gemini" {
  const mode = process.env.FOUNDRY_PROVIDER_MODE ?? "mock";
  if (mode === "gemini") return "gemini";
  return "mock";
}

async function main(argv: readonly string[]): Promise<number> {
  const [subcommand, sub2, ...rest] = argv;
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    process.stdout.write(HELP);
    return 0;
  }
  if (subcommand === "canon") {
    if (sub2 === "validate") {
      return runCanonValidateSubcommand({
        canonRoot: DEFAULT_CANON_ROOT,
        stdout: (s) => process.stdout.write(`${s}\n`),
        stderr: (s) => process.stderr.write(`${s}\n`),
      });
    }
    process.stderr.write(`foundry canon: unknown subsubcommand "${sub2 ?? ""}"\n`);
    return 2;
  }
  if (subcommand === "character") {
    const rawArgs: string[] = [];
    if (sub2 !== undefined) rawArgs.push(sub2);
    rawArgs.push(...rest);
    return runCharacterSubcommand({
      argv: rawArgs,
      canonRoot: DEFAULT_CANON_ROOT,
      workspaceRoot: resolveWorkspaceRoot(),
      providerMode: resolveProviderMode(),
      stdout: (s) => process.stdout.write(`${s}\n`),
      stderr: (s) => process.stderr.write(`${s}\n`),
    });
  }
  if (subcommand === "floor") {
    if (!sub2) {
      process.stderr.write(
        `foundry floor: missing <slug> — e.g. foundry floor "war-room"\n`,
      );
      return 2;
    }
    const floorArgs = [...rest];
    let dryRun = false;
    let seed: number | undefined;
    let reported: string[] = [];
    let runDir: string | undefined;
    for (let i = 0; i < floorArgs.length; i += 1) {
      const arg = floorArgs[i];
      if (arg === "--dry-run") {
        dryRun = true;
      } else if (arg === "--seed") {
        const next = floorArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry floor: --seed requires a value\n`);
          return 2;
        }
        seed = Number(next);
        i += 1;
      } else if (arg === "--reported") {
        const next = floorArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry floor: --reported requires a CSV value\n`);
          return 2;
        }
        reported = next.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
        i += 1;
      } else if (arg === "--run-dir") {
        const next = floorArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry floor: --run-dir requires a value\n`);
          return 2;
        }
        runDir = next;
        i += 1;
      } else {
        process.stderr.write(`foundry floor: unknown flag "${arg}"\n`);
        return 2;
      }
    }
    try {
      const result = await runFoundryFloorCli({
        floorSlug: sub2,
        runDir,
        reportedElements: reported,
        seed,
        providerKind: resolveProviderMode(),
        dryRun,
      });
      process.stdout.write(`${result.summary}\n`);
      process.stdout.write(`runDir: ${result.runDir}\n`);
      if (result.packId) {
        process.stdout.write(`packId: ${result.packId}\n`);
      }
      return 0;
    } catch (err) {
      process.stderr.write(
        `foundry floor: failed — ${(err as Error).message}\n`,
      );
      return 1;
    }
  }
  process.stderr.write(`foundry: subcommand "${subcommand}" not yet implemented\n`);
  return 2;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
