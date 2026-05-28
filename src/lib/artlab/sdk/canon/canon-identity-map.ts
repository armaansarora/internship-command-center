// src/lib/artlab/sdk/canon/canon-identity-map.ts
//
// Sync canon identity loader.
//
// Why this exists: the intake router is synchronous (called from many call
// sites — bot, worker, dispatcher, MCP — none of which want to bubble async
// up to a route call). The canonical async loader in `load-canon.ts` reads
// every YAML, runs full schema validation, builds character + palette +
// motion + space + iconography bundles. Routing only needs the
// header.id → roleSlug → floorId → displayName tuple per character; we
// don't need to pay the full validation tax just to know who Sol is.
//
// This module reads the same canon character YAMLs with `readFileSync` at
// module-init time, parses the minimum identity columns, caches the result
// for the lifetime of the process, and exposes a synchronous lookup. We
// deliberately do NOT validate against `ArtLabCharacterCanonSchema` — that
// is the canonical loader's job; this is a thin runtime-routing index.
//
// The cache invalidates automatically if `process.env.ARTLAB_CANON_ROOT`
// changes between calls (e.g. in tests that point to a fixture directory).
//
// If a canon YAML is malformed or unreachable the loader returns an empty
// list rather than throwing — the router treats that as "no canon match"
// and falls back to whatever it would have returned before this bridge
// landed.
//
// Telemetry: callers MAY pass `options.onError` to capture parse failures
// and unreachable canon directories. The runtime daemon paths (sdk-poller,
// promotion-runner, intake/router) thread a callback that pipes errors
// into `recordDaemonError` so silent canon drift surfaces in
// `daemon-errors.jsonl` instead of regressing every downstream consumer
// to legacy roleSlug shape without operator visibility. Unit tests pass
// an accumulator array to assert the callback contract directly.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface CanonIdentity {
  /** Canonical record key, e.g. "sol-navarro". Used in run-state, brief.json, promotion paths. */
  headerId: string;
  /** Runtime-facing short slug, e.g. "cno". Used in visual-assets bundles and legacy code. */
  roleSlug: string;
  /** Floor identifier, e.g. "rolodex-lounge". Used to derive promotion target dirs. */
  floorId: string;
  /** Floor label, e.g. "Floor 6 — The Rolodex Lounge". Used for human display. */
  floorLabel: string;
  /** Display name, e.g. "Sol Navarro". Used for human display. */
  displayName: string;
  /** Short label, e.g. "Sol". Used for compact display. */
  shortLabel: string;
  /** Job title, e.g. "Chief Networking Officer". Used for human display. */
  title: string;
}

interface CanonIdentityRawHeader {
  id?: unknown;
  kind?: unknown;
}

interface CanonIdentityRaw {
  header?: CanonIdentityRawHeader;
  roleSlug?: unknown;
  floorId?: unknown;
  floorLabel?: unknown;
  displayName?: unknown;
  shortLabel?: unknown;
  title?: unknown;
}

let cachedIdentities: readonly CanonIdentity[] | null = null;
let cachedCanonRoot: string | null = null;

function defaultCanonRoot(): string {
  return process.env.ARTLAB_CANON_ROOT ?? join(process.cwd(), "docs/artlab/sdk/canon");
}

/**
 * Callback signature for canon load failures. `file` is the relative
 * filename within `<canonRoot>/characters/` for per-file errors, or
 * `"characters"` when the directory itself is unreachable.
 */
export type CanonIdentityLoadErrorHandler = (err: Error, file: string) => void;

export interface LoadCanonIdentitiesOptions {
  canonRoot?: string;
  onError?: CanonIdentityLoadErrorHandler;
}

function readCanonIdentityFromFile(
  absPath: string,
  filename: string,
  onError?: CanonIdentityLoadErrorHandler,
): CanonIdentity | null {
  let raw: string;
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)), filename);
    return null;
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)), filename);
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    onError?.(new Error("canon yaml parsed to non-object"), filename);
    return null;
  }
  const p = parsed as CanonIdentityRaw;
  const headerId = typeof p.header?.id === "string" ? p.header.id : null;
  const roleSlug = typeof p.roleSlug === "string" ? p.roleSlug : null;
  const floorId = typeof p.floorId === "string" ? p.floorId : null;
  const floorLabel = typeof p.floorLabel === "string" ? p.floorLabel : "";
  const displayName = typeof p.displayName === "string" ? p.displayName : "";
  const shortLabel = typeof p.shortLabel === "string" ? p.shortLabel : "";
  const title = typeof p.title === "string" ? p.title : "";
  if (!headerId || !roleSlug || !floorId) {
    onError?.(
      new Error(
        `canon yaml missing required identity fields (header.id / roleSlug / floorId)`,
      ),
      filename,
    );
    return null;
  }
  return { headerId, roleSlug, floorId, floorLabel, displayName, shortLabel, title };
}

/**
 * Read every canon character YAML under `<canonRoot>/characters/` and return
 * a runtime identity map. Cached for the lifetime of the process, but the
 * cache resets when `ARTLAB_CANON_ROOT` changes (tests).
 *
 * Per-file parse failures and an unreachable `characters/` directory both
 * surface through `opts.onError`. The callback never throws into the
 * caller; callers decide whether to record telemetry, count errors, or
 * ignore. The result list still only contains successfully-parsed
 * identities so downstream code never crashes on a malformed YAML.
 *
 * Important: `onError` is NOT called from the cache hit path. The intent
 * is one telemetry event per load attempt; callers that need cache-miss
 * detection can call `resetCanonIdentityCache()` first.
 */
export function loadCanonIdentities(
  opts?: LoadCanonIdentitiesOptions,
): readonly CanonIdentity[] {
  const canonRoot = opts?.canonRoot ?? defaultCanonRoot();
  if (cachedIdentities && cachedCanonRoot === canonRoot) return cachedIdentities;

  const charactersDir = join(canonRoot, "characters");
  let files: string[];
  try {
    files = readdirSync(charactersDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  } catch (err) {
    opts?.onError?.(err instanceof Error ? err : new Error(String(err)), "characters");
    cachedIdentities = [];
    cachedCanonRoot = canonRoot;
    return cachedIdentities;
  }

  const identities: CanonIdentity[] = [];
  for (const f of files) {
    const id = readCanonIdentityFromFile(join(charactersDir, f), f, opts?.onError);
    if (id) identities.push(id);
  }
  cachedIdentities = identities;
  cachedCanonRoot = canonRoot;
  return cachedIdentities;
}

/**
 * Resolve a runtime identifier (header.id OR roleSlug) to the full canon
 * identity tuple. Header.id wins over roleSlug when both could match — this
 * mirrors `resolveCanonCharacter`'s behavior and keeps deterministic output
 * when slug spaces accidentally overlap.
 *
 * Returns `undefined` when the canon map can't be read or the id isn't
 * recognized — caller decides whether that's a hard error or a soft fallback.
 */
export function resolveCanonIdentity(
  idOrRoleSlug: string,
  opts?: LoadCanonIdentitiesOptions,
): CanonIdentity | undefined {
  if (!idOrRoleSlug) return undefined;
  const identities = loadCanonIdentities(opts);
  const byHeaderId = identities.find((id) => id.headerId === idOrRoleSlug);
  if (byHeaderId) return byHeaderId;
  return identities.find((id) => id.roleSlug === idOrRoleSlug);
}

/**
 * Reset the module-level cache. Call this from tests that swap
 * `ARTLAB_CANON_ROOT` mid-suite to force the next `loadCanonIdentities` to
 * re-read from disk.
 */
export function resetCanonIdentityCache(): void {
  cachedIdentities = null;
  cachedCanonRoot = null;
}
