/**
 * Dossier extractor unit tests.
 *
 * Cover the two branches the orchestrator depends on:
 *   1. Happy path — `generateObject` returns a valid object that maps cleanly
 *      to a `HandoffDossierInput` payload the REST `insertDossier` consumes.
 *   2. Fallback — the LLM call throws or returns an invalid object; we still
 *      produce a deterministic dossier built from the raw summary so the
 *      Council Table never goes empty on a real dispatch.
 *
 * We mock `ai.generateObject` and `getAgentModel` so the test runs in
 * milliseconds without any provider calls.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("../model", () => ({
  getAgentModel: () => ({ provider: "mock-model" }),
}));

// Logger pokes env.ts on warn paths — mock to a no-op so the fallback branch
// doesn't trip env validation in test runs.
vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  extractDossierFromDispatch,
  DossierExtractionSchema,
} from "./dossier-extractor";
import type { Row } from "@/db/database.types";

// ---------------------------------------------------------------------------
// Fixture — a minimal completed dispatch row. Only the fields the extractor
// reads are populated; the rest stay null/undefined-safe.
// ---------------------------------------------------------------------------
function fixtureDispatch(
  overrides: Partial<Row<"agent_dispatches">> = {},
): Row<"agent_dispatches"> {
  return {
    id: "disp-cro-1",
    user_id: "user-1",
    request_id: "req-1",
    parent_dispatch_id: null,
    agent: "cro",
    depends_on: [],
    task: "Summarise the current pipeline and recommend the highest-ROI follow-up.",
    status: "completed",
    summary:
      "Pipeline shows 14 active applications. Top-priority follow-up: Stripe (interview scheduled 5/15, no thank-you sent). Recommend drafting a thank-you note tonight to keep momentum.",
    tokens_used: 220,
    started_at: "2026-05-10T10:00:00.000Z",
    completed_at: "2026-05-10T10:00:15.000Z",
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:15.000Z",
    ...overrides,
  } as Row<"agent_dispatches">;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractDossierFromDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — maps a valid generateObject response into snake_case HandoffDossierInput", async () => {
    const modelObject = {
      task: "Summarise the current pipeline and recommend the highest-ROI follow-up.",
      recommendation:
        "Send a thank-you to Stripe tonight before the 5/15 interview to keep momentum.",
      proposedAction:
        "Draft a 3-sentence thank-you note to the Stripe recruiter and queue it for review.",
      permissionNeeded: "draft" as const,
      confidence: 78,
      evidence: [
        {
          kind: "application",
          id: "app-stripe-001",
          summary: "Stripe interview scheduled 5/15, no thank-you sent yet.",
        },
      ],
      openQuestions: ["Should I cc the hiring manager?"],
      disagreement: null,
    };

    generateObjectMock.mockResolvedValue({ object: modelObject });

    const result = await extractDossierFromDispatch({
      userId: "user-1",
      requestId: "req-1",
      dispatch: fixtureDispatch(),
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
    expect(result!.requestId).toBe("req-1");
    expect(result!.dispatchId).toBe("disp-cro-1");
    expect(result!.owner).toBe("cro");
    expect(result!.recommendation).toBe(modelObject.recommendation);
    expect(result!.proposedAction).toBe(modelObject.proposedAction);
    expect(result!.permissionNeeded).toBe("draft");
    expect(result!.confidence).toBe(78);
    const evidence = result!.evidence as Array<{ kind: string }>;
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.kind).toBe("application");
    expect(result!.openQuestions).toEqual(["Should I cc the hiring manager?"]);
    expect(result!.disagreement).toBeNull();
    expect(result!.task).toBe(modelObject.task);

    // The model was invoked with the dossier max-output budget.
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateObjectMock.mock.calls[0]?.[0] as {
      maxOutputTokens?: number;
      system?: string;
      prompt?: string;
    };
    expect(callArgs.maxOutputTokens).toBe(500);
    expect(callArgs.system).toContain("Council Table dossier writer");
    expect(callArgs.prompt).toContain("disp-cro-1");
    expect(callArgs.prompt).toContain("cro");
  });

  it("fallback path — generateObject throws, returns a deterministic dossier from the raw summary", async () => {
    generateObjectMock.mockRejectedValue(new Error("model timeout"));

    const dispatch = fixtureDispatch();
    const result = await extractDossierFromDispatch({
      userId: "user-1",
      requestId: "req-1",
      dispatch,
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
    expect(result!.requestId).toBe("req-1");
    expect(result!.dispatchId).toBe("disp-cro-1");
    expect(result!.owner).toBe("cro");
    // Recommendation derived from summary slice(0,240).
    expect(result!.recommendation).toBe(
      dispatch.summary!.slice(0, 240),
    );
    expect(result!.proposedAction).toBe(result!.recommendation);
    expect(result!.permissionNeeded).toBe("none");
    expect(result!.confidence).toBeNull();
    // Synthetic evidence floor: even when the extractor fails, we cite
    // the source dispatch so the Council Table never renders a dossier
    // without a thread the user can pull on.
    expect(result!.evidence).toHaveLength(1);
    expect(result!.evidence?.[0]).toMatchObject({
      kind: "dispatch_summary",
      id: dispatch.id,
    });
    expect(result!.openQuestions).toEqual([]);
    expect(result!.disagreement).toBeNull();
    expect(result!.task).toBe(dispatch.task);
  });

  it("fallback path — generateObject returns shape that fails schema validation, still produces deterministic dossier", async () => {
    // Missing required `recommendation` — schema parse will throw.
    generateObjectMock.mockResolvedValue({
      object: {
        proposedAction: "Do the thing",
        // recommendation: missing
        permissionNeeded: "none",
        evidence: [],
        openQuestions: [],
        disagreement: null,
      },
    });

    const result = await extractDossierFromDispatch({
      userId: "user-1",
      requestId: "req-1",
      dispatch: fixtureDispatch(),
    });

    expect(result).not.toBeNull();
    expect(result!.permissionNeeded).toBe("none");
    expect(result!.confidence).toBeNull();
    // Synthetic-evidence floor (see prior test).
    expect(result!.evidence).toHaveLength(1);
    expect(result!.evidence?.[0]).toMatchObject({ kind: "dispatch_summary" });
  });

  it("returns null when the dispatch has an empty summary — nothing to extract", async () => {
    const result = await extractDossierFromDispatch({
      userId: "user-1",
      requestId: "req-1",
      dispatch: fixtureDispatch({ summary: "" }),
    });

    expect(result).toBeNull();
    // The model was never called.
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("returns null when the dispatch summary is whitespace-only", async () => {
    const result = await extractDossierFromDispatch({
      userId: "user-1",
      requestId: "req-1",
      dispatch: fixtureDispatch({ summary: "   \n\t  " }),
    });

    expect(result).toBeNull();
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("exports a Zod schema that validates the happy-path shape", () => {
    const parsed = DossierExtractionSchema.safeParse({
      task: "x",
      recommendation: "y",
      proposedAction: "z",
      permissionNeeded: "send",
      confidence: 100,
      evidence: [],
      openQuestions: [],
      disagreement: null,
    });
    expect(parsed.success).toBe(true);
  });
});
