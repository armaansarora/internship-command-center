export const ARTLAB_SUBCOMMANDS = [
  "produce",
  "continue",
  "answer",
  "status",
  "queue",
  "health",
  "doctor",
  "cancel",
  "daemon",
  "bot",
  "migrate",
  "run-worker",
  "smoke",
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
  artlab doctor                       5-check session-readiness validation
  artlab cancel <runId>               cancel a run with refund
  artlab daemon <run|start|stop|restart|status|logs>
  artlab bot <setup>                  interactive bot setup
  artlab migrate --import <list>      one-shot legacy import
  artlab smoke                        free end-to-end mock-mode smoke test
`;

function defaultWorkspaceRoot(): string {
  return process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";
}

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
        workspaceRoot: defaultWorkspaceRoot(),
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "continue": {
      const { runContinueSubcommand } = await import("@/lib/artlab/cli/continue");
      const result = await runContinueSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "answer": {
      const { runAnswerSubcommand } = await import("@/lib/artlab/cli/answer");
      const result = await runAnswerSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        args: rest,
      });
      if (result.message) io.stdout(result.message);
      return result.exitCode;
    }
    case "status": {
      const { runStatusSubcommand } = await import("@/lib/artlab/cli/status");
      const result = await runStatusSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        log: (line) => io.stdout(line),
      });
      return result.exitCode;
    }
    case "queue": {
      const { runQueueSubcommand } = await import("@/lib/artlab/cli/queue");
      const result = await runQueueSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        log: (line) => io.stdout(line),
      });
      return result.exitCode;
    }
    case "health": {
      const { renderHealthView } = await import("@/lib/artlab/cli/ui/render");
      const { buildArtLabHealthSnapshot } = await import("@/lib/artlab/health/snapshot");
      const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot: defaultWorkspaceRoot() });
      io.stdout(renderHealthView(snapshot));
      return 0;
    }
    case "doctor": {
      const { runDoctorSubcommand } = await import("@/lib/artlab/cli/doctor");
      const result = await runDoctorSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        repoRoot: process.cwd(),
        log: (line) => io.stdout(line),
      });
      return result.exitCode;
    }
    case "cancel":
      return stub("cancel", rest, io);
    case "daemon": {
      const sub = rest[0];
      const tail = rest.slice(1);
      if (!sub) {
        io.stderr(`daemon: expected one of run|start|stop|restart|status|logs`);
        return 2;
      }
      if (sub === "run") {
        const { runDaemonRunSubcommand } = await import("@/lib/artlab/cli/daemon-run");
        return await runDaemonRunSubcommand({
          workspaceRoot: defaultWorkspaceRoot(),
          log: (line) => io.stdout(line),
        });
      }
      if (sub === "start" || sub === "stop" || sub === "restart" || sub === "status" || sub === "logs") {
        const { runDaemonControlSubcommand } = await import("@/lib/artlab/cli/daemon-control");
        return runDaemonControlSubcommand({
          verb: sub,
          workspaceRoot: defaultWorkspaceRoot(),
          log: (line) => io.stdout(line),
          err: (line) => io.stderr(line),
        });
      }
      io.stderr(`daemon: unknown subcommand "${sub}". Expected run|start|stop|restart|status|logs.`);
      if (tail.length > 0) io.stderr(`  trailing args: ${tail.join(" ")}`);
      return 2;
    }
    case "run-worker": {
      const { runWorkerSubcommand } = await import("@/lib/artlab/cli/run-worker");
      const result = await runWorkerSubcommand({
        workspaceRoot: defaultWorkspaceRoot(),
        args: rest,
        log: (line) => io.stdout(line),
      });
      return result.exitCode;
    }
    case "bot": {
      const sub = rest[0];
      if (sub === "setup") {
        const { runBotSetupSubcommand } = await import("@/lib/artlab/cli/bot-setup");
        const result = await runBotSetupSubcommand({ args: rest.slice(1) });
        if (result.message) io.stdout(result.message);
        return result.exitCode;
      }
      io.stderr(`bot: expected subcommand "setup". Got "${sub ?? ""}".`);
      return 2;
    }
    case "migrate":
      return stub("migrate", rest, io);
    case "smoke": {
      const { runSmokeSubcommand } = await import("@/lib/artlab/cli/smoke");
      const result = await runSmokeSubcommand({
        log: (line) => io.stdout(line),
        err: (line) => io.stderr(line),
      });
      return result.exitCode;
    }
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
