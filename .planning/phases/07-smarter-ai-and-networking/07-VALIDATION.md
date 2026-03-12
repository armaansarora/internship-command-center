---
phase: 7
slug: smarter-ai-and-networking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | NET-01 | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | NET-04 | unit | `npx vitest run src/__tests__/warmth.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | NET-05 | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | NET-03 | unit | `npx vitest run src/__tests__/contacts-schema.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | AI-02 | unit | `npx vitest run src/__tests__/cover-letter-versions.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | AI-01 | unit | `npx vitest run src/__tests__/interview-prep.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | AI-04 | manual | Manual -- requires live Claude API | N/A | ⬜ pending |
| 07-03-02 | 03 | 2 | AI-05 | manual | Manual -- requires live Claude API | N/A | ⬜ pending |
| 07-03-03 | 03 | 2 | NET-02 | manual | Manual -- visual/UI verification | N/A | ⬜ pending |
| 07-03-04 | 03 | 2 | NET-06 | manual | Manual -- form interaction | N/A | ⬜ pending |
| 07-03-05 | 03 | 2 | AI-03 | manual | Manual -- visual/UI verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/contacts-schema.test.ts` — stubs for NET-01, NET-03, NET-05
- [ ] `src/__tests__/warmth.test.ts` — stubs for NET-04
- [ ] `src/__tests__/cover-letter-versions.test.ts` — stubs for AI-02
- [ ] `src/__tests__/interview-prep.test.ts` — stubs for AI-01

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Company comparison table | AI-04 | Requires live Claude API for structured output | Generate comparison for 2 companies, verify table columns |
| Follow-up template tones | AI-05 | Requires live Claude API for tone variation | Generate thank-you vs cold follow-up, compare tone |
| Contact cards on detail | NET-02 | Visual/UI verification | Navigate to app detail, verify contact cards render |
| Contact form | NET-06 | Form interaction testing | Add/edit contact, verify form validation |
| CL side-by-side comparison | AI-03 | Visual/UI verification | Generate 2 CLs, open comparison, verify layout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
