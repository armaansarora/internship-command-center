import { runCharacterMaster } from "@/lib/artlab/sdk/agents/character-master";
import { createMockFoundryImageProvider } from "@/lib/artlab/sdk/providers/mock-provider";
import { createGeminiFoundryProvider } from "@/lib/artlab/sdk/providers/gemini-provider";
import { registerFoundrySlot, isFoundrySlotRegistered } from "@/lib/artlab/sdk/asset-pack";
import type { FoundryImageProvider } from "@/lib/artlab/sdk/providers/types";
import type { CharacterMasterStage } from "@/lib/artlab/sdk/agents/character-master/types";

export interface RunCharacterSubcommandInput {
  argv: readonly string[];
  canonRoot: string;
  workspaceRoot: string;
  providerMode: "mock" | "gemini";
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const USAGE = `Usage: foundry character "<Character Name>" [--resume-from <stage>] [--seed <n>]
  Stages: concept-board | anchor-lock | variant-fan-out | cutout-and-feather | composite-judge | manifest-build
`;

function slugify(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseArgs(argv: readonly string[]): { name: string | null; resumeFrom: CharacterMasterStage | null; seed: number | null } {
  let name: string | null = null;
  let resumeFrom: CharacterMasterStage | null = null;
  let seed: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--resume-from") {
      resumeFrom = (argv[i + 1] as CharacterMasterStage | undefined) ?? null;
      i += 1;
    } else if (a === "--seed") {
      seed = Number(argv[i + 1] ?? "0");
      i += 1;
    } else if (!name) {
      name = a;
    }
  }
  return { name, resumeFrom, seed };
}

function pickProvider(mode: "mock" | "gemini"): FoundryImageProvider {
  if (mode === "mock") return createMockFoundryImageProvider();
  return createGeminiFoundryProvider({ apiKey: process.env.GEMINI_API_KEY ?? "" });
}

function ensureCharacterSlots(characterId: string, floorId: string): void {
  const OUTFITS = ["regular", "summer-light", "winter-layered"];
  const POSES = ["idle", "greeting", "listening", "thinking", "talking", "alert", "working"];
  const componentName = characterId.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("") + "Character";
  for (const outfit of OUTFITS) {
    for (const pose of POSES) {
      const slotId = `${floorId}/${characterId}/${outfit}/${pose}`;
      if (isFoundrySlotRegistered(slotId)) continue;
      try {
        registerFoundrySlot({
          slotId,
          appPath: `public/art/${floorId}/${characterId}/${outfit}/${pose}.webp`,
          kind: "character-sprite",
          component: componentName,
          requiresGsap: false,
        });
      } catch {
        // ignore
      }
    }
  }
}

export async function runCharacterSubcommand(input: RunCharacterSubcommandInput): Promise<number> {
  const { name, resumeFrom, seed } = parseArgs(input.argv);
  if (!name) {
    input.stderr(USAGE);
    return 2;
  }
  const characterId = slugify(name);
  const KNOWN_FLOORS = [
    "rolodex-lounge",
    "war-room",
    "observatory",
    "situation-room",
    "writing-room",
    "briefing-room",
    "research",
    "vault",
    "archive",
    "red-team-review",
    "lobby",
    "penthouse",
  ];
  for (const f of KNOWN_FLOORS) {
    ensureCharacterSlots(characterId, f);
  }

  input.stdout(`foundry character: running ${characterId} (provider=${input.providerMode}, resumeFrom=${resumeFrom ?? "none"})`);
  const result = await runCharacterMaster({
    input: {
      characterId,
      canonRoot: input.canonRoot,
      workspaceRoot: input.workspaceRoot,
      providerId: input.providerMode === "mock" ? "mock-foundry-image" : "gemini-foundry",
      resumeFromStage: resumeFrom,
      seed: seed ?? undefined,
    },
    provider: pickProvider(input.providerMode),
    emit: (e) => input.stdout(`event ${e.kind}${"stage" in e ? ` stage=${e.stage}` : ""}`),
  });
  if (!result.ok) {
    input.stderr(`foundry character: failed at stage=${result.failure.stage} reason=${result.failure.reason}`);
    if (result.failure.offendingPath) {
      input.stderr(`offending: ${result.failure.offendingPath}`);
    }
    return 1;
  }
  input.stdout(`foundry character: ok pack=${result.pack.packDir} packId=${result.pack.manifest.packId}`);
  return 0;
}
