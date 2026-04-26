/**
 * GET /api/reports/state-of-month tests.
 *
 * Mocks getUser, the Supabase REST client, and generateStateOfMonthPdf so
 * the test stays deterministic. Asserts:
 *   - 401 unauthenticated
 *   - 400 malformed month
 *   - 200 + application/pdf + %PDF- body on a valid month
 *   - Content-Disposition filename
 *   - default = current month
 *   - empty applications still returns a valid PDF (not 500)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();

interface PlantedRow {
  id: string;
  status: string;
  tier: number | null;
  applied_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  company_name: string | null;
  role: string;
  match_score: string | null;
}

let plantedRows: PlantedRow[] = [];
let plantedError: { message: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lt: async () => ({ data: plantedRows, error: plantedError }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const generatePdfMock = vi.fn();

vi.mock("@/lib/pdf/state-of-month-pdf", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/pdf/state-of-month-pdf")
  >("@/lib/pdf/state-of-month-pdf");
  return {
    ...actual,
    generateStateOfMonthPdf: (...args: unknown[]) => generatePdfMock(...args),
  };
});

import { GET } from "./route";

function get(url: string): Promise<Response> {
  return GET(new Request(url));
}

function plantRow(overrides: Partial<PlantedRow> = {}): PlantedRow {
  return {
    id: "app-1",
    status: "applied",
    tier: 2,
    applied_at: "2026-04-05T12:00:00Z",
    last_activity_at: "2026-04-10T12:00:00Z",
    created_at: "2026-04-03T12:00:00Z",
    company_name: "Acme",
    role: "SWE Intern",
    match_score: "0.8",
    ...overrides,
  };
}

describe("GET /api/reports/state-of-month", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      id: "user-1",
      user_metadata: { full_name: "Test User" },
    });
    plantedRows = [];
    plantedError = null;
    generatePdfMock.mockResolvedValue(Buffer.from("%PDF-1.4 mocked content"));
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.status).toBe(401);
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it("returns 400 when month is malformed", async () => {
    const res = await get("http://localhost/api/reports/state-of-month?month=04-2026");
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_month");
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an out-of-range month value", async () => {
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-13");
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("invalid_month");
  });

  it("returns 200 with application/pdf content-type on a valid month", async () => {
    plantedRows = [plantRow()];
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("returns a body that starts with %PDF-", async () => {
    plantedRows = [plantRow()];
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(5);
  });

  it("Content-Disposition has the correct filename for the requested month", async () => {
    plantedRows = [plantRow()];
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toMatch(/^attachment;/);
    expect(disposition).toContain('filename="state-of-month-2026-04.pdf"');
  });

  it("defaults to the current month when no query param is provided", async () => {
    plantedRows = [];
    const res = await get("http://localhost/api/reports/state-of-month");
    expect(res.status).toBe(200);
    expect(generatePdfMock).toHaveBeenCalledTimes(1);
    const data = generatePdfMock.mock.calls[0]?.[0] as { month: string };
    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(data.month).toBe(currentMonth);
  });

  it("returns 200 with a valid PDF even when there are no applications", async () => {
    plantedRows = [];
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("passes the authenticated user's name through to the report", async () => {
    plantedRows = [plantRow()];
    await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(generatePdfMock).toHaveBeenCalledTimes(1);
    const data = generatePdfMock.mock.calls[0]?.[0] as { userName: string };
    expect(data.userName).toBe("Test User");
  });

  it("computes stats from the planted rows", async () => {
    plantedRows = [
      plantRow({ id: "a", status: "applied" }),
      plantRow({ id: "b", status: "interviewing", last_activity_at: "2026-04-15T00:00:00Z" }),
      plantRow({ id: "c", status: "interview_scheduled", last_activity_at: "2026-04-20T00:00:00Z" }),
      plantRow({ id: "d", status: "offer", last_activity_at: "2026-04-22T00:00:00Z" }),
      plantRow({ id: "e", status: "rejected", last_activity_at: "2026-04-12T00:00:00Z" }),
    ];
    await get("http://localhost/api/reports/state-of-month?month=2026-04");
    const data = generatePdfMock.mock.calls[0]?.[0] as {
      stats: {
        total: number;
        interviewsBooked: number;
        offers: number;
        rejections: number;
      };
    };
    expect(data.stats.total).toBe(5);
    expect(data.stats.interviewsBooked).toBe(2);
    expect(data.stats.offers).toBe(1);
    expect(data.stats.rejections).toBe(1);
  });

  it("composes a deterministic CFO note that varies on offer count", async () => {
    plantedRows = [
      plantRow({ id: "a", status: "offer" }),
    ];
    await get("http://localhost/api/reports/state-of-month?month=2026-04");
    const data = generatePdfMock.mock.calls[0]?.[0] as { cfoNote: string };
    expect(data.cfoNote).toMatch(/offer/i);
  });

  it("returns 500 when the underlying query errors", async () => {
    plantedError = { message: "postgres down" };
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("query_failed");
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it("returns 500 when PDF generation throws", async () => {
    plantedRows = [plantRow()];
    generatePdfMock.mockRejectedValueOnce(new Error("boom"));
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("render_failed");
  });

  it("includes a Cache-Control header that disables caching", async () => {
    plantedRows = [plantRow()];
    const res = await get("http://localhost/api/reports/state-of-month?month=2026-04");
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });

  it("planet snapshot is built from application rows (tier + angleDeg present)", async () => {
    plantedRows = [
      plantRow({ id: "p1", tier: 1, status: "applied" }),
      plantRow({ id: "p2", tier: 4, status: "interviewing" }),
    ];
    await get("http://localhost/api/reports/state-of-month?month=2026-04");
    const data = generatePdfMock.mock.calls[0]?.[0] as {
      planetSnapshot: Array<{ tier: number; status: string; angleDeg: number }>;
    };
    expect(data.planetSnapshot.length).toBe(2);
    for (const planet of data.planetSnapshot) {
      expect(planet.angleDeg).toBeGreaterThanOrEqual(0);
      expect(planet.angleDeg).toBeLessThan(360);
      expect([1, 2, 3, 4]).toContain(planet.tier);
    }
  });
});
