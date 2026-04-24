# R12 — Post-R11 Hardening (HARSH E2E) — Design

**Date**: 2026-04-24
**Phase**: R12
**Intent**: Stand up a real browser-based E2E harness (Playwright) and run HARSH scenarios against the full R0–R11 surface. Close the proof-test debt jsdom couldn't bind (R9 frame timing, R11 runtime RLS, R11 rate-limit end-to-end). Harden against realistic adversarial inputs.

**Self-approved in autopilot**: all decisions below derive from `.tower/autopilot.yml` partner_constraints + R12 ledger + §5 Reference Library. No business / legal / copy / security-sensitive choices surfaced.

---

## 1. Architecture

### 1.1 Harness — Playwright (already installed @ 1.59.1)

Existing `playwright.config.ts` is minimal (testDir, 30s timeout, trace on failure, webServer auto-start). Extend to:

- `projects: [chromium]` only — partner constraint (a). No Firefox/WebKit/mobile variants (CI cost control).
- `reporter: [['html', { outputFolder: 'playwright-report' }], ['list']]` — HTML artifact for CI, list for local.
- `retries: 0` — partner non-negotiable "no retry-until-green". Scenarios either pass on merit or file a blocker.
- `forbidOnly: !!process.env.CI` — blocks `.only` landing to main.
- `workers: process.env.CI ? 1 : undefined` — CI serial (deterministic), local parallel.
- `use.storageState` absent from config — each scenario builds its own fresh context.

### 1.2 Directory layout

```
tests/
├── e2e/                                   # Playwright test root (existing)
│   ├── north-star-loop.spec.ts            # R1 holdover — kept as-is
│   ├── session-persistence.spec.ts        # R0 holdover — kept as-is
│   ├── helpers/                           # NEW
│   │   ├── mock-supabase.ts               # page.route() intercept factory
│   │   ├── auth.ts                        # seeded user sign-in via mock
│   │   ├── fixtures.ts                    # fixture loader, stable UUIDs
│   │   └── assertions.ts                  # bytewise-scan helper for cross-user leak proofs
│   ├── fixtures/                          # NEW — canonical R12 seed data
│   │   ├── user-alice.json                # user A (canonical attacker/probe)
│   │   ├── user-bob.json                  # user B (canonical victim)
│   │   ├── applications-500.json          # scale scenario
│   │   ├── contacts-200.json              # scale scenario
│   │   ├── offers-100.json                # scale scenario
│   │   ├── planets-100.json               # R9 carryover
│   │   └── match-candidates/{alice,bob}.json
│   ├── security/                          # NEW — 5 scenarios
│   │   ├── jwt-manipulation.spec.ts
│   │   ├── rls-escape.spec.ts
│   │   ├── consent-bypass.spec.ts
│   │   ├── send-hold-bypass.spec.ts
│   │   └── cross-user-match-leak.spec.ts
│   ├── abuse/                             # NEW — 5 scenarios
│   │   ├── application-spam.spec.ts
│   │   ├── outreach-flood.spec.ts
│   │   ├── consent-rapid-toggle.spec.ts
│   │   ├── match-candidates-flood.spec.ts
│   │   └── ref-request-flood.spec.ts
│   ├── concurrency/                       # NEW — 5 scenarios
│   │   ├── stripe-subscription-race.spec.ts
│   │   ├── offer-email-double-ingest.spec.ts
│   │   ├── three-chair-double-fire.spec.ts
│   │   ├── match-index-rebuild-race.spec.ts
│   │   └── undo-bar-concurrent-dismiss.spec.ts
│   ├── scale/                             # NEW — 3 scenarios
│   │   ├── applications-500.spec.ts
│   │   ├── contacts-rolodex-200.spec.ts
│   │   └── offers-100.spec.ts
│   ├── failure/                           # NEW — 3 scenarios
│   │   ├── firecrawl-down.spec.ts
│   │   ├── openai-rate-limit.spec.ts
│   │   └── supabase-intermittent.spec.ts
│   └── carryover/                         # NEW — 3 R9/R11 runtime closures
│       ├── r9-orrery-frame-timing.spec.ts
│       ├── r11-cross-user-rls-runtime.spec.ts
│       └── r11-rate-limit-e2e.spec.ts
└── fixtures/                              # UNCHANGED — R6 prompt-injection fixtures
```

### 1.3 Mock surface

`tests/e2e/helpers/mock-supabase.ts` exports `installSupabaseMock(page, options)` that:

- Intercepts `https://jzrsrruugcajohvvmevg.supabase.co/**` (project-specific URL from env) AND its local-dev analogue.
- Also intercepts `page.context().route()` at the context level for any additional page opens in the same scenario.
- Returns fixture data matching Supabase REST shape (array-of-rows for SELECT, `{ data, error }` for RPC).
- Tracks mutations in memory; rejects unexpected writes unless the scenario opts in via `options.allowWrites: true`.
- Supports per-scenario fixture overrides: `installSupabaseMock(page, { overrides: { 'match_candidate_index': customRows } })`.
- **Never** forwards to the real Supabase project — any request that doesn't match a configured handler fails the test with a clear message (partner constraint (b)).

Auth mock: `tests/e2e/helpers/auth.ts` exports `signInAs(page, user)` that:

- Calls `installSupabaseMock(page, { authedUser: user })` which wires the mocked `auth/v1/user` endpoint to return `{ data: { user }, error: null }`.
- Sets synthetic cookies (`sb-access-token`, `sb-refresh-token`) via `context.addCookies([...])`.
- Does NOT hit a real sign-in endpoint. This is authenticated-state simulation, not OAuth flow testing (those are R4 territory, already covered by unit tests).

### 1.4 Fixtures — determinism

All fixtures use stable UUIDs: `00000000-0000-0000-0000-<hex>`. Timestamps hard-coded ISO strings (`2026-04-01T00:00:00Z` etc.) — no `Date.now()`, no `new Date()`, no `faker.*.recent()`. Per partner constraint (c).

Alice canonical id: `00000000-0000-0000-0000-000000000001`
Bob canonical id:   `00000000-0000-0000-0000-000000000002`

Match-candidate fixtures keyed by these ids so cross-user leak scenarios can assert by literal comparison.

---

## 2. Scenario design — 24 HARSH scenarios

Each scenario is a `test.describe('<attack-mode> — <defender> — <expected behavior>')` block with one or more `test()` bodies. Fresh context per scenario via Playwright's default `test.use({ ... })` pattern.

### 2.1 Security (5)

| File | Scenario | Invariant |
|------|----------|-----------|
| jwt-manipulation.spec.ts | "attacker forges JWT with user B's sub — server rejects" | Supabase auth rejects unsigned / wrong-signed JWTs; route returns 401 |
| rls-escape.spec.ts | "direct REST call to /api/networking/match-candidates without session returns 401" | Server-side auth check runs before RLS is even consulted |
| consent-bypass.spec.ts | "pre-R11 consent-version user POSTs to /api/networking/match-candidates — returns 403 consent-version-stale" | Consent-version gate fail-closed (R11 proof) |
| send-hold-bypass.spec.ts | "crafted outreach POST with send_after < now — DB-level CHECK or server clamp wins" | R7 invariant: 24h send-hold non-bypassable |
| cross-user-match-leak.spec.ts | "user A queries /api/networking/match-candidates — response bytewise contains zero of user B's IDs or anon-keys" | R11 cross-user RLS runtime proof |

### 2.2 Abuse (5)

| File | Scenario | Invariant |
|------|----------|-----------|
| application-spam.spec.ts | "50 rapid POST /api/applications — duplicate-dedup survives" | R1/R7 dedup key (user_id × company × role) |
| outreach-flood.spec.ts | "100 queued outreach rows — quiet-hours server-side clamp holds, no mass-send" | R7 server-side quiet hours |
| consent-rapid-toggle.spec.ts | "50 consent flips in 1 second — final state consistent, match-index cascade honored" | R11 revoke cascade (atomic) |
| match-candidates-flood.spec.ts | "100 GET /api/networking/match-candidates — rate limit trips at 21, subsequent 429 typed" | R11 rate-limit end-to-end |
| ref-request-flood.spec.ts | "20 ref-requests to same contact in 60s — cooldown or dedup prevents spam" | R10 ref-request rate guard |

### 2.3 Concurrency (5)

| File | Scenario | Invariant |
|------|----------|-----------|
| stripe-subscription-race.spec.ts | "simultaneous /checkout/success + /stripe/webhook — final subscription row consistent" | R0 Stripe idempotency |
| offer-email-double-ingest.spec.ts | "POST /api/offers/ingest-email twice with identical payload — single row created" | R10 email-ingest idempotency |
| three-chair-double-fire.spec.ts | "two parallel /c-suite/c-suite-ring calls — each dispatch tagged to distinct graph id" | R3 Promise.allSettled fan-out correctness |
| match-index-rebuild-race.spec.ts | "cron rebuild + delta trigger fire at same instant — no duplicate rows, no lost updates" | R11 atomic rebuild |
| undo-bar-concurrent-dismiss.spec.ts | "two tabs race on undo-dismiss — only one can flip DB state" | R7 undo atomicity |

### 2.4 Scale (3)

| File | Scenario | Invariant |
|------|----------|-----------|
| applications-500.spec.ts | "500 seeded applications render in <2s, virtual scroll works, no memory leak across 5 reloads" | R7 War Room virtualization holds |
| contacts-rolodex-200.spec.ts | "200 contacts in Rolodex — CSS 3D cylinder cycles, ±45° arc, 30fps hold" | R8 Rolodex scale |
| offers-100.spec.ts | "100 offers — comp-band chart renders, folder stack doesn't overflow, pins correct" | R10 offer floor scale |

### 2.5 Failure modes (3)

| File | Scenario | Invariant |
|------|----------|-----------|
| firecrawl-down.spec.ts | "Firecrawl endpoint returns 503 — /api/comp-bands/lookup returns graceful-empty" | R10 graceful degrade |
| openai-rate-limit.spec.ts | "OpenAI returns 429 — CMO draft endpoint returns user-visible fallback, no crash" | R5 draft degradation |
| supabase-intermittent.spec.ts | "50% of Supabase requests fail — retry path exercised, no false-success" | Fail-closed REST contract |

### 2.6 Carryover (3) — closes R9/R11 jsdom debt

| File | Scenario | Invariant |
|------|----------|-----------|
| r9-orrery-frame-timing.spec.ts | "100+ planets mounted — PerformanceObserver captures ≥30fps, click-to-detail <250ms, supernova duration within ±10% of spec" | R9 Intent-level behaviors real under real Chromium |
| r11-cross-user-rls-runtime.spec.ts | "two authed users A and B; A's match-candidates response bytewise scanned for B's ids — zero matches" | R11 cross-user RLS *runtime* proof (the structural-grep sibling lives in unit tests) |
| r11-rate-limit-e2e.spec.ts | "21 sequential real requests against the live route trip the Postgres RPC and return typed 429 + retry-after header" | R11 end-to-end, not mock-RPC |

**Total: 24 HARSH scenarios, exceeding the 20+ target, across 5 categories + 3 carryover proofs.**

---

## 3. Per-scenario discipline

1. Each scenario runs in fresh `browser.newContext()` — no shared cookies/localStorage/IndexedDB.
2. Mock surface is installed **before** any navigation — Playwright's `page.route()` is registered in `beforeEach`.
3. Assertions bind the invariant directly — no "runs without crashing" scenarios.
4. On real regression: `tower block R12.X "<finding>"` + leave the failing assertion in place. Never `.skip`, never retry-until-green.
5. `test.describe.configure({ mode: 'serial' })` inside categories that mutate shared mock state — keeps intra-file order deterministic.

---

## 4. CI workflow (R12.11, stretch)

`.github/workflows/hardening-e2e.yml`:

- Triggers:
  - `pull_request` with `paths: [src/**, tests/e2e/**, playwright.config.ts, package.json]`
  - `schedule: '0 6 * * 1'` (weekly Monday 06:00 UTC)
  - `workflow_dispatch` (manual)
- Steps: checkout → pnpm/npm install → `npx playwright install --with-deps chromium` → `npm run test:e2e` → `actions/upload-artifact` HTML report on failure.
- No merge-block wiring in this phase — partner will add required-check to branch protection as a follow-up commit after accept (per partner brief §What-you-DO-NOT-do, branch protection is partner territory).

---

## 5. Error handling + failure routing

- Missing secret (E2E auth token, Stripe test key, etc.): file blocker via `tower block R12.X "needs secret: <name>"`. Autopilot does not read secrets.
- Needs-real-db (CHECK constraint test, etc.): blocker `"needs-real-db: <reason>"`. Partner spins up Supabase branch via MCP after autopilot accepts.
- Intermittent flake: retry stability fix (wait-for-selector, explicit network.idle). If fix lands green → continue. If fix doesn't help → blocker. Never mark `.skip`.
- Same test fails 3 attempts with distinct fix strategies: blocker, move to next task. §8 autopilot rule.

---

## 6. Testing strategy

Playwright IS the testing strategy for R12. The harness tests everything. But the harness itself needs trivial smoke coverage:

- `tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts` (vitest) — asserts the mock factory rejects unexpected writes and returns fixtures.
- `tests/e2e/helpers/__tests__/auth.unit.test.ts` (vitest) — asserts `signInAs` installs the mock before any network call.

These are unit tests of helpers, running under the existing vitest infra. They are NOT Playwright scenarios — they're guardrails for the harness itself.

---

## 7. Acceptance gate mapping

| Criterion (ledger) | Closed by |
|--------------------|-----------|
| Playwright harness installed, config, CI | R12.1, R12.11 |
| Authenticated E2E flow | R12.2 (signInAs pattern) |
| ≥5 scenarios per category | R12.3–R12.7 |
| R9 frame-timing | R12.9 + carryover/r9-orrery-frame-timing.spec.ts |
| R11 cross-user RLS runtime | R12.8 + carryover/r11-cross-user-rls-runtime.spec.ts |
| R11 rate-limit e2e | R12.8 + carryover/r11-rate-limit-e2e.spec.ts |
| No silently weakened scenarios | Verified at R12.10 regression sweep |

---

## 8. Dependencies & parallelism

```
R12.1 (harness)  ──┐
                   ├─► R12.3, R12.4, R12.5, R12.6, R12.7, R12.8, R12.9 (7 parallel)
R12.2 (helpers)  ──┘
                                                          │
                                                          ▼
                                                      R12.10 (sweep)
                                                          │
                                                          ▼
                                                      R12.11 (CI)
                                                          │
                                                          ▼
                                                      R12.12 (accept)
```

R12.1 + R12.2 are serial prerequisite. R12.3 through R12.9 are 7 independent tasks — each owns a separate category file, no shared state. Use `subagent-driven-development` with one subagent per task.

---

## 9. Non-scope (explicit)

From partner_constraints: mutation testing (Stryker), fuzzing (AFL), load testing (Gatling/k6) with >1000 users, ML-adversarial, §8 living expansions, migrating existing vitest tests.

From partner_constraints anti-patterns: scenarios marked `.skip` / `.todo` when they flake, retry-until-green wrappers, harness requiring prod DB creds, Playwright tests that don't open browser contexts, CI on every push, scenario names like `SCENARIO-001`.

---

## 10. Approved (self-approved, autopilot mode)

This design sits entirely inside the phase Brief + partner_constraints. No business, legal, copy, or security-sensitive decisions. Moving to `writing-plans` next.
