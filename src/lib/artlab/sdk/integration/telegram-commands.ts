import { handleArtLabDiagnostics } from "@/lib/artlab/sdk/mcp/tool-handlers/diagnostics";
import { handleArtLabCanonList } from "@/lib/artlab/sdk/mcp/tool-handlers/canon-list";
import { handleArtLabAssetPackList } from "@/lib/artlab/sdk/mcp/tool-handlers/asset-pack-list";
import { handleArtLabAssetPackGet } from "@/lib/artlab/sdk/mcp/tool-handlers/asset-pack-get";
import { handleArtLabGenerate } from "@/lib/artlab/sdk/mcp/tool-handlers/generate";
import type { ArtLabAssetKind } from "@/lib/artlab/sdk/mcp/tools";

export interface ArtLabTelegramArgs {
  args: string[];
  workspaceRoot: string;
  canonRoot: string;
  packsRoot: string;
  slotRegistryPath: string;
}

export interface ArtLabTelegramReply {
  text: string;
  photo?: { path: string; caption?: string };
}

const HELP = [
  "ArtLab — available commands:",
  " - /sdk status        — daemon health + backlog",
  " - /sdk list <kind>   — list packs (kinds: character/floor/ui-texture/icon/sprite-animation/lottie) or 'character' canon",
  " - /sdk generate <kind> <description...> — queue a new run",
  " - /sdk preview <packId> — send the promoted image",
].join("\n");

async function statusReply(input: ArtLabTelegramArgs): Promise<ArtLabTelegramReply> {
  const diag = await handleArtLabDiagnostics({}, {
    workspaceRoot: input.workspaceRoot,
    providerProbes: {},
  });
  const lines = [
    `Daemon up: ${diag.daemonUp ? "yes" : "no"}`,
    `Backlog: ${diag.backlogDepth}`,
    `Recent runs: ${diag.recentRuns.length}`,
  ];
  return { text: lines.join("\n") };
}

async function listReply(input: ArtLabTelegramArgs): Promise<ArtLabTelegramReply> {
  const kind = (input.args[1] ?? "").trim();
  if (kind === "character") {
    const canon = await handleArtLabCanonList({ kind: "character" }, { canonRoot: input.canonRoot });
    if (canon.entries.length === 0) return { text: "No canon characters defined." };
    const lines = canon.entries.map((e) => `- ${e.displayName} (${e.id})`);
    return { text: lines.join("\n") };
  }
  const packs = await handleArtLabAssetPackList(
    kind ? { kind: kind as ArtLabAssetKind } : {},
    { packsRoot: input.packsRoot },
  );
  if (packs.packs.length === 0) return { text: "No promoted packs match." };
  const lines = packs.packs.map((p) => `- ${p.packId} [${p.kind}] @ ${p.promotedAt}`);
  return { text: lines.join("\n") };
}

async function generateReply(input: ArtLabTelegramArgs): Promise<ArtLabTelegramReply> {
  const kind = (input.args[1] ?? "") as ArtLabAssetKind;
  const description = input.args.slice(2).join(" ").trim();
  if (!description || description.length < 8) {
    return { text: "Usage: /sdk generate <kind> <description (>= 8 chars)>" };
  }
  const run = await handleArtLabGenerate({ kind, description }, { workspaceRoot: input.workspaceRoot });
  return { text: `Queued ${kind} run ${run.runId} (status=${run.status}).` };
}

async function previewReply(input: ArtLabTelegramArgs): Promise<ArtLabTelegramReply> {
  const packId = input.args[1];
  if (!packId) return { text: "Usage: /sdk preview <packId>" };
  const pack = await handleArtLabAssetPackGet({ packId }, { packsRoot: input.packsRoot });
  const primary = pack.files.find((f) => f.role === "primary") ?? pack.files[0];
  if (!primary) return { text: `Pack ${packId} has no files to preview.` };
  return {
    text: `Previewing pack ${packId}.`,
    photo: { path: primary.path, caption: packId },
  };
}

export async function handleArtLabTelegramCommand(input: ArtLabTelegramArgs): Promise<ArtLabTelegramReply> {
  const sub = input.args[0]?.toLowerCase();
  switch (sub) {
    case undefined:
    case "":
    case "help":
      return { text: HELP };
    case "status":
      return statusReply(input);
    case "list":
      return listReply(input);
    case "generate":
      return generateReply(input);
    case "preview":
      return previewReply(input);
    default:
      return { text: `Unknown /sdk subcommand: ${sub}.\n\n${HELP}` };
  }
}
