import { handleFoundryDiagnostics } from "@/lib/foundry/mcp/tool-handlers/diagnostics";
import { handleFoundryCanonList } from "@/lib/foundry/mcp/tool-handlers/canon-list";
import { handleFoundryAssetPackList } from "@/lib/foundry/mcp/tool-handlers/asset-pack-list";
import { handleFoundryAssetPackGet } from "@/lib/foundry/mcp/tool-handlers/asset-pack-get";
import { handleFoundryGenerate } from "@/lib/foundry/mcp/tool-handlers/generate";
import type { FoundryAssetKind } from "@/lib/foundry/mcp/tools";

export interface FoundryTelegramArgs {
  args: string[];
  workspaceRoot: string;
  canonRoot: string;
  packsRoot: string;
  slotRegistryPath: string;
}

export interface FoundryTelegramReply {
  text: string;
  photo?: { path: string; caption?: string };
}

const HELP = [
  "Foundry — available commands:",
  " - /foundry status        — daemon health + backlog",
  " - /foundry list <kind>   — list packs (kinds: character/floor/ui-texture/icon/sprite-animation/lottie) or 'character' canon",
  " - /foundry generate <kind> <description...> — queue a new run",
  " - /foundry preview <packId> — send the promoted image",
].join("\n");

async function statusReply(input: FoundryTelegramArgs): Promise<FoundryTelegramReply> {
  const diag = await handleFoundryDiagnostics({}, {
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

async function listReply(input: FoundryTelegramArgs): Promise<FoundryTelegramReply> {
  const kind = (input.args[1] ?? "").trim();
  if (kind === "character") {
    const canon = await handleFoundryCanonList({ kind: "character" }, { canonRoot: input.canonRoot });
    if (canon.entries.length === 0) return { text: "No canon characters defined." };
    const lines = canon.entries.map((e) => `- ${e.displayName} (${e.id})`);
    return { text: lines.join("\n") };
  }
  const packs = await handleFoundryAssetPackList(
    kind ? { kind: kind as FoundryAssetKind } : {},
    { packsRoot: input.packsRoot },
  );
  if (packs.packs.length === 0) return { text: "No promoted packs match." };
  const lines = packs.packs.map((p) => `- ${p.packId} [${p.kind}] @ ${p.promotedAt}`);
  return { text: lines.join("\n") };
}

async function generateReply(input: FoundryTelegramArgs): Promise<FoundryTelegramReply> {
  const kind = (input.args[1] ?? "") as FoundryAssetKind;
  const description = input.args.slice(2).join(" ").trim();
  if (!description || description.length < 8) {
    return { text: "Usage: /foundry generate <kind> <description (>= 8 chars)>" };
  }
  const run = await handleFoundryGenerate({ kind, description }, { workspaceRoot: input.workspaceRoot });
  return { text: `Queued ${kind} run ${run.runId} (status=${run.status}).` };
}

async function previewReply(input: FoundryTelegramArgs): Promise<FoundryTelegramReply> {
  const packId = input.args[1];
  if (!packId) return { text: "Usage: /foundry preview <packId>" };
  const pack = await handleFoundryAssetPackGet({ packId }, { packsRoot: input.packsRoot });
  const primary = pack.files.find((f) => f.role === "primary") ?? pack.files[0];
  if (!primary) return { text: `Pack ${packId} has no files to preview.` };
  return {
    text: `Previewing pack ${packId}.`,
    photo: { path: primary.path, caption: packId },
  };
}

export async function handleFoundryTelegramCommand(input: FoundryTelegramArgs): Promise<FoundryTelegramReply> {
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
      return { text: `Unknown /foundry subcommand: ${sub}.\n\n${HELP}` };
  }
}
