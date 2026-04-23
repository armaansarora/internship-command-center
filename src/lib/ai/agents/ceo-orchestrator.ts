/**
 * CEO Orchestrator — agent-in-tool wiring.
 *
 * Replaces the old `dispatchAgent` placeholder (which just returned a fake
 * acknowledgment string) with one tool per department. Each tool, when the
 * CEO model invokes it, performs a **nested** `generateText` call against the
 * target agent's persona + tools, then compresses the result back into a
 * single structured payload the CEO can synthesize across.
 *
 * Pattern (from CHAIN-OF-COMMAND.md):
 *
 *   User → CEO (streamText, stepCountIs(3))
 *           │
 *           ├── tool: dispatchToCRO  → generateText(CRO persona + tools, stepCountIs(5))
 *           ├── tool: dispatchToCOO  → generateText(COO persona + tools, stepCountIs(5))
 *           └── tool: dispatchToXYZ  ...
 *
 * R3.3 adds `dispatchBatch` — a single tool call that fans ≥2 subagents out
 * **in parallel** via `Promise.allSettled`. Each dispatch writes one
 * `agent_dispatches` row (queued → running → completed|failed) so the front
 * end can poll the progression while the CEO streams its synthesis.
 *
 * Each subagent dispatch is logged to `agent_logs` with token + cost so the
 * CFO floor can attribute spend per department. The CEO's own streamText
 * call is logged separately at the route handler.
 */

import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod/v4";
import { getAgentModel, getActiveModelId } from "../model";
import { recordAgentRun } from "../telemetry";
import { getMemoriesForContext } from "@/lib/db/queries/agent-memory-rest";
import {
  insertQueuedDispatch,
  markDispatchRunning,
  completeDispatch,
  failDispatch,
} from "@/lib/db/queries/agent-dispatches-rest";
import { getCachedSystem } from "../prompt-cache";

import { buildCROSystemPrompt } from "@/lib/agents/cro/system-prompt";
import { buildCROTools } from "@/lib/agents/cro/tools";
import { getPipelineStatsRest } from "@/lib/db/queries/applications-rest";

import { buildCOOSystemPrompt } from "@/lib/agents/coo/system-prompt";
import { buildCOOTools } from "@/lib/agents/coo/tools";
import { getDailyBriefingData } from "@/lib/db/queries/communications-rest";

import { buildCNOSystemPrompt } from "@/lib/agents/cno/system-prompt";
import { buildCNOTools } from "@/lib/agents/cno/tools";
import { getContactStats } from "@/lib/db/queries/contacts-rest";

import { buildCIOSystemPrompt } from "@/lib/agents/cio/system-prompt";
import { buildCIOTools } from "@/lib/agents/cio/tools";
import { getResearchStats } from "@/lib/db/queries/companies-rest";

import { buildCMOSystemPrompt } from "@/lib/agents/cmo/system-prompt";
import { buildCMOTools } from "@/lib/agents/cmo/tools";
import { getDocumentStats } from "@/lib/db/queries/documents-rest";

import { buildCPOSystemPrompt } from "@/lib/agents/cpo/system-prompt";
import { buildCPOTools } from "@/lib/agents/cpo/tools";
import { createClient } from "@/lib/supabase/server";

import { buildCFOSystemPrompt } from "@/lib/agents/cfo/system-prompt";
import { buildCFOTools } from "@/lib/agents/cfo/tools";

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

/** Common compressed output that every dispatch tool returns to the CEO. */
interface DispatchResult {
  agent: string;
  /** The subagent's textual reply, trimmed for synthesis. */
  summary: string;
  /** Optional structured payload — currently unused but reserved for typed sub-output. */
  data?: Record<string, unknown>;
  /** Tokens spent on this nested call. */
  tokensUsed: number;
  /** Whether the subagent ran without error. */
  ok: boolean;
}

/** Closed set of dispatchable department keys. */
export type AgentKey = "cro" | "coo" | "cno" | "cio" | "cmo" | "cpo" | "cfo";

const DISPATCH_INSTRUCTION = `The CEO is asking you to handle this for the user. Use your tools to gather real data, then deliver a single compressed report (under 250 words) the CEO can incorporate into their executive briefing. Lead with the bottom-line takeaway. Use specifics — numbers, names, deadlines.`;

const DEPARTMENT_DESCRIPTIONS: Record<string, string> = {
  cro: "CRO — pipeline status, conversion rates, follow-up strategy, deal velocity.",
  coo: "COO — calendar, deadlines, follow-up cadence, schedule management.",
  cno: "CNO — networking, contact warmth, relationship health, intro chains.",
  cio: "CIO — company research, market intelligence, competitive analysis.",
  cmo: "CMO — cover letter drafts, narrative positioning, tone calibration.",
  cpo: "CPO — interview prep packets, mock drills, behavioral frameworks.",
  cfo: "CFO — analytics, conversion funnel, benchmarks, agent cost data.",
};

// ---------------------------------------------------------------------------
// Generic dispatch runner
// ---------------------------------------------------------------------------

interface DispatchSpec<TStats> {
  agent: string;
  /** Loader for the subagent's per-request stats. */
  loadStats: (userId: string) => Promise<TStats>;
  /**
   * Build the subagent's system prompt. Memories are passed in fresh per call
   * so the subagent sees the same retrieval the standalone route would.
   */
  buildSystem: (
    stats: TStats,
    userName: string,
    memories: Array<{ content: string; category: string }>,
  ) => string;
  buildTools: (userId: string) => Record<string, unknown>;
  /** Step cap for the subagent's tool loop. */
  maxSteps?: number;
}

/**
 * Run one subagent in response to a CEO dispatch. Always resolves with a
 * structured DispatchResult — failure is reported via `ok: false` rather than
 * thrown, because we never want a single subagent error to crash the parent
 * CEO streamText call.
 *
 * The optional `dispatchId` wires the run into a persisted `agent_dispatches`
 * row so the front end can poll queued → running → completed|failed. Pass
 * `""` or leave undefined from single-agent tools that don't participate in a
 * batch — the row-lifecycle calls fall through as no-ops.
 */
async function runSubagent<TStats>(
  spec: DispatchSpec<TStats>,
  userId: string,
  userName: string,
  task: string,
  dispatchId?: string,
): Promise<DispatchResult> {
  const start = Date.now();
  const hasDispatchRow = typeof dispatchId === "string" && dispatchId.length > 0;

  // Stamp started_at as early as possible — the UI polls against this to
  // render "running" state. Fire-and-forget so we don't add the DB round-trip
  // to the critical path of the LLM call.
  if (hasDispatchRow) {
    // Intentionally not awaited: markDispatchRunning is idempotent from the
    // caller's perspective and the DB write is small. Any error is logged
    // inside the helper and does not block the subagent.
    void markDispatchRunning(dispatchId as string);
  }

  try {
    const [stats, memories] = await Promise.all([
      spec.loadStats(userId),
      getMemoriesForContext(userId, spec.agent, 5),
    ]);

    const systemPrompt = spec.buildSystem(stats, userName, memories);
    const tools = spec.buildTools(userId);
    const modelId = getActiveModelId();

    const result = await generateText({
      model: getAgentModel(),
      // Prompt-cache the entire system message for this subagent. Subsequent
      // dispatches within the same chat session reuse the cached prefix and
      // pay only for the dynamic context tail + the new user task.
      system: getCachedSystem(systemPrompt),
      prompt: `${DISPATCH_INSTRUCTION}\n\nTASK FROM CEO:\n${task}`,
      // The cast is benign — each subagent's tools satisfy ToolSet structurally;
      // this orchestrator only widens at the boundary.
      tools: tools as Parameters<typeof generateText>[0]["tools"],
      stopWhen: stepCountIs(spec.maxSteps ?? 5),
    });

    const summary = result.text.trim();
    const tokensUsed =
      (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);

    void recordAgentRun({
      userId,
      agent: spec.agent,
      action: "ceo.dispatch",
      modelId,
      usage: result.usage,
      durationMs: Date.now() - start,
      inputSummary: task.slice(0, 200),
      outputSummary: summary.slice(0, 200),
    });

    if (hasDispatchRow) {
      void completeDispatch(dispatchId as string, summary, tokensUsed);
    }

    return {
      agent: spec.agent,
      summary,
      tokensUsed,
      ok: true,
    };
  } catch (err) {
    const errorSummary = err instanceof Error ? err.message : String(err);

    void recordAgentRun({
      userId,
      agent: spec.agent,
      action: "ceo.dispatch",
      modelId: getActiveModelId(),
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: task.slice(0, 200),
      outputSummary: null,
      error: errorSummary,
      status: "failed",
    });

    if (hasDispatchRow) {
      void failDispatch(
        dispatchId as string,
        `${spec.agent.toUpperCase()} dispatch failed: ${errorSummary}`,
      );
    }

    return {
      agent: spec.agent,
      summary: `(${spec.agent.toUpperCase()} dispatch failed: ${errorSummary})`,
      tokensUsed: 0,
      ok: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Per-department tool factories
// ---------------------------------------------------------------------------
/**
 * Helper: produce a `tool({...})` object the CEO can call to dispatch one
 * subagent. The `agentKey` is the lowercase department code (cro, coo, ...).
 */
function makeDispatchTool<TStats>(
  agentKey: string,
  spec: Omit<DispatchSpec<TStats>, "agent">,
  userId: string,
  userName: string,
) {
  return tool({
    description: `Dispatch a task to the ${agentKey.toUpperCase()}. ${DEPARTMENT_DESCRIPTIONS[agentKey] ?? ""} Returns the ${agentKey.toUpperCase()}'s compressed report — incorporate it into your executive synthesis.`,
    inputSchema: z.object({
      task: z
        .string()
        .min(8)
        .max(2000)
        .describe(
          `What you need from the ${agentKey.toUpperCase()}. Be specific — they will use real tools to gather data.`,
        ),
    }),
    execute: async ({ task }) => {
      return runSubagent({ ...spec, agent: agentKey }, userId, userName, task);
    },
  });
}

// ---------------------------------------------------------------------------
// CPO stats loader (CPO requires a custom loader — same as the CPO route)
// ---------------------------------------------------------------------------
async function loadPrepStats(userId: string) {
  const supabase = await createClient();
  const [interviewsResult, prepPacketsResult] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, scheduled_at, status, application_id, prep_packet_id")
      .eq("user_id", userId),
    supabase
      .from("documents")
      .select("id, application_id")
      .eq("user_id", userId)
      .eq("type", "prep_packet")
      .eq("is_active", true),
  ]);

  const allInterviews = interviewsResult.data ?? [];
  const prepPackets = prepPacketsResult.data ?? [];
  const now = new Date();
  const upcoming = allInterviews.filter(
    (i) =>
      i.scheduled_at &&
      new Date(i.scheduled_at) > now &&
      i.status !== "cancelled",
  );
  const withPrep = upcoming.filter((i) => i.prep_packet_id !== null);
  const withoutPrep = upcoming.filter((i) => i.prep_packet_id === null);
  const sorted = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const next = sorted[0] ?? null;

  let nextInterviewCompany: string | null = null;
  let nextInterviewHoursAway: number | null = null;
  if (next) {
    const { data: app } = await supabase
      .from("applications")
      .select("company_name")
      .eq("id", next.application_id)
      .single();
    nextInterviewCompany = app?.company_name ?? null;
    nextInterviewHoursAway = Math.round(
      (new Date(next.scheduled_at).getTime() - now.getTime()) / (1000 * 60 * 60),
    );
  }

  return {
    totalInterviews: allInterviews.length,
    upcomingInterviews: upcoming.length,
    interviewsWithPrepPackets: withPrep.length,
    interviewsWithoutPrepPackets: withoutPrep.length,
    totalPrepPackets: prepPackets.length,
    nextInterviewCompany,
    nextInterviewHoursAway,
  };
}

// ---------------------------------------------------------------------------
// CFO stats loader — combines pipeline stats with daily snapshots (mirrors
// the CFO route handler).
// ---------------------------------------------------------------------------
async function loadCFOStats(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [stats, snapshotResult] = await Promise.all([
    getPipelineStatsRest(userId),
    supabase
      .from("daily_snapshots")
      .select("snapshot_date, total_applications, conversion_rate, stale_count")
      .eq("user_id", userId)
      .gte("snapshot_date", since)
      .order("snapshot_date", { ascending: false })
      .limit(14),
  ]);

  const snapshots = (snapshotResult.data ?? []).map((s) => ({
    date: s.snapshot_date as string,
    totalApplications: (s.total_applications as number) ?? 0,
    conversionRate: (s.conversion_rate as number) ?? 0,
    staleCount: (s.stale_count as number) ?? 0,
  }));

  return { stats, snapshots };
}

// ---------------------------------------------------------------------------
// Shared spec source of truth
// ---------------------------------------------------------------------------

/**
 * Returns the dispatch spec for every department, keyed by lowercase agent
 * code. Both `buildCEODispatchTools` (single-agent fan-in) and
 * `buildDispatchBatchTool` (parallel fan-out) derive from this object so a
 * spec change in one place automatically flows to both tool families.
 *
 * The return type uses `DispatchSpec<unknown>` at the map boundary — each
 * spec is internally generic over its own stats shape, but callers only ever
 * pass the spec straight into `runSubagent`, which is itself generic.
 */
function buildSpecByAgent(): Record<AgentKey, DispatchSpec<unknown>> {
  return {
    cro: {
      agent: "cro",
      loadStats: getPipelineStatsRest as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCROSystemPrompt(s as Awaited<ReturnType<typeof getPipelineStatsRest>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCROTools(uid) as Record<string, unknown>,
    },
    coo: {
      agent: "coo",
      loadStats: getDailyBriefingData as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCOOSystemPrompt(s as Awaited<ReturnType<typeof getDailyBriefingData>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCOOTools(uid) as Record<string, unknown>,
    },
    cno: {
      agent: "cno",
      loadStats: getContactStats as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCNOSystemPrompt(s as Awaited<ReturnType<typeof getContactStats>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCNOTools(uid) as Record<string, unknown>,
    },
    cio: {
      agent: "cio",
      loadStats: getResearchStats as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCIOSystemPrompt(s as Awaited<ReturnType<typeof getResearchStats>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCIOTools(uid) as Record<string, unknown>,
    },
    cmo: {
      agent: "cmo",
      loadStats: getDocumentStats as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCMOSystemPrompt(s as Awaited<ReturnType<typeof getDocumentStats>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCMOTools(uid) as Record<string, unknown>,
    },
    cpo: {
      agent: "cpo",
      loadStats: loadPrepStats as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) =>
        buildCPOSystemPrompt(s as Awaited<ReturnType<typeof loadPrepStats>>, n, m)) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCPOTools(uid) as Record<string, unknown>,
    },
    cfo: {
      agent: "cfo",
      loadStats: loadCFOStats as DispatchSpec<unknown>["loadStats"],
      buildSystem: ((s, n, m) => {
        const stats = s as Awaited<ReturnType<typeof loadCFOStats>>;
        return buildCFOSystemPrompt(stats.stats, stats.snapshots, n, m);
      }) as DispatchSpec<unknown>["buildSystem"],
      buildTools: (uid) => buildCFOTools(uid) as Record<string, unknown>,
    },
  };
}

// ---------------------------------------------------------------------------
// Public: build the CEO's dispatch tool set
// ---------------------------------------------------------------------------

/**
 * Build the seven dispatch tools the CEO can use in a single user turn. Each
 * tool, when called, runs the named department's full agent loop nested
 * inside the CEO's own streamText call.
 */
export function buildCEODispatchTools(userId: string, userName: string) {
  const specs = buildSpecByAgent();
  return {
    dispatchToCRO: makeDispatchTool("cro", specs.cro, userId, userName),
    dispatchToCOO: makeDispatchTool("coo", specs.coo, userId, userName),
    dispatchToCNO: makeDispatchTool("cno", specs.cno, userId, userName),
    dispatchToCIO: makeDispatchTool("cio", specs.cio, userId, userName),
    dispatchToCMO: makeDispatchTool("cmo", specs.cmo, userId, userName),
    dispatchToCPO: makeDispatchTool("cpo", specs.cpo, userId, userName),
    dispatchToCFO: makeDispatchTool("cfo", specs.cfo, userId, userName),
  };
}

// ---------------------------------------------------------------------------
// R3.3 — dispatchBatch: parallel fan-out across 2+ departments
// ---------------------------------------------------------------------------

/**
 * Build the `dispatchBatch` tool — the CEO's single-call parallel fan-out.
 *
 * The tool's input is a `tasks` object where each key is a lowercase
 * department code and each value is the task string for that department. At
 * least **two** agents must be named (otherwise the model should pick the
 * focused single-agent `dispatchToX` tool). The execute step:
 *
 *   1. Inserts one queued `agent_dispatches` row per named agent (sequentially
 *      so id/order pairing is deterministic).
 *   2. Kicks off every subagent via `runSubagent` with its dispatch id,
 *      synchronously under `Promise.allSettled` so all LLM calls run
 *      concurrently under Node's scheduler.
 *   3. Each `runSubagent` transitions its row queued → running → completed or
 *      queued → running → failed on its own — the batch tool never writes
 *      lifecycle state directly.
 *   4. Returns `{ requestId, agents: DispatchResult[] }` — the CEO synthesizes
 *      all reports into a single reply to the user.
 */
export function buildDispatchBatchTool(userId: string, userName: string) {
  const specs = buildSpecByAgent();

  return tool({
    description:
      "Dispatch 2+ department heads IN PARALLEL in a single call. Use me for status-across-departments briefings (e.g. 'how's everything looking', 'morning briefing', 'full status'). Returns each department's compressed report — synthesize them all in your final reply.",
    inputSchema: z.object({
      tasks: z
        .object({
          cro: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe(
              "Task for CRO: pipeline status, conversion, follow-up strategy, deal velocity.",
            ),
          coo: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe(
              "Task for COO: calendar, deadlines, follow-up cadence, schedule.",
            ),
          cno: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe(
              "Task for CNO: networking, contact warmth, relationships.",
            ),
          cio: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe("Task for CIO: company research, competitive intel."),
          cmo: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe(
              "Task for CMO: cover letters, narrative positioning.",
            ),
          cpo: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe("Task for CPO: interview prep, behavioral drills."),
          cfo: z
            .string()
            .min(8)
            .max(2000)
            .optional()
            .describe(
              "Task for CFO: analytics, benchmarks, agent cost.",
            ),
        })
        .refine(
          (t) =>
            Object.values(t).filter(
              (v): v is string => typeof v === "string" && v.length >= 8,
            ).length >= 2,
          "dispatchBatch requires at least 2 agents; use the single-agent dispatchToX tools for focused asks.",
        ),
    }),
    execute: async ({ tasks }) => {
      const requestId = crypto.randomUUID();
      const present: Array<[AgentKey, string]> = (
        Object.entries(tasks) as Array<[AgentKey, string | undefined]>
      ).filter(
        (e): e is [AgentKey, string] =>
          typeof e[1] === "string" && e[1].length >= 8,
      );

      // Write all queued rows first, sequentially so id order lines up with
      // present[] order. These writes are small; doing them upfront avoids a
      // race where the client polls before any row exists.
      const ids: string[] = [];
      for (const [agent, task] of present) {
        const id = await insertQueuedDispatch(userId, requestId, agent, task, []);
        ids.push(id);
      }

      // Parallel fan-out. Each runSubagent handles its own marking/completion
      // via the dispatchId. Use allSettled so one failure doesn't abort peers.
      //
      // IMPORTANT: the `.map(...)` must create every promise synchronously
      // (no intermediate awaits) so that the nested generateText calls all
      // begin their I/O before any of them resolve — that is what makes the
      // fan-out parallel rather than sequential.
      const settled = await Promise.allSettled(
        present.map(([agent, task], i) => {
          const spec: DispatchSpec<unknown> = { ...specs[agent], agent };
          return runSubagent(spec, userId, userName, task, ids[i]);
        }),
      );

      const agents: DispatchResult[] = settled.map((s, i) => {
        const [agent] = present[i];
        if (s.status === "fulfilled") return s.value;
        // allSettled.rejected shouldn't happen — runSubagent catches its own
        // errors and returns ok:false. But be defensive.
        return {
          agent,
          summary: `(${agent.toUpperCase()} dispatch rejected: ${s.reason instanceof Error ? s.reason.message : String(s.reason)})`,
          tokensUsed: 0,
          ok: false,
        };
      });

      return { requestId, agents };
    },
  });
}
