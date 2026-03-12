---
phase: 1
slug: data-foundation-and-application-tracker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-01 | unit | `npx vitest run src/__tests__/db.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-02 | unit | `npx vitest run src/__tests__/schema.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | DATA-03 | unit | `npx vitest run src/__tests__/seed.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | DATA-04 | unit | `npx vitest run src/__tests__/cache.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | DATA-05 | unit | `npx vitest run src/__tests__/resume.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | TRACK-01 | integration | `npx vitest run src/__tests__/tracker.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | TRACK-02 | integration | `npx vitest run src/__tests__/filters.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | TRACK-03 | integration | `npx vitest run src/__tests__/search.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 2 | TRACK-04 | integration | `npx vitest run src/__tests__/detail.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 2 | TRACK-06 | manual | visual verification | N/A | ⬜ pending |
| 1-02-06 | 02 | 2 | TRACK-07 | manual | visual verification | N/A | ⬜ pending |
| 1-02-07 | 02 | 2 | TRACK-08 | integration | `npx vitest run src/__tests__/quickadd.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | UI-01 | manual | visual verification | N/A | ⬜ pending |
| 1-03-02 | 03 | 2 | UI-05 | manual | visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install test framework
- [ ] `vitest.config.ts` — configure for Next.js + TypeScript
- [ ] `src/__tests__/db.test.ts` — stubs for database init, WAL mode, singleton
- [ ] `src/__tests__/schema.test.ts` — stubs for schema validation
- [ ] `src/__tests__/seed.test.ts` — stubs for seed data loading

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode renders correctly | UI-01 | Visual/CSS verification | Open app, verify dark bg, light text, no white flashes |
| Tier color coding correct | TRACK-09 | Visual verification | Check Gold=T1, Blue=T2, Violet=T3, Gray=T4 |
| Status badges correct | TRACK-10 | Visual verification | Check Emerald=active, Amber=review, Fuchsia=interview, Red=rejected, Gray=applied |
| Navigation works | UI-05 | Visual verification | Click each nav item, verify routing |
| Responsive layout | UI-06 | Visual verification | Resize browser, verify no broken layout |
| Smooth transitions | UI-04 | Visual verification | Interact with UI, verify no janky transitions |
| Everything clickable | UI-07 | Visual verification | Click all interactive-looking elements, verify response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
