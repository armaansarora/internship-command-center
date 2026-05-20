# Creative Production Engine V1 Final Plan

**Status:** V1 Final implemented and in certification. Otis is the closed production baseline; this document remains the behavior contract for future assets.

**Goal:** Build the production-ready Creative Production Engine so Armaan can start a routable creative request, automatically get the initial concept images, approve a direction only after seeing the concept board, and then return only for true blockers or the final upload-ready board with the exact approval phrase `approved for app`.

**North Star:** `art:produce` becomes a guided creative assistant, not a command maze. Armaan can say "let's make Mara" or "make lobby buttons," see what the engine understood, get routable initial concepts automatically, approve the direction from the concept board, and let the engine own planning, generation, spend control, QA, repair, cleanup, review boards, handoff, and guarded app integration.

---

## Normal Command Surface

The default operator command surface is exactly:

```bash
npm run art:produce -- --request "..."
npm run art:produce -- --continue <runId>
npm run art:produce -- --answer <runId> "<plain English answer>"
npm run art:status
npm run art:health
```

Everything else is advanced/internal: `art:generate`, `art:studio`, `art:operate`, browser helpers, cutout commands, repair commands, cleanup internals, and provider diagnostics.

Normal `art:status` and review output may mention internal files for traceability, but the operator should not need to know or run internal commands during normal use.

Current amendment: Otis has been promoted, browser-QA verified, and closed. The engine must treat `public/art/lobby/otis/` and `src/lib/visual-assets/approved-character-assets.generated.json` as production truth and must not ask for `approved for app` again for the closed Otis baseline.

---

## Diagnosis

The current Creative Production Engine has important hardening pieces, but the product shape is still too operator-hostile.

Current weaknesses:

- Too many low-level commands leak into normal operation.
- The engine still feels like a collection of scripts instead of a guided creative assistant.
- Paid generation is too serial and slow for production use.
- State is split across plans, receipts, ledgers, review boards, cutout receipts, and handoff docs.
- A future Codex/Claude session depends too much on reading scattered context or remembering prior chat.
- The character pipeline is too central; backgrounds, UI assets, props, animations, shaders, scenes, icons, and marketing visuals need their own contracts.
- Budget state, reservation state, retry state, and provider receipts need to be unified.
- Cleanup is not yet strong enough to keep `.artlab` understandable over many runs.
- Continuous improvement exists, but it does not yet reliably block or prioritize engine upgrades when repeated friction appears.

The fix is an engine core with a guided operator layer, durable state registry, mandatory scheduler, budget ledger, review/action manifests, promotion firewall, cleanup policy, and health view.

---

## Operator Interface / Guided Conversation

Every normal run starts from natural language:

```bash
npm run art:produce -- --request "let's make Mara"
```

The engine responds in plain English:

- What it understood.
- What it recommends.
- Projected cost before spending.
- Current phase in simple language.
- What it will do next automatically.
- When it needs Armaan and exactly why.

Before initial images exist, the engine must write a human action packet only for true blockers such as missing secrets, budget blocks, provider blocks, active locks, corrupt state, unsafe-to-run, or an actually unclear brief. For normal routable work, the first standard human action packet appears after the initial concept board exists:

```json
{
  "runId": "mara-v1",
  "phase": "direction-review-ready",
  "whatIUnderstood": "The engine generated exactly five prompt-only initial concept images...",
  "recommendation": "Inspect the initial concept board and approve one direction only if it establishes the right visual identity.",
  "costImpact": {
    "estimatedCents": 120,
    "reservedCents": 0,
    "additionalApprovalRequired": false
  },
  "risk": "Low. This only created drafts in .artlab.",
  "allowedResponses": [
    "approve direction: 01",
    "approve direction: <slot id>",
    "revise: <plain English change>",
    "reject/archive"
  ],
  "recommendedResponse": "approve direction: 01"
}
```

When present, this file lives at:

```text
.artlab/studio/<run>/human-action.json
```

Future Codex/Claude sessions must resume from `human-action.json`, `run-state.json`, `progress.json`, receipts, ledgers, and review manifests, not from chat memory.

---

## Approval Gates

There are only two normal human approval gates:

1. Initial design direction approval after the five-image concept board exists.
2. Final app promotion approval with the exact phrase `approved for app`, after the final upload-ready board exists.

The engine must not introduce accidental mini-approval gates. `approve direction` before images exist is invalid. After a valid `approve direction: 01` or slot-id response, `initial-direction-approved` is an internal checkpoint, not a stop. The engine must continue through production planning, production generation, local cutout, strict QA, and final upload-ready board creation unless a true blocker occurs. For non-critical choices, it chooses sensible defaults and continues.

The engine may stop outside those two gates only for true blockers:

- Safety issue.
- Budget ceiling or missing spend approval.
- Active lock or competing generation.
- Missing provider credential.
- Provider outage or repeated provider failure.
- Corrupt state, missing ledger, stale receipt confusion, or unsafe resume.
- Strict QA blocker.
- Promotion firewall blocker.
- Continuous improvement report marked `upgrade-required`.

Human action between concept approval and the final board is allowed only for those blockers. It must not ask Armaan to approve the same direction again.

---

## Live Progress

Live progress is a real deliverable, not just logs.

Every run writes:

```text
.artlab/studio/<run>/progress.json
```

`npm run art:status` renders it in plain English. The progress model includes:

```json
{
  "phase": "full-pack-running",
  "runningSlots": ["pose-idle", "pose-working", "expression-smile"],
  "completed": 8,
  "failed": 1,
  "repairing": 2,
  "pending": 13,
  "spendSoFarCents": 242,
  "reservedSpendCents": 90,
  "etaSeconds": 420,
  "nextAutomaticStep": "Run local cutout and strict QA after all active slots finish."
}
```

Tests must prove progress stays accurate during:

- Concurrent provider calls.
- Slot success.
- Slot failure.
- Backoff.
- Named-slot retry.
- Local repair.
- Resume after interruption.
- Cleanup and archive.

---

## State Machine

Core run states:

```text
requested
routed
brief-confirming
direction-planned
awaiting-initial-approval
direction-generating
direction-review-ready
initial-direction-approved
production-planned
canary-running
canary-passed
full-pack-running
repairing
strict-qa
final-board-ready
integration-briefing
app-preview-ready
approved-for-app
promoted
browser-verified
closed
```

Blocking states:

```text
needs-human
budget-blocked
provider-blocked
repair-required
upgrade-required
unsafe-to-run
```

Every transition writes:

- Updated `run-state.json`.
- Updated `progress.json`.
- Event entry in the run event log.
- Relevant budget/provider/QA/review receipts.

---

## Mandatory Parallel Generation Architecture

Parallelism is mandatory for normal provider-backed runs.

Initial design:

- Exactly 5 concurrent lanes by default.
- Prompt-only for character initial design.
- No identity reference image during initial design unless the asset contract explicitly allows it.

Production packs:

- Default per-run concurrency: 3.
- Can increase to 5 when provider health is clean and budget allows.
- Must use slot-level locks, budget reservations, receipts, and named-slot retry.

Subscription-browser providers:

- Not treated as true high-concurrency providers.
- Usually capped at 1-2 isolated browser sessions.
- Must never use Armaan's normal daily Chrome profile.

Whole-pack retries remain banned. Repair locally first, then regenerate only named failed slots.

---

## Provider Concurrency Policy

Concurrency is controlled by provider config and run config.

Required policy fields:

```json
{
  "provider": "gemini-api",
  "perProviderMaxConcurrency": 5,
  "perRunDefaultConcurrency": 3,
  "initialDesignConcurrency": 5,
  "productionPackConcurrency": 3,
  "slotLeaseTimeoutMs": 600000,
  "requestTimeoutMs": 300000,
  "backoff": {
    "initialMs": 2000,
    "maxMs": 60000,
    "jitter": true,
    "downgradeOn429": true,
    "downgradeOnTimeoutBurst": true
  }
}
```

Rules:

- A slot must acquire a lease before reserving budget or calling a provider.
- A worker must heartbeat while the provider call is active.
- If a worker fails before a paid provider call, reserved budget is released.
- If a worker fails after a paid provider call, actual spend is recorded and the slot receives a failure receipt.
- 429, high-demand, and timeout bursts downgrade provider health and reduce effective concurrency.
- Leases expire only after timeout plus stale-process verification.
- Resume must skip clean receipts, inspect warning receipts, and retry only named failed slots.
- Progress must be updated atomically when a slot starts, heartbeats, succeeds, fails, repairs, or releases reservation.

Acceptance tests must prove:

- Provider calls overlap in time.
- Slot locks prevent duplicate execution.
- Budget reservations are unique per slot attempt.
- Failed unpaid calls release reservation.
- Paid failures write receipts.
- Resume does not duplicate spend.
- Named-slot retry works.
- Whole-pack warning retry is impossible.

---

## Budget And Spend-Control Architecture

Budget state separates:

- Estimated cost.
- Reserved cost.
- Actual spend.
- Released reservation.
- Failed-paid spend.
- Remaining budget.

Every provider call gets a receipt with:

- Run id.
- Slot id.
- Attempt id.
- Provider.
- Model.
- Request hash.
- Estimated cost.
- Actual cost when known.
- Reservation id.
- Start/end timestamps.
- Source/output hashes.
- Failure classification if any.

The engine fails closed when:

- A ledger is missing.
- Receipts conflict.
- A slot has multiple paid attempts without named retry authorization.
- Spend exceeds approved ceiling.
- Stale receipts make status ambiguous.

---

## Provider Abstraction Strategy

Providers implement a common interface:

- `capabilities()`
- `estimateCost()`
- `reserveBudget()`
- `generateSlot()`
- `inspectOutput()`
- `classifyFailure()`
- `maxSafeConcurrency()`
- `repairRecommendations()`

Provider adapters should be honest about quality and cost. Subscription bridges are not production-clean just because the image looks attractive; they must still write receipts, source-size warnings, quality-mode metadata, and review evidence.

---

## Asset-Type Contracts

The engine must route by asset type before choosing a pipeline.

Contracts:

- Character: initial concepts share one locked Tower/Otis character style envelope; lane variation uses explicit design cards only for silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype. Production then covers identity, outfit, pose, expression, turnarounds, transparent production PNGs, alpha QA, and app pose manifest. The default Tower character production pack is 21 source sprites: 3 outfit variants (`regular`, `summer-light`, `winter-layered`) x 7 pose/expression states (`idle`, `greeting`, `listening`, `thinking`, `talking`, `alert`, `working`). A final board must not become `final-board-ready` until all 21 required slots pass strict QA and are listed in the action manifest.
- Background/environment: Tower architecture, lighting, mood, spatial metaphor, responsive crops, focal areas, no character cutout requirement, contrast/readability QA, desktop/mobile preview.
- UI assets/buttons: existing Tower product UI/design system, states, hover/pressed/disabled variants, sizing constraints, accessibility contrast, integration with real components.
- Props: object readability, Tower material fit, transparent or contextual variants depending on use, scale reference, shadow/floor contact QA when needed.
- Animations: frames or motion spec, reduced-motion fallback, timing, performance budget, browser verification.
- Shaders: code artifact, fallback, performance budget, reduced-motion behavior, integration preview.
- Scenes: composed multi-asset layout, responsive framing, foreground/background layering, app preview.
- Icons: sizes, monochrome/color variants, stroke/fill rules, contrast, asset manifest.
- Marketing visuals: social/hero/export sizes, crop safety, text-safe areas, no production manifest write unless explicitly routed.

Do not force every asset through the character/cutout pipeline.

Initial character concept QA blocks the board before `direction-review-ready` if any lane violates the shared style envelope or the five lanes are not meaningfully different. If two or more lanes fail the same way, the run is `style-failed`; the old board is superseded and the engine must harden/regenerate before asking Armaan to choose.

Implementation starts with one real character vertical slice before broad contract expansion.

---

## Cutout, Alpha, QA, And Repair Strategy

Character and foreground contracts use local cutout by default when provider alpha is unreliable.

Pipeline:

1. Generate source on approved backdrop contract.
2. Run local cutout from source.
3. Refine edge/mask.
4. Run strict cutout doctor.
5. Master and derive production assets.
6. Run asset doctor.
7. Build final upload-ready board only when strict QA passes.

Repair rules:

- Local repair before paid regeneration.
- Regenerate only named failed slots.
- Re-run strict QA after repair.
- Convert warnings into explicit repair actions.
- Repeated failure patterns can trigger `upgrade-required`.

---

## Review Boards And Action Manifests

Every review board has:

- A pretty HTML board for Armaan.
- A machine-readable action manifest for future agents.

Boards:

1. Initial concept board.
2. Final upload-ready board.
3. App preview board.

Initial concept board:

- Shows options.
- Shows what the engine recommends.
- Shows projected cost before production spending.
- Exists only after concept QA passes style coherence and design diversity.
- Allows approve direction, revise brief, regenerate named direction slots, or reject/archive.
- Does not accept `approved for app`.

Final upload-ready board:

- Shows only QA-passed assets as ready.
- Shows receipts, warnings, blockers, and source/output evidence.
- Allows approve for app, revise, regenerate named slots, or reject/archive.
- Accepts final approval only through exact phrase `approved for app`.

App preview board:

- Shows the asset in real Tower context.
- Includes desktop, mobile, reduced-motion, and fallback previews.
- Highlights broken images, overlap, crop issues, contrast issues, state mismatch, and fallback gaps.

Action manifest shape:

```json
{
  "runId": "mara-v1",
  "boardType": "final-upload-ready",
  "actions": [
    {"id": "approve-direction", "requiresExactPhrase": false},
    {"id": "regenerate-named-slots", "slots": ["pose-idle"]},
    {"id": "revise-brief", "input": "plain English"},
    {"id": "approve-for-app", "requiresExactPhrase": "approved for app"},
    {"id": "reject-archive"}
  ]
}
```

Armaan should never need to edit or interpret raw JSON, but the files must exist so a future agent can act without guessing from HTML.

---

## Website Integration Conversation

After final art approval, the engine asks only the integration questions it cannot safely infer:

- Where should this asset appear?
- Replace existing asset or add new?
- Default state, pose, variant, crop, or animation?
- Mobile behavior?
- Reduced-motion behavior?
- Fallback behavior?
- Feature flag, preview-only path, or immediate production path?

Then the engine:

1. Updates the relevant app integration in a preview-safe path.
2. Updates manifests/contracts only when allowed.
3. Runs focused tests.
4. Browser-checks desktop/mobile/reduced-motion/fallback.
5. Writes the app preview board.
6. Stops before final promotion unless the exact phrase `approved for app` is present.

---

## Promotion And Integration Strategy

Promotion is coordinator-owned and fail-closed.

Before promotion:

- Strict QA must pass.
- Final upload-ready board must be current.
- App preview board must be current if website integration is in scope.
- Budget ledger must reconcile.
- Receipts must be unambiguous.
- Cleanup/retention must be ready.
- Human action packet must contain exact `approved for app`.

Only after that may the engine:

- Copy staged assets into `public/art`.
- Update production manifests.
- Update integration references.
- Write promotion receipt.
- Run focused tests/build/browser verification.
- Close the run.

---

## Cleanup And Retention Rules

Artifact statuses:

- `draft`
- `candidate`
- `winner-reference`
- `staged`
- `approved`
- `rejected`
- `superseded`
- `archived`

Keep:

- Ledgers.
- Receipts.
- Approved references.
- Winner references.
- Final boards.
- Promotion receipts.
- Handoff docs.
- Active run state.
- QA evidence needed for traceability.

Archive:

- Superseded attempts.
- Rejected concepts with useful evidence.
- Failed outputs needed for failure history.
- Old boards that are no longer current but explain decisions.

Delete:

- Loose downloads.
- Duplicate binaries.
- Orphan previews.
- Temp files.
- Unreferenced intermediate junk.
- Failed scratch artifacts after evidence is captured.

Never delete:

- Live `public/art`.
- Approved manifests.
- Final approval receipts.
- Budget receipts.
- Current run state.

Normal status hides bad clutter by default but exposes it through health/diagnostics.

---

## Continuous Improvement / Self-Healing Loop

After every major phase, the engine records:

- Slow steps.
- Manual steps.
- Provider failures.
- QA failures.
- Repeated repair causes.
- Confusing operator moments.
- Cleanup debt.
- Missing automation.
- Cost overruns.

Repeated medium failures, any high-severity production blocker, or recurring manual friction can set `upgrade-required`.

When `upgrade-required` is set, production work stops until the engine is improved or the blocker is explicitly resolved by a safe internal migration.

By the fifth repeated friction point, the issue must become:

- A script.
- A QA gate.
- A scheduler rule.
- A provider rule.
- A cleanup rule.
- A clearer operator prompt.

---

## Engine Health / Status View

`npm run art:health` reports:

- Whether the engine is safe to run.
- Active locks and processes.
- Last run and next step.
- Spend history.
- Repeated failure codes.
- Provider health and concurrency downgrade.
- Cutout readiness.
- Cleanup debt.
- Continuous improvement blocks.
- Next recommended engine improvement.
- Whether current state is resumable by a fresh agent.

`npm run art:status` reports the current run in operator terms:

- Phase.
- Current running slots.
- Completed, failed, repairing, and pending counts.
- Spend so far.
- Reserved spend.
- ETA when possible.
- Next automatic step.
- Whether Armaan is needed.
- Exact allowed responses if Armaan is needed.

---

## Code Organization Plan

Break the current giant adapter/orchestrator responsibilities into focused modules:

```text
src/lib/creative-production/operator/
src/lib/creative-production/state/
src/lib/creative-production/scheduler/
src/lib/creative-production/budget/
src/lib/creative-production/providers/
src/lib/creative-production/contracts/
src/lib/creative-production/qa/
src/lib/creative-production/review/
src/lib/creative-production/promotion/
src/lib/creative-production/cleanup/
src/lib/creative-production/health/
```

Scripts become thin command adapters:

- `scripts/creative-production-orchestrator.ts`
- `scripts/creative-generation-adapter.ts`
- `scripts/art-pipeline.ts`

Acceptance rules:

- No new 4,000-line adapter.
- Files over roughly 500 lines need explicit review justification.
- Files over roughly 800 lines are an architecture warning unless they are generated fixtures.
- Scheduler, budget, provider, state, review, and promotion logic must not remain fused in one script.
- Future Codex/Claude sessions should be able to find the right module by responsibility.

---

## Otis Migration / Backward Compatibility

The engine must not abandon current `.artlab` state.

Add a migration/import task for:

```text
.artlab/studio/characters/otis-real-rembg-canary-v1/
```

The migration must import or normalize:

- Current run state.
- Active/finished status.
- Provider plans.
- Budget ledgers.
- Provider receipts.
- Cutout receipts.
- Canary evidence.
- Repair plans.
- QA reports.
- Review boards.
- Handoff docs.

Rules:

- Preserve all existing artifacts.
- Mark stale/conflicting state visibly.
- Do not force unlock.
- Do not start competing generation.
- Do not rewrite active provider work.
- Make `art:status` explain the current Otis next step.

---

## Implementation Slicing

This is a large system, so implementation must proceed through vertical slices.

Milestone 0: Normalize/import current Otis state into the new registry without interrupting active or finished generation.

Milestone 1: Build one end-to-end character production vertical slice from approved identity through parallel generation, receipts, cutout/QA/repair, final board, status, cleanup, and promotion firewall.

Milestone 2: Harden provider scheduler, concurrency, leases, backoff, budget reservations, and stress tests. Current implementation routes Gemini API `run-api` selected slots through the shared durable scheduler/provider adapter boundary while preserving the existing Gemini plan and inbox receipt format.

Milestone 3: Build guided website integration and app preview board.

Milestone 4: Add remaining asset-type contracts after the character path works.

Milestone 5: Add engine health, continuous improvement enforcement, docs updates, and skill updates.

Do not build nine abstract contracts before one real path works.

---

## Subagent Strategy

During implementation, use subagents only for isolated, non-conflicting work:

- Scheduler/budget tests.
- Provider fake/stress tests.
- Review board/action manifest implementation.
- Cleanup/retention implementation.
- Health/status implementation.
- Docs/skill alignment.

Subagents must own disjoint files and must not mutate shared promotion state, `public/art`, live manifests, or active provider runs.

During future creative runs, subagents may own isolated lanes only. The coordinator owns merge, status, cleanup, promotion, and app integration.

---

## Test Strategy

Required test areas:

- Guided human-action packet format.
- Pure two-gate approval behavior.
- `art:produce -- --request` routing from vague language.
- `art:produce -- --continue <runId>` resume.
- `art:status` operator summary.
- `art:health` safe/unsafe output.
- Progress reporter under concurrent work.
- Provider concurrency overlap with fake timers.
- Slot lock acquisition, heartbeat, timeout, and stale recovery.
- Budget reservation, release, spend, and receipt reconciliation.
- Interrupted run resume without duplicate spend.
- Named-slot retry only.
- Whole-pack warning retry impossible.
- Otis import/backward compatibility.
- Asset contract routing.
- Character vertical slice.
- Review-board HTML and action manifest.
- Cleanup retention, archive, delete, and hiding behavior.
- Engine health repeated-failure blocking.
- Promotion firewall for `public/art`.
- Promotion firewall for production manifests.
- Browser preview for integrated assets.

Stress tests must include many mocked failures:

- Provider 429 bursts.
- Provider high-demand responses.
- Timeouts.
- Worker crash after reservation.
- Worker crash after paid receipt.
- Duplicate worker start attempts.
- Stale lock with active process.
- Stale lock with dead process.
- Corrupt receipt.
- Missing ledger.
- Partially written progress file.
- Mixed clean/warning/failed slot set.

---

## Production Safety Proof

The definition of done must include proof that:

- `public/art` is unchanged until exact approval.
- Production manifests are unchanged until exact approval.
- A full mocked run executes parallel provider calls.
- An interrupted run resumes without duplicate spend.
- Cleanup hides bad artifacts from normal status.
- A fresh Codex session can run `art:status` and know exactly what to do.
- Current Otis state is preserved and normalized.
- Whole-pack retries remain banned.
- Named-slot retry is the only paid regeneration path after initial failure.
- Final promotion requires exact `approved for app`.

---

## Definition Of Done

V1 final is ready to use when:

- `npm run art:produce -- --request "..."` can start a vague creative request.
- `npm run art:produce -- --continue <runId>` can resume without chat memory.
- `npm run art:status` tells a fresh Codex/Claude session exactly what to do.
- `npm run art:health` says whether the engine is safe to run and why.
- The engine displays what it understood, recommendation, projected cost, live spend, current phase, slot status, next automatic step, and exact human action when needed.
- The two approval gates remain pure.
- Parallel provider calls are mandatory and proven by tests.
- Slot locks, leases, budget reservations, receipts, progress, retry, repair, and resume are durable.
- Current Otis state is imported rather than abandoned.
- One character production vertical slice works end to end before broad asset abstraction expands.
- Review boards are usable by Armaan and backed by action manifests.
- Website integration asks the right questions, implements safely, browser-checks, and stops before final approval.
- Cleanup keeps `.artlab` understandable and hides bad clutter from normal use.
- Continuous improvement can block production when repeated friction appears.
- `public/art` and production manifests remain unchanged until exact `approved for app`.
- Docs and the Creative Production Engine skill describe the same command surface, gates, and safety rules.
