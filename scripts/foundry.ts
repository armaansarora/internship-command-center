// scripts/foundry.ts
const HELP = `foundry — Tower Art Foundry CLI
Usage:
  foundry canon validate           validate every YAML canon file against its schema
  foundry character <name>         run the character-master agent (Phase 2)
  foundry help                     print this help
`;

async function main(argv: readonly string[]): Promise<number> {
  const [subcommand] = argv;
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    process.stdout.write(HELP);
    return 0;
  }
  process.stderr.write(`foundry: subcommand "${subcommand}" not yet implemented\n`);
  return 2;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
