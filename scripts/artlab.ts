export const ARTLAB_SUBCOMMANDS = [
  "produce",
  "continue",
  "answer",
  "status",
  "queue",
  "health",
  "cancel",
  "daemon",
  "bot",
  "migrate",
  "help",
] as const;
export type ArtLabSubcommand = (typeof ARTLAB_SUBCOMMANDS)[number];

export interface ArtLabCliIo {
  argv: string[];
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const HELP_TEXT = `artlab — Tower creative engine CLI
Usage:
  artlab produce <request>            new run; LLM brain routes
  artlab continue <runId>             advance a continuable phase
  artlab answer <runId> "<response>"  record human response
  artlab status [runId]               plain-English status
  artlab queue                        queued + active runs
  artlab health                       real engine health report
  artlab cancel <runId>               cancel a run with refund
  artlab daemon <start|stop|restart|status|logs>
  artlab bot <setup>                  interactive bot setup
  artlab migrate --import <list>      one-shot legacy import
`;

async function stub(name: string, args: string[], io: ArtLabCliIo): Promise<number> {
  io.stdout(`artlab ${name}: stub — fills in during Phase 1-3 implementation`);
  if (args.length > 0) io.stdout(`  args: ${args.join(" ")}`);
  return 0;
}

export async function artlabCliEntry(io: ArtLabCliIo): Promise<number> {
  const [subcommand, ...rest] = io.argv;
  if (!subcommand) {
    io.stderr(HELP_TEXT);
    return 2;
  }
  if (!ARTLAB_SUBCOMMANDS.includes(subcommand as ArtLabSubcommand)) {
    io.stderr(`artlab: unknown subcommand "${subcommand}"\n\n${HELP_TEXT}`);
    return 2;
  }
  switch (subcommand as ArtLabSubcommand) {
    case "help":
      io.stdout(HELP_TEXT);
      return 0;
    case "produce": {
      const { runProduceSubcommand } = await import("@/lib/artlab/cli/produce");
      const result = await runProduceSubcommand({
        workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "continue": {
      const { runContinueSubcommand } = await import("@/lib/artlab/cli/continue");
      const result = await runContinueSubcommand({
        workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "answer": {
      const { runAnswerSubcommand } = await import("@/lib/artlab/cli/answer");
      const result = await runAnswerSubcommand({
        workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "status":
      return stub("status", rest, io);
    case "queue":
      return stub("queue", rest, io);
    case "health":
      return stub("health", rest, io);
    case "cancel":
      return stub("cancel", rest, io);
    case "daemon":
      return stub("daemon", rest, io);
    case "bot":
      return stub("bot", rest, io);
    case "migrate":
      return stub("migrate", rest, io);
  }
}

const invokedDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("scripts/artlab.ts") ||
    process.argv[1].endsWith("scripts\\artlab.ts") ||
    process.argv[1].endsWith("scripts/artlab.js"));

if (invokedDirectly) {
  void artlabCliEntry({
    argv: process.argv.slice(2),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  }).then((code) => process.exit(code));
}
