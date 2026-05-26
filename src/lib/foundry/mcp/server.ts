import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  FOUNDRY_MCP_TOOL_NAMES,
  FoundryAssetPackGetInputSchema,
  FoundryAssetPackIntegrationInputSchema,
  FoundryAssetPackListInputSchema,
  FoundryCanonGetInputSchema,
  FoundryCanonListInputSchema,
  FoundryDiagnosticsInputSchema,
  FoundryGenerateInputSchema,
  FoundryGenerateStatusInputSchema,
  FoundrySlotAuditInputSchema,
  type FoundryMcpToolName,
} from "./tools";
import { handleFoundryCanonList } from "./tool-handlers/canon-list";
import { handleFoundryCanonGet } from "./tool-handlers/canon-get";
import { handleFoundryAssetPackList } from "./tool-handlers/asset-pack-list";
import { handleFoundryAssetPackGet } from "./tool-handlers/asset-pack-get";
import { handleFoundryAssetPackIntegration } from "./tool-handlers/asset-pack-integration";
import { handleFoundrySlotAudit } from "./tool-handlers/slot-audit";
import {
  handleFoundryGenerate,
  type FoundryGenerateContext,
} from "./tool-handlers/generate";
import { handleFoundryGenerateStatus } from "./tool-handlers/generate-status";
import { handleFoundryDiagnostics } from "./tool-handlers/diagnostics";
import { routeFoundryRequest } from "../brain/route-request";
import type {
  FoundryAnthropicCall,
  FoundryAnthropicResponse,
} from "../brain/anthropic-client";

/**
 * Per-tool Zod input schemas. Threaded through `z.toJSONSchema()` so the
 * MCP `ListTools` response advertises real argument contracts (enums,
 * required fields, min-length, UUID patterns) instead of the previous
 * placeholder `{ type: "object", additionalProperties: true }`. MCP
 * clients (Claude Code, Cursor, etc.) now see the same shape the runtime
 * validator enforces.
 */
const TOOL_INPUT_SCHEMAS: Record<FoundryMcpToolName, z.ZodTypeAny> = {
  "foundry/canon_list": FoundryCanonListInputSchema,
  "foundry/canon_get": FoundryCanonGetInputSchema,
  "foundry/asset_pack_list": FoundryAssetPackListInputSchema,
  "foundry/asset_pack_get": FoundryAssetPackGetInputSchema,
  "foundry/asset_pack_integration": FoundryAssetPackIntegrationInputSchema,
  "foundry/slot_audit": FoundrySlotAuditInputSchema,
  "foundry/generate": FoundryGenerateInputSchema,
  "foundry/generate_status": FoundryGenerateStatusInputSchema,
  "foundry/diagnostics": FoundryDiagnosticsInputSchema,
};

/** Shape every MCP client expects in the `ListTools` response. */
export interface FoundryMcpToolDescriptor {
  name: FoundryMcpToolName;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    [k: string]: unknown;
  };
}

function buildToolDescriptors(): FoundryMcpToolDescriptor[] {
  return FOUNDRY_MCP_TOOL_NAMES.map((name) => {
    // `z.toJSONSchema` is a first-party Zod v4 API (returns a JSON Schema
    // 2020-12 document). MCP only needs the schema body — strip the
    // top-level `$schema` URL because some clients reject unknown keys.
    const raw = z.toJSONSchema(TOOL_INPUT_SCHEMAS[name]) as Record<string, unknown>;
    delete raw.$schema;
    if (raw.type !== "object") {
      throw new Error(
        `foundry tool '${name}' has a non-object input schema (got '${String(raw.type)}'); ` +
          `MCP requires object-shaped inputs.`,
      );
    }
    return {
      name,
      description: TOOL_SUMMARIES[name],
      inputSchema: raw as FoundryMcpToolDescriptor["inputSchema"],
    };
  });
}

export interface FoundryMcpServerConfig {
  workspaceRoot: string;
  canonRoot: string;
  packsRoot: string;
  slotRegistryPath: string;
  /**
   * Path to the ArtLab memory ledger directory (typically
   * `<workspaceRoot>/memory`). When supplied, brain enrichment hydrates
   * `recentWins`/`recentRejections` from `style-wins.jsonl` +
   * `style-rejections.jsonl` before calling the per-agent brain. When
   * omitted, the brain receives empty arrays — every call still parses,
   * but no feedback signals are propagated.
   *
   * Wiring is intentionally additive: dropping this field in callers that
   * never set it has zero behavioural effect.
   */
  memoryDir?: string;
  providerProbes: Record<string, () => Promise<boolean>>;
  version: string;
  /** Optional env map for per-agent brain wiring. If unset, brain enrichment is skipped. */
  env?: Record<string, string | undefined>;
  /** Test seam — replaces all Anthropic calls inside the brain pipeline. */
  brainCallOverride?: (call: FoundryAnthropicCall) => Promise<FoundryAnthropicResponse>;
}

export interface FoundryMcpServer {
  identity: { name: "tower-art-foundry"; version: string };
  registeredTools: FoundryMcpToolName[];
  server: Server;
  invokeForTest(tool: FoundryMcpToolName | string, rawInput: unknown): Promise<unknown>;
  /**
   * Test seam — returns the same tool descriptors the server emits via the
   * `ListTools` MCP request. Pinned in `server.tool-schema.test.ts`.
   */
  listToolsForTest(): FoundryMcpToolDescriptor[];
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
  const enrichmentReady =
    (config.env?.ANTHROPIC_API_KEY ?? "") !== "" || config.brainCallOverride !== undefined;
  const ctxRun: FoundryGenerateContext = {
    workspaceRoot: config.workspaceRoot,
    // `handleFoundryGenerate` runs this callback in the background and
    // records the result (or failure) into the inbox file +
    // `daemon-errors.jsonl`. We intentionally let exceptions propagate so
    // the handler captures the real error instead of a synthesized
    // "successful" hint that would mask outages.
    brainEnrich: enrichmentReady
      ? async (input) => {
          const result = await routeFoundryRequest(input.description, {
            env: config.env ?? {},
            memoryDir: config.memoryDir,
            metaCallOverride: config.brainCallOverride,
          });
          return result as Record<string, unknown>;
        }
      : undefined,
  };
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

  const toolDescriptors = buildToolDescriptors();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDescriptors,
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
    listToolsForTest(): FoundryMcpToolDescriptor[] {
      return toolDescriptors;
    },
  };
}
