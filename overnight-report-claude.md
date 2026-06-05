# Overnight Hardening Report — `claude`

**Agent:** claude (parallel agent: codex — strictly isolated)
**Branch:** `auto/overnight-claude-2026-06-04` (worktree `../overnight-claude`, based off `main` @ f84aee87)
**Started:** 2026-06-04
**Repo:** The Tower — Internship Command Center (Next.js 16 / Supabase / Drizzle / Vercel AI SDK v6)
**Status:** ✅ **CONVERGED** — 8 diagnostic passes, the final one finding zero new safe-to-fix issues and making zero changes.

---

## Stack & toolchain (detected)

| Aspect | Value |
|---|---|
| Framework | Next.js 16.2.7 (App Router), React 19.2.4 |
| Package manager | npm (package-lock.json), Node 24.x |
| Type checker | `npx tsc --noEmit` |
| Linter | `npx eslint .` (eslint 9, flat config `eslint.config.mjs`) |
| Test runner | `vitest run` (node env, `fileParallelism: false`) — 4293 tests / 668 spec files |
| Build | `next build` |
| E2E | Playwright (`test:e2e`, chromium) — needs stub server :3001; CI runs it `continue-on-error` |
| DB | Supabase REST at runtime; Drizzle for schema/migrations only |

**CI gates (authoritative):** `config-guard.yml` (vitest on config+db, `tsc --noEmit`, LAUNCH_CONFIG guard), `hardening-e2e.yml` (Playwright, non-blocking), plus artlab-* workflows for art changes.

**Build/test env:** `.env.local` stub created in worktree using the **exact CI stub values** (`https://stub.supabase.co`, etc.) — no real secrets, gitignored, never committed.

---

## Headline (baseline → final)

| Gate | Baseline (iter 0) | Final | Δ |
|---|---|---|---|
| `tsc --noEmit` | 0 errors | **0 errors** | held |
| `eslint .` | 0 errors, 3 warnings | **0 errors, 1 warning** | −2 warnings |
| `next build` | exit 0 | **exit 0** | held |
| `vitest run` | **3 failed** / 4259 passed / 10 skipped (4272) | **0 failed** / 4283 passed / 10 skipped (4293) | **−3 failures, +24 tests** |
| `npm audit` | **7 vulns** (1 high, 6 moderate) | **0 vulns** | **−7 (incl. the HIGH Next.js middleware-bypass)** |

**32 commits across 7 fix-iterations + 8 diagnostic passes; 75 files; +1598 / −395** (incl. the lockfile-only dep bump). Every commit green on tsc + lint + targeted tests; full build + full suite verified at each checkpoint, after the dependency bump, and on the final tree.

---

## Skills & workflows available (enumerated) → routing plan

**Process skills:** superpowers:systematic-debugging (bugs/test failures), superpowers:test-driven-development (new tests), superpowers:verification-before-completion (before any "done" claim), superpowers:requesting-code-review, superpowers:finishing-a-development-branch.

**Codex skills (lean hard):** `codex` (delegate one-shot tasks / second opinion), `codex:rescue` (deep investigation / alternate implementation). Routed for: independent diagnostic pass, adversarial verification of fixes, second-model review.

**Domain skills:** improve-codebase-architecture, code-review, security-review, impeccable / ui-ux-pro-max / frontend-slides (HTML report polish), supabase:* + vercel:* (platform-correct fixes).

**Orchestration:** `Workflow` tool — parallel READ-ONLY diagnostics fan-out with an adversarial-verify second stage; writes serialized in the main thread.

**Routing:** diagnostics → Workflow fan-out (multi-lens auditors + per-finding refutation). Fixes → systematic-debugging / TDD, serialized atomic commits. Review → codex adversarial diff verify. Report → impeccable/ui-ux-pro-max.

---

## Baseline (iteration 0)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ **0 errors** |
| `eslint .` | ✅ **0 errors, 3 warnings** (2 unused test imports, 1 `<img>` in a test fixture) |
| `next build` | ✅ **exit 0, 0 warnings** (full route table prerendered) |
| `vitest run` | ❌ **3 failed / 4259 passed / 10 skipped** (4272 tests, 665 files) — all 3 in `tower-context.test.ts` |
| `npm audit` | ⚠️ **7 vulnerabilities** (6 moderate, 1 high) — security backlog |

### Baseline failing tests (root cause)
All 3 failures (`tower-context.test.ts`) trace to a **machine-specific hardcoded path**: `tower-context.ts` `LOCAL_PROJECT_ROOT_GUESS = "/Users/armaanarora/Documents/The Tower"`. When `resolveProjectRootFromWorkspace` can't find docs via the (temp-dir) workspace, it falls back to that absolute path — a *different* checkout than the test's repo root, so docs read empty. The full `npm test` suite is **not run in CI**, so this regression was invisible. Fix is purely robust root-resolution.

### Lint warnings (baseline)
1. `cli-inbox-consumer.test.ts:3` — unused `readdirSync`
2. `character-master/types.test.ts:5` — unused `CharacterMasterStageSchema`
3. `golden-character-sprite-snippet.tsx:6` — `<img>` (fixture; intentional, remains)

---

## Iteration log

The DIAGNOSE→FIX→VERIFY loop ran until a full diagnostic pass found **zero new safe-to-fix issues and made zero changes**. Each pass was a `Workflow` fan-out of parallel read-only auditors (distinct lenses) feeding an adversarial second stage that tries to *refute* each finding before it counts. Findings that survived were classified safe-to-fix-unattended vs. needs-human-review.

### Iteration 1 — DIAGNOSE → FIX → VERIFY  (5-auditor fan-out; 501k tokens)
**24 findings: 2 high / 9 medium / 13 low.** Auditors unanimously rated the codebase mature & secure (fail-closed cron auth w/ timing-safe compare; HMAC-signed OAuth state; signature-verified Stripe webhook; RLS-scoped queries; no injection; no hardcoded secrets; disciplined Zod/safeParse; zero `as any`/`@ts-ignore` in shipped code; all deps used). Real issues clustered into missing network timeouts on request paths, two N+1 patterns, a COO timezone bug, a streaming-reader leak, and daemon data-loss edges. **17 fixed across 11 green commits.** **Independent Codex review of the full diff: "SAFE TO KEEP."**

### Iteration 2 — DIAGNOSE (fresh full re-run) → FIX → VERIFY  (496k tokens)
Confirmed the iter-1 fixes and surfaced **new real issues the first pass missed** — proving non-convergence. **17 findings (0 high / 7 medium / 10 low).** **10 more green commits:** cron `.range()` missing `.order()` (×2), Gmail-sync N+1, sound-engine `setInterval` leak + cross-floor SFX bleed, Drive-export timeouts/error-leak/double-token, comp-bands try/catch, JSON-LD `</script>` escaping, `.or()` UUID guard, debrief dead-export cleanup, two undeclared env flags. New regression/coverage tests added.

### Iteration 3 — confirmation pass on the pushed tree → FIX → VERIFY  (527k tokens)
Confirmed every prior fix and surfaced one **genuinely new HIGH**: `notifications.source_entity_id` is a `uuid` column, but four crons wrote **non-UUID idempotency strings** into it — so Postgres rejected those inserts and `createNotification` only logged it, meaning **those user alerts silently never delivered** (invisible to tests because the Supabase stubs don't enforce the uuid type). Fixed without a schema change (deterministic-UUID coercion + opt-in dedupe). Also: Google OAuth/login token-endpoint timeouts, a scheduler heartbeat crash path, a PDF-route error leak, a warm-intro-scan N+1, three more env vars. **8 more green commits + 2 new test files.** Dependency security: `npm audit fix` resolved 7→0 (incl. the HIGH Next.js middleware-bypass), lockfile-only.

### Iteration 4 — DIAGNOSE (pass 4) → FIX → VERIFY
Pass 4 found genuinely new bugs again. **2 green commits:**
- `9a673c9a` **(HIGH)** `reconciler.readMonthlySpend` parsed `monthly-spend.json` unguarded — one corrupt file threw out of `readRunReality` and aborted crash-recovery for **every** subsequent run. Now degrades to the same `{0,0}` default as the missing-file path. + the two briefing AI calls (`score-answer`, `start-drill`) wrapped → clean 503 instead of raw 500.
- `1495ebf2` corrected the `draft-follow-ups` docstring (claimed "every 2 hours"; it's `0 8 * * *` daily) and flagged the timezone coverage gap for human review.

### Iteration 5 — DIAGNOSE (pass 5: 13 safe-fixes, 1.37M tokens) → FIX → VERIFY
Pass 5 confirmed zero regressions in the iter-4 diff and surfaced a systemic class: **when the crons were migrated to once-daily for Vercel Hobby, the docstrings were never updated.** **3 green commits:**
- `89d80842` the two remaining unguarded user-facing AI routes — `offers/negotiation-draft` and `contacts/reference-request` (both **HIGH**) — now return a clean retryable 503; **all five** AI-failure paths now `log.error` for observability. +2 reject→503 contract tests.
- `43ad1460` **(HIGH)** ArtLab daemon leaked 2 fds per worker spawn (EMFILE → wedge) — now `closeSync`'d after spawn; the `activate` Gmail-race timeout id was never cleared — now cleared in `finally`; the OpenWeather fetch had no timeout — now `AbortSignal.timeout(5s)`; `LiveComposePanel.onComplete` could double-fire — now one-shot via a ref.
- `059c359d` six stale cron docstrings corrected to match vercel.json's once-daily schedules; `owner-watchdog` pointer fixed (it's driven by GitHub Actions, not vercel.json).

### Iteration 6 — DIAGNOSE (pass 6: 2 safe-fixes) → FIX → VERIFY
Pass 6 confirmed zero regressions and that the unguarded-AI-call and resource-leak classes were exhausted. **2 green commits:**
- `2646b7b8` the Parlor "Convene" route awaited `lookupCompBands` (a throwing DB helper) outside try/catch → raw 500 on a DB hiccup, even though the route is designed fail-soft. Now degrades to `bands=null` (matching the sibling lookup route's documented graceful-empty contract). +1 contract test.
- `a5519a64` corrected the `warmth.ts` tier day-range comments to match the decay formula (hot 0–3, warm 4–6).

### Iteration 7 — DIAGNOSE (pass 7: 1 safe-fix) → FIX → VERIFY
Pass 7 found one more instance of the same class: `readBinder()` called `parseDebriefContent` unguarded → raw 500 on a malformed debrief row, while the same module's `listBindersForUser` already guards it and the file header documents "skipped without throwing." **1 green commit:**
- `fb504b6d` `readBinder` now degrades a malformed row to `null` (the route already maps null → 404). I then **proactively swept the entire throwing-parse-helper class** and confirmed no other unguarded caller remains.

### Pass 8 — CONVERGENCE
A fresh diagnostic (regression-review of iter-7 + an independent exhaustion check of the throwing-helper class + a residual all-classes sweep) returned **zero findings**. Combined with the steep decline **13 → 2 → 1 → 0**, the loop has converged: no new *safe, high-value* actionable work remains, and no churn was manufactured to reach it.

### REORGANIZE — decision: **NO structural move** (confirmed, exactly once, post-convergence)
The repository already matches canonical Next.js 16 App-Router conventions, so any move would be pure churn. **Verified layout:** `src/{app,components,lib,db,hooks,types,styles}` + `src/proxy.ts` (the Next 16 middleware rename). `src/app/` uses route groups `(authenticated)` / `(marketing)`, an `api/` tree, and the canonical root files. Components are feature-colocated by floor; tests colocated or under `__tests__/`. **Sources referenced:** Next.js docs *Project structure & organization* (the `app/` dir, `src/` support, Route Groups, private folders, colocation) and *Routing: middleware* (Next 16 `proxy.ts`); the repo's own `STRUCTURE.md` + `CLAUDE.md`. The structure is consistent with all of these; the highest-value action is to **preserve** it.

---

## Needs human review

Each is a real finding deliberately **not** auto-fixed because it touches an internal/external contract, DB concurrency, a DB-schema/RPC need, or has a risk/value tradeoff that makes an unattended fix unwise ("smaller reversible change > big risky one").

### From iterations 1–3
1. **COO daily-briefing timezone (#4, #5)** — `getDailyBriefingData(userId)` computes "today's interviews" and renders times in **server-UTC**, not the user's IANA timezone. Genuine user-facing bug. **Deferred:** the function is a typed callback across many call sites incl. the **CEO dispatch-graph contract**; threading tz through is wide and contract-touching, and wrong tz math shows the *wrong* interviews (worse than consistent UTC). **Recommended:** add optional trailing `timeZone?: string`, source from `user_profiles.timezone`, compute user-local midnight→UTC with an Intl helper, wire the two direct callers first.
2. **Outreach duplicate-email on update failure (#3)** — after a successful `resend.emails.send`, if the status update to `sent` fails the row stays `approved` and re-sends. **Deferred:** sending email is an external contract. **Recommended:** pass `idempotencyKey = row id` to Resend so a re-send is deduped provider-side.
3. **sdk-poller archive self-wedge (#19)** — if seed+enqueue succeed but the inbox→archive move fails, the next tick re-enqueues, hits the `wx` collision, throws, and the inbox file wedges. **Deferred:** the fix touches `enqueueRun`'s atomic-`wx` invariant. **Recommended:** before enqueue, check whether the queue entry already exists and if so skip enqueue + re-attempt archive.
4. **match-delta non-atomic debounce (#23)** — two concurrent rescans can both pass the read-then-check. **Deferred:** LOW (wasteful, not incorrect); the naive fix introduces a worse failure mode. **Recommended:** atomic conditional `UPDATE ... WHERE ... RETURNING id` to claim the window, with timestamp reset on failure.
5. **env() convention nits (#21, #22)** — a couple of optional-feature env reads bypass `EnvSchema`. **Deferred (low value):** routing them through `env()` couples them to full-schema validation (a missing var would throw instead of gracefully disabling). Matches the adjacent `comp-bands/lookup.ts` pattern.
6. **Bulk dead-code sweep (~3 dozen unused exports)** — best done as a focused, individually-reviewed cleanup PR, not an unattended 30+-symbol removal (risk of removing something reached via a pattern static search misses).
7. **Cron time-budgets** — a few batch crons sweep an unbounded user set with sequential per-user round-trips and no `maxDuration` budget; a scale-hardening task (time budget + cursor) for deliberate design.
8. **Gmail matcher substring breadth (`parser.ts`)** — bidirectional `includes` could over-match; pre-existing logic, wants its own test matrix before tightening.
9. **`negotiation-draft` body lacks a Zod schema** — type-asserted (byte-bounded, token-DOS guarded). A correct `ParlorConveningResult` schema is non-trivial; a wrong one would reject valid payloads.

### From iterations 4–7 (passes 4–8)
10. **`getAgentMemories` N+1 access-count bump** — every chat retrieval fires N parallel `UPDATE`s (+ a read-modify-write lost-update race) on a hot path. **Deferred:** a correct race-free fix needs a new Postgres atomic-increment RPC (`increment_memory_access(ids)`) — a DB-schema/infra change. The per-row increment is load-bearing (the file documents a prior bug from a uniform bump).
11. **`cio-reresearch` per-company UPDATE in a loop** — collapses to one `.in()` in principle, **but** the loop relies on per-company error isolation + a `refreshed` counter + a per-row notification. **Deferred:** batching requires a partial-failure-handling decision, not a mechanical edit.
12. **Stripe webhook `updateUserSubscriptionTier` `.select('id').single()` on an UPDATE** — a 0-row match (deleted profile between checkout and webhook delivery — a real TOCTOU on the metadata-driven `checkout.session.completed` path) throws → 500 → Stripe retries an unresolvable event for days. **Deferred:** the clean fix changes the webhook's ack/retry/alerting semantics (the failed-event row is part of its observability contract) — a product/ops decision.
13. **`cfo-threshold` cohort-maturity conversion bias** — buckets apps by `created_at` but counts advancement from *current* status, so the youngest cohort is structurally under-advanced → false "conversion fell" CFO alerts even for a healthy steady pipeline. **Deferred:** the correct fix is an analytics redefinition (equal-maturity cohorts / within-week transitions) or a `status_history`/`advanced_at` schema addition. (Severity LOW — a deduped low-priority notification, not data loss.)
14. **`owner-watchdog` AI-cost probe 5000-row cap** — sums `agent_logs.cost_cents` over the rolling hour but caps at `.limit(5000)` with no pagination, so a runaway wave (exactly what it should catch) can under-count and stay `ok`. **Deferred:** the correct fix is server-side aggregation (a Postgres view/RPC). Note: the hard spend enforcement (`spend-brake.ts`) is separate and fail-closed, so this only blinds the digest. (The "Page through the rolling hour" comment is also stale — fix it alongside the aggregation.)
15. **Dead code: `createCalendarEvent` + `getUpcomingEvents` (`calendar/sync.ts`)** — zero callers. **Deferred:** `createCalendarEvent` is the only code that would insert events via the Google API, and the OAuth write-scope request + a scope-minimization proof test cite it. Deleting it (and tightening the scope) vs. wiring up the "push interview to Google Calendar" feature is a product/scope-contract decision.
16. **Dead code: `getFloorIdentity` accessor (`floor-identity.ts`)** — referenced only by its own test; `FloorShell` reads the registry directly (with an unguarded lookup). **Deferred:** "which pattern is canonical" decision (delete the accessor, or route `FloorShell` through it and harden the lookup).
17. **`draft-follow-ups` timezone coverage gap** — the single daily `0 8 * * *` run gated by the local `[02:00, 06:00)` window only ever sweeps users at ~UTC-6…-3 (the Americas); most of the world never receives drafts. **Deferred:** widening coverage requires a wider local window or extra cron invocations — both deployment/product decisions (and Vercel Hobby caps vercel.json crons at once-daily). The misleading docstring was corrected; a KNOWN-LIMITATION note now flags this in-code.

### Pre-existing notes (not bugs)
- The full `npm test` suite is **not run in any CI workflow** (only config+db subsets, plus non-blocking Playwright). This is why the `tower-context` failures were invisible. **Recommendation:** add a lightweight `unit-tests.yml` running `tsc --noEmit` + `npm test` + `lint` on every PR. (Not added — CI workflow changes are owner-gated infra.)
- `launchd.test.ts` contains `/Users/armaanarora/Documents/The Tower/...` literals — explicit **test fixtures** for plist generation, not runtime fallbacks.

---

## Fixes (grouped)

All commits on `auto/overnight-claude-2026-06-04`. Every commit: tsc + lint + targeted tests green before commit; full build + full suite at client-touching checkpoints.

**Correctness / failing tests**
- `29964e27` robust Tower-context project-root resolution (removed machine-specific hardcoded path) → fixed 3 failing `tower-context` tests; baseline vitest 3-failed → 0-failed.
- `80f61c52` deterministic pagination in `warmth-decay` + `cfo-threshold` crons (`.range()` needed `.order("id")` — was skipping/double-processing rows).
- `934ec851` **(HIGH)** deliver cron alerts that silently never inserted — `source_entity_id` uuid column vs non-UUID composite keys; deterministic-UUID coercion + opt-in `dedupeBySourceEntity`. + coercion unit tests.
- `9a673c9a` **(HIGH)** `reconciler.readMonthlySpend` graceful default — one corrupt `monthly-spend.json` no longer aborts the whole crash-recovery loop.

**Performance (N+1 elimination)**
- `edac59e4` batch source-id dedupe in job-discovery (was 1 query/candidate).
- `95f786dd` batch prep-packet freshness lookup in `packet-regenerate`.
- `4d095824` kill Gmail-sync N+1: fetch applications once, pure matcher per email (≤20× → 1 on the OAuth-callback path) + 7 matcher tests.
- `b7279552` batch target-company name lookups in `warm-intro-scan`.

**Reliability (timeouts + error handling)**
- `edac59e4` 8s `AbortSignal.timeout` on job-board + Firecrawl fetches.
- `4af0c80b` 10s timeouts on every Gmail/Calendar fetch (OAuth-callback path); 45s abort + try/catch→503 on the offer-simulator AI call.
- `2a55bc66` abort in-flight compose streams on Writing-Room unmount (stops 3 leaked LLM streams + cost); re-arm weather auto-refresh after a cache hit.
- `d2e33313` Drive export: 10s timeouts on all 3 fetches, resolve tokens once, stop leaking internal error text.
- `503ddbbf` 10s timeouts on the Google OAuth + sign-in token endpoints; drop the PDF-route 500 error-text leak.
- `89d80842` **(HIGH ×2)** guard the last two unguarded AI routes (`negotiation-draft`, `reference-request`) → clean 503; all five AI-failure paths now `log.error`. +2 reject→503 tests.
- `2646b7b8` graceful-degrade the comp-bands lookup in the Parlor "Convene" route (`bands=null`, matches the sibling route) instead of a raw 500. +1 contract test.
- `fb504b6d` `readBinder` degrades a malformed debrief row to `null` (route maps → 404), mirroring `listBindersForUser`.

**Resource leaks / fragility**
- `065109af` clear ambient `setInterval`s on sound-engine teardown (per-navigation timer leak + cross-floor SFX bleed).
- `43ad1460` **(HIGH)** ArtLab daemon worker fds `closeSync`'d after spawn (EMFILE leak); `activate` Gmail-race timeout cleared in `finally`; OpenWeather fetch bounded by `AbortSignal.timeout(5s)`; `LiveComposePanel.onComplete` one-shot via ref.

**Daemon robustness / data-loss**
- `292ea37e` quarantine malformed ArtLab inbox intents into `.bad/` instead of silently deleting; move `lastRunArchivalAt` onto `DaemonContext`.
- `85d396e3` guard the scheduler heartbeat against an uncaught timer throw (worker-crash path); declare 3 env vars in the schema.

**Security / info-leak / defense-in-depth**
- `ab2e0e72` stop echoing internal `err.message` in the report 500; correct 11 cron-auth docstrings that falsely implied the spoofable `x-vercel-cron` header is accepted (verified against the 49-test cron-auth suite).
- `991917ca` comp-bands try/catch (graceful-empty), JSON-LD `</script>` escaping (×2), `.or()` UUID guard, accurate `publicArtRoot` comment.
- **`npm audit fix`** (lockfile-only, semver-compatible): 7 advisories → **0**, incl. the **HIGH** Next.js App-Router Middleware/Proxy segment-prefetch bypass (`next` 16.2.5 → **16.2.7**). `package.json` unchanged.

**Dead code / hardcoded paths**
- `aab88470` remove unused exports + demote two Drive helpers to private + drop 2 unused test imports → lint 3 warnings → 1.
- `10cd19ea` derive `publicArtRoot` from `ARTLAB_PROJECT_ROOT`/cwd instead of a hardcoded home path.
- `97ecf82a` un-export internal-only debrief schemas + delete 2 dead aliases; declare 2 `TOWER_*` flags in the env schema.

**Docs / accuracy**
- `f4d9fa3d` expand README Development section (Node version, env setup, the full tsc/lint/test/build/e2e quality-gate commands).
- `1495ebf2` correct the `draft-follow-ups` cron docstring (`0 8 * * *` daily, not "every 2 hours") + flag the timezone coverage gap.
- `059c359d` correct six stale cron docstrings to once-daily-per-vercel.json (the Hobby migration left them claiming 5-min/hourly/6-hourly cadences); fix `owner-watchdog`'s scheduler pointer (GitHub Actions, not vercel.json).
- `a5519a64` fix the `warmth.ts` tier day-range comments to match the decay formula.

---

## Skills & workflows actually used

| Tool / skill | Used for |
|---|---|
| `Workflow` (multi-lens fan-out + adversarial-verify stage) | **All 8 DIAGNOSE passes.** Parallel read-only auditors (security, bugs, error-handling/perf, dead-code, fragility, regression-of-diff) returning structured findings; a second stage spawns an independent skeptic per finding that tries to *refute* it before it counts; survivors classified safe-to-fix vs. needs-human-review. ~3.4M+ subagent tokens total across the 8 passes. |
| `Agent` (subagent_type **codex**) | Independent adversarial review of the full diff (`origin/main...HEAD`) — second-model correctness check; verdict "SAFE TO KEEP". |
| `superpowers:using-git-worktrees` (native) | Isolated worktree `../overnight-claude` on `auto/overnight-claude-2026-06-04`, parallel-safe vs the codex agent. |
| `superpowers:systematic-debugging` | Root-causing the baseline failures + each finding before fixing. |
| `superpowers:test-driven-development` | New regression tests written alongside fixes (rate-limit, inbox quarantine, simulator-503, Gmail matcher, negotiation/reference 503, convene graceful-degrade). |
| `superpowers:receiving-code-review` | Triaging Codex's + the verifier agents' flags — verified rather than blindly accepted. |
| `superpowers:verification-before-completion` | tsc + lint + targeted tests before every commit; full build + full suite at checkpoints. |
| `TaskCreate`/`TaskUpdate` | Phase tracking across baseline → diagnose → fix → coverage → finish. |
| `Bash` background tasks + completion notifications | Non-blocking build/test/diagnostic runs. |

---

## How to read this branch

```bash
git log --oneline main..auto/overnight-claude-2026-06-04   # 32 commits, oldest→newest with --reverse
git diff --stat main..auto/overnight-claude-2026-06-04      # 75 files, +1598/−395
```

Every commit is independently revertible and green. The branch is pushed to origin and **not** merged to `main` — review and merge at your discretion. The 17 "Needs human review" items above are the recommended next backlog.
