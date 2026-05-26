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
  foundry texture <name>           run the ui-texture agent (Phase 4)
                                     flags: --kind <icon|texture>,
                                            --aria-label <label>,
                                            --tile-mode <repeat|repeat-x|repeat-y|no-repeat>,
                                            --provider <mock|claude|gemini>,
                                            --dry-run, --run-dir <path>, --seed <n>
  foundry animate <sourcePackId>   run the sprite-animator agent (Phase 5)
                                     flags: --action <idle|wave|nod|celebrate>,
                                            --format <sprite|lottie>,
                                            --provider <mock|sora|runway|claude>,
                                            --dry-run, --run-dir <path>, --seed <n>
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
  if (subcommand === "texture") {
    if (!sub2) {
      process.stderr.write(
        `foundry texture: missing <name> — e.g. foundry texture elevator-door --kind=icon\n`,
      );
      return 2;
    }
    const textureArgs = [...rest];
    let kindFlag: "icon" | "texture" = "texture";
    let ariaLabel: string | undefined;
    let tileMode:
      | "repeat"
      | "repeat-x"
      | "repeat-y"
      | "no-repeat"
      | undefined;
    let providerKind: "mock" | "claude" | "gemini" = "mock";
    let dryRun = false;
    let runDir: string | undefined;
    let seed: number | undefined;
    for (let i = 0; i < textureArgs.length; i += 1) {
      const arg = textureArgs[i];
      if (arg === "--kind") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --kind requires a value\n`);
          return 2;
        }
        if (next !== "icon" && next !== "texture") {
          process.stderr.write(
            `foundry texture: --kind must be icon|texture (got "${next}")\n`,
          );
          return 2;
        }
        kindFlag = next;
        i += 1;
      } else if (arg?.startsWith("--kind=")) {
        const next = arg.slice("--kind=".length);
        if (next !== "icon" && next !== "texture") {
          process.stderr.write(
            `foundry texture: --kind must be icon|texture (got "${next}")\n`,
          );
          return 2;
        }
        kindFlag = next;
      } else if (arg === "--aria-label") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --aria-label requires a value\n`);
          return 2;
        }
        ariaLabel = next;
        i += 1;
      } else if (arg?.startsWith("--aria-label=")) {
        ariaLabel = arg.slice("--aria-label=".length);
      } else if (arg === "--tile-mode") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --tile-mode requires a value\n`);
          return 2;
        }
        if (
          next !== "repeat" &&
          next !== "repeat-x" &&
          next !== "repeat-y" &&
          next !== "no-repeat"
        ) {
          process.stderr.write(
            `foundry texture: --tile-mode must be repeat|repeat-x|repeat-y|no-repeat\n`,
          );
          return 2;
        }
        tileMode = next;
        i += 1;
      } else if (arg?.startsWith("--tile-mode=")) {
        const next = arg.slice("--tile-mode=".length);
        if (
          next !== "repeat" &&
          next !== "repeat-x" &&
          next !== "repeat-y" &&
          next !== "no-repeat"
        ) {
          process.stderr.write(
            `foundry texture: --tile-mode must be repeat|repeat-x|repeat-y|no-repeat\n`,
          );
          return 2;
        }
        tileMode = next;
      } else if (arg === "--provider") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --provider requires a value\n`);
          return 2;
        }
        if (next !== "mock" && next !== "claude" && next !== "gemini") {
          process.stderr.write(
            `foundry texture: --provider must be mock|claude|gemini\n`,
          );
          return 2;
        }
        providerKind = next;
        i += 1;
      } else if (arg?.startsWith("--provider=")) {
        const next = arg.slice("--provider=".length);
        if (next !== "mock" && next !== "claude" && next !== "gemini") {
          process.stderr.write(
            `foundry texture: --provider must be mock|claude|gemini\n`,
          );
          return 2;
        }
        providerKind = next;
      } else if (arg === "--dry-run") {
        dryRun = true;
      } else if (arg === "--run-dir") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --run-dir requires a value\n`);
          return 2;
        }
        runDir = next;
        i += 1;
      } else if (arg?.startsWith("--run-dir=")) {
        runDir = arg.slice("--run-dir=".length);
      } else if (arg === "--seed") {
        const next = textureArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry texture: --seed requires a value\n`);
          return 2;
        }
        seed = Number(next);
        i += 1;
      } else if (arg?.startsWith("--seed=")) {
        seed = Number(arg.slice("--seed=".length));
      } else {
        process.stderr.write(`foundry texture: unknown flag "${arg}"\n`);
        return 2;
      }
    }
    try {
      const { runFoundryUiTextureCli } = await import(
        "@/lib/foundry/agents/ui-texture/cli"
      );
      const out = await runFoundryUiTextureCli({
        name: sub2,
        kind: kindFlag,
        ariaLabel,
        tileMode,
        providerKind,
        dryRun,
        runDir,
        seed,
      });
      process.stdout.write(`${out.summary}\n`);
      if (out.packId) {
        process.stdout.write(`packId: ${out.packId}\n`);
      }
      return 0;
    } catch (err) {
      process.stderr.write(
        `foundry texture: failed — ${(err as Error).message}\n`,
      );
      return 1;
    }
  }
  if (subcommand === "animate") {
    if (!sub2) {
      process.stderr.write(
        `foundry animate: missing <sourcePackId> — e.g. foundry animate char-otis-v3 --action=idle --format=sprite\n`,
      );
      return 2;
    }
    const animArgs = [...rest];
    let action: "idle" | "wave" | "nod" | "celebrate" = "idle";
    let format: "sprite" | "lottie" = "sprite";
    let providerKind: "mock" | "sora" | "runway" | "claude" = "mock";
    let dryRun = false;
    let runDir: string | undefined;
    let seed: number | undefined;
    for (let i = 0; i < animArgs.length; i += 1) {
      const arg = animArgs[i];
      if (arg === "--action") {
        const next = animArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry animate: --action requires a value\n`);
          return 2;
        }
        if (
          next !== "idle" &&
          next !== "wave" &&
          next !== "nod" &&
          next !== "celebrate"
        ) {
          process.stderr.write(
            `foundry animate: --action must be idle|wave|nod|celebrate\n`,
          );
          return 2;
        }
        action = next;
        i += 1;
      } else if (arg?.startsWith("--action=")) {
        const next = arg.slice("--action=".length);
        if (
          next !== "idle" &&
          next !== "wave" &&
          next !== "nod" &&
          next !== "celebrate"
        ) {
          process.stderr.write(
            `foundry animate: --action must be idle|wave|nod|celebrate\n`,
          );
          return 2;
        }
        action = next;
      } else if (arg === "--format") {
        const next = animArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry animate: --format requires a value\n`);
          return 2;
        }
        if (next !== "sprite" && next !== "lottie") {
          process.stderr.write(
            `foundry animate: --format must be sprite|lottie\n`,
          );
          return 2;
        }
        format = next;
        i += 1;
      } else if (arg?.startsWith("--format=")) {
        const next = arg.slice("--format=".length);
        if (next !== "sprite" && next !== "lottie") {
          process.stderr.write(
            `foundry animate: --format must be sprite|lottie\n`,
          );
          return 2;
        }
        format = next;
      } else if (arg === "--provider") {
        const next = animArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry animate: --provider requires a value\n`);
          return 2;
        }
        if (
          next !== "mock" &&
          next !== "sora" &&
          next !== "runway" &&
          next !== "claude"
        ) {
          process.stderr.write(
            `foundry animate: --provider must be mock|sora|runway|claude\n`,
          );
          return 2;
        }
        providerKind = next;
        i += 1;
      } else if (arg?.startsWith("--provider=")) {
        const next = arg.slice("--provider=".length);
        if (
          next !== "mock" &&
          next !== "sora" &&
          next !== "runway" &&
          next !== "claude"
        ) {
          process.stderr.write(
            `foundry animate: --provider must be mock|sora|runway|claude\n`,
          );
          return 2;
        }
        providerKind = next;
      } else if (arg === "--dry-run") {
        dryRun = true;
      } else if (arg === "--run-dir") {
        const next = animArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry animate: --run-dir requires a value\n`);
          return 2;
        }
        runDir = next;
        i += 1;
      } else if (arg?.startsWith("--run-dir=")) {
        runDir = arg.slice("--run-dir=".length);
      } else if (arg === "--seed") {
        const next = animArgs[i + 1];
        if (next === undefined) {
          process.stderr.write(`foundry animate: --seed requires a value\n`);
          return 2;
        }
        seed = Number(next);
        i += 1;
      } else if (arg?.startsWith("--seed=")) {
        seed = Number(arg.slice("--seed=".length));
      } else {
        process.stderr.write(`foundry animate: unknown flag "${arg}"\n`);
        return 2;
      }
    }
    try {
      const { runFoundrySpriteAnimatorCli } = await import(
        "@/lib/foundry/agents/sprite-animator/cli"
      );
      const out = await runFoundrySpriteAnimatorCli({
        sourcePackId: sub2,
        action,
        format,
        providerKind,
        dryRun,
        runDir,
        seed,
      });
      process.stdout.write(`${out.summary}\n`);
      process.stdout.write(`runDir: ${out.runDir}\n`);
      if (out.packId) {
        process.stdout.write(`packId: ${out.packId}\n`);
      }
      return 0;
    } catch (err) {
      process.stderr.write(
        `foundry animate: failed — ${(err as Error).message}\n`,
      );
      return 1;
    }
  }
  process.stderr.write(`foundry: subcommand "${subcommand}" not yet implemented\n`);
  return 2;
}

void main(process.argv.slice(2)).then((code) => process.exit(code));
