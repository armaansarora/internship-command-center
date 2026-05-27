import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ARTLAB_MCP_TOOL_NAMES,
  ArtLabAssetPackGetInputSchema,
  ArtLabAssetPackIntegrationInputSchema,
  ArtLabAssetPackListInputSchema,
  ArtLabCanonGetInputSchema,
  ArtLabCanonListInputSchema,
  ArtLabDiagnosticsInputSchema,
  ArtLabGenerateInputSchema,
  ArtLabGenerateStatusInputSchema,
  ArtLabSlotAuditInputSchema,
  type ArtLabMcpToolName,
} from "./tools";
import { handleArtLabCanonList } from "./tool-handlers/canon-list";
import { handleArtLabCanonGet } from "./tool-handlers/canon-get";
import { handleArtLabAssetPackList } from "./tool-handlers/asset-pack-list";
import { handleArtLabAssetPackGet } from "./tool-handlers/asset-pack-get";
import { handleArtLabAssetPackIntegration } from "./tool-handlers/asset-pack-integration";
import { handleArtLabSlotAudit } from "./tool-handlers/slot-audit";
import {
  handleArtLabGenerate,
  type ArtLabGenerateContext,
} from "./tool-handlers/generate";
import { handleArtLabGenerateStatus } from "./tool-handlers/generate-status";
import { handleArtLabDiagnostics } from "./tool-handlers/diagnostics";
import { routeArtLabRequest } from "../brain/route-request";
import type {
  ArtLabAnthropicCall,
  ArtLabAnthropicResponse,
} from "../brain/anthropic-client";

/**
 * Per-tool Zod input schemas. Threaded through `z.toJSONSchema()` so the
 * MCP `ListTools` response advertises real argument contracts (enums,
 * required fields, min-length, UUID patterns) instead of the previous
 * placeholder `{ type: "object", additionalProperties: true }`. MCP
 * clients (Claude Code, Cursor, etc.) now see the same shape the runtime
 * validator enforces.
 */
const TOOL_INPUT_SCHEMAS: Record<ArtLabMcpToolName, z.ZodTypeAny> = {
  "artlab/canon_list": ArtLabCanonListInputSchema,
  "artlab/canon_get": ArtLabCanonGetInputSchema,
  "artlab/asset_pack_list": ArtLabAssetPackListInputSchema,
  "artlab/asset_pack_get": ArtLabAssetPackGetInputSchema,
  "artlab/asset_pack_integration": ArtLabAssetPackIntegrationInputSchema,
  "artlab/slot_audit": ArtLabSlotAuditInputSchema,
  "artlab/generate": ArtLabGenerateInputSchema,
  "artlab/generate_status": ArtLabGenerateStatusInputSchema,
  "artlab/diagnostics": ArtLabDiagnosticsInputSchema,
};

/** Shape every MCP client expects in the `ListTools` response. */
export interface ArtLabMcpToolDescriptor {
  name: ArtLabMcpToolName;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    [k: string]: unknown;
  };
}

function buildToolDescriptors(): ArtLabMcpToolDescriptor[] {
  return ARTLAB_MCP_TOOL_NAMES.map((name) => {
    // `z.toJSONSchema` is a first-party Zod v4 API (returns a JSON Schema
    // 2020-12 document). MCP only needs the schema body — strip the
    // top-level `$schema` URL because some clients reject unknown keys.
    const raw = z.toJSONSchema(TOOL_INPUT_SCHEMAS[name]) as Record<string, unknown>;
    delete raw.$schema;
    if (raw.type !== "object") {
      throw new Error(
        `artlab tool '${name}' has a non-object input schema (got '${String(raw.type)}'); ` +
          `MCP requires object-shaped inputs.`,
      );
    }
    return {
      name,
      description: TOOL_SUMMARIES[name],
      inputSchema: raw as ArtLabMcpToolDescriptor["inputSchema"],
    };
  });
}

export interface ArtLabMcpServerConfig {
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
  brainCallOverride?: (call: ArtLabAnthropicCall) => Promise<ArtLabAnthropicResponse>;
}

export interface ArtLabMcpServer {
  identity: { name: "artlab"; version: string };
  registeredTools: ArtLabMcpToolName[];
  server: Server;
  invokeForTest(tool: ArtLabMcpToolName | string, rawInput: unknown): Promise<unknown>;
  /**
   * Test seam — returns the same tool descriptors the server emits via the
   * `ListTools` MCP request. Pinned in `server.tool-schema.test.ts`.
   */
  listToolsForTest(): ArtLabMcpToolDescriptor[];
}

type HandlerFn = (rawInput: unknown) => Promise<unknown>;

const TOOL_SUMMARIES: Record<ArtLabMcpToolName, string> = {
  "artlab/canon_list": "List canonical characters/floors/palettes/style-envelopes.",
  "artlab/canon_get": "Fetch one canon entry by id (returns YAML-as-JSON).",
  "artlab/asset_pack_list": "List promoted Asset Packs filtered by kind/character/space.",
  "artlab/asset_pack_get": "Fetch one Asset Pack manifest + file paths.",
  "artlab/asset_pack_integration": "Get a copy-paste TSX integration snippet for one pack.",
  "artlab/slot_audit": "List registered slots that lack a promoted Asset Pack.",
  "artlab/generate": "Queue a new generation run; returns a runId in `queued` status.",
  "artlab/generate_status": "Poll a runId; returns phase, percent, blockers, ETA, promoted packId.",
  "artlab/diagnostics": "Daemon health + provider reachability + last 5 runs + backlog depth.",
};

export function createArtLabMcpServer(config: ArtLabMcpServerConfig): ArtLabMcpServer {
  const server = new Server(
    { name: "artlab", version: config.version },
    { capabilities: { tools: {} } },
  );

  const ctxCanon = { canonRoot: config.canonRoot };
  const ctxPacks = { packsRoot: config.packsRoot };
  const ctxSlot = { slotRegistryPath: config.slotRegistryPath, packsRoot: config.packsRoot };
  const enrichmentReady =
    (config.env?.ANTHROPIC_API_KEY ?? "") !== "" || config.brainCallOverride !== undefined;
  const ctxRun: ArtLabGenerateContext = {
    workspaceRoot: config.workspaceRoot,
    // `handleArtLabGenerate` runs this callback in the background and
    // records the result (or failure) into the inbox file +
    // `daemon-errors.jsonl`. We intentionally let exceptions propagate so
    // the handler captures the real error instead of a synthesized
    // "successful" hint that would mask outages.
    brainEnrich: enrichmentReady
      ? async (input) => {
          const result = await routeArtLabRequest(input.description, {
            env: config.env ?? {},
            memoryDir: config.memoryDir,
            metaCallOverride: config.brainCallOverride,
          });
          return result as Record<string, unknown>;
        }
      : undefined,
  };
  const ctxDiag = { workspaceRoot: config.workspaceRoot, providerProbes: config.providerProbes };

  const handlers: Record<ArtLabMcpToolName, HandlerFn> = {
    "artlab/canon_list": (i) => handleArtLabCanonList(i, ctxCanon),
    "artlab/canon_get": (i) => handleArtLabCanonGet(i, ctxCanon),
    "artlab/asset_pack_list": (i) => handleArtLabAssetPackList(i, ctxPacks),
    "artlab/asset_pack_get": (i) => handleArtLabAssetPackGet(i, ctxPacks),
    "artlab/asset_pack_integration": (i) => handleArtLabAssetPackIntegration(i, ctxPacks),
    "artlab/slot_audit": (i) => handleArtLabSlotAudit(i, ctxSlot),
    "artlab/generate": (i) => handleArtLabGenerate(i, ctxRun),
    "artlab/generate_status": (i) => handleArtLabGenerateStatus(i, ctxRun),
    "artlab/diagnostics": (i) => handleArtLabDiagnostics(i, ctxDiag),
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
    const fn = handlers[tool as ArtLabMcpToolName];
    const result = await fn(req.params.arguments ?? {});
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });

  return {
    identity: { name: "artlab", version: config.version },
    registeredTools: [...ARTLAB_MCP_TOOL_NAMES],
    server,
    async invokeForTest(tool: string, rawInput: unknown): Promise<unknown> {
      if (!(tool in handlers)) throw new Error(`unknown tool: ${tool}`);
      return handlers[tool as ArtLabMcpToolName](rawInput);
    },
    listToolsForTest(): ArtLabMcpToolDescriptor[] {
      return toolDescriptors;
    },
  };
}
