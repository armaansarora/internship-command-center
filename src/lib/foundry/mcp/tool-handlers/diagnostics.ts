import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  FoundryDiagnosticsInputSchema,
  FoundryDiagnosticsOutputSchema,
  type FoundryDiagnosticsOutput,
  type FoundryRunStatus,
} from "../tools";

export interface FoundryDiagnosticsContext {
  workspaceRoot: string;
  providerProbes: Record<string, () => Promise<boolean>>;
}

interface RunStateLite {
  runId: string;
  phase: string;
  blocker: string | null;
  updatedAt: string;
}

const HEARTBEAT_STALE_MS = 60_000;

/**
 * Read the daemon heartbeat file.
 *
 * The canonical field name is `at` — see `writeHeartbeat` in
 * src/lib/artlab/daemon/entry.ts. A previous version of this reader looked
 * for `writtenAt`, which silently made `daemonUp` evaluate to `false` for
 * every fresh heartbeat (`new Date(undefined).getTime()` is `NaN`). The
 * writer has never emitted `writtenAt`, so there is no legacy file to
 * support — we only honour `at`.
 */
function readHeartbeat(workspaceRoot: string): { at: string } | null {
  const path = join(workspaceRoot, "daemon-heartbeat.json");
  if (!existsSync(path)) return null;
  let raw: { at?: unknown };
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as { at?: unknown };
  } catch (err) {
    throw new Error(`malformed daemon heartbeat at ${path}: ${String(err)}`);
  }
  if (typeof raw.at !== "string") return null;
  return { at: raw.at };
}

function recentRuns(
  workspaceRoot: string,
  limit: number,
): Array<{ runId: string; status: FoundryRunStatus; updatedAt: string }> {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return [];
  const states: RunStateLite[] = [];
  for (const dir of readdirSync(runsDir)) {
    const path = join(runsDir, dir, "run-state.json");
    if (!existsSync(path)) continue;
    try {
      states.push(JSON.parse(readFileSync(path, "utf8")) as RunStateLite);
    } catch (err) {
      throw new Error(`malformed run-state.json at ${path}: ${String(err)}`);
    }
  }
  states.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return states.slice(0, limit).map((s) => ({
    runId: s.runId,
    status: s.blocker ? "blocked" : s.phase === "closed" ? "promoted" : "running",
    updatedAt: s.updatedAt,
  }));
}

async function probeProviders(
  probes: Record<string, () => Promise<boolean>>,
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const [name, probe] of Object.entries(probes)) {
    try {
      out[name] = await probe();
    } catch (err) {
      out[name] = false;
      // Surface in event log via the events module — not console.
      // (consumer wires the events sink at server bootstrap)
      throw new Error(`provider probe '${name}' threw: ${String(err)}`);
    }
  }
  return out;
}

export async function handleFoundryDiagnostics(
  rawInput: unknown,
  ctx: FoundryDiagnosticsContext,
): Promise<FoundryDiagnosticsOutput> {
  FoundryDiagnosticsInputSchema.parse(rawInput);
  const heartbeat = readHeartbeat(ctx.workspaceRoot);
  const daemonUp = heartbeat
    ? Date.now() - new Date(heartbeat.at).getTime() < HEARTBEAT_STALE_MS
    : false;
  const inboxDir = join(ctx.workspaceRoot, "inbox", "foundry");
  const backlogDepth = existsSync(inboxDir)
    ? readdirSync(inboxDir).filter((f) => f.endsWith(".json")).length
    : 0;
  const providersReachable = await probeProviders(ctx.providerProbes);
  return FoundryDiagnosticsOutputSchema.parse({
    daemonUp,
    providersReachable,
    recentRuns: recentRuns(ctx.workspaceRoot, 5),
    backlogDepth,
    collectedAt: new Date().toISOString(),
  });
}
