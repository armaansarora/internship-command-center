import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * R3.3 acceptance proof: `dispatchBatch` is real parallel fan-out.
 *
 * The contract we need to prove:
 *   1. The tool writes one `agent_dispatches` row per named agent, queued.
 *   2. Every named subagent starts concurrently — `started_at` (via the
 *      `markDispatchRunning` call) lands for every agent within a tight
 *      window, not sequentially one-after-another.
 *   3. Total wall-clock is bounded by the slowest subagent, not the sum.
 *   4. One failing subagent does NOT block or cancel its peers (allSettled
 *      semantics) — the returned `agents[]` still contains OK entries for
 *      the successful agents and an `ok:false` entry for the failure.
 *   5. The zod refine gate on `tasks` rejects fewer than 2 present agents at
 *      validation time — the model is told to use the single-agent
 *      `dispatchToX` tools for focused asks, not dispatchBatch.
 *
 * We aggressively mock every I/O boundary so the test runs in milliseconds
 * and measures only the orchestration layer, never the SDK or DB.
 */

// ---------------------------------------------------------------------------
// Hoisted spies & timing controls. Hoisting is required so vi.mock factories
// (which Vitest runs before imports) can reference them.
// ---------------------------------------------------------------------------
const {
  generateTextMock,
  markRunningSpy,
  markRunningTimestamps,
  insertQueuedSpy,
  completeDispatchSpy,
  failDispatchSpy,
  recordAgentRunSpy,
  getMemoriesForContextSpy,
  getCachedSystemSpy,
  getAgentModelSpy,
  getActiveModelIdSpy,
  // per-agent stat loader spies — returned values don't matter because the
  // mocked generateText ignores them.
  getPipelineStatsRestSpy,
  getDailyBriefingDataSpy,
  getContactStatsSpy,
  getResearchStatsSpy,
  getDocumentStatsSpy,
  // per-agent system-prompt + tools factories — all stubbed to return
  // trivial strings / empty tool sets so we never touch real agent code.
  buildCROSystemPromptSpy,
  buildCOOSystemPromptSpy,
  buildCNOSystemPromptSpy,
  buildCIOSystemPromptSpy,
  buildCMOSystemPromptSpy,
  buildCPOSystemPromptSpy,
  buildCFOSystemPromptSpy,
  buildCROToolsSpy,
  buildCOOToolsSpy,
  buildCNOToolsSpy,
  buildCIOToolsSpy,
  buildCMOToolsSpy,
  buildCPOToolsSpy,
  buildCFOToolsSpy,
  supabaseFromSpy,
} = vi.hoisted(() => {
  const markRunningTimestamps: Record<string, number> = {};
  return {
    generateTextMock: vi.fn(),
    markRunningSpy: vi.fn(),
    markRunningTimestamps,
    insertQueuedSpy: vi.fn(),
    completeDispatchSpy: vi.fn(),
    failDispatchSpy: vi.fn(),
    recordAgentRunSpy: vi.fn(),
    getMemoriesForContextSpy: vi.fn(),
    getCachedSystemSpy: vi.fn(),
    getAgentModelSpy: vi.fn(),
    getActiveModelIdSpy: vi.fn(),
    getPipelineStatsRestSpy: vi.fn(),
    getDailyBriefingDataSpy: vi.fn(),
    getContactStatsSpy: vi.fn(),
    getResearchStatsSpy: vi.fn(),
    getDocumentStatsSpy: vi.fn(),
    buildCROSystemPromptSpy: vi.fn(),
    buildCOOSystemPromptSpy: vi.fn(),
    buildCNOSystemPromptSpy: vi.fn(),
    buildCIOSystemPromptSpy: vi.fn(),
    buildCMOSystemPromptSpy: vi.fn(),
    buildCPOSystemPromptSpy: vi.fn(),
    buildCFOSystemPromptSpy: vi.fn(),
    buildCROToolsSpy: vi.fn(),
    buildCOOToolsSpy: vi.fn(),
    buildCNOToolsSpy: vi.fn(),
    buildCIOToolsSpy: vi.fn(),
    buildCMOToolsSpy: vi.fn(),
    buildCPOToolsSpy: vi.fn(),
    buildCFOToolsSpy: vi.fn(),
    supabaseFromSpy: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// `ai` — we ONLY override generateText. `tool` and `stepCountIs` keep their
// real runtime behavior because the orchestrator constructs real tool
// objects and we invoke `tool.execute` directly on them.
// ---------------------------------------------------------------------------
vi.mock("ai", async () => {
  const actual =
    await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: generateTextMock,
  };
});

// ---------------------------------------------------------------------------
// AI subsystem plumbing — stubs for the bits we don't care about.
// ---------------------------------------------------------------------------
vi.mock("../model", () => ({
  getAgentModel: getAgentModelSpy,
  getActiveModelId: getActiveModelIdSpy,
}));

vi.mock("../telemetry", () => ({
  recordAgentRun: recordAgentRunSpy,
}));

vi.mock("../prompt-cache", () => ({
  getCachedSystem: getCachedSystemSpy,
}));

// ---------------------------------------------------------------------------
// DB-layer stubs — every query the orchestrator imports.
// ---------------------------------------------------------------------------
vi.mock("@/lib/db/queries/agent-memory-rest", () => ({
  getMemoriesForContext: getMemoriesForContextSpy,
}));

vi.mock("@/lib/db/queries/agent-dispatches-rest", () => ({
  insertQueuedDispatch: insertQueuedSpy,
  markDispatchRunning: markRunningSpy,
  completeDispatch: completeDispatchSpy,
  failDispatch: failDispatchSpy,
}));

// R3.9 wired shared-knowledge reads into runSubagent. The R3.3 proof doesn't
// care what's on the bus — it cares about parallel fan-out timing — so stub
// the read as a fast-empty so the new Promise.all leg stays neutral.
vi.mock("@/lib/db/queries/shared-knowledge-rest", () => ({
  readSharedKnowledge: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db/queries/applications-rest", () => ({
  getPipelineStatsRest: getPipelineStatsRestSpy,
}));

vi.mock("@/lib/db/queries/communications-rest", () => ({
  getDailyBriefingData: getDailyBriefingDataSpy,
}));

vi.mock("@/lib/db/queries/contacts-rest", () => ({
  getContactStats: getContactStatsSpy,
}));

vi.mock("@/lib/db/queries/companies-rest", () => ({
  getResearchStats: getResearchStatsSpy,
}));

vi.mock("@/lib/db/queries/documents-rest", () => ({
  getDocumentStats: getDocumentStatsSpy,
}));

// Supabase server stub: `loadPrepStats` and `loadCFOStats` hit `createClient`
// directly. If either spec is invoked in a test we need a minimal chain that
// doesn't throw. Our tests only dispatch to CRO / COO / CIO so these are
// defensive — but when someone later writes a 7-agent batch test we want
// non-breakage.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: supabaseFromSpy,
  }),
}));

// ---------------------------------------------------------------------------
// Per-agent persona factories — stubbed to trivial strings / empty tool maps.
// ---------------------------------------------------------------------------
vi.mock("@/lib/agents/cro/system-prompt", () => ({
  buildCROSystemPrompt: buildCROSystemPromptSpy,
}));
vi.mock("@/lib/agents/cro/tools", () => ({
  buildCROTools: buildCROToolsSpy,
}));

vi.mock("@/lib/agents/coo/system-prompt", () => ({
  buildCOOSystemPrompt: buildCOOSystemPromptSpy,
}));
vi.mock("@/lib/agents/coo/tools", () => ({
  buildCOOTools: buildCOOToolsSpy,
}));

vi.mock("@/lib/agents/cno/system-prompt", () => ({
  buildCNOSystemPrompt: buildCNOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cno/tools", () => ({
  buildCNOTools: buildCNOToolsSpy,
}));

vi.mock("@/lib/agents/cio/system-prompt", () => ({
  buildCIOSystemPrompt: buildCIOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cio/tools", () => ({
  buildCIOTools: buildCIOToolsSpy,
}));

vi.mock("@/lib/agents/cmo/system-prompt", () => ({
  buildCMOSystemPrompt: buildCMOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cmo/tools", () => ({
  buildCMOTools: buildCMOToolsSpy,
}));

vi.mock("@/lib/agents/cpo/system-prompt", () => ({
  buildCPOSystemPrompt: buildCPOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cpo/tools", () => ({
  buildCPOTools: buildCPOToolsSpy,
}));

vi.mock("@/lib/agents/cfo/system-prompt", () => ({
  buildCFOSystemPrompt: buildCFOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cfo/tools", () => ({
  buildCFOTools: buildCFOToolsSpy,
}));

// ---------------------------------------------------------------------------
// Import the orchestrator AFTER every mock is registered.
// ---------------------------------------------------------------------------
const { buildDispatchBatchTool } = await import("./ceo-orchestrator");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ToolWithExecute {
  execute: (args: unknown, opts?: unknown) => Promise<unknown>;
  inputSchema: { safeParse: (v: unknown) => { success: boolean } };
}

function tasksWith(entries: Partial<Record<string, string>>): {
  tasks: Partial<Record<string, string>>;
} {
  return { tasks: entries };
}

/**
 * Configure generateTextMock to return a distinct per-agent payload after
 * `sleepMs`. The mock inspects the `system` string (which is a unique stub
 * per agent because we stubbed each buildXSystemPrompt to return a tagged
 * string) to route the delay and payload.
 */
function makeTimedGenerateText(
  perAgentSleepMs: Record<string, number>,
  shouldFailAgent?: string,
): void {
  generateTextMock.mockImplementation(async ({ system }: { system: string }) => {
    // Each system string is tagged "<AGENT>-system-prompt" by our stubs.
    const agent = Object.keys(perAgentSleepMs).find((k) =>
      system.startsWith(`${k}-system-prompt`),
    );
    if (!agent) {
      throw new Error(
        `generateText called with unknown system: ${system.slice(0, 40)}`,
      );
    }
    await new Promise((r) => setTimeout(r, perAgentSleepMs[agent]));
    if (shouldFailAgent && agent === shouldFailAgent) {
      throw new Error(`${agent.toUpperCase()} simulated failure`);
    }
    return {
      text: `  ${agent.toUpperCase()} compressed report.  `,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// beforeEach: give every mock a sane default.
// ---------------------------------------------------------------------------
beforeEach(() => {
  // Reset the auto-cleared spies (vitest config has clearMocks + restoreMocks,
  // but vi.hoisted instances persist across tests by design).
  generateTextMock.mockReset();
  markRunningSpy.mockReset();
  for (const k of Object.keys(markRunningTimestamps))
    delete markRunningTimestamps[k];
  insertQueuedSpy.mockReset();
  completeDispatchSpy.mockReset();
  failDispatchSpy.mockReset();
  recordAgentRunSpy.mockReset();
  getMemoriesForContextSpy.mockReset();
  getCachedSystemSpy.mockReset();
  getAgentModelSpy.mockReset();
  getActiveModelIdSpy.mockReset();
  getPipelineStatsRestSpy.mockReset();
  getDailyBriefingDataSpy.mockReset();
  getContactStatsSpy.mockReset();
  getResearchStatsSpy.mockReset();
  getDocumentStatsSpy.mockReset();
  buildCROSystemPromptSpy.mockReset();
  buildCOOSystemPromptSpy.mockReset();
  buildCNOSystemPromptSpy.mockReset();
  buildCIOSystemPromptSpy.mockReset();
  buildCMOSystemPromptSpy.mockReset();
  buildCPOSystemPromptSpy.mockReset();
  buildCFOSystemPromptSpy.mockReset();
  buildCROToolsSpy.mockReset();
  buildCOOToolsSpy.mockReset();
  buildCNOToolsSpy.mockReset();
  buildCIOToolsSpy.mockReset();
  buildCMOToolsSpy.mockReset();
  buildCPOToolsSpy.mockReset();
  buildCFOToolsSpy.mockReset();
  supabaseFromSpy.mockReset();

  // Default spies.
  getAgentModelSpy.mockReturnValue({ modelId: "mock" });
  getActiveModelIdSpy.mockReturnValue("mock");
  getCachedSystemSpy.mockImplementation((s: string) => s);
  getMemoriesForContextSpy.mockResolvedValue([]);
  recordAgentRunSpy.mockResolvedValue(undefined);

  // Per-agent stat loaders — irrelevant return shape because the stubbed
  // buildXSystemPrompt never reads the stats.
  getPipelineStatsRestSpy.mockResolvedValue({});
  getDailyBriefingDataSpy.mockResolvedValue({});
  getContactStatsSpy.mockResolvedValue({});
  getResearchStatsSpy.mockResolvedValue({});
  getDocumentStatsSpy.mockResolvedValue({});

  // System prompt stubs: tag output with agent key so `generateTextMock` can
  // disambiguate the call.
  buildCROSystemPromptSpy.mockReturnValue("cro-system-prompt");
  buildCOOSystemPromptSpy.mockReturnValue("coo-system-prompt");
  buildCNOSystemPromptSpy.mockReturnValue("cno-system-prompt");
  buildCIOSystemPromptSpy.mockReturnValue("cio-system-prompt");
  buildCMOSystemPromptSpy.mockReturnValue("cmo-system-prompt");
  buildCPOSystemPromptSpy.mockReturnValue("cpo-system-prompt");
  buildCFOSystemPromptSpy.mockReturnValue("cfo-system-prompt");
  buildCROToolsSpy.mockReturnValue({});
  buildCOOToolsSpy.mockReturnValue({});
  buildCNOToolsSpy.mockReturnValue({});
  buildCIOToolsSpy.mockReturnValue({});
  buildCMOToolsSpy.mockReturnValue({});
  buildCPOToolsSpy.mockReturnValue({});
  buildCFOToolsSpy.mockReturnValue({});

  // Supabase: stubbed chain that returns `.select(...).eq(...).gte(...)...`
  // as no-ops; our tests never actually engage CPO / CFO so this stays inert.
  supabaseFromSpy.mockReturnValue({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({ limit: () => ({ data: [], error: null }) }),
        }),
      }),
    }),
  });

  // Dispatch-row spies. Each insert returns a unique id; mark_running records
  // the wall-clock it was called so the concurrency test can inspect spread.
  let nextId = 1;
  insertQueuedSpy.mockImplementation(async (...args: unknown[]) => {
    const agent = args[2] as string;
    return `disp-${agent}-${nextId++}`;
  });
  markRunningSpy.mockImplementation(async (id: string) => {
    markRunningTimestamps[id] = Date.now();
  });
  completeDispatchSpy.mockResolvedValue(undefined);
  failDispatchSpy.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("R3.3 proof — dispatchBatch fans out in parallel", () => {
  it("3-agent batch: inserts 3 queued rows with distinct ids, all three run concurrently, total wall-clock < 900ms for 3×500ms subagents", async () => {
    makeTimedGenerateText({ cro: 500, coo: 500, cio: 500 });

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const started = Date.now();
    const result = (await batchTool.execute(
      tasksWith({
        cro: "Summarise pipeline status",
        coo: "Summarise follow-up cadence",
        cio: "Summarise top 5 researched companies",
      }),
      {
        toolCallId: "tc-1",
        messages: [],
      },
    )) as {
      requestId: string;
      agents: Array<{
        agent: string;
        summary: string;
        tokensUsed: number;
        ok: boolean;
      }>;
    };
    const totalMs = Date.now() - started;

    // --- 1. fan-out: one queued row per present agent, distinct ids. ---
    expect(insertQueuedSpy).toHaveBeenCalledTimes(3);
    const insertedIds = insertQueuedSpy.mock.results.map(
      (r) => r.value as unknown as Promise<string>,
    );
    const resolved = await Promise.all(insertedIds);
    expect(new Set(resolved).size).toBe(3);

    // --- 2. parallel wall-clock. ---
    // 3 × 500ms sequential would be ≥1500ms; 500ms parallel + overhead should
    // comfortably fit under 900ms. We give a generous upper bound to absorb
    // slow-CI variance while still being 40%+ below the sequential floor.
    expect(totalMs).toBeLessThan(900);

    // --- 3. mark_running spread: all three called within 100ms of each other. ---
    const stamps = Object.values(markRunningTimestamps);
    expect(stamps.length).toBe(3);
    const spread = Math.max(...stamps) - Math.min(...stamps);
    expect(spread).toBeLessThan(100);

    // --- 4. every agent completed. ---
    expect(completeDispatchSpy).toHaveBeenCalledTimes(3);
    expect(failDispatchSpy).not.toHaveBeenCalled();
    const completeCalls = completeDispatchSpy.mock.calls as Array<
      [string, string, number]
    >;
    for (const [id, summary, tokens] of completeCalls) {
      expect(id).toMatch(/^disp-[a-z]+-\d+$/);
      expect(summary).toMatch(/compressed report/);
      expect(tokens).toBe(150);
    }

    // --- 5. returned payload shape. ---
    expect(typeof result.requestId).toBe("string");
    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(result.agents).toHaveLength(3);
    for (const a of result.agents) {
      expect(a.ok).toBe(true);
      expect(a.tokensUsed).toBe(150);
      expect(a.summary).toMatch(/compressed report/);
      // Trim applied.
      expect(a.summary.startsWith(" ")).toBe(false);
      expect(a.summary.endsWith(" ")).toBe(false);
    }
    expect(result.agents.map((a) => a.agent).sort()).toEqual(["cio", "coo", "cro"]);

    // Timing observability — log for the commit message / manual inspection.
    console.log(
      `[R3.3 proof] 3 agents total=${totalMs}ms mark_running spread=${spread}ms`,
    );
  });

  it("one-failure isolation: when one subagent throws, the other two still complete and failDispatch fires once", async () => {
    makeTimedGenerateText({ cro: 100, coo: 100, cio: 100 }, "coo");

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const result = (await batchTool.execute(
      tasksWith({
        cro: "Pipeline status",
        coo: "Follow-up cadence",
        cio: "Company research",
      }),
      { toolCallId: "tc-2", messages: [] },
    )) as {
      requestId: string;
      agents: Array<{ agent: string; ok: boolean }>;
    };

    // 3 rows queued.
    expect(insertQueuedSpy).toHaveBeenCalledTimes(3);

    // 2 successes, 1 failure.
    expect(completeDispatchSpy).toHaveBeenCalledTimes(2);
    expect(failDispatchSpy).toHaveBeenCalledTimes(1);

    const okAgents = result.agents.filter((a) => a.ok).map((a) => a.agent);
    const failedAgents = result.agents.filter((a) => !a.ok).map((a) => a.agent);
    expect(okAgents.sort()).toEqual(["cio", "cro"]);
    expect(failedAgents).toEqual(["coo"]);

    // failDispatch carried the error summary.
    const [failedId, failedSummary] = failDispatchSpy.mock.calls[0] as [
      string,
      string,
    ];
    expect(failedId).toMatch(/^disp-coo-/);
    expect(failedSummary).toContain("COO dispatch failed");
    expect(failedSummary).toContain("COO simulated failure");
  });

  it("zod refine gate: a tasks object with only 1 present agent fails schema validation", () => {
    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const oneAgent = batchTool.inputSchema.safeParse({
      tasks: { cro: "Just check the pipeline real quick" },
    });
    expect(oneAgent.success).toBe(false);

    const zeroAgents = batchTool.inputSchema.safeParse({ tasks: {} });
    expect(zeroAgents.success).toBe(false);

    const twoAgents = batchTool.inputSchema.safeParse({
      tasks: {
        cro: "Pipeline status please",
        coo: "Follow-up cadence please",
      },
    });
    expect(twoAgents.success).toBe(true);
  });

  it("requestId is a fresh uuid per batch invocation", async () => {
    makeTimedGenerateText({ cro: 10, coo: 10 });

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const r1 = (await batchTool.execute(
      tasksWith({
        cro: "Pipeline status please",
        coo: "Follow-up cadence please",
      }),
      { toolCallId: "tc-r1", messages: [] },
    )) as { requestId: string };

    const r2 = (await batchTool.execute(
      tasksWith({
        cro: "Pipeline status please",
        coo: "Follow-up cadence please",
      }),
      { toolCallId: "tc-r2", messages: [] },
    )) as { requestId: string };

    expect(r1.requestId).not.toBe(r2.requestId);
    // insertQueuedSpy was called with requestId each time; confirm it matches.
    const calls = insertQueuedSpy.mock.calls as Array<
      [string, string, string, string, string[]]
    >;
    const firstBatch = calls.slice(0, 2).map((c) => c[1]);
    const secondBatch = calls.slice(2, 4).map((c) => c[1]);
    expect(new Set(firstBatch).size).toBe(1);
    expect(new Set(secondBatch).size).toBe(1);
    expect(firstBatch[0]).toBe(r1.requestId);
    expect(secondBatch[0]).toBe(r2.requestId);
  });

  it("insertQueuedDispatch is called with (userId, requestId, agent, task, []) in the correct order", async () => {
    makeTimedGenerateText({ cro: 10, cio: 10, cfo: 10 });

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    await batchTool.execute(
      tasksWith({
        cro: "Pipeline summary please",
        cio: "Company research summary please",
        cfo: "Analytics + spend summary please",
      }),
      { toolCallId: "tc-3", messages: [] },
    );

    // Exactly 3 inserts, each with depends_on: [].
    expect(insertQueuedSpy).toHaveBeenCalledTimes(3);
    for (const call of insertQueuedSpy.mock.calls as Array<
      [string, string, string, string, string[]]
    >) {
      const [uid, requestIdArg, agent, task, dependsOn] = call;
      expect(uid).toBe("user-1");
      expect(typeof requestIdArg).toBe("string");
      expect(["cro", "cio", "cfo"]).toContain(agent);
      expect(task.length).toBeGreaterThanOrEqual(8);
      expect(dependsOn).toEqual([]);
    }
  });

  it("markDispatchRunning is fired for every agent before any completeDispatch runs", async () => {
    const order: string[] = [];
    markRunningSpy.mockImplementation(async (id: string) => {
      markRunningTimestamps[id] = Date.now();
      order.push(`run:${id}`);
    });
    completeDispatchSpy.mockImplementation(async (id: string) => {
      order.push(`done:${id}`);
    });
    makeTimedGenerateText({ cro: 80, coo: 80, cio: 80 });

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    await batchTool.execute(
      tasksWith({
        cro: "Pipeline summary please",
        coo: "Follow-up cadence please",
        cio: "Company research summary please",
      }),
      { toolCallId: "tc-4", messages: [] },
    );

    const firstDone = order.findIndex((o) => o.startsWith("done:"));
    const runCountBeforeFirstDone = order
      .slice(0, firstDone)
      .filter((o) => o.startsWith("run:")).length;
    expect(runCountBeforeFirstDone).toBe(3);
  });
});
