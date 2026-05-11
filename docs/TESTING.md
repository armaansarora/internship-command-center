# Testing Patterns — The Tower

Reference for new tests. Lives in `/docs/` alongside `VISION-SPEC.md` and `CHAIN-OF-COMMAND.md`.

## What the test stack already gets right

- **Zero snapshot tests.** `grep -r "toMatchSnapshot" src` returns nothing.
  Every assertion is intentional. Keep it that way — snapshots ossify
  implementation details and turn legitimate refactors into churn.
- **Behavioral fixtures, not implementation spies.** The cron tests
  (`src/app/api/cron/*/route.test.ts`) build a minimal Supabase shim and
  assert on what landed (rows inserted, statuses flipped, notifications
  dispatched), not on which internal helper was invoked. Mirror this when
  writing new cron/route tests.
- **Auth gates audited as a flock.** Every `/api/cron/*` route is exercised
  in `src/app/api/cron/__integration__/cron-auth.test.ts`. When you ship a
  new cron route, append it to the `ROUTES` array there.

## Anti-patterns to avoid

### 1. Asserting only on `toHaveBeenCalledWith` for behavioral effects

```ts
// AVOID — tests the implementation
expect(insertSpy).toHaveBeenCalledWith({ ... });
```

```ts
// PREFER — tests the observable behavior
const res = await POST(req);
expect(res.status).toBe(200);
expect(insertedRows).toEqual([{ ... }]);  // tracked inside the fixture
```

Spy assertions are fine when the spy is the only observable surface (a
fire-and-forget audit log, a Resend call), but they should never be the
sole assertion when the route also returns a status + body.

### 2. Coupling tests to private helper signatures

If `route.ts` factors out `function _internal(...)`, do not import and test
`_internal` directly. The route's GET/POST handler IS the contract.

### 3. Snapshot tests for React components

The repo has zero. Keep it that way. Render with `renderToStaticMarkup` and
assert on the DOM tokens you care about (testid, label, copy fragment).

### 4. Real network or real DB in unit tests

The Drizzle ORM `db` object MUST NOT be touched at runtime — Supabase
Postgres is IPv6-only and the test runner cannot reach it. ALL data access
in tests is mocked via `vi.mock("@/lib/supabase/admin", …)` or
`vi.mock("@/lib/supabase/server", …)`.

## Cron route test template

Every new `src/app/api/cron/<name>/route.ts` should ship with
`src/app/api/cron/<name>/route.test.ts` covering AT MINIMUM:

1. **401 when `verifyCronRequest` rejects.** Bind the auth contract.
2. **Empty-state happy path.** No work → consistent 200 + zero counters.
3. **One-row success path.** Asserts both the side effect AND the
   returned counters.
4. **Failure isolation.** When the cron iterates per-user, one user's
   failure must not abort the batch — assert the survivor still landed.
5. **500 on the load-bearing DB read error.** Confirms the error path
   bubbles a useful message rather than swallowing.

See `src/app/api/cron/cfo-threshold/route.test.ts` for a complete example.

## Playwright e2e test template

E2E tests live in `tests/e2e/*.spec.ts` and run against the stub Supabase
server booted by `globalSetup`. To author a new spec:

1. Import `signInAs` from `./helpers/auth` — stamps an SSR-shaped cookie
   and installs a stub fixture in one call.
2. Pass `tables: {…}` for the fixture state your scenario needs.
3. To assert on observed DB writes, GET
   `http://localhost:3001/__test__/writes` and filter by table/method.
4. NEVER pin a fixture timestamp to `Date.now()`. Import from
   `./helpers/fixtures::TIMES` and use the anchor + relative deltas.
5. Single worker is mandatory — the stub server holds a single
   `activeScenarioId`. `playwright.config.ts` pins this.
