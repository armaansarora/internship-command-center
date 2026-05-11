/**
 * PR 3 — Council Table flag-gating proof for the CEO orchestrator.
 *
 * Contract: when `GATE_CONFIG.flags.councilTableEnabled()` returns false,
 * the dossier-emission block inside `dispatchBatch` is a true no-op — no
 * `extractDossierFromDispatch` calls fire, no `insertDossier` writes happen.
 * The orchestrator's public return shape is unchanged.
 *
 * When the flag returns true, every OK dispatch gets exactly one
 * `extractDossierFromDispatch` call followed by exactly one `insertDossier`
 * call. Failed dispatches are skipped because they did not produce a
 * structured recommendation to insert.
 *
 * I/O is mocked aggressively so the test never reaches the SDK or DB.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted spies. Mirrors the existing dispatch-batch proof shape; we add
// `extractDossierSpy`, `insertDossierSpy`, and `councilTableEnabledMock` so
// the flag's value can vary per test.
// ---------------------------------------------------------------------------
const {
  generateTextMock,
  markRunningSpy,
  insertQueuedSpy,
  completeDispatchSpy,
  failDispatchSpy,
  recordAgentRunSpy,
  consumeAiQuotaSpy,
  getUserTierSpy,
  getMemoriesForContextSpy,
  getCachedSystemSpy,
  getAgentModelSpy,
  getActiveModelIdSpy,
  readSharedKnowledgeSpy,
  extractDossierSpy,
  insertDossierSpy,
  councilTableEnabledMock,
  getPipelineStatsRestSpy,
  getDailyBriefingDataSpy,
  getContactStatsSpy,
  getResearchStatsSpy,
  getDocumentStatsSpy,
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
} = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  markRunningSpy: vi.fn(),
  insertQueuedSpy: vi.fn(),
  completeDispatchSpy: vi.fn(),
  failDispatchSpy: vi.fn(),
  recordAgentRunSpy: vi.fn(),
  consumeAiQuotaSpy: vi.fn(),
  getUserTierSpy: vi.fn(),
  getMemoriesForContextSpy: vi.fn(),
  getCachedSystemSpy: vi.fn(),
  getAgentModelSpy: vi.fn(),
  getActiveModelIdSpy: vi.fn(),
  readSharedKnowledgeSpy: vi.fn(),
  extractDossierSpy: vi.fn(),
  insertDossierSpy: vi.fn(),
  councilTableEnabledMock: vi.fn(),
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
}));

// ---------------------------------------------------------------------------
// Module mocks
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

vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: consumeAiQuotaSpy,
}));

vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: getUserTierSpy,
}));

vi.mock("../prompt-cache", () => ({
  getCachedSystem: getCachedSystemSpy,
  buildCachedSystemMessages: (s: string) => [{ role: "system", content: s }],
}));

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

vi.mock("@/lib/db/queries/handoff-dossiers-rest", () => ({
  insertDossier: insertDossierSpy,
}));

vi.mock("./dossier-extractor", () => ({
  extractDossierFromDispatch: extractDossierSpy,
}));

// Mock GATE_CONFIG so we can flip the flag mid-test without touching env vars.
vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      councilTableEnabled: councilTableEnabledMock,
    },
  },
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

vi.mock("@/lib/agents/cro/system-prompt", () => ({
  buildCROSystemPrompt: buildCROSystemPromptSpy,
}));
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

// Import after mocks.
const { buildDispatchBatchTool } = await import("./ceo-orchestrator");

interface ToolWithExecute {
  execute: (args: unknown, opts?: unknown) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// beforeEach: sane defaults. Flag starts OFF — each test opts in explicitly.
// ---------------------------------------------------------------------------
beforeEach(() => {
  generateTextMock.mockReset();
  markRunningSpy.mockReset();
  insertQueuedSpy.mockReset();
  completeDispatchSpy.mockReset();
  failDispatchSpy.mockReset();
  recordAgentRunSpy.mockReset();
  consumeAiQuotaSpy.mockReset();
  getUserTierSpy.mockReset();
  getMemoriesForContextSpy.mockReset();
  getCachedSystemSpy.mockReset();
  getAgentModelSpy.mockReset();
  getActiveModelIdSpy.mockReset();
  readSharedKnowledgeSpy.mockReset();
  extractDossierSpy.mockReset();
  insertDossierSpy.mockReset();
  councilTableEnabledMock.mockReset();
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

  getAgentModelSpy.mockReturnValue({ modelId: "mock" });
  getActiveModelIdSpy.mockReturnValue("mock");
  getCachedSystemSpy.mockImplementation((s: string) => s);
  getMemoriesForContextSpy.mockResolvedValue([]);
  recordAgentRunSpy.mockResolvedValue(undefined);
  getUserTierSpy.mockResolvedValue("free");
  consumeAiQuotaSpy.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
  readSharedKnowledgeSpy.mockResolvedValue({});

  getPipelineStatsRestSpy.mockResolvedValue({});
  getDailyBriefingDataSpy.mockResolvedValue({});
  getContactStatsSpy.mockResolvedValue({});
  getResearchStatsSpy.mockResolvedValue({});
  getDocumentStatsSpy.mockResolvedValue({});

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

  supabaseFromSpy.mockReturnValue({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({ limit: () => ({ data: [], error: null }) }),
        }),
      }),
    }),
  });

  let nextId = 1;
  insertQueuedSpy.mockImplementation(async (...args: unknown[]) => {
    const agent = args[2] as string;
    return `disp-${agent}-${nextId++}`;
  });
  markRunningSpy.mockResolvedValue(undefined);
  completeDispatchSpy.mockResolvedValue(undefined);
  failDispatchSpy.mockResolvedValue(undefined);

  // Generic generateText: tag returns by agent so the orchestrator's per-agent
  // routing in production is exercised. 20ms sleep keeps the test fast.
  generateTextMock.mockImplementation(
    async (args: { messages?: Array<{ role: string; content: string }> }) => {
      const system = (args.messages ?? [])
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n");
      const agent = ["cro", "coo", "cio", "cno", "cmo", "cpo", "cfo"].find(
        (k) => system.includes(`${k}-system-prompt`),
      ) ?? "cro";
      await new Promise((r) => setTimeout(r, 20));
      return {
        text: `${agent.toUpperCase()} compressed report.`,
        usage: { inputTokens: 100, outputTokens: 50 },
      };
    },
  );

  // Default extractor — happy-path dossier.
  extractDossierSpy.mockImplementation(
    async (input: { userId: string; requestId: string; dispatch: { agent: string; id: string } }) => ({
      userId: input.userId,
      requestId: input.requestId,
      dispatchId: input.dispatch.id,
      owner: input.dispatch.agent,
      task: "echo",
      recommendation: "Recommend X",
      proposedAction: "Do X",
      permissionNeeded: "none" as const,
      confidence: 80,
      evidence: [],
      openQuestions: [],
      disagreement: null,
    }),
  );
  insertDossierSpy.mockResolvedValue("dossier-id-1");
});

describe("PR 3 — dossier emission flag-gating", () => {
  it("flag OFF: no extractDossier or insertDossier calls fire — orchestrator is a true no-op", async () => {
    councilTableEnabledMock.mockReturnValue(false);

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const result = (await batchTool.execute(
      {
        tasks: {
          cro: "Pipeline status please",
          coo: "Follow-up cadence please",
        },
      },
      { toolCallId: "tc-flag-off", messages: [] },
    )) as { requestId: string; agents: Array<{ ok: boolean }> };

    // Original orchestrator behavior unchanged.
    expect(result.agents).toHaveLength(2);
    for (const a of result.agents) {
      expect(a.ok).toBe(true);
    }

    // The dossier code path was never touched.
    expect(extractDossierSpy).not.toHaveBeenCalled();
    expect(insertDossierSpy).not.toHaveBeenCalled();
    // Flag-gate was consulted.
    expect(councilTableEnabledMock).toHaveBeenCalled();
  });

  it("flag ON: every OK dispatch produces exactly one extractDossier + insertDossier call", async () => {
    councilTableEnabledMock.mockReturnValue(true);

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const result = (await batchTool.execute(
      {
        tasks: {
          cro: "Pipeline status please",
          coo: "Follow-up cadence please",
          cio: "Company research please",
        },
      },
      { toolCallId: "tc-flag-on", messages: [] },
    )) as { requestId: string; agents: Array<{ agent: string; ok: boolean }> };

    expect(result.agents).toHaveLength(3);

    // One extract + one insert per OK dispatch.
    expect(extractDossierSpy).toHaveBeenCalledTimes(3);
    expect(insertDossierSpy).toHaveBeenCalledTimes(3);

    // Each extract was handed the requestId and the agent code matches.
    const extractCalls = extractDossierSpy.mock.calls as Array<
      [{ userId: string; requestId: string; dispatch: { agent: string } }]
    >;
    for (const [arg] of extractCalls) {
      expect(arg.userId).toBe("user-1");
      expect(arg.requestId).toBe(result.requestId);
      expect(["cro", "coo", "cio"]).toContain(arg.dispatch.agent);
    }
  });

  it("flag ON + extractor returns null: no insertDossier call for that agent — empty summaries are skipped silently", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    extractDossierSpy.mockResolvedValueOnce(null);
    extractDossierSpy.mockResolvedValueOnce({
      userId: "user-1",
      requestId: "any",
      dispatchId: "any",
      owner: "coo",
      task: "echo",
      recommendation: "x",
      proposedAction: "x",
      permissionNeeded: "none",
      confidence: null,
      evidence: [],
      openQuestions: [],
      disagreement: null,
    });

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    await batchTool.execute(
      {
        tasks: {
          cro: "Pipeline status please",
          coo: "Follow-up cadence please",
        },
      },
      { toolCallId: "tc-flag-null", messages: [] },
    );

    expect(extractDossierSpy).toHaveBeenCalledTimes(2);
    expect(insertDossierSpy).toHaveBeenCalledTimes(1);
  });

  it("flag ON + extractor throws: the orchestrator return is unaffected, error is swallowed", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    extractDossierSpy.mockRejectedValue(new Error("extractor blew up"));

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const result = (await batchTool.execute(
      {
        tasks: {
          cro: "Pipeline status please",
          coo: "Follow-up cadence please",
        },
      },
      { toolCallId: "tc-flag-throw", messages: [] },
    )) as { requestId: string; agents: Array<{ ok: boolean }> };

    // CEO's experience is unchanged — both dispatches still report OK.
    expect(result.agents).toHaveLength(2);
    for (const a of result.agents) {
      expect(a.ok).toBe(true);
    }
    // insertDossier never ran (extractor threw before reaching it).
    expect(insertDossierSpy).not.toHaveBeenCalled();
  });

  it("flag ON + insertDossier throws: still does not break orchestrator return", async () => {
    councilTableEnabledMock.mockReturnValue(true);
    insertDossierSpy.mockRejectedValue(new Error("insert blew up"));

    const batchTool = buildDispatchBatchTool(
      "user-1",
      "Armaan",
    ) as unknown as ToolWithExecute;

    const result = (await batchTool.execute(
      {
        tasks: {
          cro: "Pipeline status please",
          coo: "Follow-up cadence please",
        },
      },
      { toolCallId: "tc-flag-insert-throw", messages: [] },
    )) as { requestId: string; agents: Array<{ ok: boolean }> };

    expect(result.agents).toHaveLength(2);
    for (const a of result.agents) {
      expect(a.ok).toBe(true);
    }
    expect(extractDossierSpy).toHaveBeenCalledTimes(2);
    // Both inserts attempted, both threw — orchestrator absorbed the errors.
    expect(insertDossierSpy).toHaveBeenCalledTimes(2);
  });
});
