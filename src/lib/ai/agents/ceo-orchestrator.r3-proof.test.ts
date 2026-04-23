import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * R3.12 — The R3 Proof-line canary.
 *
 * One integration-style test that stitches the full R3 proof into a single
 * cohesive statement. If parallel fan-out, dispatch-row writing, or
 * shared-knowledge threading regress, THIS test fails first.
 *
 * Proof line (from roadmap §7):
 *   "Ringing the bell with 'How's everything looking?' triggers ≥3
 *    departments to dispatch visibly in parallel. Total bell-to-briefing
 *    time is modest and felt as work being done. /-injecting mid-dispatch
 *    adapts the plan. ≥3 threshold triggers fire autonomously across an
 *    extended test. CEO's briefing references a learning first captured by
 *    a sibling agent."
 *
 * What this canary exercises end-to-end:
 *   1. `dispatchBatch` fans ≥3 named agents out in parallel.
 *   2. Each agent writes one `agent_dispatches` row with a shared requestId.
 *   3. All three are marked running within a tight window (overlapping
 *      started_at, not sequential).
 *   4. All three complete — none fall over.
 *   5. The CRO's captured system prompt contains a CIO-written shared-
 *      knowledge entry, threaded through via `readSharedKnowledge`.
 *   6. The batch returns a fresh UUID requestId and one ok:true entry per
 *      named agent.
 *
 * The R3.3 scaffold (dispatchBatch timing) and the R3.9 scaffold (shared-
 * knowledge prompt capture) each cover half of this. R3.12 consolidates
 * both into a single failing-if-any-piece-regresses test.
 *
 * We mock every I/O boundary so the test runs in milliseconds and measures
 * only the orchestration layer — never the real SDK or real DB.
 */

// ---------------------------------------------------------------------------
// Hoisted spies — must be declared in vi.hoisted so vi.mock factories can
// reference them. Mirrors the R3.3 + R3.9 shapes.
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
  readSharedKnowledgeSpy,
  // per-agent stat loaders — return shapes are irrelevant because the real
  // buildCROSystemPrompt is the only builder we let run unmocked, and we
  // feed it a valid PipelineStats shape below.
  getPipelineStatsRestSpy,
  getDailyBriefingDataSpy,
  getContactStatsSpy,
  getResearchStatsSpy,
  getDocumentStatsSpy,
  // per-agent system prompt + tools stubs — CRO keeps the real prompt
  // builder so the CROSS-AGENT INTEL block actually renders end-to-end.
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
    readSharedKnowledgeSpy: vi.fn(),
    getPipelineStatsRestSpy: vi.fn(),
    getDailyBriefingDataSpy: vi.fn(),
    getContactStatsSpy: vi.fn(),
    getResearchStatsSpy: vi.fn(),
    getDocumentStatsSpy: vi.fn(),
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
// Module mocks — `ai.generateText` is replaced; `tool` / `stepCountIs` keep
// their real behavior so the orchestrator's tool wiring is exercised.
// ---------------------------------------------------------------------------
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: generateTextMock };
});

vi.mock("../model", () => ({
  getAgentModel: getAgentModelSpy,
  getActiveModelId: getActiveModelIdSpy,
}));

vi.mock("../telemetry", () => ({ recordAgentRun: recordAgentRunSpy }));

vi.mock("../prompt-cache", () => ({ getCachedSystem: getCachedSystemSpy }));

vi.mock("@/lib/db/queries/agent-memory-rest", () => ({
  getMemoriesForContext: getMemoriesForContextSpy,
}));

vi.mock("@/lib/db/queries/agent-dispatches-rest", () => ({
  insertQueuedDispatch: insertQueuedSpy,
  markDispatchRunning: markRunningSpy,
  completeDispatch: completeDispatchSpy,
  failDispatch: failDispatchSpy,
}));

vi.mock("@/lib/db/queries/shared-knowledge-rest", () => ({
  readSharedKnowledge: readSharedKnowledgeSpy,
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: supabaseFromSpy }),
}));

// NB: `@/lib/agents/cro/system-prompt` is NOT mocked — the real
// buildCROSystemPrompt runs so the CROSS-AGENT INTEL block actually
// renders into the captured prompt. Every other persona builder is stubbed
// because only CRO's prompt content is what this canary inspects.
vi.mock("@/lib/agents/cro/tools", () => ({ buildCROTools: buildCROToolsSpy }));

vi.mock("@/lib/agents/coo/system-prompt", () => ({
  buildCOOSystemPrompt: buildCOOSystemPromptSpy,
}));
vi.mock("@/lib/agents/coo/tools", () => ({ buildCOOTools: buildCOOToolsSpy }));

vi.mock("@/lib/agents/cno/system-prompt", () => ({
  buildCNOSystemPrompt: buildCNOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cno/tools", () => ({ buildCNOTools: buildCNOToolsSpy }));

vi.mock("@/lib/agents/cio/system-prompt", () => ({
  buildCIOSystemPrompt: buildCIOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cio/tools", () => ({ buildCIOTools: buildCIOToolsSpy }));

vi.mock("@/lib/agents/cmo/system-prompt", () => ({
  buildCMOSystemPrompt: buildCMOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cmo/tools", () => ({ buildCMOTools: buildCMOToolsSpy }));

vi.mock("@/lib/agents/cpo/system-prompt", () => ({
  buildCPOSystemPrompt: buildCPOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cpo/tools", () => ({ buildCPOTools: buildCPOToolsSpy }));

vi.mock("@/lib/agents/cfo/system-prompt", () => ({
  buildCFOSystemPrompt: buildCFOSystemPromptSpy,
}));
vi.mock("@/lib/agents/cfo/tools", () => ({ buildCFOTools: buildCFOToolsSpy }));

// Import after every mock is registered.
const { buildDispatchBatchTool } = await import("./ceo-orchestrator");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ToolWithExecute {
  execute: (args: unknown, opts?: unknown) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// beforeEach: wire sane defaults on every spy
// ---------------------------------------------------------------------------
beforeEach(() => {
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
  readSharedKnowledgeSpy.mockReset();
  getPipelineStatsRestSpy.mockReset();
  getDailyBriefingDataSpy.mockReset();
  getContactStatsSpy.mockReset();
  getResearchStatsSpy.mockReset();
  getDocumentStatsSpy.mockReset();
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

  getAgentModelSpy.mockReturnValue({ modelId: "mock" });
  getActiveModelIdSpy.mockReturnValue("mock");
  // Pass-through cache so the CRO's rendered prompt flows through intact.
  getCachedSystemSpy.mockImplementation((s: string) => s);
  getMemoriesForContextSpy.mockResolvedValue([]);
  recordAgentRunSpy.mockResolvedValue(undefined);

  // CRO's real builder expects a PipelineStats-shaped object.
  getPipelineStatsRestSpy.mockResolvedValue({
    total: 10,
    byStatus: { applied: 5, screening: 3, interview: 2 },
    appliedToScreeningRate: 60,
    screeningToInterviewRate: 66.7,
    interviewToOfferRate: 0,
    staleCount: 1,
    warmCount: 2,
  });
  getDailyBriefingDataSpy.mockResolvedValue({});
  getContactStatsSpy.mockResolvedValue({});
  getResearchStatsSpy.mockResolvedValue({});
  getDocumentStatsSpy.mockResolvedValue({});

  // Tag each non-CRO system prompt with the agent key so generateTextMock
  // can route the right delay + fake response by inspection.
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

  supabaseFromSpy.mockReturnValue({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({ limit: () => ({ data: [], error: null }) }),
        }),
      }),
    }),
  });

  // Dispatch-row spies. Each insert returns a unique agent-tagged id so the
  // fan-out timing assertions can tell the three apart.
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
// The canary
// ---------------------------------------------------------------------------
describe("R3 Proof — bell-ring end-to-end", () => {
  it("fans out 3+ agents in parallel AND threads sibling intel into the CRO system prompt", async () => {
    // ── 1. Prime the shared-knowledge bus with a CIO-written entry. ──
    // This is the "learning first captured by a sibling agent" from the proof
    // line. When the CRO is dispatched, the orchestrator reads this entry and
    // the real buildCROSystemPrompt appends a CROSS-AGENT INTEL block.
    readSharedKnowledgeSpy.mockImplementation(
      async (_userId: string, excludeAgent?: string) => {
        // Self-echo guard: orchestrator must exclude the dispatching agent.
        if (excludeAgent === "cro") {
          return {
            "cio:company:acme:intel": {
              value:
                "Culture: Engineering-led, hands-off managers. Recent: Layoffs announced 4/20.",
              writtenAt: "2026-04-20T10:00:00.000Z",
              writtenBy: "cio",
            },
          };
        }
        // COO + CIO themselves get an empty bus — we only care that the
        // CRO's prompt is the one carrying the threaded intel.
        return {};
      },
    );

    // ── 2. Capture the system prompt each agent saw, and stall enough per-
    //      call so the three LLM calls overlap wall-clock. 500ms each:
    //      sequential would be 1500ms+, parallel should land well under. ──
    const capturedSystems: Record<string, string> = {};
    generateTextMock.mockImplementation(
      async ({ system }: { system: string }) => {
        // Non-CRO stubs tag their prompt with "<agent>-system-prompt".
        // The real CRO prompt starts with the CRO_IDENTITY block.
        const agent = system.startsWith("coo-")
          ? "coo"
          : system.startsWith("cio-")
            ? "cio"
            : "cro";
        capturedSystems[agent] = system;
        await new Promise((r) => setTimeout(r, 500));
        return {
          text: `  ${agent.toUpperCase()} compressed report.  `,
          usage: { inputTokens: 100, outputTokens: 50 },
        };
      },
    );

    // ── 3. Ring the bell with a ≥3-agent dispatchBatch — the roadmap's
    //      "How's everything looking?" intent, fanning to CRO + COO + CIO. ──
    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const started = Date.now();
    const result = (await batchTool.execute(
      {
        tasks: {
          cro: "Give me the current pipeline + any peer intel you've been handed",
          coo: "What's on the calendar and what follow-ups are overdue",
          cio: "Any fresh company research on the pipeline's top names",
        },
      },
      { toolCallId: "tc-r3-proof", messages: [] },
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

    // ── 4. Parallel fan-out proof — the "visibly in parallel" half. ──

    // (a) 3 agent-dispatches rows were queued under one requestId.
    expect(insertQueuedSpy).toHaveBeenCalledTimes(3);
    const insertCalls = insertQueuedSpy.mock.calls as Array<
      [string, string, string, string, string[]]
    >;
    const requestIds = new Set(insertCalls.map((c) => c[1]));
    expect(requestIds.size).toBe(1);
    expect([...requestIds][0]).toBe(result.requestId);
    expect(insertCalls.map((c) => c[2]).sort()).toEqual(["cio", "coo", "cro"]);

    // (b) All 3 generateText calls fired (one per subagent).
    expect(generateTextMock).toHaveBeenCalledTimes(3);

    // (c) All 3 were marked running within 100ms of each other — overlapping
    //     started_at, not sequential.
    const stamps = Object.values(markRunningTimestamps);
    expect(stamps.length).toBe(3);
    const spread = Math.max(...stamps) - Math.min(...stamps);
    expect(spread).toBeLessThan(100);

    // (d) Total wall-clock < 900ms for 3×500ms subagents = true parallelism.
    //     Sequential would be ≥1500ms.
    expect(totalMs).toBeLessThan(900);

    // (e) All 3 completed cleanly — no failDispatch.
    expect(completeDispatchSpy).toHaveBeenCalledTimes(3);
    expect(failDispatchSpy).not.toHaveBeenCalled();

    // ── 5. Sibling-intel threading proof — the "CEO's briefing references a
    //      learning first captured by a sibling agent" half. ──

    // (a) readSharedKnowledge was called for each subagent with its own key
    //     as the exclude arg (self-echo guard).
    expect(readSharedKnowledgeSpy).toHaveBeenCalledTimes(3);
    const excludeArgs = (
      readSharedKnowledgeSpy.mock.calls as Array<[string, string]>
    ).map((c) => c[1]);
    expect(excludeArgs.sort()).toEqual(["cio", "coo", "cro"]);

    // (b) The CRO's captured system prompt carries the CIO's intel verbatim.
    //     This is the end-to-end proof: CIO wrote → bus persisted → CRO
    //     dispatch read → builder rendered → LLM saw.
    const croPrompt = capturedSystems.cro;
    expect(croPrompt).toBeDefined();
    expect(croPrompt).toContain("CROSS-AGENT INTEL");
    expect(croPrompt).toContain("[CIO]");
    expect(croPrompt).toContain("Layoffs announced 4/20");
    expect(croPrompt).toContain("Engineering-led");

    // ── 6. Return-shape proof — UUID requestId and 3 ok:true entries. ──
    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(result.agents).toHaveLength(3);
    expect(result.agents.map((a) => a.agent).sort()).toEqual([
      "cio",
      "coo",
      "cro",
    ]);
    for (const a of result.agents) {
      expect(a.ok).toBe(true);
      expect(a.tokensUsed).toBe(150);
      // summary was trimmed of the mock's surrounding whitespace.
      expect(a.summary.startsWith(" ")).toBe(false);
      expect(a.summary.endsWith(" ")).toBe(false);
      expect(a.summary).toMatch(/compressed report/);
    }
  });
});
