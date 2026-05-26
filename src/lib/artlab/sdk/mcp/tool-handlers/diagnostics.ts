import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ArtLabDiagnosticsInputSchema,
  ArtLabDiagnosticsOutputSchema,
  type ArtLabDiagnosticsOutput,
  type ArtLabRunStatus,
} from "../tools";

export interface ArtLabDiagnosticsContext {
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
): Array<{ runId: string; status: ArtLabRunStatus; updatedAt: string }> {
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
  onProbeError?: (name: string, err: unknown) => void,
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const [name, probe] of Object.entries(probes)) {
    try {
      out[name] = await probe();
    } catch (err) {
      // Round-2 review: diagnostics must ALWAYS report — a single failing
      // probe should not propagate into a whole-handler crash. Record the
      // probe as false and surface the error via the optional callback so
      // operators can still see WHY it failed (events emitter / log file).
      out[name] = false;
      if (onProbeError) onProbeError(name, err);
    }
  }
  return out;
}

export async function handleArtLabDiagnostics(
  rawInput: unknown,
  ctx: ArtLabDiagnosticsContext,
): Promise<ArtLabDiagnosticsOutput> {
  ArtLabDiagnosticsInputSchema.parse(rawInput);
  const heartbeat = readHeartbeat(ctx.workspaceRoot);
  const daemonUp = heartbeat
    ? Date.now() - new Date(heartbeat.at).getTime() < HEARTBEAT_STALE_MS
    : false;
  const inboxDir = join(ctx.workspaceRoot, "inbox", "foundry");
  const backlogDepth = existsSync(inboxDir)
    ? readdirSync(inboxDir).filter((f) => f.endsWith(".json")).length
    : 0;
  const providersReachable = await probeProviders(ctx.providerProbes);
  return ArtLabDiagnosticsOutputSchema.parse({
    daemonUp,
    providersReachable,
    recentRuns: recentRuns(ctx.workspaceRoot, 5),
    backlogDepth,
    collectedAt: new Date().toISOString(),
  });
}
