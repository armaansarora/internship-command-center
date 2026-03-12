---
phase: 4
slug: cloud-migration-and-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `internship-command-center/vitest.config.ts` |
| **Quick run command** | `cd internship-command-center && npx vitest run` |
| **Full suite command** | `cd internship-command-center && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd internship-command-center && npx vitest run`
- **After every plan wave:** Run `cd internship-command-center && npx vitest run --reporter=verbose && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + manual auth flow verification
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CLOUD-01 | unit | `npx vitest run src/__tests__/db.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | CLOUD-02 | unit | `npx vitest run src/__tests__/seed.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | CLOUD-05 | smoke | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | AUTH-05 | smoke | `npx vitest run src/__tests__/auth.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | CLOUD-01 | unit | `npx vitest run src/__tests__/db.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | CLOUD-02 | unit | `npx vitest run src/__tests__/seed.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | CLOUD-04 | smoke | `npm run build` | ✅ | ⬜ pending |
| 04-XX-XX | XX | 1+ | CLOUD-05 | smoke | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-01 | manual | Navigate unauthenticated, verify redirect | N/A | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-02 | manual | Sign in with non-whitelisted email | N/A | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-03 | manual | Check session.accessToken in server component | N/A | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-04 | manual | Check consent screen shows correct scopes | N/A | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-05 | smoke | `curl http://localhost:3000/ --max-redirs 0` | ❌ W0 | ⬜ pending |
| 04-XX-XX | XX | 1+ | AUTH-06 | manual | Click sign out, verify redirect | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/db.test.ts` — rewrite to use `@libsql/client` async API (covers CLOUD-01, CLOUD-02, CLOUD-05)
- [ ] `src/__tests__/seed.test.ts` — rewrite to use `@libsql/client` async API (covers CLOUD-02)
- [ ] `src/__tests__/auth.test.ts` — new smoke test: verify proxy.ts exports, auth() returns null when no session (covers AUTH-05)
- [ ] Framework install: `npm install next-auth@beta googleapis @libsql/client` — if not yet done

*Existing infrastructure: vitest.config.ts present, node environment configured, `@` path alias working — all correct for post-migration tests*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth sign-in flow | AUTH-01 | Requires browser interaction with Google consent screen | Navigate to app → verify redirect to Google → sign in → verify return |
| Non-whitelisted email rejected | AUTH-02 | Requires browser interaction with a different Google account | Sign in with non-whitelisted email → verify error/rejection |
| JWT auto-refresh after 1 hour | AUTH-03 | Token expiry timing, requires waiting or mocking clock | Check session.accessToken exists, verify refresh callback in auth.ts |
| OAuth scopes include Gmail + Calendar | AUTH-04 | Visual verification of Google consent screen | Sign in → verify consent screen lists all required scopes |
| Sign-out clears session | AUTH-06 | Browser session state interaction | Click sign out → verify redirect to sign-in → verify protected routes inaccessible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
