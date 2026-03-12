---
phase: 8
slug: deploy-and-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npm run lint`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + production URL accessible + all smoke checks pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | DEPLOY-01 | manual-only | N/A -- verify via Vercel dashboard after push | N/A | ⬜ pending |
| 08-01-02 | 01 | 1 | DEPLOY-02 | manual-only | N/A -- create test branch, verify preview URL | N/A | ⬜ pending |
| 08-01-03 | 01 | 1 | DEPLOY-03 | smoke | `curl -s https://<app>.vercel.app/api/auth/providers` | N/A | ⬜ pending |
| 08-02-01 | 02 | 2 | DEPLOY-04 | manual-only | N/A -- open production URL on phone/laptop | N/A | ⬜ pending |
| 08-02-02 | 02 | 2 | DEPLOY-05 | smoke | `curl -o /dev/null -s -w '%{time_total}' https://<app>.vercel.app/` | N/A | ⬜ pending |
| 08-XX-XX | XX | X | N/A | automated | `npm run build` | ✅ | ⬜ pending |
| 08-XX-XX | XX | X | N/A | automated | `npm run lint` | ✅ | ⬜ pending |
| 08-XX-XX | XX | X | N/A | automated | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No Wave 0 test setup needed.*

Phase 8 requirements are primarily deployment/infrastructure that require manual verification against the live production URL. Existing vitest, build, and lint commands cover automated checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel auto-deploy from GitHub | DEPLOY-01 | Requires GitHub push + Vercel dashboard check | Push to main, verify deployment appears in Vercel dashboard |
| Preview deploys per branch | DEPLOY-02 | Requires branch creation + Vercel preview URL | Create feature branch, push, verify preview URL in Vercel |
| App accessible from any device | DEPLOY-04 | Requires physical device test | Open production URL on phone and laptop browser |
| Security headers present | DEPLOY-03 | Smoke test against live URL | `curl -I https://<app>.vercel.app/ \| grep -i x-frame` |
| PWA manifest accessible | N/A | Smoke test against live URL | `curl -s https://<app>.vercel.app/manifest.webmanifest` |
| OG image accessible | N/A | Smoke test against live URL | `curl -s -o /dev/null -w '%{http_code}' https://<app>.vercel.app/opengraph-image` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
