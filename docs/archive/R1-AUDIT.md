# R1 — War Room — Audit Report

**Generated:** 2026-04-22 (autopilot)
**Scope:** Rate-limit + CSRF coverage for every mutating surface R1 introduced
or touched, plus a bundle/Lighthouse pre-check for the War Room route.

---

## §1 — State-change surfaces

| Surface | Caller | Auth | Rate-limit | CSRF |
|---|---|---|---|---|
| `POST /api/cro` | WarRoom dialogue + CEO orchestrator | requireUserApi | Tier B (20 rpm free / 60 rpm paid) via createAgentRouteHandler | Next.js App Router (Server Components; no cross-origin form posts) |
| `POST /api/cmo` | WritingRoom dialogue + CEO orchestrator | requireUserApi | Tier B | same |
| `GET /api/cron/job-discovery` | Vercel Cron | verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1) | n/a (cron) | n/a (cron) |
| `GET /api/cron/outreach-sender` | Vercel Cron | verifyCronRequest | n/a | n/a |
| Server Action `createApplicationAction` | War-room UI | requireUser | inherit from shared Supabase session | built-in (Next.js Server Actions) |
| Server Action `moveApplicationAction` | War-room drag | requireUser | same | same |
| Server Action `bulkMoveAction` | War-room Stamp bar | requireUser | same | same |
| Server Action `deleteApplicationAction` | War-room UI | requireUser | same | same |
| Server Action `updateApplicationAction` | War-room UI | requireUser | same | same |

**Finding:** every mutating surface is gated. Next.js 16 Server Actions are
CSRF-protected out of the box (POST requires same-origin + router-generated
action ids). Cron endpoints fail closed in prod if `CRON_SECRET` is unset
(see `src/lib/auth/cron.ts`).

## §2 — IDOR safety on vector queries

| Query | Path | Scope |
|---|---|---|
| `findSimilarJobByEmbedding` | `src/lib/db/queries/job-discovery-rest.ts:27` | RPC `match_job_embeddings` accepts `p_user_id` — IDOR-safe in WHERE, not just RLS |
| `findSimilarJobs` | `src/lib/db/queries/embeddings-rest.ts:316` | same |
| `findSimilarCompanies` | `src/lib/db/queries/embeddings-rest.ts:198` | same |
| `getTopDiscoveredApplications` | `src/lib/db/queries/job-discovery-rest.ts:176` | `eq('user_id', userId)` |
| `getTargetProfile` | `src/lib/agents/cro/target-profile.ts:165` | `eq('user_id', userId)` |
| `insertDiscoveredApplication` | `src/lib/db/queries/job-discovery-rest.ts:103` | `user_id` supplied by server-resolved auth; RLS + explicit scope |

**Finding:** every vector and scoped read passes a `user_id` in the query
body, not relying on RLS alone. Matches Climate §4 non-negotiable.

## §3 — Rate-limiting new cron routes

Cron routes are not user-rate-limited because they run as Vercel infra on a
bounded schedule (`*/5 * * * *` for outreach-sender, `0 */4 * * *` for
job-discovery). Worst-case invocation rate is the cron cadence itself. The
per-user work inside job-discovery is soft-bounded at
`DISCOVERY_MAX_NEW_PER_RUN = 10` inserts and at ~8s wall clock per user
(batch embedding limit + two RPC calls per candidate). The outreach-sender
batch cap is `OUTREACH_BATCH_LIMIT = 30`.

**Finding:** no additional user-level limiter needed for the cron surface.

## §4 — Audit-log coverage for R1

| Event | Where it fires |
|---|---|
| `agent_side_effect_email_sent` | outreach-sender after a successful Resend send |
| `agent_side_effect_status_updated` | (existing R0 hooks — unchanged) |

**Finding:** the North Star's primary user-visible side effect (the actual
email send) is audited. Other R1 side effects (application inserts,
document inserts) are data-plane writes the user initiated directly — they
don't carry the same audit requirement.

## §5 — Floor 7 bundle + Lighthouse pre-check

### Code-splits already in place
- `ApplicationModal` (761 LOC) is `dynamic(..., { ssr: false })` in
  `WarRoomClient.tsx:24`. Initial route bundle does NOT include it.
- The CRODialoguePanel is rendered only when `dialogueOpen`; its chat
  surface (`AgentDialoguePanel`) is pulled in on open.

### Heavy imports still on the critical path
- `@dnd-kit/core` + `@dnd-kit/sortable` (WarTable.tsx) — necessary for the
  kanban UX; keeping as critical path because user interaction is the
  central value of the floor. Tree-shake with the library defaults.
- GSAP — not directly imported by Floor 7 components.

### Run the audit (manual)
```bash
# In one terminal:
npm run dev

# In another:
npx lighthouse http://localhost:3000/war-room \
  --only-categories=performance,accessibility,best-practices \
  --chrome-flags="--headless --disable-gpu" \
  --output=html \
  --output-path=./lighthouse-war-room.html
```

CI-ready automation is a follow-on in R8/R9 (CFO telemetry floor).

### Known good baselines
- Server component pre-renders the skyline + window chrome (FloorShell);
  data fetching lives behind a Suspense boundary so first paint is
  near-instant.
- Whiteboard + top-find ribbons are derived from pre-aggregated queries
  (match_score index + targets fetch), not per-row client work.

## §6 — Follow-on items explicitly deferred from R1

| Deferred | Reason |
|---|---|
| Dedicated "stamp" procedural sound in engine.ts | bell-ring covers the cue; engine upgrade is its own card |
| Per-user verified outreach senders (user's own domain) | MVP uses Tower sender + user's email as reply-to |
| Full Playwright user-journey E2E with seeded test account | Gated on E2E creds + Resend mock infra |
| Parallel CEO dispatch (CMO + CRO concurrent) | R3 scope |
| Master-resume first-class document type | Current path accepts resume text directly on the tool call |
