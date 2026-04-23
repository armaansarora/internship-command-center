# R3 — C-Suite (Floor 1) Design
_Self-approved under autopilot §8. Design anchored to `docs/NEXT-ROADMAP.md` §7 and today's kickoff note ("≥3 agents in visible parallel", "`agent_dispatches` with `depends_on uuid[]` is a real deliverable", "Stripe/auth off-limits", "Dispatch Graph animates under load")._

## 1. Intent
Turn the CEO from a router into a conductor. When the bell rings, the boardroom fans out — multiple department heads dispatched **in parallel** — and the user watches the thinking happen as gold light flows across a live graph. Follow-on: the CEO speaks unprompted when thresholds trip. Agents learn from each other through a shared-knowledge bridge.

## 2. What Exists Today
- `RingTheBell.tsx` — bell button + 6 progress cards, driven by `tool-dispatchTo<X>` UIMessage parts forwarded from `CSuiteClient`.
- `CSuiteScene.tsx` — **static radial SVG** of 6 nodes around a CEO center (CFO missing; no animation). This is the anti-pattern the brief warns against.
- `ceo-orchestrator.ts` — 7 `makeDispatchTool` entries (CRO/COO/CNO/CIO/CMO/CPO/CFO). Dispatch is **sequential**: the CEO model calls one tool at a time inside its `maxSteps: 3` loop.
- Telemetry goes to `agent_logs` only. No dispatch tree, no depends-on, no request grouping.
- `user_profiles` has no shared-knowledge surface.
- Bell rings the briefing prompt but does not dim the building, pull the camera back, or signal other floors.

## 3. Target Behavior
- User rings bell → CEO model chooses to issue `dispatchBatch({ tasks: { cro:…, coo:…, cno:…, cio:… } })` (one tool call, N subagents).
- `dispatchBatch` fires all agents via `Promise.allSettled`. Wall-clock time ≈ slowest subagent, not Σ subagents.
- Each subagent writes a row to `agent_dispatches` (queued → running → completed|failed). Rows are keyed by a shared `request_id` and optionally `depends_on uuid[]`.
- UI shows parallel flow: 4 gold streaks travel from CEO to 4 nodes simultaneously; nodes pulse while running; flip green on completion. Poll `/api/ceo/dispatches?requestId=…` at 300ms during orchestration.
- `/`-inject: mid-dispatch, the user can press `/` to open a tiny inline input; submit inserts a new instruction into the CEO chat.
- Unprompted CEO: a cron sweeps thresholds (stale apps, rejection clusters, offers), inserts `notifications` rows with `sourceAgent=ceo`. Existing `NotificationSystem` surfaces them in-world.
- Shared knowledge: `user_profiles.shared_knowledge jsonb` = `{ [agent]: { [key]: value } }`. Subagent prompts include the slice relevant to them (e.g., CRO sees entries from all agents about the applications it's ranking).

## 4. Non-Goals for R3
- **CEO voice (TTS/STT)**: deferred to R4. Same "I don't know yet" reason as R2.
- **Stripe / auth / billing-gate changes**: **OFF LIMITS**. Requires two independent reviewer sessions. If a subtask drifts there, block + move on.
- **3D bell / R3F scene**: keep the 2D brushed-gold SVG bell. The metaphor is carried by the **graph animation + building dim**, not by a WebGL bell.
- **Force-directed layout**: overkill at n=7. Fixed radial layout + CSS-animated streaks is sufficient and main-thread safe.
- **Supabase realtime for dispatch state**: polling at 300ms during orchestration is simpler and degrades cleanly. Upgrade to realtime only if polling is insufficient.

## 5. Deliverables

### 5.1 Schema additions
**Table `agent_dispatches`** — the dispatch tree, per bell-ring.

```ts
// src/db/schema.ts
export const agentDispatches = pgTable("agent_dispatches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull(),           // groups all dispatches for one user turn
  parentDispatchId: uuid("parent_dispatch_id"),       // for future nested fan-out
  agent: text("agent").notNull(),                     // cro | coo | cno | cio | cmo | cpo | cfo
  dependsOn: uuid("depends_on").array().default(sql`'{}'::uuid[]`),  // REAL depends_on uuid[] — not a stub
  task: text("task").notNull(),
  status: text("status", { enum: ["queued", "running", "completed", "failed"] }).notNull().default("queued"),
  summary: text("summary"),
  tokensUsed: integer("tokens_used").default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  userIsolation("agent_dispatches"),
  index("idx_dispatches_user_request").on(table.userId, table.requestId),
  index("idx_dispatches_request_status").on(table.requestId, table.status),
]);
```

**Column `user_profiles.shared_knowledge jsonb`** — the cross-agent bridge.

```ts
// src/db/schema.ts (patched)
sharedKnowledge: jsonb("shared_knowledge").default(sql`'{}'::jsonb`),
// shape: { [agentKey: string]: { [entryKey: string]: { value: string, writtenAt: string, writtenBy: string } } }
```

Migration: `0012_agent_dispatches_and_shared_knowledge.sql`. Two statements; idempotent with `IF NOT EXISTS` on the column add.

### 5.2 Parallel fan-out — `dispatchBatch` tool
New factory in `ceo-orchestrator.ts`. Input:

```ts
z.object({
  tasks: z.object({
    cro: z.string().min(8).max(2000).optional(),
    coo: z.string().min(8).max(2000).optional(),
    cno: z.string().min(8).max(2000).optional(),
    cio: z.string().min(8).max(2000).optional(),
    cmo: z.string().min(8).max(2000).optional(),
    cpo: z.string().min(8).max(2000).optional(),
    cfo: z.string().min(8).max(2000).optional(),
  }).refine(t => Object.values(t).filter(Boolean).length >= 2,
            "dispatchBatch requires at least 2 agents; use the single-agent tools otherwise"),
})
```

Execution:
1. Generate `requestId` (crypto.randomUUID()).
2. Insert one `agent_dispatches` row per present agent, status=`queued`.
3. `Promise.allSettled(Object.entries(tasks).map(([agent, task]) => runSubagent(..., dispatchId)))`.
4. Inside `runSubagent`: flip row to `running` at start, `completed`|`failed` at end, fill `summary` + `tokensUsed` + `startedAt`/`completedAt`.
5. Return a `BatchDispatchResult` to the CEO model — one compressed line per agent. CEO synthesizes.

Rationale: the CEO model still has `maxSteps: 3`, so in practice it issues ONE `dispatchBatch` tool-call for omnibus prompts and uses the single `dispatchToX` tools for focused asks. Token budget respected.

### 5.3 Dispatch Graph (animated)
Replace the static SVG in `CSuiteScene`. New file `src/components/floor-1/DispatchGraph.tsx`.

**Visual signature**: the graph BREATHES. When idle, 7 dim nodes + faint dashed edges. When a dispatch fires, a gold streak (CSS `<animateMotion>` along the edge path, 600ms duration) travels from CEO to the node. The node picks up a pulsing gold glow. On completion, node flips to emerald; a second streak runs BACK from the node to the CEO (the "report delivered" beat). On failure, red flash + node stays amber.

Implementation notes:
- 7-node radial layout, fixed. CFO added.
- Dots via SVG `<circle>` + `<animateMotion>` along `<path>`. All CSS/SVG animation — 0 JS per frame.
- Under load (7 streaks simultaneously): 7 concurrent SMIL animations ≈ cheap.
- `prefers-reduced-motion`: fall back to a color flash, skip motion path.
- Accessibility: `role="img"` with a dynamic aria-label that enumerates current dispatch status in words.

### 5.4 Live progress polling
New endpoint `GET /api/ceo/dispatches?requestId=…` returning `{ dispatches: Array<{ agent, status, startedAt, completedAt }> }`.

Client hook `useDispatchProgress(requestId, isActive)` polls every 300ms while `isActive` and the last poll showed at least one agent not in a terminal state.

`CSuiteClient` extracts `requestId` from the `dispatchBatch` tool-call input (stable once streaming) and wires the hook's output into the graph.

### 5.5 `/`-inject mid-dispatch
New floating pill above the bell when `phase === "orchestrating"`: hint "Press / to direct the CEO". On `/` keystroke (while dialogue panel is focused OR graph visible), open a small inline input. Submit calls `sendMessage` on the existing CEO chat. No new backend route.

### 5.6 Unprompted CEO triggers
New cron `/api/cron/unprompted-ceo/route.ts`. Runs every 6h. Per user (not-deleted, last_floor_visited within 30d):
- Stale cluster: `count(apps where status in ('applied','screening') and last_activity_at < now() - 14d) > 5` → `notifications` row (priority=high, title="Pipeline going cold").
- Rejection cluster: `count(apps where status='rejected' and updated_at > now() - 7d) >= 3` → priority=medium, title="3 rejections this week — let's regroup".
- Offer arrived: any app with `status='offer'` created in last 24h where no prior ceo notification references it → priority=critical, title="Offer in from {company}".

Notifications carry `actions: [{ label: "See briefing", floor: "1" }]`. Existing `NotificationSystem` renders them.

### 5.7 Shared-knowledge bridge
Helpers in `src/lib/db/queries/shared-knowledge-rest.ts`:
- `readSharedKnowledge(userId, agent?): Promise<Record<string, Entry>>` — slices to relevant agent OR returns all.
- `writeSharedKnowledge(userId, agent, key, value): Promise<void>` — merges into the jsonb (via Supabase `update`), records `writtenAt` + `writtenBy`.

Consumers:
- `buildCROSystemPrompt` accepts an optional `sharedKnowledge` param; injects as a short block after memories.
- `buildCIOSystemPrompt` same.
- CIO's `extractAndCompress` inner tool writes CI findings to shared-knowledge with keys like `company:{companyId}:intel:layoffs-2026-04-20`.
- CRO's system prompt scans for `company:{companyId}:*` entries that match apps in its active list.

Scope guard for R3: wire CIO→CRO only. Other agents touch the bridge in later milestones.

### 5.8 Bell polish — dim + pull-back
- CSS variable `--building-dim` on `<html>`, default 1. Flip to 0.4 for 600ms during `phase === "ringing"`, ease back to 1 during `orchestrating`.
- Scene transform `scale(0.97)` with `translateY(-8px)` during orchestrating, tweened via CSS transition. Reveals the graph.
- `prefers-reduced-motion`: skip both, use a fade-only.

## 6. Non-Negotiables the Design Meets
| Brief line | How |
|---|---|
| ≥3 departments dispatch **visibly in parallel** | `dispatchBatch` + graph animates N streaks; poll-driven node flips |
| `agent_dispatches` with `depends_on uuid[]` is a REAL deliverable | §5.1 — drizzle column + migration + real uuid[] default |
| Stripe / auth off-limits | nothing in §5 touches `/api/stripe`, `/api/auth`, `stripe_webhook_events`, `subscriptionTier` |
| Dispatch Graph animates under load | §5.3 — SMIL streaks, not static SVG |
| Bell-to-briefing time is **modest and felt as work** | parallel fan-out bounds on slowest subagent |
| `/`-inject adapts the plan | §5.5 |
| ≥3 threshold triggers fire autonomously | §5.6 |
| CEO briefing references a learning first captured by a sibling | §5.7 — CIO→CRO bridge |

## 7. Risks / Unknowns
- **Polling thrash**: 300ms polling during ~3s orchestration = 10 requests. Supabase REST is fine but I'll batch with `If-None-Match` style early-exit if nothing changed. If the request lands in a cold-start function, first poll may be slow; that's tolerable.
- **dispatchBatch prompt discipline**: the CEO model must choose batch over sequential for omnibus asks. The `dispatchBatch` tool description will explicitly say "use me when the user asks for a status-across-departments briefing". If the model still picks sequential, the fallback is fine (still works), just slower.
- **`animateMotion` browser support**: Safari + Chrome full; Firefox OK. IE excluded by scope. Reduced-motion path covers users who disable SMIL.
- **depends_on usage today**: R3 doesn't actually use dependent dispatches (all agents fan out flat). The column is there so later milestones can add 2-level dispatch (e.g., CRO→[depends CRO]→summarizer). Not a stub — it's a populated column that defaults to `'{}'` and is written as `[]` by `dispatchBatch`.

## 8. Verification Plan (Proof)
1. `npm test` — new vitest suites for:
   - `agent_dispatches` RLS (cross-user read denied).
   - `shared-knowledge` round-trip (CIO writes, CRO reads).
   - `dispatchBatch.proof.test.ts` — mocks subagents; asserts Promise.all parallelism (`started_at` spread ≤ 100ms across ≥3 agents; total wall-clock ≤ 1.5× slowest subagent).
   - Threshold functions for stale/rejection/offer triggers.
2. `npx tsc --noEmit` — zero errors.
3. `npm run build` — Next.js production build succeeds (required by autopilot gate).
4. `npm run lint` — baseline respected.
5. Manual smoke in dev: ring the bell with "How's everything looking?" → observe ≥3 gold streaks fire concurrently in the Dispatch Graph → CEO briefing returned in ≤ ~8s → `agent_dispatches` rows exist with overlapping started_at windows.

## 9. Task Plan Shape (→ see `2026-04-22-r3-csuite.md`)
12 tasks across 6 waves; waves 1, 2, 3, 4 are internally parallelizable via subagent-driven-development. All wrapped in the `tower start/done` protocol.

## 10. Decisions Logged
1. **Polling over Supabase realtime** for dispatch progress. _Why: avoids realtime channel setup overhead for a 3-second orchestration window; realtime can be added later if scale demands._
2. **2D brushed-gold SVG bell retained** (no R3F). _Why: the "boardroom runs" metaphor is carried by the graph animation + building dim, not by a WebGL bell; R3 scope budget preserves that for R4/R5 if it ever becomes the bottleneck._
3. **Fixed radial layout for 7 nodes** (no d3-force). _Why: force-directed at n=7 is jank risk on the main thread; fixed layout + animated edges delivers the same "watch it work" feel at zero main-thread cost._
4. **Voice deferred to R4**. _Why: same opt-in / permissions / audio-pipeline scope that R2 blocked on; R3 is already 12 tasks._
5. **CIO→CRO shared-knowledge bridge only in R3**. _Why: one consumer + one producer is enough to prove the Proof line "CEO briefing references a learning first captured by a sibling agent". Other agents wire in during later milestones._
6. **`depends_on uuid[]` populated but not exercised in R3**. _Why: the column is a real schema deliverable (non-stub). All R3 dispatches go out with `depends_on = []`; a future milestone adds 2-level dispatch. Having the column now avoids a later migration._
