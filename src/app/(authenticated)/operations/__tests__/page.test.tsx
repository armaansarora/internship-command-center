/**
 * /operations route-gate proof.
 *
 * Three independent guards must hold before the page is allowed to render:
 *
 *   1. Unauthenticated → redirect to `/lobby`.
 *   2. Authenticated but not in `OWNER_USER_ID(S)` → `notFound()` (404).
 *      The route never reveals its existence to non-owners — a typo'd
 *      URL and a deliberate poke look identical.
 *   3. Owner authenticated but `TOWER_OPERATIONS_DASHBOARD` flag off →
 *      `notFound()` (404). Same logic: a flag-off route should look
 *      like it does not exist.
 *   4. Owner authenticated AND flag on → renders the four-panel
 *      OperationsClient with mocked data, including the new cron,
 *      incidents, and AI-spend panels.
 *
 * Strategy: mock `notFound` and `redirect` to throw sentinel errors, then
 * drive each guard individually. If any future refactor regresses the
 * gate, one of these assertions will trip.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { _resetEnvCacheForTests } from "@/lib/env";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

// Page-level supabase auth is the only Supabase touchpoint the test cares
// about — once a guard trips it throws before any query runs.
const { getUserMock, operationsFlagMock } = vi.hoisted(() => ({
  getUserMock: vi.fn<() => Promise<{ id: string } | null>>(),
  operationsFlagMock: vi.fn<() => boolean>(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getUser: getUserMock,
}));

// The page calls the admin client + queries inside the render success
// path; the gate tests never reach that point. Stub the admin module
// out so importing the page doesn't try to construct a real client.
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({})),
}));

// Gate-config flag is mocked via a `vi.hoisted` spy so each test can flip
// the operations-dashboard flag on/off without depending on env-var caching.
// `restoreMocks: true` in vitest.config.ts otherwise strips arrow-function
// members of the real GATE_CONFIG between tests, leaving the flag undefined.
vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      operationsDashboardEnabled: operationsFlagMock,
    },
  },
}));

// Activation funnel queries aren't reached in the gate-fail paths, but in
// the owner+flag-on happy path we stub them so the test file also serves
// as a smoke check on the success branch (page renders, no throw).
vi.mock("@/lib/db/queries/operations-rest", () => ({
  getActivationFunnelCounts: vi.fn(async () => ({
    beats: {},
    totals: { unique_users: 0, started: 0, completed: 0 },
  })),
  getRecentActivationDispatches: vi.fn(async () => []),
  getActivationCostUsd: vi.fn(async () => ({
    totalTokens: 0,
    totalUsd: 0,
    dispatches: 0,
  })),
}));

// Day-1 production-health readers (incidents + spend). Same pattern as
// the activation readers: stubbed to harmless empty values so the
// happy-path render does not require a live DB.
vi.mock("@/lib/db/queries/operations-ops-rest", () => ({
  getRecentIncidentAlerts: vi.fn(async () => []),
  getDailyAiSpendCents: vi.fn(async () => ({
    day: "2026-05-11",
    totalCostCents: 0,
    capCents: 5000,
    usageRatio: 0,
  })),
}));

// Cron health is read via `readProductionHealthSummary`; stub it to a
// healthy summary so the happy-path render does not require a live DB.
vi.mock("@/lib/observability/production-health", () => ({
  readProductionHealthSummary: vi.fn(async () => ({
    status: "ok" as const,
    cron: {
      configuredJobs: 0,
      lastRuns: [],
      staleJobs: [],
      failingJobs: [],
    },
    stripe: { failedRecent: [] },
  })),
}));

vi.mock("@/components/operations/OperationsClient", () => ({
  OperationsClient: () => null,
}));

const OWNER_ID = "00000000-0000-4000-8000-000000000001";

describe("GET /operations route gate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    };
    delete process.env.OWNER_USER_ID;
    delete process.env.OWNER_USER_IDS;
    _resetEnvCacheForTests();
    getUserMock.mockReset();
    operationsFlagMock.mockReset();
  });

  it("redirects to /lobby when no user is authenticated", async () => {
    getUserMock.mockResolvedValue(null);
    operationsFlagMock.mockReturnValue(true);

    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/lobby/);
  });

  it("returns 404 when authenticated user is not the owner", async () => {
    // Owner UUID is configured, but the authenticated user has a different id.
    // The route uses `notFound()` rather than redirect so the URL never
    // reveals its existence to a probe.
    process.env.OWNER_USER_ID = OWNER_ID;
    _resetEnvCacheForTests();
    operationsFlagMock.mockReturnValue(true);
    getUserMock.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000099",
    });

    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/NOT_FOUND/);
  });

  it("returns 404 when the operations flag is off — even for the owner", async () => {
    // A flag-off page must look like it does not exist; otherwise the
    // surface leaks "this route was here before the flip" to any prober.
    process.env.OWNER_USER_ID = OWNER_ID;
    _resetEnvCacheForTests();
    operationsFlagMock.mockReturnValue(false);
    getUserMock.mockResolvedValue({ id: OWNER_ID });

    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/NOT_FOUND/);
  });

  it("renders when the user is the owner AND the flag is on", async () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    _resetEnvCacheForTests();
    operationsFlagMock.mockReturnValue(true);
    getUserMock.mockResolvedValue({ id: OWNER_ID });

    const { default: Page } = await import("../page");
    // Must not throw — mocked OperationsClient renders null.
    await expect(Page()).resolves.toBeDefined();
  });
});
