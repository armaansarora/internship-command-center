/**
 * /operations route-gate proof.
 *
 * Three independent guards must hold before the page is allowed to render:
 *
 *   1. Unauthenticated → redirect to `/lobby`.
 *   2. Authenticated but not in `OWNER_USER_ID(S)` → redirect to `/penthouse`.
 *   3. Owner authenticated but `TOWER_OPERATIONS_DASHBOARD` flag off →
 *      redirect to `/penthouse`.
 *
 * Strategy: mock `redirect` to throw a sentinel error, then drive each
 * guard individually. If any future refactor regresses the gate, one of
 * these assertions will trip.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { _resetEnvCacheForTests } from "@/lib/env";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
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

// Operations queries aren't reached in the gate-fail paths, but in the
// owner+flag-on happy path we stub them so the test file also serves as
// a smoke check on the success branch (page renders, no throw).
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

  it("redirects to /penthouse when authenticated user is not the owner", async () => {
    // Owner UUID is configured, but the authenticated user has a different id.
    process.env.OWNER_USER_ID = OWNER_ID;
    _resetEnvCacheForTests();
    operationsFlagMock.mockReturnValue(true);
    getUserMock.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000099",
    });

    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/penthouse/);
  });

  it("redirects to /penthouse when the operations flag is off — even for the owner", async () => {
    process.env.OWNER_USER_ID = OWNER_ID;
    _resetEnvCacheForTests();
    operationsFlagMock.mockReturnValue(false);
    getUserMock.mockResolvedValue({ id: OWNER_ID });

    const { default: Page } = await import("../page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/penthouse/);
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
