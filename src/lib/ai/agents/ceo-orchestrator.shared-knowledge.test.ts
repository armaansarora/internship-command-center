import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * CIO→CRO shared-knowledge bridge, end-to-end through the orchestrator.
 *
 * Proof goal: when the CEO dispatches the CRO, the CRO's system prompt
 * contains the CIO-written entry that was previously persisted to
 * shared_knowledge. This closes the R3 Proof line:
 *
 *   "CEO's briefing references a learning first captured by a sibling agent."
 *
 * We test the orchestrator layer — not Supabase, not the SDK. `generateText`
 * is stubbed to record the `system` string it was called with; we then
 * assert the captured prompt contains the CROSS-AGENT INTEL block plus the
 * specific CIO entry.
 */

// ---------------------------------------------------------------------------
// Hoisted spies
// ---------------------------------------------------------------------------
const {
  generateTextMock,
  markRunningSpy,
  insertQueuedSpy,
  completeDispatchSpy,
  failDispatchSpy,
  recordAgentRunSpy,
  getMemoriesForContextSpy,
  getCachedSystemSpy,
  getAgentModelSpy,
  getActiveModelIdSpy,
  getPipelineStatsRestSpy,
  getDailyBriefingDataSpy,
  getContactStatsSpy,
  getResearchStatsSpy,
  getDocumentStatsSpy,
  readSharedKnowledgeSpy,
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
  getMemoriesForContextSpy: vi.fn(),
  getCachedSystemSpy: vi.fn(),
  getAgentModelSpy: vi.fn(),
  getActiveModelIdSpy: vi.fn(),
  getPipelineStatsRestSpy: vi.fn(),
  getDailyBriefingDataSpy: vi.fn(),
  getContactStatsSpy: vi.fn(),
  getResearchStatsSpy: vi.fn(),
  getDocumentStatsSpy: vi.fn(),
  readSharedKnowledgeSpy: vi.fn(),
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

// Keep the real buildCROSystemPrompt so the test actually proves the block
// is rendered end-to-end through the orchestrator → builder chain.
// The CRO tools + every other agent's surface area remain stubbed.
vi.mock("@/lib/agents/cro/tools", () => ({ buildCROTools: buildCROToolsSpy }));
vi.mock("@/lib/agents/coo/system-prompt", () => ({
  buildCOOSystemPrompt: () => "coo-system-prompt",
}));
vi.mock("@/lib/agents/coo/tools", () => ({ buildCOOTools: buildCOOToolsSpy }));
vi.mock("@/lib/agents/cno/system-prompt", () => ({
  buildCNOSystemPrompt: () => "cno-system-prompt",
}));
vi.mock("@/lib/agents/cno/tools", () => ({ buildCNOTools: buildCNOToolsSpy }));
vi.mock("@/lib/agents/cio/system-prompt", () => ({
  buildCIOSystemPrompt: () => "cio-system-prompt",
}));
vi.mock("@/lib/agents/cio/tools", () => ({ buildCIOTools: buildCIOToolsSpy }));
vi.mock("@/lib/agents/cmo/system-prompt", () => ({
  buildCMOSystemPrompt: () => "cmo-system-prompt",
}));
vi.mock("@/lib/agents/cmo/tools", () => ({ buildCMOTools: buildCMOToolsSpy }));
vi.mock("@/lib/agents/cpo/system-prompt", () => ({
  buildCPOSystemPrompt: () => "cpo-system-prompt",
}));
vi.mock("@/lib/agents/cpo/tools", () => ({ buildCPOTools: buildCPOToolsSpy }));
vi.mock("@/lib/agents/cfo/system-prompt", () => ({
  buildCFOSystemPrompt: () => "cfo-system-prompt",
}));
vi.mock("@/lib/agents/cfo/tools", () => ({ buildCFOTools: buildCFOToolsSpy }));

const { buildCEODispatchTools } = await import("./ceo-orchestrator");

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
interface ToolWithExecute {
  execute: (args: unknown, opts?: unknown) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// beforeEach: sane defaults
// ---------------------------------------------------------------------------
beforeEach(() => {
  generateTextMock.mockReset();
  markRunningSpy.mockReset();
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
  readSharedKnowledgeSpy.mockReset();
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
  // Pass-through cache so the assertion sees the real prompt.
  getCachedSystemSpy.mockImplementation((s: string) => s);
  getMemoriesForContextSpy.mockResolvedValue([]);
  recordAgentRunSpy.mockResolvedValue(undefined);

  // Real buildCROSystemPrompt consumes this shape — give it a valid stats obj.
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
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("CEO orchestrator — CIO→CRO shared-knowledge round trip (R3.9)", () => {
  it("when readSharedKnowledge returns a CIO entry, the CRO dispatch's system prompt contains CROSS-AGENT INTEL + the CIO intel", async () => {
    // The CIO has left an intel note on the bus.
    readSharedKnowledgeSpy.mockImplementation(
      async (_userId: string, excludeAgent?: string) => {
        // Sanity check: orchestrator excludes self-echo for CRO.
        expect(excludeAgent).toBe("cro");
        return {
          "cio:company:acme-corp:intel": {
            value:
              "Culture: Engineering-led, hands-off managers. Recent: Layoffs announced 4/20.",
            writtenAt: "2026-04-20T10:00:00.000Z",
            writtenBy: "cio",
          },
        };
      },
    );

    // Capture the `system` string generateText was called with — that's what
    // the subagent actually saw.
    let capturedSystem: string | null = null;
    generateTextMock.mockImplementation(async (args: { system: string }) => {
      capturedSystem = args.system;
      return {
        text: "CRO compressed report citing Acme intel.",
        usage: { inputTokens: 100, outputTokens: 50 },
      };
    });

    const tools = buildCEODispatchTools("user-1", "Armaan");
    const croTool = tools.dispatchToCRO as unknown as ToolWithExecute;

    const result = (await croTool.execute(
      { task: "Give me the current pipeline + any peer intel you've been handed" },
      { toolCallId: "tc-r3.9", messages: [] },
    )) as { agent: string; summary: string; ok: boolean };

    // The dispatch itself succeeded.
    expect(result.ok).toBe(true);
    expect(result.agent).toBe("cro");

    // readSharedKnowledge was called with (userId, "cro") — excluding self-echo.
    expect(readSharedKnowledgeSpy).toHaveBeenCalledTimes(1);
    const [uidArg, excludeArg] = readSharedKnowledgeSpy.mock.calls[0] as [
      string,
      string,
    ];
    expect(uidArg).toBe("user-1");
    expect(excludeArg).toBe("cro");

    // The CRO's system prompt contains the block + the CIO's intel.
    expect(capturedSystem).not.toBeNull();
    const prompt: string = capturedSystem as unknown as string;
    expect(prompt).toContain("CROSS-AGENT INTEL");
    expect(prompt).toContain("[CIO]");
    expect(prompt).toContain("Layoffs announced 4/20");
    expect(prompt).toContain("Engineering-led");
  });

  it("when the bus is empty, the CRO system prompt has no CROSS-AGENT INTEL section", async () => {
    readSharedKnowledgeSpy.mockResolvedValue({});

    let capturedSystem: string | null = null;
    generateTextMock.mockImplementation(async (args: { system: string }) => {
      capturedSystem = args.system;
      return {
        text: "CRO compressed report (no peer intel).",
        usage: { inputTokens: 80, outputTokens: 40 },
      };
    });

    const tools = buildCEODispatchTools("user-1", "Armaan");
    const croTool = tools.dispatchToCRO as unknown as ToolWithExecute;

    await croTool.execute(
      { task: "Give me the current pipeline please." },
      { toolCallId: "tc-empty", messages: [] },
    );

    expect(capturedSystem).not.toBeNull();
    const prompt: string = capturedSystem as unknown as string;
    expect(prompt).not.toContain("CROSS-AGENT INTEL");
    expect(prompt).not.toContain("[CIO]");
  });
});
