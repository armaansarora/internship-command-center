import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * CIO `updateCompanyIntel` writes to shared_knowledge after a
 * successful Supabase update.
 *
 * Contract under test:
 *   1. On successful updateCompanyResearch → writeSharedKnowledge is called
 *      with (userId, "cio", "company:{companyId}:intel", <summary>).
 *   2. On failed updateCompanyResearch → writeSharedKnowledge is NOT called
 *      (we never broadcast unconfirmed intel).
 *   3. The compactSummary is composed from the non-null updated fields
 *      ("Culture: ...", "Recent: ...", etc.) and is non-empty.
 *   4. Calling the tool with no fields → no Supabase update, no shared write.
 */

// ---------------------------------------------------------------------------
// Hoisted spies
// ---------------------------------------------------------------------------
const {
  updateCompanyResearchSpy,
  writeSharedKnowledgeSpy,
} = vi.hoisted(() => ({
  updateCompanyResearchSpy: vi.fn(),
  writeSharedKnowledgeSpy: vi.fn(),
}));

vi.mock("@/lib/db/queries/companies-rest", () => ({
  // Unused helpers — declare them so the import surface stays satisfied.
  getCompanyById: vi.fn(),
  getCompaniesByUser: vi.fn(),
  getCompaniesForAgent: vi.fn(),
  searchCompaniesByName: vi.fn(),
  updateCompanyResearch: updateCompanyResearchSpy,
}));

vi.mock("@/lib/db/queries/embeddings-rest", () => ({
  findSimilarCompanies: vi.fn(),
  upsertCompanyEmbedding: vi.fn(),
}));

vi.mock("@/lib/db/queries/shared-knowledge-rest", () => ({
  writeSharedKnowledge: writeSharedKnowledgeSpy,
}));

const { makeUpdateCompanyIntelTool } = await import("./tools");

// ---------------------------------------------------------------------------
// Helper: invoke the tool's execute with a minimal fake context.
// ---------------------------------------------------------------------------
interface ToolWithExecute {
  execute: (args: unknown, opts?: unknown) => Promise<unknown>;
}

async function callTool(
  userId: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const tool = makeUpdateCompanyIntelTool(userId) as unknown as ToolWithExecute;
  return tool.execute(input, { toolCallId: "tc-test", messages: [] });
}

beforeEach(() => {
  updateCompanyResearchSpy.mockReset();
  writeSharedKnowledgeSpy.mockReset();
  writeSharedKnowledgeSpy.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("CIO.updateCompanyIntel — shared-knowledge bridge (R3.9)", () => {
  it("on successful Supabase update, writeSharedKnowledge is called with the right namespace + key + summary", async () => {
    updateCompanyResearchSpy.mockResolvedValue({
      success: true,
      message: "Research profile updated.",
    });

    await callTool("user-42", {
      companyId: "co-acme",
      cultureSummary: "Engineering-led, hands-off managers",
      recentNews: "Raised Series C at $4B",
    });

    expect(writeSharedKnowledgeSpy).toHaveBeenCalledTimes(1);
    const [userId, writtenBy, entryKey, summary] =
      writeSharedKnowledgeSpy.mock.calls[0] as [string, string, string, string];
    expect(userId).toBe("user-42");
    expect(writtenBy).toBe("cio");
    expect(entryKey).toBe("company:co-acme:intel");
    expect(summary).toContain("Culture:");
    expect(summary).toContain("Recent:");
    expect(summary).toContain("Engineering-led");
    expect(summary).toContain("Series C");
  });

  it("on failed Supabase update, writeSharedKnowledge is NOT called", async () => {
    updateCompanyResearchSpy.mockResolvedValue({
      success: false,
      message: "Update failed: row not found",
    });

    await callTool("user-42", {
      companyId: "co-ghost",
      cultureSummary: "Will never be persisted",
    });

    expect(updateCompanyResearchSpy).toHaveBeenCalledTimes(1);
    expect(writeSharedKnowledgeSpy).not.toHaveBeenCalled();
  });

  it("when called with no updatable fields, neither Supabase nor shared_knowledge is touched", async () => {
    const result = (await callTool("user-42", {
      companyId: "co-acme",
    })) as { success: boolean };

    expect(result.success).toBe(false);
    expect(updateCompanyResearchSpy).not.toHaveBeenCalled();
    expect(writeSharedKnowledgeSpy).not.toHaveBeenCalled();
  });

  it("summary is truncated to ~300 chars when fields are huge", async () => {
    updateCompanyResearchSpy.mockResolvedValue({
      success: true,
      message: "ok",
    });

    const huge = "x".repeat(2000);
    await callTool("user-42", {
      companyId: "co-acme",
      cultureSummary: huge,
      recentNews: "more",
    });

    const summary = writeSharedKnowledgeSpy.mock.calls[0][3] as string;
    expect(summary.length).toBeLessThanOrEqual(300);
    expect(summary.endsWith("...")).toBe(true);
  });

  it("summary is non-empty whenever any field is provided", async () => {
    updateCompanyResearchSpy.mockResolvedValue({ success: true, message: "ok" });

    await callTool("user-42", {
      companyId: "co-acme",
      internshipIntel: "Spring intern hires 25, conversion 60%.",
    });

    const summary = writeSharedKnowledgeSpy.mock.calls[0][3] as string;
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain("Internships:");
  });
});
