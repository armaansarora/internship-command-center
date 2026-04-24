# R12.10 — Mock Topology Stub Server (Design)

**Date:** 2026-04-24
**Phase:** R12.10 (B1 closure)
**Author:** Claude (autopilot, self-approved per CLAUDE.md §8)
**Architecture:** PRE-LOCKED in user partner brief; this doc captures the implementation shape.

---

## Problem

R12 session 1 shipped 36 HARSH Playwright scenarios but only 6/36 pass at runtime. The blocker (B1):

- `installSupabaseMock` uses `page.route()` — a Playwright primitive that only intercepts **browser-origin** fetches.
- The Tower's API routes (`/api/networking/match-candidates`, `/api/contacts/[id]/reference-request`, etc.) issue **server-side** Supabase fetches from the Next.js dev-server process.
- Those server-side fetches escape `page.route()` entirely — they hit `https://jzrsrruugcajohvvmevg.supabase.co` with stub publishable keys, returning non-deterministic auth failures.

Three architectural options were on the table; partner pre-locked **option (b): a Node-side stub Supabase server on `http://localhost:3001`** and `globalSetup` rewires `NEXT_PUBLIC_SUPABASE_URL` to that origin so both browser and server-side fetches converge on the same mock state.

## Why option (b) over (a) or (c)

- **(a) MSW-node at the Next fetch layer** — would require a Next.js instrumentation hook to register MSW handlers. Invasive (touches `next.config.ts` and a server-only init file), and fragile across Next versions.
- **(c) Real Supabase test branch via MCP** — out of autopilot scope per partner constraint (b): "if a scenario NEEDS real DB integration, flag for partner via needs-real-db blocker — don't shortcut into Supabase from inside a test session." Stub server is the right escape hatch.
- **(b) port-redirect stub server** — least invasive: zero changes to src/, zero changes to Next config, just an env-var swap on the dev-server child process. Browser and server share one source of truth. Clean teardown (kill the listener).

## High-level shape

```
┌──────────────────┐  http://localhost:3001/__test__/install
│ Playwright spec  │ ─────────────────────────────────────────►
│   (test runner)  │                                            │
└────────┬─────────┘                                            ▼
         │                                              ┌────────────────┐
         │ page.goto + signInAs                         │  stub-server   │
         ▼                                              │  :3001         │
┌──────────────────┐                                    │                │
│  Chromium page   │ ──── /auth/v1/user, /rest/v1/* ──► │  /auth/v1/*    │
│  (browser)       │      (with x-scenario-id header)   │  /rest/v1/*    │
└──────────────────┘                                    │  /functions/*  │
         │                                              │                │
         │ page.goto('/observatory')                    │  fixture store │
         ▼                                              │  Map<sid,...>  │
┌──────────────────┐                                    │                │
│  Next dev server │ ──── /auth/v1/user, /rest/v1/* ──► │                │
│  :3000           │      (NEXT_PUBLIC_SUPABASE_URL     │                │
│  (Node process)  │       = http://localhost:3001)     │                │
└──────────────────┘                                    └────────────────┘
```

Both Chromium AND the Next dev-server's server-side fetches converge on `http://localhost:3001`. The stub server keys per-scenario state by an `x-scenario-id` HTTP header (browser sends via Playwright `extraHTTPHeaders`; server-side requests don't carry the header — they instead pull scenarioId from a request-context cookie).

**Wait — server-side fetches DON'T carry the x-scenario-id header.** Server-side Supabase calls use the SDK's own fetch, which doesn't propagate browser headers.

## Resolution: cookie-based scenario ID

The cookie path works because:
- Playwright's `signInAs()` already drops `sb-access-token` and `sb-refresh-token` cookies.
- We piggyback a `sb-scenario-id` cookie alongside (set on the same origin, `localhost:3000`).
- Server-side Supabase REST calls don't auto-forward browser cookies, BUT the server reads the cookie via `cookies()` in route handlers, then passes it to a small "create scenario-aware client" wrapper.

**Even simpler: server-side fetches inherit the scenarioId via a per-Next-process env var.** But that breaks per-test isolation if tests run sequentially in the same dev server.

**Cleanest approach** (what we ship): the stub server holds a **single active scenarioId** at `:3001` in module state. When a test starts, `installSupabaseMock` calls `POST /__test__/activate` with the new scenarioId. All subsequent `/auth/v1/*` and `/rest/v1/*` calls from any source resolve against the active scenario. Tests run sequentially (`fullyParallel: false` in playwright.config.ts), so there's no race.

For belt-and-suspenders, the install endpoint is also `POST /__test__/install` accepting a full fixture bundle, and activation happens atomically: `install` swaps the fixture store and clears any per-scenario stateful counters. The `x-scenario-id` header still flows in via Playwright `extraHTTPHeaders` for diagnostic logging — when a request arrives WITHOUT the header AND the active scenarioId is set, the server logs (debug-only) "server-side fetch using active scenario" so we can prove topology is correct.

## State model

```ts
type StubState = {
  activeScenarioId: string | null;
  // Static per-scenario fixtures — installed via POST /__test__/install.
  fixtures: {
    tables: Record<string, Array<Record<string, unknown>>>;
    rpcs: Record<string, unknown>;
    authedUser: { id: string; email: string } | null;
    allowWrites: boolean;
  };
  // Stateful overlays — installed via POST /__test__/install in
  // payload.overrides[]. Interpreted at request time. See "Overrides" below.
  overrides: StubOverride[];
  // Mutable counters maintained per scenario lifetime.
  counters: Record<string, number>;
  // Observed writes — for tests that assert "no writes happened" or "N writes happened".
  writes: Array<{ table: string; method: string; body: string }>;
};
```

## Overrides — declarative DSL

Stateful behaviors that R12 scenarios depend on are expressed as **declarative override descriptors**, not callback functions (callbacks can't survive an HTTP boundary). Each override has a `behavior` field that the stub server interprets.

Override types needed by the 36 scenarios:

| Behavior | Used by | Description |
|---|---|---|
| `rpc_count_threshold` | `match-candidates-flood`, `r11-rate-limit-e2e` (over-threshold case) | Increment named counter on each call to a specific RPC. Return `allowedShape` while count ≤ limit, then `blockedShape`. |
| `rpc_error_status` | `r11-rate-limit-e2e` (RPC error case) | Always return a fixed `{status, body}` for a specific RPC. |
| `rpc_abort` | `r11-rate-limit-e2e` (RPC transport error case) | Drop the connection without a response. |
| `table_filter_branch` | `r11-cross-user-rls-runtime` | If GET on table X carries query param `user_id=eq.<value>`, return shape A; else return shape B (union). |
| `track_writes` | `ref-request-flood`, abuse scenarios | Pure passive — every non-GET request to specified tables appended to `state.writes` array, readable via GET `/__test__/writes`. |

This DSL covers every overlay pattern the existing 36 scenarios use, with no need for serialized callbacks.

## Helper API

`tests/e2e/helpers/mock-supabase.ts` re-exposes `installSupabaseMock(page, options)` with the new contract:

```ts
export interface MockOptions {
  tables?: FixtureTables;
  rpc?: FixtureRpc;
  allowWrites?: boolean;
  authedUser?: { id: string; email: string } | null;
  overrides?: StubOverride[];   // NEW
}

export async function installSupabaseMock(
  page: Page,
  options: MockOptions,
): Promise<void> {
  const scenarioId = randomUUID();
  // Set the diagnostic header on browser-origin fetches.
  await page.setExtraHTTPHeaders({ "x-scenario-id": scenarioId });
  // Install the fixtures and activate this scenarioId on the stub.
  await fetch("http://localhost:3001/__test__/install", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId, ...options }),
  });
}
```

The pre-existing `buildFixtureHandler` is repurposed: its request → response mapping logic is inlined into the stub server's HTTP handlers verbatim. Same logic, new transport.

`tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts` keeps its tests but pivots to test the override interpreter (in-memory) and the install-endpoint protocol, not the helper's outbound HTTP call (that's covered by an integration test in stub-server's own unit suite).

## Scenario migration

Most of the 36 scenarios already call `signInAs(page, user, {tables, rpc, allowWrites})`, which routes through `installSupabaseMock`. Those scenarios need **zero changes**.

Scenarios with `page.route()` overlays (4 of 36) need a 5–10 line edit each: replace the overlay with an `overrides: [...]` entry passed into `signInAs`/`installSupabaseMock`:

| Scenario | Current overlay | New override |
|---|---|---|
| `match-candidates-flood.spec.ts` | counter on `bump_match_rate_limit` RPC | `{behavior: "rpc_count_threshold", rpc: "bump_match_rate_limit", limit: 20, allowed: {allowed: true}, blocked: {allowed: false}}` |
| `r11-rate-limit-e2e.spec.ts` (over-threshold) | counter | same as above with limit: 20 + count return |
| `r11-rate-limit-e2e.spec.ts` (RPC error) | static 500 fulfill | `{behavior: "rpc_error_status", rpc: "bump_match_rate_limit", status: 500, body: {...}}` |
| `r11-rate-limit-e2e.spec.ts` (RPC abort) | route.abort() | `{behavior: "rpc_abort", rpc: "bump_match_rate_limit"}` |
| `r11-cross-user-rls-runtime.spec.ts` | RLS-simulating overlay on table | `{behavior: "table_filter_branch", table: "match_candidate_index", filterParam: "user_id", filterValue: "eq.<alice>", onMatch: aliceRows, onNoMatch: unionRows}` |
| `ref-request-flood.spec.ts` | write tracker | `{behavior: "track_writes", tables: ["outreach_queue"]}` + read via stub GET `/__test__/writes` |

## Testing strategy

**Unit tests** (vitest, in-process):
- `tests/e2e/helpers/__tests__/stub-server.unit.test.ts` — boot stub on a random port, assert each handler shape (auth, REST GET, REST POST, RPC, install, activate, override interpreter for each behavior).
- Re-use existing `mock-supabase.unit.test.ts` to cover the helper's new payload shape.

**E2E tests** (Playwright, via `npm run test:e2e`):
- The 36 scenarios are themselves the integration tests. After topology fix, they should all pass.

## Failure modes & guardrails

1. **Real Supabase project URL leaks into the stub** — guard: stub-server logs a warning if it ever sees a request with `Host: *.supabase.co` (would only happen if env-var rewrite missed). CI grep `tests/` for the project ref `jzrsrruugcajohvvmevg` should return zero matches before commit.
2. **Cross-test state bleed** — guard: install endpoint atomically swaps the fixture store and resets all counters/writes. Tests run sequentially so there's no race.
3. **Stub server crashes mid-suite** — guard: `globalSetup` wraps `server.listen` with an error handler that fails the whole suite if the port is taken or the process dies.
4. **Stale `x-scenario-id` header** — diagnostic only. Active-scenario model means the header isn't load-bearing; it's just a logging/debug aid.

## Out of scope (re-asserted from partner brief)

- Mutation testing
- Fuzzing
- Load testing >1000 concurrent users
- ML-adversarial testing
- Replacing existing vitest unit suites
- Any new R12 scenarios (the 36 stand)
- Any src/ feature work — the 3 src regressions partner closed in 98d3c47 stand; this work just makes them verifiable

## Acceptance

- All 36 scenarios run green via `npm run test:e2e` end-to-end
- `tower verify R12` passes (tasks complete, blockers empty, drift clean, tests, tsc, build, lint)
- `tower accept R12` succeeds without `--force`
- Final handoff via `tower handoff --stdin`

---

**Self-approval gate (per CLAUDE.md §8):**

Decisions made within scope of the phase brief:
- ✓ Scenario isolation via active scenarioId (deterministic, avoids cookie-propagation complexity)
- ✓ Override DSL instead of serialized callbacks (HTTP-friendly, no in-memory function refs)
- ✓ Verbatim port of `buildFixtureHandler` request→response logic into stub-server (partner brief: "Don't rewrite the handler logic; just relocate it.")
- ✓ Diagnostic-only header (active-scenario model is the source of truth)

No business or design decisions punted to the user.
