# Overnight Hardening Report — `claude`

**Agent:** claude (parallel agent: codex — strictly isolated)
**Branch:** `auto/overnight-claude-2026-06-04` (worktree `../overnight-claude`, based off `main` @ f84aee87)
**Started:** 2026-06-04
**Repo:** The Tower — Internship Command Center (Next.js 16 / Supabase / Drizzle / Vercel AI SDK v6)

---

## Stack & toolchain (detected)

| Aspect | Value |
|---|---|
| Framework | Next.js 16.2.5 (App Router), React 19.2.4 |
| Package manager | npm (package-lock.json), Node 24.x |
| Type checker | `npx tsc --noEmit` |
| Linter | `npx eslint .` (eslint 9, flat config `eslint.config.mjs`) |
| Test runner | `vitest run` (node env, `fileParallelism: false`) — ~2285 tests / 297 spec files |
| Build | `next build` |
| E2E | Playwright (`test:e2e`, chromium) — needs stub server :3001; CI runs it `continue-on-error` |
| DB | Supabase REST at runtime; Drizzle for schema/migrations only |

**CI gates (authoritative):** `config-guard.yml` (vitest on config+db, `tsc --noEmit`, LAUNCH_CONFIG guard), `hardening-e2e.yml` (Playwright, non-blocking), plus artlab-* workflows for art changes.

**Build/test env:** `.env.local` stub created in worktree using the **exact CI stub values** (`https://stub.supabase.co`, etc.) — no real secrets, gitignored, never committed.

---

## Skills & workflows available (enumerated) → routing plan

**Process skills:** superpowers:systematic-debugging (bugs/test failures), superpowers:test-driven-development (new tests), superpowers:verification-before-completion (before any "done" claim), superpowers:requesting-code-review, superpowers:finishing-a-development-branch.

**Codex skills (lean hard):** `codex` (delegate one-shot tasks / second opinion), `codex:rescue` (deep investigation / alternate implementation), `codex:gpt-5-4-prompting`. Routed for: independent diagnostic pass, adversarial verification of fixes, second-model review.

**Domain skills:** improve-codebase-architecture (deepening/refactor opportunities), code-review skill (diff review), security-review (branch security review), impeccable / ui-ux-pro-max / frontend-slides (final HTML report polish), supabase:* + vercel:* (platform-correct fixes).

**Orchestration:** `Workflow` tool — parallel READ-ONLY diagnostics fan-out; writes serialized in the main thread.

**Routing:** diagnostics → Workflow fan-out (Explore + codex). Fixes → systematic-debugging / TDD, serialized commits. Review → code-review + codex adversarial verify. Report → impeccable/ui-ux-pro-max.

---

## Baseline (iteration 0)

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ **0 errors** |
| `eslint .` | ✅ **0 errors, 3 warnings** (2 unused test imports, 1 `<img>` in a test fixture) |
| `next build` | ✅ **exit 0, 0 warnings** (full route table prerendered) |
| `vitest run` | ❌ **3 failed / 4259 passed / 10 skipped** (4272 tests, 665 files, 124.5s) — all 3 in `tower-context.test.ts` |
| `npm audit` | ⚠️ **7 vulnerabilities** (6 moderate, 1 high) — security backlog |

### Baseline failing tests (root cause)
All 3 failures (`tower-context.test.ts`: style envelope / image prompts / bible canon) trace to a **machine-specific hardcoded path**: `tower-context.ts:105` `LOCAL_PROJECT_ROOT_GUESS = "/Users/armaanarora/Documents/The Tower"`. When `resolveProjectRootFromWorkspace` can't find docs via the (temp-dir) workspace, it falls back to that absolute path — which is a *different* checkout than the test's actual repo root, so the docs read as empty. The full `npm test` suite is **not run in CI** (`config-guard.yml` only runs `npm test -- src/lib/config` and `npm test -- src/db`), so this regression was invisible. Worktree docs verified to contain all asserted content → fix is purely robust root-resolution.

Same machine-specific path also appears as a runtime fallback in `promotion-runner.ts:113` (`ARTLAB_PUBLIC_ART_ROOT ?? "/Users/armaanarora/Documents/The Tower/public/art"`) and in `approved-character-assets.generated.json` (generated — not touched).

### Lint warnings (baseline)
1. `src/lib/artlab/daemon/cli-inbox-consumer.test.ts:3` — unused `readdirSync`
2. `src/lib/artlab/sdk/agents/character-master/types.test.ts:5` — unused `CharacterMasterStageSchema`
3. `src/lib/artlab/sdk/asset-pack/__fixtures__/golden-character-sprite-snippet.tsx:6` — `<img>` (fixture)

---

## Iteration log

### Iteration 1 — DIAGNOSE (Workflow: `overnight-diagnose-claude`, 5 parallel read-only auditors)
501k subagent tokens, 210 tool uses, 338s. **24 findings: 2 high / 9 medium / 13 low.** Auditors unanimously rate the codebase mature & secure (fail-closed cron auth w/ timing-safe compare; HMAC-signed OAuth state; signature-verified Stripe webhook; RLS-scoped queries; no injection; no hardcoded secrets; disciplined Zod/safeParse; zero `as any`/`@ts-ignore` in shipped code; all 44 deps used).

Findings cluster into: **missing network timeouts** on user-facing request paths, **two N+1 query patterns**, a **timezone correctness bug** (COO briefing), a **streaming-reader leak** (Writing Room), **daemon data-loss/robustness** edges, plus low-severity dead code & doc/accuracy nits. Pre-verified independently: no Supabase `.or()`/`.ilike()` injection (all interpolations are server-computed or upstream-UUID-validated).

Fix batches (priority order): env-convention → external-call timeouts → N+1 batching → timezone → stream-leak/weather → daemon robustness → dead code → doc/error-leak → promotion-path. Two deferred for careful review: outreach email idempotency (#3, external contract) and match-delta atomic debounce (#23, DB concurrency).

---

## Needs human review

Deferred deliberately — each is a real finding but touches an internal contract, DB concurrency, or has a risk/value tradeoff that makes an unattended fix unwise ("smaller reversible change > big risky one").

1. **COO daily-briefing timezone (#4, #5)** — `getDailyBriefingData(userId)` computes "today's interviews" and renders interview times in **server-UTC**, not the user's IANA timezone (penthouse/cron already do this correctly). Genuine user-facing bug (wrong-day interviews for non-UTC users). **Why deferred:** `getDailyBriefingData` is consumed as a typed callback across many call sites including the **CEO dispatch-graph contract** (`loadStats`/`loadContext` in `ceo-orchestrator.ts:432`). Threading a timezone through is a wide, contract-touching change, and tz-aware day-boundary math done wrong shows the *wrong* interviews — worse than today's consistent UTC. **Recommended:** add optional trailing `timeZone?: string` (assignable to the existing callback type, so no contract break), source it from `user_profiles.timezone`, compute user-local midnight→UTC boundaries with an Intl-based helper, and wire the two direct callers first (`situation-room/page.tsx`, `api/coo/route.ts`); pass tz into `buildCOOSystemPrompt`'s `toLocaleTimeString`.

2. **Outreach duplicate-email on update failure (#3)** — `outreach-sender/route.ts`: after a successful `resend.emails.send`, if the row's status update to `sent` fails, the row stays `approved` and re-sends next tick. **Why deferred:** sending email is an external contract; the clean fix (`resend.emails.send` idempotencyKey derived from row id) needs verification of Resend SDK support, and the alternative (mark pending/failed on updateErr) changes the blast-brake state machine. **Recommended:** pass an idempotencyKey = row id to Resend so a re-send is deduped provider-side.

3. **sdk-poller archive self-wedge (#19)** — if `seedRunState`+`enqueueArtLabRun` succeed but the inbox→archive move fails, the next tick re-enqueues, hits the `wx` collision, throws, and the inbox file wedges forever. **Why deferred:** the fix touches `enqueueRun`'s atomic-`wx` invariant; making it idempotent globally could permit double-enqueue (worse than a rare wedge). **Recommended:** in `submitArtLabJob`, before enqueue, check whether the queue entry for this runId already exists and if so skip enqueue and re-attempt the archive (localized, preserves `wx` semantics).

4. **match-delta non-atomic debounce (#23)** — two concurrent rescans can both pass the read-then-check and both run the expensive (idempotent) rebuild. **Why deferred:** LOW severity (wasteful, not incorrect). The "claim-the-window-first" fix would advance the timestamp before the rebuild, so a *failed* rebuild then skips retries for 5 min — a worse failure mode — unless racy compensation is added. **Recommended:** atomic conditional `UPDATE ... WHERE last_rescan_at IS NULL OR last_rescan_at < now()-interval '5 min' RETURNING id` to claim, with timestamp reset on rebuild failure.

5. **env() convention nits (#21, #22)** — `EXPORT_EMAIL_FROM`/`OUTREACH_EMAIL_FROM` read via `process.env` and absent from `EnvSchema`; `FIRECRAWL_API_KEY` read via `process.env` though it's in the schema. **Why deferred (low value):** switching these optional-feature reads to `env()` couples them to full-schema validation — a missing required var would turn a graceful `null`/disabled-feature into a throw, a mild resilience regression. The adjacent `comp-bands/lookup.ts` already reads `process.env` directly by the same pattern. Low value; left as-is.

### Pre-existing notes (not bugs)
- The full `npm test` suite is **not run in any CI workflow** (`config-guard.yml` runs only `npm test -- src/lib/config` and `npm test -- src/db`; `hardening-e2e.yml` runs Playwright). This is why the `tower-context` failures (Fix #0) were invisible. **Recommendation:** add a lightweight `unit-tests.yml` running `npx tsc --noEmit` + `npm test` + `npm run lint` on every PR. (Not added here — CI workflow changes are owner-gated infra.)
- `launchd.test.ts` contains `/Users/armaanarora/Documents/The Tower/...` literals — these are explicit **test fixtures** for plist generation (legitimate test inputs), not runtime fallbacks.

---

## Fixes (grouped)

All commits on `auto/overnight-claude-2026-06-04`. Every commit: tsc + lint + targeted tests green before commit; full build run at client-touching checkpoints.

**Correctness / failing tests**
- `29964e27` fix(artlab): robust Tower-context project-root resolution (removed machine-specific hardcoded path) → fixed 3 failing `tower-context` tests; baseline vitest 3-failed → 0-failed.

**Performance (N+1 elimination)**
- `edac59e4` batch source-id dedupe in job-discovery (was 1 query/candidate) + timeboxes on Greenhouse/Lever/Firecrawl fetches.
- `95f786dd` batch prep-packet freshness lookup in `packet-regenerate` cron (was 1 SELECT/row).

**Reliability (timeouts + error handling)**
- `edac59e4` 8s `AbortSignal.timeout` on job-board + Firecrawl fetches (request paths).
- `4af0c80b` 10s timeouts on every Gmail/Calendar API fetch (awaited on OAuth callback); 45s abortSignal on the offer-simulator `generateObject`; try/catch→503 on the simulator AI call.
- `2a55bc66` abort in-flight compose streams on Writing-Room unmount (stops 3 leaked LLM streams + cost); re-arm weather auto-refresh after a sessionStorage cache hit (was freezing after one refresh).

**Daemon robustness / data-loss**
- `292ea37e` quarantine malformed ArtLab inbox intents into `.bad/` instead of silently deleting (data loss); move `lastRunArchivalAt` onto `DaemonContext` (was a module global).

**Security / info-leak / docs**
- `ab2e0e72` stop echoing internal `err.message` in the report 500; correct 11 cron-auth docstrings that falsely claimed the spoofable `x-vercel-cron` header is accepted (verified against the 49-test cron-auth integration suite).

**Dead code / hardcoded paths**
- `aab88470` remove unused exports (`getTimeLabel`, `getTimeProgress`, `DrillInterrupt`), demote two internal-only Drive helpers to private, drop 2 unused test imports → lint 3 warnings → 1 (the remaining is an intentional `<img>` in a golden fixture).
- `10cd19ea` derive `publicArtRoot` from `ARTLAB_PROJECT_ROOT`/cwd instead of a hardcoded contributor home path.
