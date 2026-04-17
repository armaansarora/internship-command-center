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
 * Each subagent dispatch is logged to `agent_logs` with token + cost so the
 * CFO floor can attribute spend per department. The CEO's own streamText
 * call is logged separately at the route handler.
 */

import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod/v4";
import { getAgentModel, getActiveModelId } from "../model";
import { recordAgentRun } from "../telemetry";
import { getMemoriesForContext } from "@/lib/db/queries/agent-memory-rest";
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
 */
async function runSubagent<TStats>(
  spec: DispatchSpec<TStats>,
  userId: string,
  userName: string,
  task: string,
): Promise<DispatchResult> {
  const start = Date.now();

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

    return {
      agent: spec.agent,
      summary,
      tokensUsed,
      ok: true,
    };
  } catch (err) {
    void recordAgentRun({
      userId,
      agent: spec.agent,
      action: "ceo.dispatch",
      modelId: getActiveModelId(),
      usage: undefined,
      durationMs: Date.now() - start,
      inputSummary: task.slice(0, 200),
      outputSummary: null,
      error: err instanceof Error ? err.message : String(err),
      status: "failed",
    });

    return {
      agent: spec.agent,
      summary: `(${spec.agent.toUpperCase()} dispatch failed: ${err instanceof Error ? err.message : "unknown error"})`,
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
// Public: build the CEO's dispatch tool set
// ---------------------------------------------------------------------------

/**
 * Build the seven dispatch tools the CEO can use in a single user turn. Each
 * tool, when called, runs the named department's full agent loop nested
 * inside the CEO's own streamText call.
 */
export function buildCEODispatchTools(userId: string, userName: string) {
  return {
    dispatchToCRO: makeDispatchTool(
      "cro",
      {
        loadStats: getPipelineStatsRest,
        buildSystem: (s, n, m) => buildCROSystemPrompt(s, n, m),
        buildTools: (uid) => buildCROTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCOO: makeDispatchTool(
      "coo",
      {
        loadStats: getDailyBriefingData,
        buildSystem: (s, n, m) => buildCOOSystemPrompt(s, n, m),
        buildTools: (uid) => buildCOOTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCNO: makeDispatchTool(
      "cno",
      {
        loadStats: getContactStats,
        buildSystem: (s, n, m) => buildCNOSystemPrompt(s, n, m),
        buildTools: (uid) => buildCNOTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCIO: makeDispatchTool(
      "cio",
      {
        loadStats: getResearchStats,
        buildSystem: (s, n, m) => buildCIOSystemPrompt(s, n, m),
        buildTools: (uid) => buildCIOTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCMO: makeDispatchTool(
      "cmo",
      {
        loadStats: getDocumentStats,
        buildSystem: (s, n, m) => buildCMOSystemPrompt(s, n, m),
        buildTools: (uid) => buildCMOTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCPO: makeDispatchTool(
      "cpo",
      {
        loadStats: loadPrepStats,
        buildSystem: (s, n, m) => buildCPOSystemPrompt(s, n, m),
        buildTools: (uid) => buildCPOTools(uid),
      },
      userId,
      userName,
    ),
    dispatchToCFO: makeDispatchTool(
      "cfo",
      {
        loadStats: loadCFOStats,
        buildSystem: (s, n, m) => buildCFOSystemPrompt(s.stats, s.snapshots, n, m),
        buildTools: (uid) => buildCFOTools(uid),
      },
      userId,
      userName,
    ),
  };
}
