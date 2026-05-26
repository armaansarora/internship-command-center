import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryGenerateInputSchema,
  FoundryGenerateOutputSchema,
  type FoundryGenerateInput,
  type FoundryGenerateOutput,
} from "../tools";

export interface FoundryGenerateContext {
  /** ArtLab workspace root (typically `.artlab/engine`). */
  workspaceRoot: string;
  /**
   * Optional brain enrichment callback. The MCP server wires this to
   * `routeFoundryRequest`. When unset the handler stays purely deterministic
   * (no LLM calls) and just enqueues the raw input.
   */
  brainEnrich?: (input: FoundryGenerateInput) => Promise<Record<string, unknown>>;
}

function atomicWriteJson(path: string, payload: unknown): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: "utf8" });
  renameSync(tmp, path);
}

export async function handleFoundryGenerate(
  rawInput: unknown,
  ctx: FoundryGenerateContext,
): Promise<FoundryGenerateOutput> {
  const input = FoundryGenerateInputSchema.parse(rawInput);
  const runId = randomUUID();
  const queuedAt = new Date().toISOString();
  const inboxDir = join(ctx.workspaceRoot, "inbox", "foundry");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const inboxPath = join(inboxDir, `generate-${runId}.json`);
  const brainHint = ctx.brainEnrich ? await ctx.brainEnrich(input) : undefined;
  const payload: Record<string, unknown> = { runId, queuedAt, source: "foundry-mcp", ...input };
  if (brainHint) payload.brainHint = brainHint;
  atomicWriteJson(inboxPath, payload);
  return FoundryGenerateOutputSchema.parse({
    runId,
    status: "queued",
    queuedAt,
    inboxPath,
  });
}
