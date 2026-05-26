// scripts/foundry.ts
import { runCanonValidateSubcommand } from "@/lib/foundry/cli/canon-validate";
import { join } from "node:path";

const HELP = `foundry — Tower Art Foundry CLI
Usage:
  foundry canon validate           validate every YAML canon file against its schema
  foundry character <name>         run the character-master agent (Phase 2)
  foundry help                     print this help
`;

const DEFAULT_CANON_ROOT = join(process.cwd(), "docs/foundry/canon");

async function main(argv: readonly string[]): Promise<number> {
  const [subcommand, sub2] = argv;
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
  process.stderr.write(`foundry: subcommand "${subcommand}" not yet implemented\n`);
  return 2;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
