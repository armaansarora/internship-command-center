---
phase: 5
slug: ui-ux-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `internship-command-center/vitest.config.ts` |
| **Quick run command** | `cd internship-command-center && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd internship-command-center && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd internship-command-center && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd internship-command-center && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | UX-01 | unit | `npx vitest run src/__tests__/layout-transition.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | UX-02 | unit | `npx vitest run src/__tests__/animated-list.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | UX-03 | unit | `npx vitest run src/__tests__/toast-integration.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | UX-04 | unit | `npx vitest run src/__tests__/command-palette.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | UX-05 | smoke | Manual — check loading.tsx files exist | N/A | ⬜ pending |
| 05-03-02 | 03 | 2 | UX-06 | unit | `npx vitest run src/__tests__/empty-states.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | UX-07 | unit | `npx vitest run src/__tests__/inline-edit.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 3 | UX-08 | unit | `npx vitest run src/__tests__/bottom-tab-bar.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-04-02 | 04 | 3 | UX-09 | smoke | Manual — visual inspection | N/A | ⬜ pending |
| 05-04-03 | 04 | 3 | UX-10 | unit | `npx vitest run src/__tests__/swipeable-card.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/layout-transition.test.ts` — stubs for UX-01 (mock LayoutRouterContext)
- [ ] `src/__tests__/animated-list.test.ts` — stubs for UX-02
- [ ] `src/__tests__/toast-integration.test.ts` — stubs for UX-03 (mock sonner toast)
- [ ] `src/__tests__/command-palette.test.ts` — stubs for UX-04 (keyboard event + navigation)
- [ ] `src/__tests__/empty-states.test.ts` — stubs for UX-06
- [ ] `src/__tests__/inline-edit.test.ts` — stubs for UX-07 (mock server action)
- [ ] `src/__tests__/bottom-tab-bar.test.ts` — stubs for UX-08
- [ ] `src/__tests__/swipeable-card.test.ts` — stubs for UX-10

*UX-05 (loading skeletons) and UX-09 (micro-interactions) verified by file existence and manual visual inspection.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Loading skeletons exist for all routes | UX-05 | Structural/visual — file existence check sufficient | Verify loading.tsx exists in each route directory |
| Micro-interactions are smooth | UX-09 | Visual fidelity — hover/press states need visual confirmation | Hover over tier badges, press buttons, verify smooth transitions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
