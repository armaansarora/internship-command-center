import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FOUNDRY_MCP_TOOL_NAMES, type FoundryMcpToolName } from "./tools";
import { handleFoundryCanonList } from "./tool-handlers/canon-list";
import { handleFoundryCanonGet } from "./tool-handlers/canon-get";
import { handleFoundryAssetPackList } from "./tool-handlers/asset-pack-list";
import { handleFoundryAssetPackGet } from "./tool-handlers/asset-pack-get";
import { handleFoundryAssetPackIntegration } from "./tool-handlers/asset-pack-integration";
import { handleFoundrySlotAudit } from "./tool-handlers/slot-audit";
import { handleFoundryGenerate } from "./tool-handlers/generate";
import { handleFoundryGenerateStatus } from "./tool-handlers/generate-status";
import { handleFoundryDiagnostics } from "./tool-handlers/diagnostics";

export interface FoundryMcpServerConfig {
  workspaceRoot: string;
  canonRoot: string;
  packsRoot: string;
  slotRegistryPath: string;
  providerProbes: Record<string, () => Promise<boolean>>;
  version: string;
}

export interface FoundryMcpServer {
  identity: { name: "tower-art-foundry"; version: string };
  registeredTools: FoundryMcpToolName[];
  server: Server;
  invokeForTest(tool: FoundryMcpToolName | string, rawInput: unknown): Promise<unknown>;
}

type HandlerFn = (rawInput: unknown) => Promise<unknown>;

const TOOL_SUMMARIES: Record<FoundryMcpToolName, string> = {
  "foundry/canon_list": "List canonical characters/floors/palettes/style-envelopes.",
  "foundry/canon_get": "Fetch one canon entry by id (returns YAML-as-JSON).",
  "foundry/asset_pack_list": "List promoted Asset Packs filtered by kind/character/space.",
  "foundry/asset_pack_get": "Fetch one Asset Pack manifest + file paths.",
  "foundry/asset_pack_integration": "Get a copy-paste TSX integration snippet for one pack.",
  "foundry/slot_audit": "List registered slots that lack a promoted Asset Pack.",
  "foundry/generate": "Queue a new generation run; returns a runId in `queued` status.",
  "foundry/generate_status": "Poll a runId; returns phase, percent, blockers, ETA, promoted packId.",
  "foundry/diagnostics": "Daemon health + provider reachability + last 5 runs + backlog depth.",
};

export function createFoundryMcpServer(config: FoundryMcpServerConfig): FoundryMcpServer {
  const server = new Server(
    { name: "tower-art-foundry", version: config.version },
    { capabilities: { tools: {} } },
  );

  const ctxCanon = { canonRoot: config.canonRoot };
  const ctxPacks = { packsRoot: config.packsRoot };
  const ctxSlot = { slotRegistryPath: config.slotRegistryPath, packsRoot: config.packsRoot };
  const ctxRun = { workspaceRoot: config.workspaceRoot };
  const ctxDiag = { workspaceRoot: config.workspaceRoot, providerProbes: config.providerProbes };

  const handlers: Record<FoundryMcpToolName, HandlerFn> = {
    "foundry/canon_list": (i) => handleFoundryCanonList(i, ctxCanon),
    "foundry/canon_get": (i) => handleFoundryCanonGet(i, ctxCanon),
    "foundry/asset_pack_list": (i) => handleFoundryAssetPackList(i, ctxPacks),
    "foundry/asset_pack_get": (i) => handleFoundryAssetPackGet(i, ctxPacks),
    "foundry/asset_pack_integration": (i) => handleFoundryAssetPackIntegration(i, ctxPacks),
    "foundry/slot_audit": (i) => handleFoundrySlotAudit(i, ctxSlot),
    "foundry/generate": (i) => handleFoundryGenerate(i, ctxRun),
    "foundry/generate_status": (i) => handleFoundryGenerateStatus(i, ctxRun),
    "foundry/diagnostics": (i) => handleFoundryDiagnostics(i, ctxDiag),
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: FOUNDRY_MCP_TOOL_NAMES.map((name) => ({
      name,
      description: TOOL_SUMMARIES[name],
      inputSchema: { type: "object" as const, additionalProperties: true },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = req.params.name;
    if (!(tool in handlers)) {
      throw new Error(`unknown tool: ${tool}`);
    }
    const fn = handlers[tool as FoundryMcpToolName];
    const result = await fn(req.params.arguments ?? {});
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });

  return {
    identity: { name: "tower-art-foundry", version: config.version },
    registeredTools: [...FOUNDRY_MCP_TOOL_NAMES],
    server,
    async invokeForTest(tool: string, rawInput: unknown): Promise<unknown> {
      if (!(tool in handlers)) throw new Error(`unknown tool: ${tool}`);
      return handlers[tool as FoundryMcpToolName](rawInput);
    },
  };
}
