/**
 * Unit tests for `operations-ops-rest.ts`.
 *
 * Contracts:
 *   - getRecentIncidentAlerts → SELECT FROM incident_alerts ORDER BY
 *     opened_at DESC LIMIT N. Open rows partition first; resolved rows
 *     after. Empty array on error path so the panel renders gracefully.
 *   - getDailyAiSpendCents → SELECT total_cost_cents FROM
 *     v_daily_ai_spend_cents WHERE day=<today> (UTC). Returns a zeroed
 *     reading with the cap applied on error; usageRatio is total/cap.
 *
 * The Supabase client is hand-rolled — each test wires the bare minimum
 * of the builder chain needed for the path under test. No live DB.
 */
import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDailyAiSpendCents,
  getRecentIncidentAlerts,
} from "./operations-ops-rest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface IncidentRow {
  id: string;
  job_name: string;
  severity: "warn" | "crit";
  last_seen_value: string | null;
  opened_at: string;
  resolved_at: string | null;
}

function incidentClient(
  rows: IncidentRow[] | null,
  error: { message: string } | null = null,
): SupabaseClient {
  const limitSpy = vi.fn(async () => ({ data: rows, error }));
  const orderSpy = vi.fn(() => ({ limit: limitSpy }));
  const selectSpy = vi.fn(() => ({ order: orderSpy }));
  const fromSpy = vi.fn(() => ({ select: selectSpy }));
  return { from: fromSpy } as unknown as SupabaseClient;
}

interface SpendRow {
  total_cost_cents: number | string | null;
}

function spendClient(
  row: SpendRow | null,
  error: { message: string } | null = null,
): SupabaseClient {
  const maybeSingleSpy = vi.fn(async () => ({ data: row, error }));
  const eqSpy = vi.fn(() => ({ maybeSingle: maybeSingleSpy }));
  const selectSpy = vi.fn(() => ({ eq: eqSpy }));
  const fromSpy = vi.fn(() => ({ select: selectSpy }));
  return { from: fromSpy } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// getRecentIncidentAlerts
// ---------------------------------------------------------------------------

describe("getRecentIncidentAlerts", () => {
  it("returns an empty array when the table has no rows", async () => {
    const client = incidentClient([]);
    await expect(getRecentIncidentAlerts(client)).resolves.toEqual([]);
  });

  it("partitions open incidents before resolved, preserving newest-first within each group", async () => {
    // PostgREST returns rows ordered by `opened_at DESC`. The reader
    // splits them into open / resolved and emits open-first.
    const rows: IncidentRow[] = [
      {
        id: "open-1",
        job_name: "cron-stale",
        severity: "crit",
        last_seen_value: "stale 6h",
        opened_at: "2026-05-11T12:00:00.000Z",
        resolved_at: null,
      },
      {
        id: "resolved-1",
        job_name: "ai-cost-hourly",
        severity: "warn",
        last_seen_value: "$3.20/hr",
        opened_at: "2026-05-11T11:00:00.000Z",
        resolved_at: "2026-05-11T11:30:00.000Z",
      },
      {
        id: "open-2",
        job_name: "outreach-queue-frozen",
        severity: "warn",
        last_seen_value: null,
        opened_at: "2026-05-11T10:00:00.000Z",
        resolved_at: null,
      },
    ];
    const result = await getRecentIncidentAlerts(incidentClient(rows));
    expect(result.map((r) => r.id)).toEqual([
      "open-1",
      "open-2",
      "resolved-1",
    ]);
    expect(result[0].open).toBe(true);
    expect(result[2].open).toBe(false);
  });

  it("returns an empty array on REST error rather than throwing", async () => {
    // Failure must NOT propagate — the dashboard already renders an
    // empty-state panel and the watchdog is the source of truth for
    // paging, not the read-only dashboard.
    const client = incidentClient(null, { message: "bad gateway" });
    await expect(getRecentIncidentAlerts(client)).resolves.toEqual([]);
  });

  it("honors the limit option when provided", async () => {
    // Wire a client that captures the limit call so the test can verify
    // it was forwarded all the way to the builder.
    let observedLimit: number | undefined;
    const limitSpy = vi.fn(async (n: number) => {
      observedLimit = n;
      return { data: [], error: null };
    });
    const orderSpy = vi.fn(() => ({ limit: limitSpy }));
    const selectSpy = vi.fn(() => ({ order: orderSpy }));
    const fromSpy = vi.fn(() => ({ select: selectSpy }));
    const client = { from: fromSpy } as unknown as SupabaseClient;

    await getRecentIncidentAlerts(client, { limit: 5 });
    expect(observedLimit).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getDailyAiSpendCents
// ---------------------------------------------------------------------------

describe("getDailyAiSpendCents", () => {
  it("returns a zeroed reading with the cap applied when no row exists for today", async () => {
    // The view has no row for today → "no spend yet" → 0 cents / 0 ratio.
    const client = spendClient(null);
    const reading = await getDailyAiSpendCents(client, {
      capUsd: 50,
      nowIso: "2026-05-11T12:34:56.000Z",
    });
    expect(reading.day).toBe("2026-05-11");
    expect(reading.totalCostCents).toBe(0);
    expect(reading.capCents).toBe(5000);
    expect(reading.usageRatio).toBe(0);
  });

  it("computes the usage ratio against the configured cap", async () => {
    const client = spendClient({ total_cost_cents: 1250 });
    const reading = await getDailyAiSpendCents(client, {
      capUsd: 50,
      nowIso: "2026-05-11T12:34:56.000Z",
    });
    expect(reading.totalCostCents).toBe(1250);
    expect(reading.usageRatio).toBeCloseTo(0.25, 5);
  });

  it("coerces numeric strings from PostgREST into numbers", async () => {
    // PostgREST sends BIGINT / NUMERIC columns as strings; the brake
    // helper has the same coercion and this reader must agree.
    const client = spendClient({ total_cost_cents: "7500" });
    const reading = await getDailyAiSpendCents(client, {
      capUsd: 50,
      nowIso: "2026-05-11T12:34:56.000Z",
    });
    expect(reading.totalCostCents).toBe(7500);
    expect(reading.usageRatio).toBeCloseTo(1.5, 5);
  });

  it("returns a zeroed reading on REST error rather than throwing", async () => {
    const client = spendClient(null, { message: "broken view" });
    const reading = await getDailyAiSpendCents(client, {
      capUsd: 50,
      nowIso: "2026-05-11T12:34:56.000Z",
    });
    expect(reading.totalCostCents).toBe(0);
    expect(reading.usageRatio).toBe(0);
    expect(reading.capCents).toBe(5000);
  });

  it("returns a zeroed reading when the view emits a malformed total", async () => {
    const client = spendClient({ total_cost_cents: "not-a-number" });
    const reading = await getDailyAiSpendCents(client, {
      capUsd: 50,
      nowIso: "2026-05-11T12:34:56.000Z",
    });
    expect(reading.totalCostCents).toBe(0);
    expect(reading.usageRatio).toBe(0);
  });
});
