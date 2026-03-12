import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

describe("CRO Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queryApplications returns pipeline data", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: "app-1", status: "applied", tier: 1, role: "Analyst" },
          ]),
        }),
      }),
    });

    const { queryApplications } = await import("@/lib/agents/cro/tools");
    const result = await queryApplications({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("analyzeConversionRates returns rate data", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { status: "applied" },
          { status: "applied" },
          { status: "interview_scheduled" },
          { status: "offer" },
        ]),
      }),
    });

    const { analyzeConversionRates } = await import("@/lib/agents/cro/tools");
    const result = await analyzeConversionRates({});
    expect(result).toHaveProperty("totalApplications");
    expect(result).toHaveProperty("conversionRates");
  });
});
