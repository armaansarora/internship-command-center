/**
 * generateTailoredResume reads from active base_resume by default.
 *
 * Covers three paths:
 *   1. No base resume + no override → success: false, reason: no_base_resume.
 *   2. Base resume exists → tool reads parsed_text + generates tailored output.
 *   3. Explicit masterResume override wins over the stored base.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getActiveBaseResumeMock = vi.fn();
const insertBaseResumeMock = vi.fn();
const probeResumesBucketMock = vi.fn();
vi.mock("@/lib/db/queries/base-resumes-rest", () => ({
  getActiveBaseResume: () => getActiveBaseResumeMock(),
  insertBaseResume: (input: unknown) => insertBaseResumeMock(input),
  probeResumesBucket: () => probeResumesBucketMock(),
}));

const generateStructuredTailoredResumeMock = vi.fn();
vi.mock("@/lib/ai/structured/tailored-resume", () => ({
  generateStructuredTailoredResume: (input: unknown) =>
    generateStructuredTailoredResumeMock(input),
}));

const getTargetProfileMock = vi.fn();
vi.mock("@/lib/agents/cro/target-profile", () => ({
  getTargetProfile: () => getTargetProfileMock(),
}));

// Stub structured cover letter imports (same module file).
vi.mock("@/lib/ai/structured/cover-letter", () => ({
  generateStructuredCoverLetter: vi.fn(),
  generateThreeToneCoverLetters: vi.fn(),
}));

// Supabase server client — we only need the shape for .from(...).eq(...)...
// Provide a minimal chain that returns sensible defaults.
function mkQuery(finalData: unknown, finalError: unknown = null) {
  type Chain = {
    select: (..._args: unknown[]) => Chain;
    eq: (..._args: unknown[]) => Chain;
    ilike: (..._args: unknown[]) => Chain;
    order: (..._args: unknown[]) => Chain;
    limit: (..._args: unknown[]) => Chain;
    single: () => Promise<{ data: unknown; error: unknown }>;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    insert: (..._args: unknown[]) => Chain;
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => void;
  };
  const chain: Chain = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => ({ data: finalData, error: finalError }),
    maybeSingle: async () => ({ data: finalData, error: finalError }),
    insert: () => chain,
    then: (resolve) => resolve({ data: finalData, error: finalError }),
  };
  return chain;
}

const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => fromMock(table),
  }),
}));

import { buildCMOTools } from "../tools";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("R5.5 generateTailoredResume — reads active base_resume", () => {
  const userId = "u-1";

  beforeEach(() => {
    vi.clearAllMocks();
    getTargetProfileMock.mockResolvedValue(null);
    // Default: documents existing + companies lookup return empty/null.
    fromMock.mockImplementation((table: string) => {
      if (table === "documents") {
        return mkQuery([], null);
      }
      if (table === "companies") {
        return mkQuery(null, null);
      }
      return mkQuery(null, null);
    });
    generateStructuredTailoredResumeMock.mockResolvedValue({
      resume: {
        header_name: "Jane Doe",
        header_contact: ["jane@example.com"],
        summary: "Summary text.",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        tailoring_notes: "Emphasized underwriting.",
      },
      markdown: "# Jane Doe\n\nSummary text.",
    });
  });

  it("returns success: false / reason: no_base_resume when nothing is uploaded and no override", async () => {
    getActiveBaseResumeMock.mockResolvedValue(null);
    const tools = buildCMOTools(userId);
    // Cast to executable shape — the AI-SDK `tool` helper wraps execute.
    const tool = tools.generateTailoredResume as unknown as {
      execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
    const result = await tool.execute({
      applicationId: "app-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_base_resume");
    expect(generateStructuredTailoredResumeMock).not.toHaveBeenCalled();
  });

  it("pulls parsed_text from active base resume when no override is provided", async () => {
    getActiveBaseResumeMock.mockResolvedValue({
      id: "r-1",
      storagePath: "u/u-1/base-abc.pdf",
      originalFilename: "resume.pdf",
      fileSizeBytes: 1024,
      parsedText: "Jane Doe — Experience: 3 years at Blackstone Credit. Skills: Python, Argus, DCF modeling.",
      pageCount: 1,
      isActive: true,
      createdAt: "2026-04-23T07:00:00.000Z",
      updatedAt: "2026-04-23T07:00:00.000Z",
    });
    // documents insert must return a created row for the happy path.
    fromMock.mockImplementation((table: string) => {
      if (table === "documents") {
        // listing existing versions first (returns empty array), then insert
        // returning a created row.
        const chain = mkQuery(null, null);
        // Override insert().select().single() to return a real created row.
        chain.insert = () => mkQuery({ id: "doc-1", version: 1 }, null);
        return chain;
      }
      if (table === "companies") return mkQuery(null, null);
      return mkQuery(null, null);
    });

    const tools = buildCMOTools(userId);
    const tool = tools.generateTailoredResume as unknown as {
      execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
    const result = await tool.execute({
      applicationId: "app-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
    });

    expect(getActiveBaseResumeMock).toHaveBeenCalled();
    expect(generateStructuredTailoredResumeMock).toHaveBeenCalled();
    const calledWith = generateStructuredTailoredResumeMock.mock.calls[0][0];
    expect(calledWith.masterResume).toContain("Blackstone Credit");
    expect(result.success).toBe(true);
  });

  it("honors an explicit masterResume override over the stored base resume", async () => {
    getActiveBaseResumeMock.mockResolvedValue({
      id: "r-1",
      storagePath: "u/u-1/base-abc.pdf",
      originalFilename: "resume.pdf",
      fileSizeBytes: 1024,
      parsedText: "STORED: Jane Doe — Blackstone Credit.",
      pageCount: 1,
      isActive: true,
      createdAt: "2026-04-23T07:00:00.000Z",
      updatedAt: "2026-04-23T07:00:00.000Z",
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "documents") {
        const chain = mkQuery(null, null);
        chain.insert = () => mkQuery({ id: "doc-2", version: 1 }, null);
        return chain;
      }
      return mkQuery(null, null);
    });

    const tools = buildCMOTools(userId);
    const tool = tools.generateTailoredResume as unknown as {
      execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
    const longerThan80Chars =
      "OVERRIDE: John Smith — a completely different master resume supplied inline to the tool for a one-off generate.";
    await tool.execute({
      applicationId: "app-1",
      companyName: "Hexspire",
      role: "Analyst Intern",
      masterResume: longerThan80Chars,
    });

    const calledWith = generateStructuredTailoredResumeMock.mock.calls[0][0];
    expect(calledWith.masterResume).toBe(longerThan80Chars);
    expect(calledWith.masterResume).not.toContain("STORED:");
  });
});
