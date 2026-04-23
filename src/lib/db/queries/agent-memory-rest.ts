/**
 * Agent Memory queries via Supabase REST.
 * pgvector-backed conversation memory per character.
 * Characters remember past interactions across sessions.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentMemoryEntry {
  id: string;
  userId: string;
  agent: string | null;
  category: string | null;
  content: string | null;
  importance: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateMemoryInput {
  userId: string;
  agent: string;
  category: "preference" | "pattern" | "fact" | "feedback";
  content: string;
  importance?: number;
}

/** Per-agent rolling cap so memory tables never grow unbounded. */
const MAX_MEMORIES_PER_AGENT = 50;

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToMemory(row: Record<string, unknown>): AgentMemoryEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    agent: row.agent as string | null,
    category: row.category as string | null,
    content: row.content as string | null,
    importance: row.importance as string | null,
    accessCount: (row.access_count as number) ?? 0,
    lastAccessedAt: row.last_accessed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Retrieve memories for a specific agent, ordered by importance + recency.
 *
 * The previous implementation increment-bug used `data[0].access_count + 1`
 * for every row — that bumped all rows to the same count instead of per-row
 * +1. We now perform a per-row update using the row's own current count.
 */
export async function getAgentMemories(
  userId: string,
  agent: string,
  limit: number = 20,
): Promise<AgentMemoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("agent", agent)
    .order("importance", { ascending: false })
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    log.error("agent_memory.get_by_agent_failed", undefined, {
      userId,
      agent,
      limit,
      error: error.message,
    });
    return [];
  }

  // Per-row access-count bump (fire-and-forget — never block retrieval).
  const rows = data ?? [];
  if (rows.length > 0) {
    const now = new Date().toISOString();
    void Promise.all(
      rows.map((row) =>
        supabase
          .from("agent_memory")
          .update({
            access_count: ((row.access_count as number | null) ?? 0) + 1,
            last_accessed_at: now,
          })
          .eq("id", row.id as string),
      ),
    );
  }

  return rows.map(rowToMemory);
}

/**
 * Retrieve memories shaped for prompt-injection (used by every chat route).
 *
 * Strategy: take top-N by importance × recency, where N defaults to 5. This is
 * a simple "two-signal" ordering that doesn't require an embedding round-trip
 * — semantic retrieval is a future upgrade once we have query embedding
 * infrastructure threaded into the chat path.
 */
export async function getMemoriesForContext(
  userId: string,
  agent: string,
  topK: number = 5,
): Promise<Array<{ content: string; category: string }>> {
  const memories = await getAgentMemories(userId, agent, topK);
  return memories
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      content: m.content as string,
      category: m.category ?? "fact",
    }));
}

/**
 * Store a new memory entry for an agent. Caps total memories per
 * (user, agent) pair at MAX_MEMORIES_PER_AGENT — when exceeded, deletes the
 * lowest-importance / least-recently-accessed rows first.
 */
export async function storeAgentMemory(
  input: CreateMemoryInput,
): Promise<AgentMemoryEntry | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .insert({
      user_id: input.userId,
      agent: input.agent,
      category: input.category,
      content: input.content,
      importance: input.importance?.toFixed(2) ?? "0.50",
      access_count: 0,
      last_accessed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    log.error("agent_memory.store_failed", undefined, {
      userId: input.userId,
      agent: input.agent,
      category: input.category,
      error: error.message,
    });
    return null;
  }

  // Enforce the rolling cap. Run in the background — never block the write
  // path. Two-step: count, then prune oldest-by-recency / weakest-by-
  // importance if over.
  void enforceMemoryCap(input.userId, input.agent);

  return data ? rowToMemory(data as Record<string, unknown>) : null;
}

/**
 * Delete oldest, least-important memories beyond the cap. Best-effort.
 */
async function enforceMemoryCap(userId: string, agent: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data, count } = await supabase
      .from("agent_memory")
      .select("id, importance, last_accessed_at, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("agent", agent);

    if (!count || count <= MAX_MEMORIES_PER_AGENT || !data) return;

    const overflow = count - MAX_MEMORIES_PER_AGENT;
    // Sort: lowest importance first, then oldest last_accessed_at.
    const sorted = [...data].sort((a, b) => {
      const ai = parseFloat((a.importance as string | null) ?? "0.5");
      const bi = parseFloat((b.importance as string | null) ?? "0.5");
      if (ai !== bi) return ai - bi;
      const at = (a.last_accessed_at as string | null) ?? (a.created_at as string);
      const bt = (b.last_accessed_at as string | null) ?? (b.created_at as string);
      return new Date(at).getTime() - new Date(bt).getTime();
    });

    const toDelete = sorted.slice(0, overflow).map((r) => r.id as string);
    if (toDelete.length === 0) return;

    await supabase.from("agent_memory").delete().in("id", toDelete);
  } catch (err) {
    log.warn("agent_memory.enforce_cap_failed", {
      agent,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get memories for all agents (used by CEO for briefing compilation).
 */
export async function getAllAgentMemories(
  userId: string,
  limit: number = 50,
): Promise<AgentMemoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    log.error("agent_memory.get_all_failed", undefined, {
      userId,
      limit,
      error: error.message,
    });
    return [];
  }

  return (data ?? []).map(rowToMemory);
}

/**
 * Whiteboard-friendly memory — excludes the target_profile marker row and
 * returns the single freshest non-profile note (pattern, feedback, or fact).
 * Returns null when no suitable memory exists.
 */
export async function getLatestWhiteboardMemory(
  userId: string,
  agent: string = "cro"
): Promise<{ content: string; category: string } | null> {
  const memories = await getAgentMemories(userId, agent, 15);
  for (const m of memories) {
    if (!m.content) continue;
    if (m.content.startsWith("[target_profile_v1]")) continue;
    return { content: m.content, category: m.category ?? "fact" };
  }
  return null;
}

/**
 * Get memory count per agent (for dashboard display).
 */
export async function getMemoryCountByAgent(
  userId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .select("agent")
    .eq("user_id", userId);

  if (error) {
    log.error("agent_memory.count_failed", undefined, {
      userId,
      error: error.message,
    });
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const agent = (row.agent as string) ?? "unknown";
    counts[agent] = (counts[agent] ?? 0) + 1;
  }

  return counts;
}
