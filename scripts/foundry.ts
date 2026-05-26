// scripts/foundry.ts
import { runCanonValidateSubcommand } from "@/lib/foundry/cli/canon-validate";
import { runCharacterSubcommand } from "@/lib/foundry/cli/character";
import { join } from "node:path";

const HELP = `foundry — Tower Art Foundry CLI
Usage:
  foundry canon validate           validate every YAML canon file against its schema
  foundry character <name>         run the character-master agent (Phase 2)
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
  process.stderr.write(`foundry: subcommand "${subcommand}" not yet implemented\n`);
  return 2;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
