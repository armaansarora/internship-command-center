# Atelier — Creative Engine Dream Design

**Status:** Design approved, not yet implemented
**Author:** Brainstormed with Claude (Opus 4.7) on 2026-05-20
**Supersedes:** `docs/CREATIVE-PRODUCTION-ENGINE-V1-FINAL-PLAN.md`
**Implementation target:** `src/lib/atelier/` (new); legacy `src/lib/creative-production/` retires over 9-12 weeks
**Migration approach:** Greenfield with compat bridge (legacy frozen, drained asset-type by asset-type)

---

## 1. North Star

The Tower's Creative Production Engine becomes **Atelier** — an autonomous overnight engine that:

1. Receives a creative request via Telegram (with optional reference image attachments) or CLI.
2. Routes it through an LLM-backed brain that understands ambiguity ("Otis-compatible style envelope" ≠ "make Otis").
3. Generates exactly 5 prompt-only concept lanes with cast coherence + diversity QA.
4. Sends the concept board to Telegram as image attachments.
5. Accepts `approve direction <n>` via Telegram reply.
6. Automatically runs canary → production → cutout → strict QA → final board.
7. Sends the final 21-sprite board to Telegram as image attachments.
8. Accepts `approved for app` (EXACT phrase) via Telegram reply.
9. Promotes assets, updates manifest, runs Playwright e2e on integrated surfaces.
10. Confirms completion via Telegram with a single preview image.

**Two human gates only.** Everything else is autonomous. Armaan texts before bed; wakes to either finished assets or a single actionable blocker.

The engine remembers what worked and what didn't across runs. It enforces cast coherence at every concept board. It supports multi-asset bundles ("the war room with Rafe in it"). It drafts its own refactor branches when friction repeats. It can be cancelled mid-run and cleanly refunds reservations.

---

## 2. Locked-in design decisions

These came from the brainstorm Q&A. Each is non-negotiable in the V1 spec.

| Decision | Choice |
|---|---|
| Ambition | Autonomous overnight engine, two human gates only |
| Brain | Deterministic scheduler + LLM brain for novel decisions |
| Primary trigger surface | Telegram bot (with two-way image attachments) |
| Channel | Telegram (Bot API) |
| Secondary surface | CLI for power use; no browser studio |
| Budget posture | Pre-approved monthly cap + per-run soft cap |
| Engine voice | Anonymous engine, anonymous lanes — pure functional, no persona |
| Memory | Persistent style-wins + style-rejections + prompt-evolution ledgers |
| State machine | Simplify 22 → 10 core phases, blockers as orthogonal dimension |
| Asset roadmap | Cast first (10 more characters), then asset types one vertical slice at a time |
| .artlab/ history | Preserve as `.artlab/studio-legacy/`, start fresh in `.artlab/atelier/` |
| Cancellation | Real cancel — SIGTERM runner, refund unused reservations |
| Notification scope | Gates + blockers + completion; poll `/status` for everything else |
| Self-evolution | At 5x repeated friction, spawn Codex to draft a branch; never auto-PR |
| Pre-promotion QA | Real Playwright e2e on every promotion (per-asset-type assertions defined when each asset type is implemented; Otis QA is the character template) |
| Cast coherence | Auto check at concept board; silhouette + palette + age-impression cross-check |
| Multi-asset bundles | Yes — bundled requests spawn linked sub-runs |
| Parallelism | Up to 2 concurrent runs |
| Reference images | Yes — send photo via Telegram to use as style reference |
| Ambiguity handling | Engine asks back before starting work |
| Weekly digest | No |

---

## 3. Architecture

### 3.1 Module map

`src/lib/atelier/` houses 11 focused modules, each ≤ ~500 lines and not aware of other modules' internals:

| Module | Responsibility |
|---|---|
| `intake/` | Single-source request router. Parses requests, detects ambiguity, parses bundles, handles reference photo uploads. |
| `state/` | 10-phase state machine, atomic writes, the **reconciler** (single read path for run state). |
| `queue/` | Multi-run queue, parallelism limit (max 2), priority ordering, engine-level lock. |
| `runners/` | Concept, canary, production, cutout, strict-QA, promotion, verifying. Each ~200 lines. |
| `orchestrator/` | Deterministic scheduler walking the machine + LLM brain for novel decisions + progress publisher (heartbeat). |
| `memory/` | Style-wins ledger, style-rejections ledger, prompt-evolution ledger, retrieval API. |
| `coherence/` | Cast-level checks at concept board: silhouette diversity, palette range, style envelope, age impression. |
| `bot/` | Telegram surface: webhook handler equivalent (long-poll), message parser, image attachments both ways, identity verification, command handlers. |
| `daemon/` | Background runner: process supervisor, heartbeat, crash recovery, SIGTERM cancellation, Mac sleep guard. |
| `self-evolution/` | Friction detector, Codex summoner (drafts branches only — never opens PRs). |
| `health/` | Real snapshot builder — replaces today's hard-coded zeros with actual scans. |

**Reused unchanged from legacy:** `budget/ledger.ts`, `scheduler/scheduler.ts`, `providers/adapters.ts`, `promotion/index.ts`, `review/index.ts`, `cleanup/index.ts`, `contracts/index.ts`. Atelier re-exports these so the same plumbing serves both engines during migration.

### 3.2 Data flow

```
Telegram                                Vercel
   │                                       │
   │  (NOT USED — Mac polls directly)      │
   ▼                                       │
Mac Daemon ◄──── launchd auto-restart ─────┘
   │
   ├── Telegram long-poll loop
   ├── CLI inbox watcher (fs.watchFile)
   ├── Queue processor (max 2 active)
   │
   ▼
Atelier orchestrator
   │
   ├── Intake (route + ambiguity + bundle)
   │     └── LLM brain (if ambiguous or novel)
   │
   ├── State machine transition
   │     └── Reconciler validates before write
   │
   ├── Spawn runner (child process)
   │     ├── concept-runner / canary / production / cutout / strict-qa / promotion / verifying
   │     ├── Heartbeat publisher updates progress.json every 10s
   │     └── Catches SIGTERM, releases leases, refunds reservations
   │
   ├── Memory: read past wins + rejections to enrich prompt
   │
   ├── Coherence: hash signatures + LLM age estimate at concept board
   │
   ├── Promotion: copy to public/art, update manifest, run Playwright
   │
   └── Bot: send Telegram message (image attachments for boards)
```

### 3.3 CLI

One entry point: `scripts/atelier.ts` with subcommands.

```bash
atelier produce <request>            # New run; LLM brain routes
atelier continue <runId>             # Advance a continuable phase
atelier answer <runId> "<response>"  # Record human response
atelier status [runId]               # Plain English via reconciler
atelier queue                        # Queued + active runs
atelier health                       # Real health report
atelier cancel <runId>               # Send cancel signal
atelier daemon <start|stop|restart|status|logs>
atelier bot setup                    # Interactive Telegram setup
```

The four existing giant scripts (`creative-production-orchestrator.ts`, `creative-generation-adapter.ts`, `art-pipeline.ts`, `creative-production-health.ts`) get a deprecation banner pointing to atelier.

---

## 4. State machine + reconciler

### 4.1 Phases (10 core)

```
routed
  ↓ (intake confident, or ambiguity resolved)
generating-concepts
  ↓ (5 slots done + concept QA + cast coherence pass)
concept-review
  ↓ ("approve direction: <n>")
canary
  ↓ (canary slot generated, cutout passes, canary-gate written)
production
  ↓ (remaining slots done)
strict-qa
  ↓ (asset doctor passes, repair plan empty)
final-review
  ↓ ("approved for app" — exact phrase)
promoting
  ↓ (files copied, manifest updated)
verifying
  ↓ (Playwright e2e passes)
closed
```

### 4.2 Blockers (orthogonal — any active phase can enter one)

```
needs-human         — intake ambiguous, asking back
budget-blocked      — monthly or per-run cap hit
provider-blocked    — API failure, missing key
repair-required     — strict-qa found issues; running repair-auto
style-failed        — concept QA failed coherence/diversity; regenerating
upgrade-required    — CI ledger says engine needs hardening
cancelled           — human cancellation; refund flow ran
```

Phase + blocker is the full state. A run is `(phase: "production", blocker: "provider-blocked")` not `phase: "provider-blocked"`.

### 4.3 Transitions

`state/machine.ts` defines every transition explicitly:

```ts
type PhaseTransition = {
  from: AtelierPhase;
  to: AtelierPhase;
  blocker?: AtelierBlocker;
  trigger: "auto" | "human" | "blocker" | "cancel";
  validate(state, ctx): Promise<void>;  // throws if illegal
  apply(state, ctx): Promise<AtelierRunState>;
};
```

Validate-before-write means illegal transitions cannot corrupt state. Each transition writes `run-state.json`, appends `events.jsonl`, and may write `progress.json` (the heartbeat owns that file otherwise).

### 4.4 Reconciler — single read path

`state/reconciler.ts` is **the only legal way to read run state**. Every consumer (bot, CLI, health, runners, promotion) calls:

```ts
await readRunReality(runId): Promise<RunReality>
```

`RunReality` aggregates from: `run-state.json`, `progress.json`, `events.jsonl`, `provider-budget-ledger.json`, `slot-leases/*.lease.json`, `inbox/*/api-receipt*.json`, `canary-gate.json`, `cutout-readiness.json`, `asset-doctor.json`, `repair-plan.json`, review boards. Consumers never touch those files directly.

```ts
interface RunReality {
  runId: string;
  phase: AtelierPhase;
  blocker?: AtelierBlocker;
  slots: {
    completed: SlotResult[];
    running: SlotResult[];       // ← derived from slot-leases/ in real time
    failed: SlotResult[];
    pending: SlotSpec[];
  };
  spend: {
    actualCents: number;          // ← from provider-budget-ledger.json receipts
    reservedCents: number;
    refundedCents: number;
    monthlySpentCents: number;
    monthlyCeilingCents: number;
  };
  approvedConcept?: ApprovedConceptRef;
  reviewBoards: {
    concept?: BoardArtifact;
    final?: BoardArtifact;
    appPreview?: BoardArtifact;
  };
  human: {
    nextGate?: "concept-review" | "final-review" | "blocker-resolution";
    cta?: string;                 // exact Telegram message text
  };
  health: {
    activeLocks: string[];
    activeProcesses: ProcessRef[];
    lastHeartbeatAt?: string;
  };
  memory: {
    relevantPastWins: number;
    relevantPastRejections: number;
  };
  events: EventEntry[];           // last 20 events
}
```

### 4.5 Heartbeat — live progress that is honest

`orchestrator/progress-publisher.ts` runs alongside every active runner:
- Every 10 seconds while a runner is executing
- Reads `provider-budget-ledger.json` for actual spend
- Reads `slot-leases/*.lease.json` for active slots
- Counts completed receipts in inbox
- Writes `progress.json` atomically (temp + rename)
- Exits when the parent runner exits

`atelier status` mid-run returns real numbers. This eliminates the existing "21 slots running" frozen snapshot.

### 4.6 Atomic writes everywhere

- `run-state.json`: temp file + rename (existing pattern)
- `progress.json`: temp file + rename (every 10s during active work)
- `events.jsonl`: append-only (no rewrites)
- `slot-leases/*.lease.json`: `wx` flag for create, atomic delete on release

### 4.7 Cancel flow

1. `atelier cancel <runId>` (or Telegram `/cancel <runId>`)
2. Bot/CLI writes `inbox/cancel-<runId>.json`
3. Daemon picks up, validates the runner is active
4. Daemon sends SIGTERM to the runner child PID
5. Runner has 30s grace to release active leases, release unused reservations (via budget/ledger.ts `releaseCreativeBudgetReservation`), write final receipt
6. If grace expires, daemon SIGKILLs and marks run with `stale-process-killed: true`
7. Daemon writes state transition: `blocker: cancelled`
8. Reconciler reflects final accurate spend
9. Bot replies: *"Cancelled at <phase>. $X.XX spent, $Y.YY refunded."*

---

## 5. Surfaces

### 5.1 Telegram bot

**Hosting:** Mac daemon long-polls Telegram `getUpdates` (60s timeout). No Vercel webhook. Keeps the data path off the public network.

**Identity:** every inbound message checks `chat.id === TELEGRAM_CHAT_ID` (stored in macOS Keychain). Other senders are silently dropped.

**Inbound message types:**

| Form | Example | Engine action |
|---|---|---|
| Plain trigger | `make Sol Navarro` | Intake → route → start run |
| Trigger + photo | `make Priya like this` + image | Intake → route → store photo as reference → start run |
| Gate reply | `approve direction 2` | Apply human response → advance |
| Bundle | `make the war room with Rafe in it` | Bundle parser → spawn linked sub-runs |
| Command | `/status`, `/queue`, `/cancel <runId>`, `/health` | Reconciler → reply |
| Promotion | `approved for app` (EXACT) | Promote |

**Reply parser — three tiers:**

1. **Exact tier** — `approved for app` must match exactly (case-insensitive, trimmed). No LLM fallback. Variants like `approve for app` echo-back: *"I read that as wanting to promote — please reply with the exact phrase: approved for app"*.
2. **Pattern tier** — `approve direction <n>`, `revise: <text>`, `reject/archive`, `cancel` via regex with fuzzy whitespace.
3. **LLM-assisted fallback** — ambiguous goes to LLM brain with current run state. Brain replies with structured action or asks for clarification via bot.

**Outbound message types:**

| Event | Format |
|---|---|
| Concept-review gate | `sendMediaGroup` with 5 images + caption: *"Sol concepts ready. Reply: `approve direction 1-5`, `revise: <change>`, or `reject/archive`."* |
| Final-review gate | `sendMediaGroup` with grid of 21 sprites + caption: *"Sol final upload-ready board. Reply: `approved for app` to promote."* |
| Blocker | Text with the blocker reason + suggested action |
| Completion | *"Sol shipped. 21 sprites promoted, $X.XX spent, browser QA passed."* with one preview image |

### 5.2 CLI

See section 3.3.

### 5.3 Daemon

**Process model:** one long-running Node daemon on the Mac, started by `launchd`.

```
~/Library/LaunchAgents/com.tower.atelier.plist
```

**Inside the daemon:**

| Component | Responsibility |
|---|---|
| Telegram poller | `getUpdates` long-poll loop with 60s timeout |
| CLI inbox watcher | `fs.watchFile` on `.artlab/atelier/inbox/cli/*.json` |
| Queue processor | Max 2 concurrent runs; priority: human-flagged > scheduled > default cast order |
| Active runner manager | Spawns child processes per runner, tracks PIDs |
| Heartbeat scheduler | Calls `progress-publisher` every 10s per active runner |
| Blocker watcher | Sends Telegram message exactly once per blocker entry |
| Self-evolution watcher | Hourly check of CI ledger; spawns Codex on repeated friction |
| Mac sleep guard | Wraps active runs in `caffeinate -i` |

**Crash recovery:** on daemon startup, scan all runs in non-terminal states via reconciler. For each: check `slot-leases/`, any with heartbeat > 10 minutes old are stale → mark slot failed, release reservation. Resume current phase or transition to `repair-required` if a required runner died.

---

## 6. Brain

### 6.1 Deterministic scheduler

`orchestrator/deterministic.ts` walks the state machine. For each phase with a clear next action (e.g., `generating-concepts → concept-runner`, `canary-passed → production-runner`), runs it. No LLM tokens.

### 6.2 LLM brain (novel decisions only)

`orchestrator/llm-brain.ts` invoked for:

| Decision | Reason |
|---|---|
| Route ambiguous brief | Today's regex misrouted Rafe→Otis. LLM understands style-references vs requests. |
| Clarification wording | Telegram phrasing matters; LLM phrases naturally. |
| Concept QA failure adjudication | When 2/5 lanes fail, decide: regenerate, supersede, or escalate. Reads memory. |
| Reply parser fallback | Tier-3 fallback for ambiguous human responses. |
| Prompt enrichment | Reads style-wins + style-rejections + cast coherence; rewrites next-run prompt. |
| Blocker message drafting | Provider 429 → reader-friendly explanation with suggested action. |

Every LLM call writes to `orchestrator/decision-log.jsonl`:

```json
{
  "decisionAt": "2026-05-21T03:14:22Z",
  "kind": "route",
  "input": "make Sol Navarro for floor 6 lounge",
  "prompt": "...",
  "output": { "assetType": "character", "name": "Sol Navarro", "confidence": 0.94 },
  "tokensIn": 412,
  "tokensOut": 38,
  "model": "claude-opus-4-7"
}
```

This is the audit trail. Any wrong decision is debuggable.

### 6.3 Ambiguity detector

`intake/ambiguity-detector.ts` triggers `needs-human` blocker when:
- Multiple known characters match with similar scores
- A character name appears with `-compatible`, `style`, `envelope`, `language`, `reference`, `look` modifiers (the Rafe→Otis bug pattern)
- The brief mixes two character names in `for X` / `as X` / `like X` phrasing
- LLM brain confidence < 0.7

Bot then sends LLM-drafted clarification with explicit choices. Run stays in `routed` phase until human responds.

---

## 7. Memory

Three ledgers in `.artlab/atelier/memory/`:

**`style-wins.jsonl`** — every promoted asset, what worked:
```json
{
  "characterId": "otis",
  "promotedAt": "2026-05-19T14:23:08Z",
  "winningTechniques": [
    "warm desk lamp emerged in lane 3 prompt-only generation",
    "rembg model 'isnet-anime' produced cleanest cutout for hair edges",
    "premium-simple-backdrop-v1 separation perfect for concierge silhouette"
  ],
  "promptHash": "sha256:...",
  "cutoutModelUsed": "isnet-anime",
  "totalCostCents": 664
}
```

**`style-rejections.jsonl`** — every rejected concept lane, why:
```json
{
  "characterId": "otis",
  "runId": "otis-initial-design-v3",
  "lane": 5,
  "rejectedAt": "2026-05-15T10:11:42Z",
  "reason": "jawline too perfect, reads as AI-fake",
  "qaFailureCodes": ["style-coherence-failed"],
  "promptHashRejected": "sha256:..."
}
```

**`prompt-evolution.jsonl`** — every prompt builder change:
```json
{
  "promptComponent": "character-concept-base",
  "version": "v1.4",
  "diff": "added 'preserve natural human imperfections including asymmetry'",
  "triggeredBy": "rejection-pattern-jawline-too-perfect",
  "outcomes": { "subsequentRejections": 0, "subsequentPromotions": 2 }
}
```

**Retrieval API** (`memory/retrieve.ts`):
```ts
async function getRelevantMemory(input: {
  assetType: CreativeAssetType;
  characterId?: string;
  topN?: number;
}): Promise<{
  wins: WinEntry[];
  rejections: RejectionEntry[];
  recentPromptHardening: PromptEvolutionEntry[];
}>;
```

LLM brain calls this before generating prompts. Each new character benefits from every prior character's lessons.

---

## 8. Cast coherence

`coherence/cast-diversity.ts` runs after concept lanes finish, BEFORE the concept board is sent:

1. Compute perceptual signatures for each lane:
   - **Silhouette hash**: `sharp` foreground bbox shape
   - **Palette histogram**: k-means top 5 colors
   - **Age impression**: LLM-derived from image with prompt "estimate age 20-70"

2. Compute pairwise distance within the 5 lanes. If two lanes too similar → `diversity-failure`.

3. Compute distance to each promoted cast member:
   - Too close → `cohesion-drift` (lane reads as an existing character)
   - Too far → `style-envelope-drift` (lane breaks the cast aesthetic)

4. If any check fails → `style-failed` blocker. LLM brain crafts prompt hardening; engine regenerates. 3rd consecutive failure escalates to human.

Thresholds in `coherence/thresholds.json`. Memory feeds: when a human approved a board after a coherence-check warning, threshold loosens by recorded delta.

---

## 9. Multi-asset bundles

`intake/bundle-parser.ts` detects bundle phrases: `X with Y in it`, `X and Y together`, `X for Z`, `the [room] floor`.

Bundle parsing produces:

```ts
interface BundleSpec {
  bundleId: string;
  children: ChildAssetSpec[];
  links: {
    childA: string;
    childB: string;
    linkType: "shares-style" | "co-appears-in" | "references";
  }[];
  promotionPolicy: "atomic" | "independent";
}
```

A bundle creates linked child runs. Each child goes through normal gates. Parent run aggregates child statuses. When all children reach `final-review`:
- `atomic` — `approved for app` on bundle promotes all children together
- `independent` — each child promotes when its own approval lands

If `atomic` and one child fails, parent enters `repair-required` and bot pings.

---

## 10. Self-evolution

`self-evolution/friction-detector.ts` runs hourly:

1. Reads `.artlab/atelier/ledgers/improvements.jsonl`
2. Groups by `failureCode`
3. For each group with `occurrences >= 5` and `severity >= medium`:
   - If branch `atelier/fix/<failureCode>-*` already exists, skip
   - Else spawn Codex via `mcp__codex__codex`:
     ```
     Goal: harden the atelier engine against repeated failure: <failureCode>
     Recent occurrences: <last 10 with context>
     Suggested hardening from CI report: <command, test, doc>
     Create a branch atelier/fix/<failureCode>-<date>, write the fix and test, commit, push.
     Do not open a PR.
     ```
   - When Codex completes, bot pings: *"5x repeated '<code>' friction. Codex drafted fix on branch atelier/fix/<code>-2026-05-21. Reply `/show <code>` to see the diff."*

Engine never opens PRs. Human reviews the branch first.

---

## 11. Budget posture

`budget/per-month-cap.ts` layers on top of existing `budget/ledger.ts`:

```ts
const estimated = estimateRunCost(spec);  // concept ~$1, char prod ~$15-20, env ~$2
const monthlyRemaining = monthlyCeilingCents - currentMonthSpentCents;
const perRunCap = 2500;  // $25 default per-asset-type configurable

if (estimated > perRunCap) {
  // blocker: budget-blocked, bot asks "approve $X.XX for this run?"
}
if (estimated > monthlyRemaining) {
  // blocker: budget-blocked, bot warns "would exceed monthly cap"
}
```

Config in `.artlab/atelier/config.json` with per-asset-type defaults.

---

## 12. Health (real, not stubbed)

`health/snapshot.ts` replaces the existing `scripts/creative-production-health.ts buildSnapshot` (which feeds zeros for processes, repeatedFailures, cleanup counts, and hard-codes a $10 ceiling).

Real scanners:
- `scanners/leases.ts` — inventories `slot-leases/*.lease.json` across all runs
- `scanners/ledgers.ts` — sums spend from every `provider-budget-ledger.json`
- `scanners/processes.ts` — counts active leases with recent heartbeat as live processes
- `scanners/receipts.ts` — counts receipts in inbox vs expected slots; detects stuck runs
- `scanners/locks.ts` — finds all `.lock` files across the workspace
- `scanners/cleanup.ts` — finds orphan previews, stale boards, stale locks

The well-typed `CreativeProductionHealthReport` shape (from existing `health/engine-health.ts`) is preserved; only the snapshot builder changes.

---

## 13. Safety properties

These are invariants the engine must enforce. Tests prove each.

1. **Promotion firewall is unbreakable.** No `public/art` write without `approved for app` exact phrase + strict QA pass + valid action manifest.
2. **No duplicate spend.** Budget ledger blocks paid retry without named-slot retry authorization.
3. **Cancellation is honest.** SIGTERM + grace + release leases + release reservations + state transition all complete before bot confirms cancel.
4. **Resume after crash.** Daemon restart reconciles all non-terminal runs; stale leases released; no double-spend.
5. **No PR auto-merge.** Self-evolution creates branches only; never `gh pr create`, never `gh pr merge`.
6. **Identity check.** Telegram messages from any chat.id other than configured one are silently dropped.
7. **Secret hygiene.** API keys read only from env or macOS Keychain. Never written to state files, plans, prompt decks, receipts, screenshots, or branch commits.
8. **Promoted state preservation.** Migration must not change a single byte of promoted Otis or Mara public art or manifest entries.
9. **Mid-run progress accuracy.** Heartbeat updates progress.json every 10s during active generation. `atelier status` mid-run shows real numbers (completed slots, running slots, actual spend).
10. **Two-gate purity.** No mini-gates between approve direction and approved for app. Engine continues automatically through canary, production, cutout, QA, final board unless a true blocker fires.

---

## 14. Migration plan

### Phase 0 — Scaffold (week 1)
- Create `src/lib/atelier/` skeleton with all 11 module directories.
- Re-export salvaged leaf modules.
- Add `scripts/atelier.ts` CLI shell with stub subcommands.
- Legacy CPE keeps working.

### Phase 1 — Foundation (weeks 1-2)
- State machine + reconciler.
- All 7 runners.
- Deterministic orchestrator + progress publisher.
- Real health snapshot.
- All tests mocked end-to-end.

### Phase 2 — Intelligence (weeks 2-3)
- Intake router + ambiguity detector (with today's Rafe regression in CI).
- Memory ledgers + retrieval API.
- Cast coherence with sharp + LLM age estimate.
- LLM brain + decision log.
- Bundle parser.

### Phase 3 — Surfaces (weeks 3-4)
- Telegram bot.
- Daemon (launchd, heartbeat, crash recovery, SIGTERM).
- Self-evolution (Codex summoner — branches only).
- CLI subcommands wired.
- `atelier bot setup` interactive command.

### Phase 4 — Migration & cutover (weeks 4-5)
- `migration/import-otis.ts` and `import-mara.ts` read promoted state, write atelier-shape `closed` state files.
- Move `.artlab/studio/` → `.artlab/studio-legacy/`. Atelier starts fresh in `.artlab/atelier/`.
- Deprecation banners on the four giant scripts (single warning line, exit 1 if invoked).
- First new run through atelier: **Rafe Calder** (fixes today's misrouted run). This run is the production go-live and the first acceptance test.

### Phase 5 — Cast push (weeks 5-9)
- Generate 9 more characters via atelier (Rafe, Priya, Dylan, Vera, Sol, Inez, Mina, Etta, Rowan, Nadia).
- Memory accumulates; cast coherence becomes meaningful at character 5+.
- Daemon runs unattended overnight for several.
- Bundle test on at least one (e.g., "war room with Rafe").

### Phase 6 — Asset type expansion (post-week-9)
- One war room background (environment vertical slice).
- One Tower button texture (UI vertical slice).
- One ambient animation (motion vertical slice).

### Phase 7 — Legacy retirement
- Delete `scripts/creative-production-orchestrator.ts`, `creative-generation-adapter.ts`, `art-pipeline.ts`, `creative-production-health.ts`.
- Delete `src/lib/creative-production/operator/v1-final.ts`.
- Keep only the salvaged leaf modules that atelier imports.
- Final tally: legacy ~12,000 lines → 0; atelier ~5,000 lines spread across ~50 files.

**Estimated total: 9-12 weeks solo, overnight runs concurrent with day-time development.**

---

## 15. Testing strategy

| Layer | Test type | Notes |
|---|---|---|
| Leaf modules | Unit (Vitest, no I/O) | Budget, scheduler, intake, state machine, coherence hashes, memory retrieval |
| State machine | Property-based | All transitions valid, no illegal jumps, blockers stack correctly |
| Reconciler | Snapshot + fixtures | Each artifact shape produces expected `RunReality` |
| Runners | Integration with fake provider | End-to-end with mocked Gemini |
| Orchestrator | Mocked scheduler walks | Deterministic decisions are deterministic |
| LLM brain | Recorded prompt fixtures | Routing decisions stable; ambiguity detection fires correctly |
| Bot | Mocked Telegram API | All inbound types parse; image attachments build correctly |
| Daemon | Spawn fake processes | Crash recovery works; SIGTERM releases leases |
| E2E mocked | Full run on local-mock | "make Sol" → all gates → promoted manifest |
| E2E real provider | One Rafe run per CI cycle | Costs ~$15; manual trigger only |
| Stress | 100-scenario mocked | Concurrent slots, 429 bursts, worker crashes, named retries |
| Routing regression | Today's Rafe brief + 20 ambiguity variants | Locks bug fix; prevents regression |
| Self-evolution | Mocked Codex MCP | Branch created, PR NOT, bot pings sent |
| Bundle | Multi-child resolution | "war room with Rafe" → 3 linked children, correct atomic policy |
| Memory | Win/rejection feed-forward | Past rejections enrich next prompt |
| Coherence | Too-similar lanes | Diversity-failure fires; style-envelope-drift fires |
| Telegram parser | 50 autocorrect/voice variants per gate | Robust against real-world replies |
| Promotion firewall | All bypass attempts | Blocked without exact phrase, without QA, without manifest update |

**Coverage targets:** ≥90% on state machine + reconciler + runners; ≥80% overall.

**Promoted-state preservation:** byte-level diff of `public/art/lobby/otis/` and `public/art/penthouse/ceo/` hashes after every major refactor. CI fails if any byte changes.

---

## 16. Documentation consolidation

**12 docs → 3:**

- `docs/atelier/ENGINE.md` — architecture, state machine, modules, commands
- `docs/atelier/OPERATIONS.md` — runbook, troubleshooting, daemon, recovery
- `docs/atelier/CHARACTER-PIPELINE.md` — character bible, contracts, prompts (merged from CHARACTER-ART-PIPELINE + CHARACTER-IMAGE-OPERATIONS + CHARACTER-IMAGE-PROMPTS + CHARACTER-PROMPTS + CHARACTER-BIBLE + CHARACTER-RELATIONSHIPS)

All 12 existing docs move to `docs/legacy/`. SKILL.md slims from 220 lines → ~80 lines covering only the new CLI + Telegram surface + the two gates + safety rules.

CLAUDE.md updates: replace "Creative Production Engine" section with the new Atelier surface; legacy section moves to `docs/legacy/CLAUDE-LEGACY.md` for reference.

---

## 17. Open questions / future work

These deliberately out of scope for V1 but worth noting:

- **Weekly digest** — decided no, but could revisit if engine usage scales beyond solo.
- **Multi-user / multi-tenant** — currently single-Armaan via identity check; multi-user would need auth layer, per-user budget, per-user memory.
- **Video / animation generation** — `animation` asset type stays paper for V1; real video model integration is post-cast.
- **In-Tower Studio surface** — decided no for V1 but could be added on top of the atelier API surface if usage pattern changes.
- **A/B testing in production** — engine could generate two character variants and ship both behind a feature flag; deferred.
- **Procedural NPCs** — secondary characters generated on demand (e.g., a war room intern background extra); deferred.
- **Self-generated style envelope updates** — engine occasionally generates a new envelope candidate and proposes it; deferred until baseline cast is locked.

---

## 18. Success criteria

V1 atelier is done when:
- `atelier produce "make Rafe"` from Telegram triggers a full overnight run.
- Mac wakes up with concept-board notification on Telegram by morning.
- Reply `approve direction 2` continues automatically through canary → production → QA → final board.
- Reply `approved for app` promotes assets, updates manifest, runs Playwright e2e, confirms ship via Telegram.
- 10 characters successfully promoted via atelier.
- One war room background, one button texture, one animation through atelier.
- `npm test -- src/lib/atelier` passes with ≥90% on state/reconciler/runners, ≥80% overall.
- `npm run lint`, `npx tsc --noEmit`, `npx playwright test` all pass.
- Promoted Otis + Mara art and manifests unchanged from pre-migration baseline (byte-level diff is empty).
- Four legacy scripts deleted. `src/lib/creative-production/operator/v1-final.ts` deleted. Legacy retired.
- Docs consolidated; SKILL.md slim.
- Self-evolution observed at least once during cast push: friction repeated, branch drafted, human reviewed, branch merged.
