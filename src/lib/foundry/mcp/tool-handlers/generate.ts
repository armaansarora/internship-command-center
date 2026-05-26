import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
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
   *
   * IMPORTANT: this callback is intentionally *not* awaited inline. The MCP
   * `generate` response must return the runId in <200ms so callers can
   * immediately poll `generate_status`. The brain hint is appended to the
   * inbox file (atomic rewrite) once enrichment completes; daemon pollers
   * may either wait for `brainHintStatus === 'ready'` or proceed with the
   * un-enriched job and rebuild the prompt from the raw description.
   */
  brainEnrich?: (input: FoundryGenerateInput) => Promise<Record<string, unknown>>;
}

type BrainHintStatus = "pending" | "ready" | "failed";

interface InboxPayload {
  runId: string;
  queuedAt: string;
  source: "foundry-mcp";
  brainHintStatus?: BrainHintStatus;
  brainHint?: Record<string, unknown>;
  brainHintError?: string;
  brainHintCompletedAt?: string;
  [k: string]: unknown;
}

function atomicWriteJson(path: string, payload: unknown): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: "utf8" });
  renameSync(tmp, path);
}

/**
 * Record brain-enrichment failures to daemon-errors.jsonl so /health and the
 * status CLI surface them. We never let logging crash the response handler
 * (mirroring `recordDaemonError`'s contract in `daemon/entry.ts`).
 */
function recordEnrichError(workspaceRoot: string, runId: string, err: unknown): void {
  try {
    if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      source: "foundry-mcp:brain-enrich",
      runId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    appendFileSync(join(workspaceRoot, "daemon-errors.jsonl"), `${line}\n`);
  } catch {
    /* never let logging crash the handler */
  }
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

  // Step 1 — write the queued inbox payload synchronously so callers can poll
  // immediately. If a brainEnrich is wired, the payload carries
  // `brainHintStatus: 'pending'` so daemon consumers know to expect an
  // update.
  const initial: InboxPayload = { runId, queuedAt, source: "foundry-mcp", ...input };
  if (ctx.brainEnrich) initial.brainHintStatus = "pending";
  atomicWriteJson(inboxPath, initial);

  // Step 2 — fire brain enrichment in the background, without blocking the
  // MCP response. When it completes (success or failure) we atomically
  // rewrite the inbox file with the result so daemons can observe it. The
  // `void` discards the promise; we never let it reject unhandled.
  if (ctx.brainEnrich) {
    const enrich = ctx.brainEnrich;
    void (async (): Promise<void> => {
      try {
        const brainHint = await enrich(input);
        const updated: InboxPayload = {
          ...initial,
          brainHintStatus: "ready",
          brainHint,
          brainHintCompletedAt: new Date().toISOString(),
        };
        atomicWriteJson(inboxPath, updated);
      } catch (err) {
        const updated: InboxPayload = {
          ...initial,
          brainHintStatus: "failed",
          brainHintError: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          brainHintCompletedAt: new Date().toISOString(),
        };
        try {
          atomicWriteJson(inboxPath, updated);
        } catch {
          /* even if the inbox rewrite fails, the daemon-errors log below
             still captures the original brain failure. */
        }
        recordEnrichError(ctx.workspaceRoot, runId, err);
      }
    })();
  }

  return FoundryGenerateOutputSchema.parse({
    runId,
    status: "queued",
    queuedAt,
    inboxPath,
  });
}
