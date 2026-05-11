import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for incident-alerts-rest.ts.
 *
 * Contract:
 *   - findOpenIncident → SELECT * FROM incident_alerts WHERE job_name=$
 *     AND resolved_at IS NULL ORDER BY opened_at DESC LIMIT 1.
 *     Returns the row, null on miss, null + logs once on error.
 *   - openIncident → INSERT a snake_case row with last_email_at = opened_at
 *     = now(); returns the inserted row, null + logs once on error.
 *   - stampReminder → UPDATE last_email_at = now() WHERE id=$.
 *     Returns true / false; logs once on failure.
 *   - resolveIncident → UPDATE resolved_at = last_email_at = now() WHERE
 *     id=$. Returns true / false; logs once on failure.
 */

const {
  adminFromSpy,
  insertSpy,
  insertSelectSpy,
  insertSingleSpy,
  updateSpy,
  updateEqSpy,
  selectSpy,
  eqJobSpy,
  isResolvedSpy,
  orderSpy,
  limitSpy,
  maybeSingleSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  adminFromSpy: vi.fn(),
  insertSpy: vi.fn(),
  insertSelectSpy: vi.fn(),
  insertSingleSpy: vi.fn(),
  updateSpy: vi.fn(),
  updateEqSpy: vi.fn(),
  selectSpy: vi.fn(),
  eqJobSpy: vi.fn(),
  isResolvedSpy: vi.fn(),
  orderSpy: vi.fn(),
  limitSpy: vi.fn(),
  maybeSingleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: adminFromSpy }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: logErrorSpy,
  },
}));

const {
  findOpenIncident,
  openIncident,
  stampReminder,
  resolveIncident,
} = await import("./incident-alerts-rest");

beforeEach(() => {
  adminFromSpy.mockReset();
  insertSpy.mockReset();
  insertSelectSpy.mockReset();
  insertSingleSpy.mockReset();
  updateSpy.mockReset();
  updateEqSpy.mockReset();
  selectSpy.mockReset();
  eqJobSpy.mockReset();
  isResolvedSpy.mockReset();
  orderSpy.mockReset();
  limitSpy.mockReset();
  maybeSingleSpy.mockReset();
  logErrorSpy.mockReset();
});

// ---------------------------------------------------------------------------
// findOpenIncident
// ---------------------------------------------------------------------------

describe("findOpenIncident", () => {
  function wireQuery() {
    adminFromSpy.mockReturnValue({ select: selectSpy });
    selectSpy.mockReturnValue({ eq: eqJobSpy });
    eqJobSpy.mockReturnValue({ is: isResolvedSpy });
    isResolvedSpy.mockReturnValue({ order: orderSpy });
    orderSpy.mockReturnValue({ limit: limitSpy });
    limitSpy.mockReturnValue({ maybeSingle: maybeSingleSpy });
  }

  it("returns the open row scoped to (job_name, resolved_at IS NULL)", async () => {
    const row = {
      id: "inc-1",
      job_name: "cron:warmth-decay",
      severity: "warn",
      resolved_at: null,
    };
    wireQuery();
    maybeSingleSpy.mockResolvedValue({ data: row, error: null });

    const out = await findOpenIncident("cron:warmth-decay");

    expect(adminFromSpy).toHaveBeenCalledWith("incident_alerts");
    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(eqJobSpy).toHaveBeenCalledWith("job_name", "cron:warmth-decay");
    expect(isResolvedSpy).toHaveBeenCalledWith("resolved_at", null);
    expect(orderSpy).toHaveBeenCalledWith("opened_at", { ascending: false });
    expect(limitSpy).toHaveBeenCalledWith(1);
    expect(out).toEqual(row);
  });

  it("returns null when no row is open", async () => {
    wireQuery();
    maybeSingleSpy.mockResolvedValue({ data: null, error: null });

    const out = await findOpenIncident("cron:warmth-decay");
    expect(out).toBeNull();
  });

  it("returns null + logs once on error", async () => {
    wireQuery();
    maybeSingleSpy.mockResolvedValue({ data: null, error: { message: "boom" } });

    const out = await findOpenIncident("cron:warmth-decay");
    expect(out).toBeNull();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("incident_alerts.find_open_failed");
  });
});

// ---------------------------------------------------------------------------
// openIncident
// ---------------------------------------------------------------------------

describe("openIncident", () => {
  function wireQuery() {
    adminFromSpy.mockReturnValue({ insert: insertSpy });
    insertSpy.mockReturnValue({ select: insertSelectSpy });
    insertSelectSpy.mockReturnValue({ single: insertSingleSpy });
  }

  it("inserts a snake_case payload with last_email_at = opened_at = now()", async () => {
    const inserted = {
      id: "inc-2",
      job_name: "stripe-webhooks",
      severity: "crit",
      last_seen_value: "3 failed in 24h",
      opened_at: "2026-05-11T12:00:00.000Z",
      last_email_at: "2026-05-11T12:00:00.000Z",
      resolved_at: null,
      created_at: "2026-05-11T12:00:00.000Z",
    };
    wireQuery();
    insertSingleSpy.mockResolvedValue({ data: inserted, error: null });

    const out = await openIncident({
      jobName: "stripe-webhooks",
      severity: "crit",
      lastSeenValue: "3 failed in 24h",
    });

    expect(adminFromSpy).toHaveBeenCalledWith("incident_alerts");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.job_name).toBe("stripe-webhooks");
    expect(payload.severity).toBe("crit");
    expect(payload.last_seen_value).toBe("3 failed in 24h");
    expect(typeof payload.opened_at).toBe("string");
    expect(payload.last_email_at).toBe(payload.opened_at);
    expect(insertSelectSpy).toHaveBeenCalledWith("*");
    expect(out).toEqual(inserted);
  });

  it("defaults lastSeenValue to null when omitted", async () => {
    wireQuery();
    insertSingleSpy.mockResolvedValue({
      data: { id: "inc-3", job_name: "ai-cost-hourly" },
      error: null,
    });

    await openIncident({ jobName: "ai-cost-hourly", severity: "warn" });

    const [payload] = insertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(payload.last_seen_value).toBeNull();
  });

  it("returns null + logs once on error", async () => {
    wireQuery();
    insertSingleSpy.mockResolvedValue({ data: null, error: { message: "denied" } });

    const out = await openIncident({ jobName: "cron:x", severity: "warn" });
    expect(out).toBeNull();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("incident_alerts.open_failed");
  });
});

// ---------------------------------------------------------------------------
// stampReminder
// ---------------------------------------------------------------------------

describe("stampReminder", () => {
  function wireQuery() {
    adminFromSpy.mockReturnValue({ update: updateSpy });
    updateSpy.mockReturnValue({ eq: updateEqSpy });
  }

  it("updates last_email_at = now() scoped to id and returns true", async () => {
    wireQuery();
    updateEqSpy.mockResolvedValue({ error: null });

    const out = await stampReminder("inc-1");
    expect(out).toBe(true);
    expect(adminFromSpy).toHaveBeenCalledWith("incident_alerts");
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(typeof payload.last_email_at).toBe("string");
    expect(() => new Date(payload.last_email_at as string).toISOString()).not.toThrow();
    expect(updateEqSpy).toHaveBeenCalledWith("id", "inc-1");
  });

  it("returns false + logs once on error", async () => {
    wireQuery();
    updateEqSpy.mockResolvedValue({ error: { message: "missing" } });

    const out = await stampReminder("inc-missing");
    expect(out).toBe(false);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("incident_alerts.stamp_reminder_failed");
  });
});

// ---------------------------------------------------------------------------
// resolveIncident
// ---------------------------------------------------------------------------

describe("resolveIncident", () => {
  function wireQuery() {
    adminFromSpy.mockReturnValue({ update: updateSpy });
    updateSpy.mockReturnValue({ eq: updateEqSpy });
  }

  it("stamps both resolved_at and last_email_at to now() and returns true", async () => {
    wireQuery();
    updateEqSpy.mockResolvedValue({ error: null });

    const out = await resolveIncident("inc-1");
    expect(out).toBe(true);
    const [payload] = updateSpy.mock.calls[0] as [Record<string, unknown>];
    expect(typeof payload.resolved_at).toBe("string");
    expect(typeof payload.last_email_at).toBe("string");
    expect(payload.resolved_at).toBe(payload.last_email_at);
    expect(updateEqSpy).toHaveBeenCalledWith("id", "inc-1");
  });

  it("returns false + logs once on error", async () => {
    wireQuery();
    updateEqSpy.mockResolvedValue({ error: { message: "boom" } });

    const out = await resolveIncident("inc-1");
    expect(out).toBe(false);
    expect(logErrorSpy).toHaveBeenCalledTimes(1);
    expect(logErrorSpy.mock.calls[0][0]).toBe("incident_alerts.resolve_failed");
  });
});
