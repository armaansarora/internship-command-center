import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — the integration test exercises the orchestration graph without
// hitting real Supabase, OpenAI, or Resend.
// ---------------------------------------------------------------------------

const supabaseMock = vi.hoisted(() => {
  // Hand-written builder that mimics the chains we actually use.
  const inserted: Record<string, unknown[]> = {
    documents: [],
    outreach_queue: [],
    agent_memory: [],
  };

  function tableBuilder(table: string) {
    const ctx: { inserted?: Record<string, unknown> } = {};
    return {
      select() {
        return {
          eq() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data:
                      table === "applications"
                        ? {
                            id: "app-1",
                            role: "Software Engineer Intern",
                            company_name: "Stripe",
                            notes: "Stripe Payments Infra Intern — NYC.",
                            contact_id: null,
                          }
                        : null,
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
      insert(payload: Record<string, unknown>) {
        ctx.inserted = payload;
        return {
          select() {
            return {
              single: async () => {
                const id = `${table}-${(inserted[table]?.length ?? 0) + 1}`;
                inserted[table] = [
                  ...(inserted[table] ?? []),
                  { id, ...payload },
                ];
                return {
                  data: { id, version: 1, embedding: null, updated_at: new Date().toISOString() },
                  error: null,
                };
              },
            };
          },
        };
      },
      delete() {
        return {
          eq() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      like: async () => ({ data: null, error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
  }
  return { inserted, tableBuilder };
});

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: async () => ({
      from: (table: string) => supabaseMock.tableBuilder(table),
    }),
    requireUser: async () => ({ id: "user-test" }),
  };
});

vi.mock("@/lib/ai/structured/tailored-resume", () => {
  return {
    generateStructuredTailoredResume: vi.fn(async () => ({
      resume: { tailoring_notes: "led with payment specifics." },
      markdown: "# Tailored resume\n\nStub content.",
    })),
  };
});

vi.mock("@/lib/ai/structured/cover-letter", () => {
  return {
    generateStructuredCoverLetter: vi.fn(async () => ({
      letter: { tone_notes: "formal" },
      markdown: "Dear Hiring Team,\n\nStub cover letter.",
    })),
  };
});

vi.mock("@/lib/db/queries/agent-memory-rest", () => {
  return {
    storeAgentMemory: vi.fn(async () => ({
      id: "mem-1",
      userId: "user-test",
      agent: "cro",
      category: "pattern",
      content: "stub",
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: "",
      updatedAt: "",
      importance: "0.80",
    })),
  };
});

describe("executeNorthStar — integration", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "test" });
    supabaseMock.inserted.documents = [];
    supabaseMock.inserted.outreach_queue = [];
    supabaseMock.inserted.agent_memory = [];
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
    vi.clearAllMocks();
  });

  it("runs resume → letter → outreach → memory and reports ok for all steps", async () => {
    const { executeNorthStar } = await import("./north-star");

    const result = await executeNorthStar("user-test", {
      applicationId: "app-1",
      masterResume:
        "Jane Doe\nSoftware Engineer at FintechCo. Ruby, Go, Postgres.\nB.S. CS, NYU 2024.",
      tone: "formal",
    });

    expect(result.ok).toBe(true);
    expect(result.applicationId).toBe("app-1");
    expect(result.role).toBe("Software Engineer Intern");
    expect(result.companyName).toBe("Stripe");
    expect(result.resumeDocumentId).toMatch(/^documents-/);
    expect(result.coverLetterDocumentId).toMatch(/^documents-/);
    expect(result.outreachQueueId).toMatch(/^outreach_queue-/);

    // Every step landed ok.
    const okSteps = result.steps.filter((s) => s.ok);
    expect(okSteps.map((s) => s.step).sort()).toEqual(
      ["coverLetter", "memory", "outreachDraft", "resume"].sort()
    );

    // Two documents (resume + letter), one outreach_queue row.
    expect(supabaseMock.inserted.documents.length).toBe(2);
    expect(supabaseMock.inserted.outreach_queue.length).toBe(1);
    const outreachRow = supabaseMock.inserted.outreach_queue[0] as Record<
      string,
      unknown
    >;
    expect(outreachRow.type).toBe("cold_email");
    expect(outreachRow.status).toBe("pending_approval");
    expect(outreachRow.generated_by).toBe("ceo-north-star");
  });

  it("reports failure gracefully when the tailored-resume generator returns null", async () => {
    const { generateStructuredTailoredResume } = await import(
      "@/lib/ai/structured/tailored-resume"
    );
    (
      generateStructuredTailoredResume as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const { executeNorthStar } = await import("./north-star");

    const result = await executeNorthStar("user-test", {
      applicationId: "app-1",
      masterResume: "stub master",
    });

    expect(result.ok).toBe(false);
    const resumeStep = result.steps.find((s) => s.step === "resume");
    expect(resumeStep?.ok).toBe(false);
    // The cover letter + outreach still run — degradation is per-step, not fatal.
    expect(
      result.steps.find((s) => s.step === "coverLetter")?.ok
    ).toBe(true);
    expect(
      result.steps.find((s) => s.step === "outreachDraft")?.ok
    ).toBe(true);
  });
});
