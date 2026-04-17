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

  // Increment access count for retrieved memories
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length > 0) {
    const now = new Date().toISOString();
    void Promise.all(
      (data ?? []).map((row) =>
        supabase
          .from("agent_memory")
          .update({
            access_count: ((row.access_count as number | null) ?? 0) + 1,
            last_accessed_at: now,
          })
          .eq("id", row.id as string),
      ),
    )
      .then(() => null);
  }

  return (data ?? []).map(rowToMemory);
}

/**
 * Store a new memory entry for an agent.
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

  return data ? rowToMemory(data as Record<string, unknown>) : null;
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
