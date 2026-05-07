import { describe, it, expect, beforeEach, vi } from "vitest";

const insertMock = vi.hoisted(() =>
  vi.fn<(record: Record<string, unknown>) => Promise<{ data: null; error: null }>>(
    async () => ({ data: null, error: null }),
  ),
);
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      expect(table).toBe("cron_runs");
      return { insert: insertMock };
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { withCronHealth } from "./health";

describe("withCronHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not write cron_runs for unauthorized responses", async () => {
    const wrapped = withCronHealth("test-cron", async () =>
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const res = await wrapped(new Request("http://localhost/api/cron/test"));
    await Promise.resolve();

    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("writes cron_runs for successful authorized work", async () => {
    const wrapped = withCronHealth("test-cron", async () =>
      Response.json({ ok: true }),
    );

    const res = await wrapped(new Request("http://localhost/api/cron/test"));
    await Promise.resolve();

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({
      job_name: "test-cron",
      success: true,
    });
  });
});
