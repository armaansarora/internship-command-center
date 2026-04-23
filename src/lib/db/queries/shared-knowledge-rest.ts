/**
 * Shared Knowledge queries via Supabase REST.
 *
 * The `user_profiles.shared_knowledge` jsonb is a two-level map that lets any
 * agent drop a note for another agent to pick up on its next turn. The shape
 * stored in the column is:
 *
 *   {
 *     [agentKey]: {
 *       [entryKey]: { value, writtenAt, writtenBy }
 *     }
 *   }
 *
 * Callers of `writeSharedKnowledge` never touch another agent's namespace —
 * the `writtenBy` param is always the agent's own key, so writes are
 * agent-scoped by construction. Reads can optionally filter out a given
 * agent's own entries with `excludeAgent`, giving the caller a clean
 * "what have my peers learned?" view without self-echo.
 *
 * Implementation note: Supabase REST has no first-class partial jsonb patch,
 * so every write is a read → merge → write round-trip. The row is one
 * small jsonb column, so the overhead is negligible in practice. If/when
 * this grows beyond a handful of entries per user we can move into an RPC.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SharedKnowledgeEntry {
  value: string;
  writtenAt: string; // ISO
  writtenBy: string; // agent key
}

/** Flat map keyed `"{writtenBy}:{entryKey}" → Entry` returned by reads. */
export type SharedKnowledgeFlatMap = Record<string, SharedKnowledgeEntry>;

/** Nested map shape as it lives in the jsonb column. */
type NestedMap = Record<string, Record<string, SharedKnowledgeEntry>>;

// ---------------------------------------------------------------------------
// Defensive parsing — the jsonb column is `unknown` from Supabase's POV, so
// narrow before trusting it.
// ---------------------------------------------------------------------------

function isValidEntry(x: unknown): x is SharedKnowledgeEntry {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.value === "string" &&
    typeof obj.writtenAt === "string" &&
    typeof obj.writtenBy === "string"
  );
}

/**
 * Coerce an arbitrary jsonb value into a NestedMap, dropping anything that
 * doesn't fit the { [agent]: { [key]: Entry } } shape. Returns `{}` for
 * null / non-object / malformed inputs.
 */
function coerceToNested(raw: unknown): NestedMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: NestedMap = {};
  for (const [agent, inner] of Object.entries(raw as Record<string, unknown>)) {
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) continue;
    const entries: Record<string, SharedKnowledgeEntry> = {};
    for (const [key, entry] of Object.entries(inner as Record<string, unknown>)) {
      if (isValidEntry(entry)) {
        entries[key] = entry;
      }
    }
    out[agent] = entries;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Write (or overwrite) one entry under the given agent's namespace.
 *
 * Reads the current shared_knowledge, merges in the new entry, writes back.
 * Two round-trips — the row is tiny; later we can move this into an RPC.
 *
 * `writtenBy` should always be the calling agent's own key; it's used both
 * as the outer namespace and echoed inside the entry so flattened reads
 * don't need to reconstruct it from position.
 */
export async function writeSharedKnowledge(
  userId: string,
  writtenBy: string,
  entryKey: string,
  value: string,
): Promise<void> {
  const supabase = await createClient();

  // Read leg — pull the current jsonb so we can merge.
  const { data, error: readError } = await supabase
    .from("user_profiles")
    .select("shared_knowledge")
    .eq("id", userId)
    .single();

  if (readError) {
    log.error("shared_knowledge.read_for_write_failed", undefined, {
      userId,
      writtenBy,
      entryKey,
      error: readError.message,
    });
    return;
  }

  const current = coerceToNested(
    (data as { shared_knowledge: unknown } | null)?.shared_knowledge ?? null,
  );

  const next: NestedMap = {
    ...current,
    [writtenBy]: {
      ...(current[writtenBy] ?? {}),
      [entryKey]: {
        value,
        writtenAt: new Date().toISOString(),
        writtenBy,
      },
    },
  };

  // Write leg — merge back.
  const { error: writeError } = await supabase
    .from("user_profiles")
    .update({ shared_knowledge: next })
    .eq("id", userId);

  if (writeError) {
    log.error("shared_knowledge.write_failed", undefined, {
      userId,
      writtenBy,
      entryKey,
      error: writeError.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Read entries for a given user, returned as a flat map keyed
 * `"{agent}:{entryKey}" → Entry`.
 *
 * If `excludeAgent` is provided, entries written by that agent are filtered
 * out — so an agent can ask "what have my peers learned?" without seeing
 * its own echo.
 *
 * Returns `{}` on any error or null shared_knowledge (defensive — callers
 * always get a usable object).
 */
export async function readSharedKnowledge(
  userId: string,
  excludeAgent?: string,
): Promise<SharedKnowledgeFlatMap> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("shared_knowledge")
    .eq("id", userId)
    .single();

  if (error) {
    log.error("shared_knowledge.read_failed", undefined, {
      userId,
      error: error.message,
    });
    return {};
  }

  const nested = coerceToNested(
    (data as { shared_knowledge: unknown } | null)?.shared_knowledge ?? null,
  );

  const flat: SharedKnowledgeFlatMap = {};
  for (const [agent, entries] of Object.entries(nested)) {
    for (const [key, entry] of Object.entries(entries)) {
      if (excludeAgent && entry.writtenBy === excludeAgent) continue;
      flat[`${agent}:${key}`] = entry;
    }
  }

  return flat;
}
