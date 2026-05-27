import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArtLabGenerateInputSchema,
  ArtLabGenerateOutputSchema,
  type ArtLabGenerateInput,
  type ArtLabGenerateOutput,
} from "../tools";
import { mergeBrainHintIntoRunState } from "@/lib/artlab/state/snapshots";

export interface ArtLabGenerateContext {
  /** ArtLab workspace root (typically `.artlab/engine`). */
  workspaceRoot: string;
  /**
   * Optional brain enrichment callback. The MCP server wires this to
   * `routeArtLabRequest`. When unset the handler stays purely deterministic
   * (no LLM calls) and just enqueues the raw input.
   *
   * IMPORTANT: this callback is intentionally *not* awaited inline. The MCP
   * `generate` response must return the runId in <200ms so callers can
   * immediately poll `generate_status`. The brain hint is written to a
   * SIDECAR file (`generate-<runId>.brain-hint.json`) once enrichment
   * completes — the main inbox trigger file is written once at queue-time
   * and is never rewritten. See the brain-enrich-race comment below.
   */
  brainEnrich?: (input: ArtLabGenerateInput) => Promise<Record<string, unknown>>;
}

type BrainHintStatus = "pending" | "ready" | "failed";

interface InboxPayload {
  runId: string;
  queuedAt: string;
  source: "artlab-mcp";
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
      source: "artlab-mcp:brain-enrich",
      runId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    appendFileSync(join(workspaceRoot, "daemon-errors.jsonl"), `${line}\n`);
  } catch {
    /* never let logging crash the handler */
  }
}

export async function handleArtLabGenerate(
  rawInput: unknown,
  ctx: ArtLabGenerateContext,
): Promise<ArtLabGenerateOutput> {
  const input = ArtLabGenerateInputSchema.parse(rawInput);
  const runId = randomUUID();
  const queuedAt = new Date().toISOString();
  const inboxDir = join(ctx.workspaceRoot, "inbox", "sdk");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const inboxPath = join(inboxDir, `generate-${runId}.json`);

  // Step 1 — write the queued inbox payload synchronously so callers can poll
  // immediately. If a brainEnrich is wired, the payload carries
  // `brainHintStatus: 'pending'` so daemon consumers know a sidecar may
  // arrive later. The main inbox file is WRITE-ONCE — every subsequent
  // update goes to the sidecar.
  const initial: InboxPayload = { runId, queuedAt, source: "artlab-mcp", ...input };
  if (ctx.brainEnrich) initial.brainHintStatus = "pending";
  atomicWriteJson(inboxPath, initial);

  // Step 2 — fire brain enrichment in the background, without blocking the
  // MCP response. The result is written to a SIDECAR file next to the
  // inbox file instead of rewriting the inbox file itself.
  //
  // Why sidecar instead of rewriting the inbox file:
  //   The daemon poller (src/lib/artlab/daemon/sdk-poller.ts) archives
  //   processed inbox files into `.processed/` via rename. If enrichment
  //   resolved AFTER that rename and we used temp+rename on the original
  //   path, we'd RESURRECT `generate-<runId>.json` in the live inbox — the
  //   next tick would re-seed `phase=routed` and re-enqueue (then the
  //   queue's `wx` flag would throw EEXIST into daemon-errors.jsonl).
  //
  //   By writing only to the sidecar:
  //   - the trigger file glob in the poller (`generate-*.json` minus
  //     `.brain-hint`) never picks up a sidecar
  //   - if the trigger file is STILL in the inbox when enrichment resolves,
  //     the poller reads the sidecar and merges it into the job payload
  //     before archival, archiving both files together (fast-enrich path)
  //   - if the trigger has ALREADY been archived (slow-enrich path), we
  //     route the sidecar straight into `.processed/` AND merge the brain
  //     hint into `runs/<runId>/run-state.json` so it still reaches the
  //     run-worker and `generate_status`. The trigger file is never
  //     resurrected in the live inbox.
  if (ctx.brainEnrich) {
    const enrich = ctx.brainEnrich;
    const inboxSidecarPath = sidecarPathFor(inboxPath);
    void (async (): Promise<void> => {
      const completedAt = (): string => new Date().toISOString();
      const writeSidecar = (sidecar: BrainHintSidecar): void => {
        // If the trigger file is still in the inbox, the poller hasn't
        // archived this run yet — drop the sidecar next to it so the
        // poller's `mergeSidecarIfPresent` picks it up on the next tick.
        // If the trigger has ALREADY been archived (race lost), route the
        // sidecar to `.processed/` for audit and merge the hint into
        // run-state.json directly. The orphan-sidecar-in-inbox path is no
        // longer used — it dropped the brain hint on the floor.
        const archived = !existsSync(inboxPath);
        if (!archived) {
          atomicWriteJson(inboxSidecarPath, sidecar);
          return;
        }
        const processed = join(ctx.workspaceRoot, "inbox", "sdk", ".processed");
        if (!existsSync(processed)) mkdirSync(processed, { recursive: true });
        atomicWriteJson(join(processed, `${runId}.brain-hint.json`), sidecar);
        // Best-effort direct merge into run-state.json. If the poller
        // hasn't seeded run-state yet (extremely tight race), the merge
        // returns false — the `.processed/` sidecar above is the audit
        // trail, but the hint won't reach the run-worker. Log so /health
        // surfaces it; the trigger archive sequence in the poller
        // (seedRunState → enqueue → moveFile) means run-state is seeded
        // before the inbox file is renamed, so this only fires on a real
        // ordering bug.
        try {
          const runDir = join(ctx.workspaceRoot, "runs", runId);
          const merged = mergeBrainHintIntoRunState(runDir, {
            status: sidecar.brainHintStatus === "ready" ? "ready" : "failed",
            hint: sidecar.brainHint,
            error: sidecar.brainHintError,
            completedAt: sidecar.brainHintCompletedAt,
          });
          if (!merged) {
            recordEnrichError(
              ctx.workspaceRoot,
              runId,
              new Error(
                "brain-enrich landed post-archive but run-state.json missing — sidecar archived to .processed/",
              ),
            );
          }
        } catch (mergeErr) {
          recordEnrichError(ctx.workspaceRoot, runId, mergeErr);
        }
      };
      try {
        const brainHint = await enrich(input);
        writeSidecar({
          runId,
          brainHintStatus: "ready",
          brainHint,
          brainHintCompletedAt: completedAt(),
        });
      } catch (err) {
        const sidecar: BrainHintSidecar = {
          runId,
          brainHintStatus: "failed",
          brainHintError: (err instanceof Error ? err.message : String(err)).slice(0, 500),
          brainHintCompletedAt: completedAt(),
        };
        try {
          writeSidecar(sidecar);
        } catch {
          /* even if the sidecar write fails, the daemon-errors log below
             still captures the original brain failure. */
        }
        recordEnrichError(ctx.workspaceRoot, runId, err);
      }
    })();
  }

  return ArtLabGenerateOutputSchema.parse({
    runId,
    status: "queued",
    queuedAt,
    inboxPath,
  });
}
