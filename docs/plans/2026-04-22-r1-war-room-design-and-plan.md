# R1 — War Room (Floor 7) — Design & Plan
**Date:** 2026-04-22 (autopilot session, scope: R1-only)
**Brief:** `docs/NEXT-ROADMAP.md §7 R1`
**Decomposition rationale:** Autopilot self-approval per §4 Climate + §5 Reference Library.

---

## The Proof we are building toward

> A cold user declares targets and returns later to ≥5 scored opportunities. Dragging a card between stages passes a three-person vibe test against Linear's issue drag. The proof-of-concept loop executes end-to-end in a user's first session. Whiteboard content visibly reflects `agent_memory` writes. Empty state invites. Lighthouse >90 on the War Room route.

The loop in one sentence: **user states targets → job arrives → CMO tailors resume → CMO drafts cover letter → queued for approval → user approves → Resend sends.**

---

## Existing foundation (survey results)

- Kanban `WarTable` with @dnd-kit + React 19 `useOptimistic` already passes the drag vibe test.
- `CRODialoguePanel` wired to `/api/cro` with four tools (query/manage/followup/convert).
- pgvector enabled. `match_company_embeddings` and `match_job_embeddings` RPCs exist with `p_user_id` scope.
- `agent_memory` table with 1536-dim embedding + `getMemoriesForContext()` retrieval.
- CMO has `generateCoverLetter` tool that writes to `documents` — pattern to follow.
- Resend integrated in R0 export worker; `RESEND_API_KEY` present.
- No Job Discovery source. No tailored-resume tool. No outreach send pipeline. Whiteboard reads static stats.

---

## Decisions (auto-approved per §5 Reference Library)

| Question | Decision | Why |
|---|---|---|
| Job Discovery sources | Greenhouse + Lever public APIs (no auth) + seed fallback of 40 synthetic JDs; JSearch only if env present | Ships without paywalled deps; seed keeps loop functional in fresh environments |
| Worker cadence | Hybrid — Vercel Cron every 4h + on-demand CRO tool `runJobDiscovery` | Fixed cadence per brief "I don't know yet"; on-demand covers first-session proof |
| Match-score storage | Stored on `applications.matchScore` (new column, decimal 0.00–1.00) + job_embedding row. Also denormalized for sort speed | Whiteboard and war-table both sort by it; re-score on demand if embedding changes |
| Match-score visual | Ribbon with glow on ApplicationCard (not sound, not color-coded chip) | Brief forbids colored-tag chips; ribbon fits mahogany/Bloomberg |
| CRO intake style | Conversational — CRO asks 4 questions in one flow, persists to `agent_memory` as `preference` category | Matches brief anchor "visible on a legal pad" and R0 memory infra |
| Outreach send mechanism | User-approval gate → `/api/cron/outreach-sender` (Vercel Cron, CRON_SECRET) + on-approve fire-and-forget call | Idempotent, resend_message_id stored, audit log on send |
| CEO dispatch | Sequential (tailor-resume → draft-letter → queue). Parallelism is R3's scope | Ships proof end-to-end without new orchestration plumbing |
| Batch Stamp UX | Shift-click multi-select + floating "Stamp To" bar; gavel-ish sound via existing SoundProvider | The "rubber-on-wood" provocation; existing SoundProvider covers audio |
| Empty state copy | "This floor is waiting. Tell the CRO your targets — the war table fills itself." with CTA opening dialogue | Satisfies Climate "empty states invite, not apologize" |

Anti-patterns explicitly avoided: Trello-skin, Kanban header labels, "+ Add task", drop-shadow hover, colored-tag chips, any Asana word.

---

## Task breakdown (critical path first)

| ID | Title | Notes |
|----|-------|-------|
| R1.1 | CRO `captureTargetProfile` tool + agent_memory seeding | First brick. Writes preference rows. |
| R1.2 | Job Discovery source adapters + scorer (pgvector cosine × company-tier) | No external keys needed. |
| R1.3 | Job Discovery worker — cron + on-demand CRO tool + deduper | Creates discovered-status applications. |
| R1.4 | CROWhiteboard — live view of agent_memory (targets + findings + one pattern) | Replaces static stats. |
| R1.5 | CMO `generateTailoredResume` tool | Mirrors cover-letter pattern. |
| R1.6 | Outreach draft→approve→send pipeline + Resend send | CSRF on state routes. |
| R1.7 | CEO Ring-the-Bell — "run North Star for application" macro | Dispatches R1.5 → R1.6. |
| R1.8 | Batch Stamp — multi-select + Stamp action | UX provocation. |
| R1.9 | War Room empty state invitation | Climate quality floor. |
| R1.10 | Playwright E2E — cold user → 5 scored opps → full loop | Acceptance criterion. |
| R1.11 | Lighthouse >90 + bundle audit | Performance gate. |
| R1.12 | Rate-limit + CSRF audit for Floor 7 surface | Climate security. |

Wave strategy:
- **Wave 1 (serial, critical path):** R1.1 → R1.2 → R1.3
- **Wave 2 (parallel subagents):** R1.4, R1.5, R1.6, R1.8, R1.9 — independent surfaces
- **Wave 3 (serial):** R1.7 (depends on R1.5 + R1.6)
- **Wave 4 (parallel subagents):** R1.10, R1.11, R1.12 — validation

Phase-complete verification before flipping `acceptance.met: true`:
1. `npm test` — all vitest suites green
2. `npx tsc --noEmit` — zero type errors
3. `npm run build` — Next.js production build green
4. `npm run lint` — baseline respected

---

## Voice & error copy (applies to every surface here)

- "Oops!" / "Something went wrong" / "Try again" — banned. Errors carry character.
- "No data yet" / "Add task" — banned. Empty states invite.
- "Dashboard" / "widget" / "panel" (except glass panel) — banned. Building language wins.
- Discover, arrival, stamp, tube, table, whiteboard, floor, dossier, binder — preferred.

---

## Out of scope for R1 (for later)

- Parallel CEO orchestration across agents (R3).
- JSearch/RapidAPI paid aggregator integration (add when user provides key).
- Interview prep handoff on status=interview_scheduled (R6).
- Match-score ribbon **sound** variant (pick one, we picked glow).
