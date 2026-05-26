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
   * immediately poll `generate_status`. The brain hint is written to a
   * SIDECAR file (`generate-<runId>.brain-hint.json`) once enrichment
   * completes — the main inbox trigger file is written once at queue-time
   * and is never rewritten. See the brain-enrich-race comment below.
   */
  brainEnrich?: (input: FoundryGenerateInput) => Promise<Record<string, unknown>>;
}

type BrainHintStatus = "pending" | "ready" | "failed";

interface InboxPayload {
  runId: string;
  queuedAt: string;
  source: "foundry-mcp";
  brainHintStatus?: BrainHintStatus;
  [k: string]: unknown;
}

interface BrainHintSidecar {
  runId: string;
  brainHintStatus: BrainHintStatus;
  brainHint?: Record<string, unknown>;
  brainHintError?: string;
  brainHintCompletedAt: string;
}

function atomicWriteJson(path: string, payload: unknown): void {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: "utf8" });
  renameSync(tmp, path);
}

/**
 * Sidecar path for a given inbox trigger path. The sidecar carries the brain
 * enrichment result so the main inbox file is never rewritten — that avoids
 * the post-archive resurrection race described in the handler below.
 */
function sidecarPathFor(inboxPath: string): string {
  return inboxPath.replace(/\.json$/, ".brain-hint.json");
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
  // `brainHintStatus: 'pending'` so daemon consumers know a sidecar may
  // arrive later. The main inbox file is WRITE-ONCE — every subsequent
  // update goes to the sidecar.
  const initial: InboxPayload = { runId, queuedAt, source: "foundry-mcp", ...input };
  if (ctx.brainEnrich) initial.brainHintStatus = "pending";
  atomicWriteJson(inboxPath, initial);

  // Step 2 — fire brain enrichment in the background, without blocking the
  // MCP response. The result is written to a SIDECAR file next to the
  // inbox file instead of rewriting the inbox file itself.
  //
  // Why sidecar instead of rewriting the inbox file:
  //   The daemon poller (src/lib/artlab/daemon/foundry-poller.ts) archives
  //   processed inbox files into `.processed/` via rename. If enrichment
  //   resolved AFTER that rename and we used temp+rename on the original
  //   path, we'd RESURRECT `generate-<runId>.json` in the live inbox — the
  //   next tick would re-seed `phase=routed` and re-enqueue (then the
  //   queue's `wx` flag would throw EEXIST into daemon-errors.jsonl).
  //
  //   By writing only to the sidecar:
  //   - the trigger file glob in the poller (`generate-*.json` minus
  //     `.brain-hint`) never picks up a sidecar
  //   - the poller reads the sidecar (if present) and merges it into the
  //     job payload before archival, archiving both files together
  //   - if the sidecar lands AFTER the inbox file is archived, it becomes
  //     an orphan in the inbox dir and is ignored by the next tick — no
  //     resurrection, no duplicated work.
  if (ctx.brainEnrich) {
    const enrich = ctx.brainEnrich;
    const sidecarPath = sidecarPathFor(inboxPath);
    void (async (): Promise<void> => {
      try {
        const brainHint = await enrich(input);
        const sidecar: BrainHintSidecar = {
          runId,
          brainHintStatus: "ready",
          brainHint,
          brainHintCompletedAt: new Date().toISOString(),
        };
        atomicWriteJson(sidecarPath, sidecar);
      } catch (err) {
        const sidecar: BrainHintSidecar = {
          runId,
          brainHintStatus: "failed",
          brainHintError: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          brainHintCompletedAt: new Date().toISOString(),
        };
        try {
          atomicWriteJson(sidecarPath, sidecar);
        } catch {
          /* even if the sidecar write fails, the daemon-errors log below
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
