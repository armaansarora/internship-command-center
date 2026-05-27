# ArtLab System Fixes — Master Plan (post-4-auditor synthesis)

> **For agentic workers:** Each work unit below is a paste-ready `/goal` block. Run them one at a time as independent `/goal` sessions — they do not share state and can be reordered, though ROI ranking suggests the printed order.

**Branch this plan was authored on:** `plan/2026-05-27-artlab-system-fixes` (from `origin/main` @ `ba8539db`)

---

## Synthesis methodology

**Consensus filter (2+ auditors flag → high signal, promoted):** 10 raw findings.

**Single-auditor promoted to consensus by synthesizer's own walk (independent file:line verification):** 5 raw findings.

**Single-auditor outliers (kept only if verified and atomic; otherwise deferred):** ~15 items, 6 absorbed into existing units, ~9 listed in *Out of scope*.

**Dedup logic:** the "cancel stub" finding appeared 4 ways (intent-file shape, exit code, doc-claim contradiction, missing recovery channel) and was merged into one work unit. The "characterId drift" finding had 3 distinct sub-aspects (promotion path, style-wins keying, intake artifact set) and was merged into one work unit because fixing the intake resolver kills all three.

**Sizing rule:** each work unit must fit in a single `/goal` block under 3000 chars, name explicit file:line targets, and define a TDD red→green plus a runtime verification probe. Bundles that exceeded 3000 chars were split (notably operator-truth CLI was kept as one unit only because the test scaffold is shared across the 6 sub-fixes).

---

## Source audits

- `audit/20260527-6210f6d6` — GPT-5 Codex, 61 sampled files + 12 probes, 3 critical / 8 important / 3 minor.
- `audit/20260527-212dc976` — Claude Opus 4.7 (1M ctx), 18 source + 6 docs + 12 canon yamls, 5 critical / 8 important / 5 minor.
- `audit/20260527-d58b2bdf` — GPT-5 Codex, 48 source + doc samples + targeted rg scans, 5 critical / 9 important / 3 minor.
- `audit/20260527-c11049ae` — Claude Opus 4.7 (1M ctx), 18 source + 5 doc + 6 state artifacts, 5 critical / 8 important / 5 minor.
- **Synthesizer's own ~30-min walk (this session)** — sampled 5 NEW files audits didn't cite (`daemon/cli-inbox-consumer.ts` uncommitted, `daemon/git-commit.ts:147` auto-pushes to main directly, `runners/strict-qa-runner.ts:161/178/200` three more silent-catches, `"approved for app"` literal at 8+ sites not 3, live `ls .artlab/engine/promoted/` shows the dir empty and `ls public/art/lobby/` returns `cno otis`).

---

## Findings consensus matrix

| Finding | Auditors flagged | Synthesizer-walk corroboration | Severity range | Merged severity |
|---|---|---|---|---|
| `artlab cancel` is a stub | 6210f6d6.C1, 212dc976.C1, d58b2bdf.C3, c11049ae.C4 (4/4) | yes (`scripts/artlab.ts:136`) | Critical × 4 | **Critical** |
| `appendRejection` has zero production callers | 6210f6d6.I4, 212dc976.C3, d58b2bdf.I4, c11049ae.C5 (4/4) | yes (`grep` returns only test/def) | Important–Critical | **Critical** |
| `concept-critique-fallback` mishandled (writes blocker out-of-band; missing from `BLOCKERS_FOR_TRANSITIONS`) | 6210f6d6.I3, 212dc976.C4, c11049ae.C2 (3/4) | yes (live `daemon-errors.jsonl`) | Important–Critical | **Critical** |
| `characterId` / canon drift (3 sub-aspects) | 6210f6d6.C3, 212dc976.C5, c11049ae.C3 (3/4) | yes (`ls public/art/lobby` = `cno otis`) | Critical × 3 | **Critical** |
| `CHARACTER-PIPELINE.md` role/floor drift across cast | 6210f6d6.M3, 212dc976.I1, c11049ae.M2 (3/4) | yes (canon vs doc table) | Minor–Important | **Important** |
| Docs say 10-phase, code has 13-phase | 6210f6d6.I5, 212dc976.I2, d58b2bdf.I6 (3/4) | yes (`types.ts` vs `ENGINE.md`) | Important × 3 | **Important** |
| Gemini model `gemini-3-pro-preview` retired (404 in prod) | 212dc976.C2, c11049ae.C1 (2/4) | yes (live errors today) | Critical × 2 | **Critical** |
| `status [runId]` documented but ignored | 6210f6d6.I1, d58b2bdf.I7 (2/4) | yes (`scripts/artlab.ts:94-99`) | Important × 2 | **Important** |
| `sdk-poller` writes `sourceSurface: "cli"` for MCP-origin | 212dc976.I4, d58b2bdf.M2 (2/4) | yes (`sdk-poller.ts:171`) | Important–Minor | **Important** |
| Skipped acceptance tests cover regression-prone areas | 6210f6d6.I7, 212dc976.I6 (2/4) | yes (4 `describe.skip`) | Important × 2 | **Important** |
| Promotion writes `promotedPackId` but no MCP-readable manifest | 6210f6d6.C2 (1/4) | **yes** (`.artlab/engine/promoted/` empty) | Critical | **Critical** (promoted) |
| Promotion auto-pushes to `origin/main` directly | 212dc976.I8 (1/4) | **yes** (`git-commit.ts:147`) | Important | **Critical** (promoted: bypasses PR review entirely) |
| CLI `produce` runId thrown away by bridge | d58b2bdf.C1 (1/4) | yes (`cli-inbox-bridge.ts:51`) | Critical | **Critical** (promoted) |
| CLI `answer`/`continue` not consumed by worker | d58b2bdf.C2 (1/4) | **yes — and** uncommitted `cli-inbox-consumer.ts` already solves it, just not wired | Critical | **Critical** (promoted) |
| Queue dequeue can lose a job on spawn failure | d58b2bdf.C5 (1/4) | yes (`queue.ts:70-75` + `queue-processor.ts:24-35`) | Critical | **Critical** (promoted) |
| `artlab health` exits 0 while daemon down | d58b2bdf.I1 (1/4) | yes (`scripts/artlab.ts:110-115`) | Important | **Important** (promoted) |
| Default `claude-opus-4-5` is 1 gen behind in 5 files | 212dc976.I3 (1/4) | yes (5 `grep` hits) | Important | **Important** (folded into Unit 1) |
| Brief-runner writes `"canonical-fallback"` — schema drift vs concept/environment | c11049ae.I2 (1/4) | yes (`brief-runner.ts:152,182,266`) | Important | **Important** (folded into Unit 1) |
| `"approved for app"` duplicated 8+ times | c11049ae.I5 (1/4) | **yes — 8+ sites, not 3** | Important | **Important** (promoted; folded into Unit 8) |
| `.artlab/engine/inbox/foundry/` directory persists | c11049ae.I4 (1/4) | yes (live `ls`) | Minor | **Minor** (folded into Unit 8) |
| Silent-catch sweep (≥7 sites swallow errors with no `recordDaemonError`) | c11049ae.I1+I2+M3 + synthesizer.W4 | yes (`strict-qa-runner.ts:161,178,200` + others) | Important | **Important** (folded into Unit 1) |

---

## Work units (ranked by ROI)

### Unit 1 — Restore the Gemini brain + sweep silent-catch sites

**Scope:** Production is in a partial-outage right now — every Gemini brain call 404s because the hardcoded `DEFAULT_MODEL` was retired by Google, and ≥7 silent `catch {}` sites swallow brain failures with no telemetry. Default Claude model is one generation behind in 5 files. Brief-runner writes `"canonical-fallback"` while concept/environment writes `"canonical"` (schema drift introduced by recent partial rename).

**Files touched:**
- `src/lib/artlab/orchestrator/gemini-brain.ts:7-9, 34` (default model + lying comment)
- `src/lib/artlab/sdk/brain/provider-registry.ts:3` (new central `DEFAULT_ARTLAB_CLAUDE_MODEL`)
- `src/lib/artlab/runners/brief-runner.ts:34, 152, 182, 257-259, 266`
- `src/lib/artlab/runners/concept-runner.ts:61, 129`
- `src/lib/artlab/runners/production-runner.ts:37, 79`
- `src/lib/artlab/runners/promotion-runner.ts:62-63`
- `src/lib/artlab/runners/strict-qa-runner.ts:161, 178, 200`
- `src/lib/artlab/orchestrator/recommend-direction.ts:61-63`
- `src/lib/artlab/bot/commands.ts:207-208`
- `src/lib/artlab/daemon/phase-notifier.ts:125, 282`

**TDD red→green:**
- Red: fixture test mocks `createGeminiBrain` to return HTTP 404 for stale model; assert `recordDaemonError` is called with source `"gemini-brain-stale-model"`.
- Red: per silent-catch site, assert `recordDaemonError` is called with a named source.
- Green: env-driven `ARTLAB_GEMINI_BRAIN_MODEL` (default verified against Google's current catalog before locking), `claude-opus-4-7` everywhere, `recordDaemonError` at each catch.

**Verification probe:** `tail -5 .artlab/engine/daemon-errors.jsonl` after one fresh run shows no `concept-critique-fallback` (or shows it with proper structured source). `grep -rn "claude-opus-4-5\|gemini-3-pro-preview\|canonical-fallback" src/` returns 0.

**`/goal` prompt:**
```
/goal Restore the ArtLab Gemini brain + sweep silent-catch sites that swallow brain failures.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- src/lib/artlab/orchestrator/gemini-brain.ts:34 hard-codes `DEFAULT_MODEL = "gemini-3-pro-preview"`. Google retired it. Every brain call 404s — proof in .artlab/engine/daemon-errors.jsonl (search for "concept-critique-fallback").
- Default Claude `claude-opus-4-5` is 1 generation behind in 5 files: bot/commands.ts:207, runners/brief-runner.ts:34, concept-runner.ts:129, production-runner.ts:37, promotion-runner.ts:62.
- Silent catches with NO recordDaemonError: orchestrator/recommend-direction.ts:61-63, runners/brief-runner.ts:257-259, runners/strict-qa-runner.ts:161/178/200, daemon/phase-notifier.ts:125/282.
- gemini-brain.ts:7-9 comment lies about an auto-fallback to gemini-3.5-flash that doesn't exist.
- brief-runner.ts writes promptSource "canonical-fallback" at :152, :182, :266, but commit 2e11e178 renamed concept/environment to "canonical". Schema drift between runner outputs.

# Steps
1. Add `DEFAULT_ARTLAB_GEMINI_BRAIN_MODEL` env-driven const to gemini-brain.ts; verify current Google catalog before locking the default. Rewrite the lying comment at :7-9 to describe ACTUAL behavior (Anthropic→Gemini chain only).
2. Add `DEFAULT_ARTLAB_CLAUDE_MODEL = "claude-opus-4-7"` to src/lib/artlab/sdk/brain/provider-registry.ts. Import everywhere `claude-opus-4-5` literal currently lives. Delete the 5 duplicates.
3. Wrap each silent catch with `recordDaemonError(workspaceRoot, "<source>", err)`. Source names: "recommend-direction-fallback", "brief-runner-canonical-fallback", "strict-qa-identity-drift", "strict-qa-tower-context", "strict-qa-final-board", "phase-notifier-:125", "phase-notifier-:282".
4. Rename "canonical-fallback" → "canonical" at brief-runner.ts:152, 182, 266.

# TDD red→green
- Write a vitest test that mocks createGeminiBrain to throw HTTP 404 for the stale model name. Red: assert daemon-errors.jsonl gets a structured entry with source "concept-critique-fallback" AND the model name in message. Green: env-driven default + recordDaemonError.
- Per silent-catch site, write a test that throws inside the wrapped path. Red: no daemon-error recorded. Green: recordDaemonError called with the named source.
- Test that runners/brief-runner.ts output uses "canonical" not "canonical-fallback".

# Verification
- `grep -rn "claude-opus-4-5\|gemini-3-pro-preview\|canonical-fallback" src/` returns empty.
- `tail .artlab/engine/daemon-errors.jsonl` shows no untyped catches after 1 fresh produce.

# Branch + commit
Branch: `fix/2026-05-28-brain-restore` from main. Push branch only. Open PR.
Commit: `Restore Gemini brain default + audit silent-catch sweep`
```

---

### Unit 2 — Implement `artlab cancel` for real + clean up stub exit codes

**Scope:** `artlab cancel <runId>` is advertised as the documented safety/recovery command (`docs/artlab/ENGINE.md:54`, `docs/artlab/OPERATIONS.md:39`) but routes to `stub("cancel", ...)` which prints a message and returns exit 0. Same UX bug on `migrate`. `--help` / `-h` are treated as unknown subcommands while `help` works. The cancel-flow machinery already exists at `src/lib/artlab/daemon/cancel-flow.ts:19-39` and reads `inbox/cancel-*.json` (NOT `runs/<runId>/cancel.json` — two auditors had this wrong); we just need to wire the intent writer.

**Files touched:**
- `scripts/artlab.ts:47-51, 59, 94-99, 136-137, 185-186` (stub() → exit 78; cancel→ runCancelSubcommand; accept `--help`/`-h`; status arg)
- `src/lib/artlab/cli/cancel.ts` (new)
- `src/lib/artlab/cli/cancel.test.ts` (new)

**TDD red→green:**
- Red: `cancel <runId>` writes `.artlab/engine/inbox/cancel-<runId>.json` with shape `{runId, requestedAt}`.
- Red: `cancel` (no args) exits 2.
- Red: `cancel bogus-runid` exits 1 (no matching run).
- Red: `--help` exits 0 with help text.
- Green: implementation.

**Verification probe:** `npm run artlab -- cancel test-id-123` exits 0; `ls .artlab/engine/inbox/cancel-test-id-123.json` exists.

**`/goal` prompt:**
```
/goal Implement `artlab cancel <runId>` and clean up stub exit codes.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- scripts/artlab.ts:136-137 routes `cancel` to `stub("cancel", rest, io)`. stub() at :47-51 prints a message and returns 0. docs/artlab/ENGINE.md:54 + OPERATIONS.md:39 advertise it as a real recovery command.
- scripts/artlab.ts:185-186 routes `migrate` to the same stub.
- scripts/artlab.ts:59-61 treats `--help`/`-h` as unknown subcommands (exit 2); only literal `help` works.
- Daemon-side machinery exists: src/lib/artlab/daemon/cancel-flow.ts:19-39 drains `inbox/cancel-*.json` files with shape {runId} and SIGTERMs the matching child via the supervisor.

# Steps
1. New file: src/lib/artlab/cli/cancel.ts exporting `runCancelSubcommand(args, io)`. Behavior:
   - No args → io.err("usage: artlab cancel <runId>"); return 2.
   - Args[0] = runId. Validate run exists at `.artlab/engine/runs/<runId>/run-state.json`. If not → io.err("no such run"); return 1.
   - Write JSON {runId, requestedAt: new Date().toISOString()} to `<workspaceRoot>/inbox/cancel-<runId>.json` via temp-file-rename (mirror state/snapshots.ts pattern).
   - io.out("cancel intent written; daemon will SIGTERM within next tick"); return 0.
2. Wire scripts/artlab.ts:136 case "cancel" → return runCancelSubcommand(rest, io).
3. Change stub() exit code from 0 → 78 (EX_CONFIG). Update message to "not yet implemented". Decide migrate: implement OR remove from HELP_TEXT + ARTLAB_SUBCOMMANDS.
4. Accept `--help`/`-h` at scripts/artlab.ts:59 — treat as alias for help.

# TDD red→green
- Test (vitest): `cancel test-runid-1` writes inbox file with shape {runId, requestedAt}.
- Test: `cancel` (no args) returns 2.
- Test: `cancel does-not-exist-run` returns 1.
- Test: `--help` and `-h` return 0 with help text matching `help`.
- Test: stub() returns 78 not 0.

# Verification
- `npm run artlab -- cancel test-id` then `ls .artlab/engine/inbox/cancel-test-id.json` succeeds.
- `npm run artlab -- cancel; echo $?` prints 2.
- `npm run artlab -- --help; echo $?` prints 0.

# Branch + commit
Branch: `fix/2026-05-28-artlab-cancel` from main. Push branch only. Open PR.
Commit: `Wire artlab cancel to real intent + fix stub exit codes`
```

---

### Unit 3 — Fix `concept-critique-fallback` state-machine handling

**Scope:** When the brain critique throws, `concept-runner.ts:445-459` writes `blocker: "concept-critique-fallback"` to run-state directly, then returns `{status: "ok"}`. The orchestrator at `deterministic.ts:89-101` then re-applies state from the pre-runner snapshot (no blocker) and `state/machine.ts:19 patch()` constructs a new state with `blocker: undefined` — the runner's blocker is silently overwritten. Compounding: `concept-critique-fallback` is in the `ArtLabBlocker` type union at `types.ts:32-41` but missing from `BLOCKERS_FOR_TRANSITIONS` at `state/machine.ts:82-91`, so `isLegalTransition(phase, phase, "concept-critique-fallback")` returns false even when correctly written.

**Files touched:**
- `src/lib/artlab/runners/concept-runner.ts:445-459`
- `src/lib/artlab/runners/concept-critique-blocker.ts:23-49`
- `src/lib/artlab/runners/runner-contract.ts` (extend `ArtLabRunnerResult.blockerHint` type to include `concept-critique-fallback`)
- `src/lib/artlab/state/machine.ts:82-91`
- `src/lib/artlab/orchestrator/deterministic.ts:80-101`

**TDD red→green:**
- Red: integration test where brain mock throws during critique. Assert run-state.json post-runner shows `blocker: "concept-critique-fallback"` (currently absent).
- Red: `isLegalTransition("concept-review", "concept-review", "concept-critique-fallback")` returns true (currently false).
- Green: runner returns blockerHint; orchestrator owns the write; blocker added to transition table.

**Verification probe:** synthetic run with brain throwing → `cat .artlab/engine/runs/<id>/run-state.json | jq .blocker` returns `"concept-critique-fallback"`; `npm run artlab -- status` shows the blocker column populated.

**`/goal` prompt:**
```
/goal Fix concept-critique-fallback so the blocker survives state-machine apply + is legal.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
1. src/lib/artlab/runners/concept-runner.ts:445-459 writes blocker:"concept-critique-fallback" to run-state via `writeConceptCritiqueFallbackBlocker`, then returns `{status:"ok"}`. No blockerHint field on the result.
2. src/lib/artlab/orchestrator/deterministic.ts:89-101 reads state INTO a local var BEFORE the runner runs, applies an auto-transition with `patch()` (state/machine.ts:19) that constructs a new state with `blocker: undefined`, then writes it via writeRunStateSnapshot — silently overwriting the runner's blocker. Live evidence: `.artlab/engine/runs/44901b6f-*/run-state.json` has no blocker field; daemon-errors.jsonl records the same run's concept-critique-fallback source.
3. src/lib/artlab/types.ts:32-41 includes "concept-critique-fallback" in ArtLabBlocker, but state/machine.ts:82-91 BLOCKERS_FOR_TRANSITIONS omits it. isLegalTransition returns false for this blocker — even if the write survived, the state machine can't recover from it.

# Steps
1. Extend ArtLabRunnerResult.blockerHint type union in runners/runner-contract.ts to include "concept-critique-fallback".
2. Change concept-runner.ts:447-459: on critique failure, return `{runnerKind:"concept", status:"failed", durationMs, artifacts, blockerHint:"concept-critique-fallback", failureCode:"concept-critique-skipped"}` instead of writing run-state + returning ok.
3. Delete the out-of-band write in concept-critique-blocker.ts (or rewrite it to be a pure helper that returns the blocker name + reason; the orchestrator owns persistence).
4. Add "concept-critique-fallback" to BLOCKERS_FOR_TRANSITIONS in state/machine.ts:82-91.
5. Verify deterministic.ts:80-86 (the `result.status === "failed"` branch) honors blockerHint correctly — if not, route through findBlockerTransition.

# TDD red→green
- Integration test: seed concept-review run, mock brain to throw during critique, run concept-runner. Red: post-run state.json.blocker is undefined. Green: state.json.blocker === "concept-critique-fallback".
- Unit test: `isLegalTransition("concept-review", "concept-review", "concept-critique-fallback")` returns true.

# Verification
- After change, kick a real run with brain mock throwing → `jq .blocker .artlab/engine/runs/<id>/run-state.json` returns the string.
- `npm run artlab -- status` renders ⚠️ blocked: concept-critique-fallback on that row.

# Branch + commit
Branch: `fix/2026-05-28-critique-blocker` from main. Push branch only. Open PR.
Commit: `Honor concept-critique-fallback blocker via runner result + state machine`
```

---

### Unit 4 — Wire the rejection ledger (memory feed-forward)

**Scope:** `appendRejection` exists at `memory/rejection-ledger.ts:22-24` and has zero production callers (verified by `grep` — only tests). `getRelevantMemory` at `memory/retrieve.ts:22` actively reads rejections but the file `.artlab/engine/memory/style-rejections.jsonl` doesn't exist. `docs/artlab/CHARACTER-PIPELINE.md:51` claims the memory loop learns from rejections — fiction. Additionally: promotion writes style-wins without `source` (`promotion-runner.ts:264-277`) while `sdk/brain/memory-scope.ts:27-31` filters wins by `source` — so promotion wins are invisible to scoped brain calls. RejectionEntry shape in `memory/rejection-ledger.ts` doesn't match the read shape used by `sdk/brain/agents/*-brain.ts`.

**Files touched:**
- `src/lib/artlab/memory/rejection-ledger.ts` (align shape)
- `src/lib/artlab/runners/strict-qa-runner.ts:126-134` (on `repair-required`)
- `src/lib/artlab/runners/concept-critique-blocker.ts:23-49` (on fallback)
- `src/lib/artlab/runners/concept-runner.ts` (on refinement-reject path)
- `src/lib/artlab/runners/promotion-runner.ts:264-277` (add `source` field)
- `src/lib/artlab/bot/brief-advance.ts` (when user rejects)
- `src/lib/artlab/bot/gate-advance.ts` (Telegram `reject`)
- `src/lib/artlab/sdk/brain/memory-scope.ts:27-31` (verify filter alignment)

**TDD red→green:**
- Red: vitest — synthetic strict-qa repair-required scenario writes a `style-rejections.jsonl` entry with `{at, characterId, lane, reason, codes}`.
- Red: synthetic promotion writes win with `source` field; `readStyleWinsForScope({winSource})` returns it.
- Red: `getRelevantMemory` returns the entry on the next call.
- Green: appendRejection wired at all 5 sites + promotion `source` added.

**Verification probe:** `wc -l .artlab/engine/memory/style-rejections.jsonl` > 0 after 1 forced strict-qa failure.

**`/goal` prompt:**
```
/goal Wire the rejection ledger so memory actually learns from rejections + fix style-wins source.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- `grep -rn "appendRejection" src/lib/artlab/` returns only the definition at memory/rejection-ledger.ts:22 + two test files. Zero production callers.
- memory/retrieve.ts:22 actively reads style-rejections.jsonl into the brain prompt. The file never exists.
- docs/artlab/CHARACTER-PIPELINE.md:51 claims "Every rejected concept writes a style-rejections.jsonl entry."
- runners/promotion-runner.ts:264-277 writes style-wins WITHOUT a `source` field. sdk/brain/memory-scope.ts:27-31 filters wins by `source` — so promotion wins are invisible to scoped brain calls.
- RejectionEntry shape in memory/rejection-ledger.ts uses {at, reason, ...}; sdk/brain/agents/*-brain.ts readers expect {at, reason, codes}. Schema drift means even if you wire writes, the brain agent parser may skip them.

# Steps
1. Align RejectionEntry shape in memory/rejection-ledger.ts to {at, characterId, lane, reason, codes, promptHash?}. Update the read in memory/retrieve.ts + sdk/brain/agents/*-brain.ts to expect this shape.
2. Call appendRejection at these sites:
   - runners/strict-qa-runner.ts:126-134 — when `repairs.length > 0`, append {reason:"repair-required", codes: repairs.map(r=>r.reason), lane: approvedLaneIndex, characterId, promptHash}.
   - runners/concept-critique-blocker.ts:23-49 — on fallback write, append {reason:"critique-skipped", codes:["brain-failure"], characterId}.
   - runners/concept-runner.ts — on refinement-reject path (the lane(s) the user rejected), append {reason:"user-rejected-lane", codes:[...], lane, characterId}.
   - bot/brief-advance.ts — when brief feedback rejects, append {reason:"user-rejected-brief", codes:["brief-feedback"], characterId}.
   - bot/gate-advance.ts — Telegram `reject` action: append {reason:"user-rejected-run", codes:["telegram-reject"], characterId}.
3. Add `source: "artlab-promotion"` to the style-wins write at promotion-runner.ts:270-275 (matches memory-scope.ts:27-31 filter).
4. Verify memory-scope.ts read filter matches the new write shape; tighten if needed.

# TDD red→green
- Vitest: synthetic strict-qa with repairs.length>0. Red: no style-rejections.jsonl written. Green: file written with one entry matching the shape.
- Vitest: synthetic promotion → style-wins.jsonl entry has `source` field; readStyleWinsForScope({winSource:"artlab-promotion"}) returns it.
- Vitest: after writing a rejection, getRelevantMemory({characterId}) returns it in `recentMemory.rejections`.

# Verification
- After forced QA failure: `wc -l .artlab/engine/memory/style-rejections.jsonl` > 0.
- `jq .source .artlab/engine/memory/style-wins.jsonl | tail -1` returns the string.

# Branch + commit
Branch: `fix/2026-05-28-rejection-ledger` from main. Push branch only. Open PR.
Commit: `Wire appendRejection + add source field to style-wins`
```

---

### Unit 5 — Kill the characterId / canon drift class at intake

**Scope:** One root cause produces three observable bugs: `intake/router.ts` never calls `resolveCanonCharacter`, so the entire downstream artifact chain (run-state, brief, concept-board lane paths, promotion target dir, style-wins) carries `roleSlug` (e.g. `"cno"`) instead of canon `header.id` (`"sol-navarro"`). Commit `ba8539db` patched concept-board.json only; five other artifacts still drift. Live evidence: `ls public/art/lobby/` returns `cno otis` — Sol's assets land at `/art/lobby/cno/` instead of canon's `floorId: rolodex-lounge`. Two existing `style-wins.jsonl` entries are keyed `characterId: "cno"`; the next Sol regeneration calls `getRelevantMemory({characterId: "sol-navarro"})` and gets zero hits. Compounding: MCP `artlab/generate` schema (`sdk/mcp/tools.ts:271-293`) has no `characterId` field, so MCP-originated character jobs reach the worker without identity (`sdk-poller.ts:164-172` writes state without `characterId`) and the brief-runner throws `no-character-match`.

**Files touched:**
- `src/lib/artlab/intake/router.ts:51-99` (call resolveCanonCharacter, persist header.id)
- `src/lib/artlab/runners/brief-runner.ts:146` (use state.characterId not roleSlug)
- `src/lib/artlab/runners/promotion-runner.ts:121-123` (derive `targetRelativeDir` from canon.floorId, not hardcoded `"lobby"`)
- `src/lib/artlab/daemon/sdk-poller.ts:164-172` (run router pre-state OR add characterId column)
- `src/lib/artlab/types.ts:83` (add `"artlab-mcp"` to sourceSurface enum)
- `src/lib/artlab/sdk/mcp/tools.ts:271-293` (add optional `characterId: CharacterIdSchema`)
- `scripts/migrate-style-wins-character-id.ts` (new — backfill `cno → sol-navarro` for existing 2 entries)
- `src/lib/visual-assets/characters.ts:286-290` (audit — may need to align `id` field to canon header.id)

**TDD red→green:**
- Red: contract test — for every character in `docs/artlab/sdk/canon/characters/*.yaml`, route messages by `displayName`, `firstName lastName`, `shortLabel`, `roleSlug`; assert resolved `characterId === header.id`.
- Red: promoted character path matches `canon.floorId` subdir, not hardcoded `lobby`.
- Red: MCP generate without explicit `characterId` still resolves identity from description (or fails loudly, not silently).
- Green: implementation.

**Verification probe:** fresh Sol run → `jq .characterId .artlab/engine/runs/<id>/run-state.json` returns `"sol-navarro"`. Promoted assets land at `public/art/rolodex-lounge/sol-navarro/`. `wc -l .artlab/engine/memory/style-wins.jsonl` shows existing entries migrated.

**`/goal` prompt:**
```
/goal Kill characterId/canon drift at intake (one resolveCanonCharacter call).

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- intake/router.ts:51-99 never calls resolveCanonCharacter; writes payload using roleSlug ("cno") not canon header.id ("sol-navarro").
- Commit ba8539db patched concept-board.json only. Still drifted: brief-runner.ts:146, run-state.json (intake), events.jsonl, concept-runner.ts:320 lane PNG paths, promotion-runner.ts:121-123 `join("lobby", input.characterId)` (hardcoded "lobby" ignores canon.floorId).
- Live evidence: `ls public/art/lobby/` returns "cno otis" — no sol-navarro, no rolodex-lounge dir.
- .artlab/engine/memory/style-wins.jsonl: 2 entries with characterId:"cno". Future Sol regen reads zero wins via getRelevantMemory({characterId:"sol-navarro"}).
- sdk/mcp/tools.ts:271-293 GenerateInput has no characterId field. daemon/sdk-poller.ts:164-172 writes state without it. brief-runner throws no-character-match.
- types.ts:83 sourceSurface enum omits "artlab-mcp"; sdk-poller writes "cli" — schema lie.

# Steps
1. intake/router.ts:51-99: call resolveCanonCharacter({workspaceRoot, hint}) at the top of the matching branch → header.id. Persist header.id in all downstream artifacts (run-state, brief, concept, events).
2. brief-runner.ts:146 — read state.characterId; don't recompute.
3. promotion-runner.ts:121-123 — load canon character for input.characterId; targetRelativeDir = join(canon.floorId, input.characterId). Fallback to lobby/<id> only if canon load fails (and recordDaemonError on fallback).
4. types.ts:83 — add "artlab-mcp" to sourceSurface enum. sdk-poller.ts:171 — write "artlab-mcp" not "cli".
5. sdk/mcp/tools.ts:271-293 — add optional `characterId: CharacterIdSchema`. sdk-poller.ts:164-172 — use provided characterId, else route via resolveCanonCharacter on description text.
6. scripts/migrate-style-wins-character-id.ts (new): read style-wins.jsonl line by line; if characterId === roleSlug, resolve to header.id; rewrite via temp-file-rename. Idempotent.

# TDD red→green
- Contract vitest: for every canon character, route messages by displayName / firstName+lastName / shortLabel / roleSlug → resolved characterId === header.id.
- Test: promoted character path === public/art/<floorId>/<header.id>/<asset>.
- Test: MCP generate without characterId resolves from description, OR fails with a loud "needs-character-id" error.
- Test: sdk-poller writes sourceSurface "artlab-mcp".

# Verification
- Fresh Sol produce → `jq .characterId .artlab/engine/runs/<id>/run-state.json` returns "sol-navarro".
- After promotion: `ls public/art/rolodex-lounge/sol-navarro/` non-empty.
- `node scripts/migrate-style-wins-character-id.ts` migrates 2 entries; rerun migrates 0.

# Branch + commit
Branch: `fix/2026-05-28-canon-identity` from main. Push branch only. Open PR.
Commit: `Resolve canon header.id at intake + migrate style-wins`
```

---

### Unit 6 — Promotion: write SDK Asset Pack manifest + gate auto-push behind opt-in

**Scope:** Two contract violations in promotion. (a) Promotion writes `promotedPackId` to run-state but never creates `.artlab/engine/promoted/<packId>/manifest.json` — the directory is empty (live probe confirms only `.gitkeep`). MCP `artlab/asset_pack_list` and `asset_pack_get` (which all 9 SDK tools and the installed skill point at) cannot round-trip. (b) `daemon/git-commit.ts:147` runs `git push origin HEAD:main` on every promotion by default, bypassing PR review. Combined with the cancel-stub (Unit 2): a stuck mistaken run can ship art directly to main + Vercel auto-deploy without operator approval.

**Files touched:**
- `src/lib/artlab/runners/promotion-runner.ts:227-258`
- `src/lib/artlab/sdk/asset-pack/manifest.schema.ts` (validator hook)
- `src/lib/artlab/daemon/git-commit.ts:143-156`
- `docs/artlab/OPERATIONS.md` (document `ARTLAB_AUTO_PUSH`)

**TDD red→green:**
- Red: integration test — promote synthetic character. Assert `.artlab/engine/promoted/<packId>/manifest.json` exists, validates against `ArtLabAssetPackManifest` schema, has `sha256` fields per payload, has `integration` block.
- Red: MCP round-trip — `asset_pack_get({packId})` after promotion returns the manifest.
- Red: default config — `autoCommitPromotion` returns `{status: "skipped", reason: "push-opt-in-required"}` unless `ARTLAB_AUTO_PUSH=on`.
- Green: implementation.

**Verification probe:** `find .artlab/engine/promoted -name manifest.json` finds it. `vitest run sdk/mcp/tool-handlers/asset-pack-get` round-trip passes. `git log origin/main --since='1 hour ago' --author='ArtLab daemon'` empty during default-config runs.

**`/goal` prompt:**
```
/goal Promotion: write SDK Asset Pack manifest + gate auto-push to main behind opt-in.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- promotion-runner.ts:252-258 writes `promotedPackId` to run-state but no code creates .artlab/engine/promoted/<packId>/manifest.json. Live probe: `ls .artlab/engine/promoted/` shows only `.gitkeep`.
- sdk/mcp/tool-handlers/asset-pack-list.ts:36-42 discovers packs by scanning <packsRoot>/<dir>/manifest.json. asset-pack-get.ts:31-35 throws when absent.
- ~/.claude/skills/artlab/SKILL.md:50,66 advertises promoted packs at .artlab/engine/promoted/.
- daemon/git-commit.ts:147 unconditionally calls `git push origin HEAD:main`. autoCommitPromotion at :80-156 only honors `skipPush` if explicitly set; default OFF. OPERATIONS.md never warns about auto-push.

# Steps
1. In promotion-runner.ts after the public-art write (~:237) and BEFORE writing promotedPackId at :252:
   a. Build ArtLabAssetPackManifest = {packId, kind, publicPath, sha256, integration:{width,height,alt,...}, sources:[{path,sha256}], generatedAt}.
   b. sha256 = createHash("sha256").update(buf).digest("hex") per payload.
   c. Validate via ArtLabAssetPackManifestSchema.parse(); throw with clear error code if invalid.
   d. mkdirSync(`.artlab/engine/promoted/<packId>`, {recursive:true}); copy/hardlink payloads; writeFileSync manifest.json via temp-file-rename.
   e. Only then write promotedPackId to run-state.
2. daemon/git-commit.ts:80-156: default `skipPush = process.env.ARTLAB_AUTO_PUSH !== "on"` (opt-in). On default-skip, return {status:"committed", reason:"push-opt-in-required (set ARTLAB_AUTO_PUSH=on)", ...}. Keep test's skipPush:true path working.
3. docs/artlab/OPERATIONS.md "Daily use": document ARTLAB_AUTO_PUSH=on requirement, that it pushes to origin/main (no PR), and that the byte-diff CI workflow runs ONLY on PRs — so auto-push bypasses byte-diff.

# TDD red→green
- Integration vitest: synthetic promotion fixture → assert .artlab/engine/promoted/<packId>/manifest.json exists, parses with ArtLabAssetPackManifestSchema, has sha256.
- Integration: after promotion, asset-pack-get({packId}) round-trips.
- Test: ARTLAB_AUTO_PUSH unset → autoCommitPromotion returns status:"committed" + reason:"push-opt-in-required"; spawnSync push NOT invoked.
- Test: ARTLAB_AUTO_PUSH=on → push runs.

# Verification
- `find .artlab/engine/promoted -name manifest.json` non-empty after 1 promotion.
- `vitest run sdk/mcp/tool-handlers/asset-pack-get` passes round-trip.
- `git log origin/main --since='10 minutes ago' --grep='ArtLab promotion'` empty unless flag set.

# Branch + commit
Branch: `fix/2026-05-28-promotion-pack-and-push` from main. Push branch only. Open PR.
Commit: `Write SDK Asset Pack manifest at promotion + gate auto-push opt-in`
```

---

### Unit 7 — CLI operator-truth: preserve runId, wire inbox consumer, atomic queue, exit codes, status `[runId]`

**Scope:** Six small fixes that share a test scaffold — bundling because they cross-pollinate (status reads what produce writes; queue reflects active state; health enforces it). (1) `cli/produce.ts:28-37` creates `runId` and announces it, but `daemon/cli-inbox-bridge.ts:51-61` does `randomUUID()` again and discards the CLI ID — every documented `status/cancel/answer/continue <runId>` workflow is broken at the first step. (2) `src/lib/artlab/daemon/cli-inbox-consumer.ts` exists in the working tree (uncommitted) with full test coverage and implements answer/continue consumption, but is not wired into `daemon/entry.ts` — the fix is half-completed. (3) `queue/queue.ts:70-75` unlinks the queue file immediately, then `queue-processor.ts:24-35` spawns; a spawn failure between unlink and registration loses the job. (4) `scripts/artlab.ts:110-115` returns 0 from `health` even when daemon-down — onboarding docs treat this as a green signal. (5) `cli/status.ts:14-19` accepts no args; `scripts/artlab.ts:94-99` doesn't pass `rest`. (6) `cli/ui/render.ts:84` prints "engine is idle" while status sees active runs. (7) `health/snapshot.ts:47-60` collects locks + daemon-errors, but the renderer at `ui/render.ts:105-153` doesn't show them.

**Files touched:**
- `src/lib/artlab/cli/produce.ts:28-37`
- `src/lib/artlab/daemon/cli-inbox-bridge.ts:51-79`
- `src/lib/artlab/daemon/entry.ts` (wire consumer into tick)
- `src/lib/artlab/daemon/cli-inbox-consumer.ts` (already exists — commit it as-is via this work unit)
- `src/lib/artlab/queue/queue.ts:70-75`
- `src/lib/artlab/daemon/queue-processor.ts:24-35`
- `src/lib/artlab/cli/status.ts:14-64`
- `src/lib/artlab/cli/queue.ts:16-19`
- `src/lib/artlab/cli/ui/render.ts:42-153`
- `src/lib/artlab/health/snapshot.ts:47-60`
- `scripts/artlab.ts:94-115`

**TDD red→green:**
- Red: `produce "x"` returns runId R; `status R` resolves the same run (currently fails — bridge writes a different ID).
- Red: spawn-failure simulation in `queue-processor.spawnRunner` — assert the queue entry survives in `inflight/` and gets requeued, not lost.
- Red: `health` non-interactive exits non-zero on Daemon down state.
- Red: `status R` renders single-run view with blocker column.
- Red: `queue` doesn't print "engine is idle" when `status` reports active runs.
- Red: drop `answer-*.json` into a run's `cli-inbox/`, run consumer drain, assert state advances brief-review → generating-concepts.
- Green: implementation.

**Verification probe:** scripted shell: `R=$(npm run artlab -- produce "x" | grep -oE 'run [a-f0-9-]{36}' | awk '{print $2}'); npm run artlab -- status $R` shows that one run.

**`/goal` prompt:**
```
/goal CLI operator-truth: preserve runId, wire inbox consumer, atomic queue, exit codes, status [runId].

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
1. cli/produce.ts:28-37 creates runId; cli-inbox-bridge.ts:51-61 randomUUID()s again. CLI runId discarded — status/cancel/answer/continue target a phantom.
2. daemon/cli-inbox-consumer.ts + .test.ts EXIST in working tree uncommitted (see `git status`). Implement answer/continue via advanceBriefApproval / advanceConceptApproval / advancePromotionApproval with full test coverage. NOT wired into daemon/entry.ts.
3. queue/queue.ts:70-75 unlinks BEFORE spawn. queue-processor.ts:24-35 spawns AFTER; spawn throw or registration fail → job silently dropped.
4. scripts/artlab.ts:110-115 always returns 0 from `health`. daemon-errors.ts:96-103 can return "✗ Daemon down" while exit is 0.
5. scripts/artlab.ts:94-99 calls runStatusSubcommand without `rest`. status.ts:14-19 accepts no args.
6. ui/render.ts:84 prints "(engine is idle)" when queue empty even when status sees active runs.
7. health/snapshot.ts:47-60 includes locks + daemon-errors. ui/render.ts:105-153 renders only banner/spend/processes/leases/cleanup/speed.

# Steps
1. produce.ts:28-37: include runId in payload {runId, request, sourceSurface, createdAt}. cli-inbox-bridge.ts:51-61: use payload.runId.
2. Commit cli-inbox-consumer.ts + .test.ts as-is. In daemon/entry.ts per-tick loop, call `createCliInboxConsumer({workspaceRoot}).drain()` inside runStep "cli-inbox-consumer".
3. queue/queue.ts:70-75: rename next file to <queueDir>/inflight/<filename> atomically. queue-processor.ts:24-35: unlink inflight after spawn+register succeed; on spawn throw, rename back (requeue). Surface `requeue` count on health.
4. scripts/artlab.ts:110-115: daemonDown OR staleLocks → return 1. --soft flag overrides.
5. status.ts:14-19: accept optional runId. Render single-run view via new renderRunDetailView. scripts/artlab.ts:94-99: pass rest.
6. ui/render.ts:42-51: add `blocker` column. :84: only print "engine is idle" when active count is 0.
7. renderHealthView: add `Locks` table + `Recent daemon errors` (last 5). Stale/corrupt locks bump severity.

# TDD red→green
- `produce` → bridge preserves runId; `status <id>` finds it.
- cli-inbox-consumer drain test still passes after entry wire.
- queue-processor with spawnSync mocked to throw → inflight rename-back invoked; queue re-readable.
- health returns 1 on daemon-down without --soft.
- status with runId renders single-run view; without → global.

# Verification
- `R=$(npm run artlab -- produce "x"|grep -oE '[a-f0-9-]{36}'|head -1); npm run artlab -- status $R` resolves the run.
- `npm run artlab -- health; echo $?` returns 1 on daemon down.
- `npm run artlab -- status` shows blocker column.

# Branch + commit
Branch: `fix/2026-05-28-cli-ops-surface` from main. Push branch only. Open PR.
Commit: `Operator-truth: preserve runId, wire inbox consumer, atomic queue, exit codes, status arg`
```

---

### Unit 8 — Doc regeneration from canon/types + REQUIRED_PHRASE consolidation + brand purity

**Scope:** Three drift-prevention surfaces share one PR. (a) `docs/artlab/CHARACTER-PIPELINE.md:23-36` table contradicts canon for 7 of 12 characters; rewrite from `docs/artlab/sdk/canon/characters/*.yaml` headers. (b) `docs/artlab/ENGINE.md:29-35` lists 10 phases + 7 blockers; `src/lib/artlab/types.ts:15-41` has 13 phases + 8 blockers — regenerate from `ARTLAB_PHASES`/`ARTLAB_BLOCKERS`. (c) The promotion firewall string `"approved for app"` lives at 8+ production sites (synthesizer's walk corrected c11049ae.I5's count): `promotion/promotion.ts:55,86,176`, `contracts/contracts.ts:55,104,114,124`, `bot/reply-parser.ts:1`, `runners/promotion-runner.ts:91`, `bot/gate-advance.ts:105`, `daemon/phase-notifier.ts:371`. Consolidate to one import. (d) `CLAUDE.md:35` still points at `docs/CHARACTER-PROMPTS.md` (legacy, in `docs/legacy/`); redirect. (e) `.artlab/engine/inbox/foundry/` directory exists, empty — brand-purity violation per CLAUDE.md sacred rule. (f) Add a CI doc-drift check.

**Files touched:**
- `docs/artlab/CHARACTER-PIPELINE.md:23-36`
- `docs/artlab/ENGINE.md:29-35`
- `CLAUDE.md:35`
- `src/lib/artlab/promotion/constants.ts` (new — `REQUIRED_PROMOTION_PHRASE`)
- `src/lib/artlab/promotion/promotion.ts:55,86,176`
- `src/lib/artlab/contracts/contracts.ts:55,104,114,124`
- `src/lib/artlab/bot/reply-parser.ts:1`
- `src/lib/artlab/runners/promotion-runner.ts:91`
- `src/lib/artlab/bot/gate-advance.ts:105`
- `src/lib/artlab/daemon/phase-notifier.ts:371`
- `scripts/artlab-doc-drift-check.ts` (new)
- `.artlab/engine/inbox/foundry/` (delete)
- `.github/workflows/*.yml` (add doc-drift job)

**TDD red→green:**
- Red: doc-drift test compares the CHARACTER-PIPELINE.md role/floor table to canon YAML for each character; fails on mismatch.
- Red: ENGINE.md phase enumeration matches `ARTLAB_PHASES.length` and content.
- Red: `grep -rn "\"approved for app\"" src/lib/artlab/` (excluding constants.ts) returns 0.
- Red: `ls .artlab/engine/inbox/foundry/` fails (directory removed).
- Green: implementation.

**Verification probe:** `grep -rn "\"approved for app\"" src/lib/artlab/ --include='*.ts' | grep -v constants.ts` empty. `node scripts/artlab-doc-drift-check.ts` exits 0.

**`/goal` prompt:**
```
/goal Doc regen from canon/types + consolidate "approved for app" + delete foundry/ dir.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
- docs/artlab/CHARACTER-PIPELINE.md:23-36 role/floor table contradicts canon for 7 of 12 chars. Canon: docs/artlab/sdk/canon/characters/*.yaml {id, roleSlug, displayName, title, floorId, floorLabel}. Doc lies about sol (says Floor 4/COO; canon: Floor 6/CNO), dylan, priya, mina, etta, nadia, rowan.
- docs/artlab/ENGINE.md:29-35 says 10 phases + 7 blockers; src/lib/artlab/types.ts:15-41 has 13 phases (adds briefing, brief-review, refining-concepts) + 8 blockers (adds concept-critique-fallback).
- "approved for app" literal at 8+ sites: promotion/promotion.ts:55,86,176 + contracts/contracts.ts:55,104,114,124 + bot/reply-parser.ts:1 + runners/promotion-runner.ts:91 + bot/gate-advance.ts:105 + daemon/phase-notifier.ts:371. Any drift → firewall silently mismatches.
- CLAUDE.md:35 still points at docs/CHARACTER-PROMPTS.md (legacy in docs/legacy/). Canonical = docs/artlab/CHARACTER-PIPELINE.md.
- .artlab/engine/inbox/foundry/ exists empty. CLAUDE.md sacred rule: ArtLab only.

# Steps
1. New file: src/lib/artlab/promotion/constants.ts → `export const REQUIRED_PROMOTION_PHRASE = "approved for app" as const;`. Replace all 8 literal sites with imports.
2. New file: scripts/artlab-doc-drift-check.ts:
   - Load canon char YAMLs → expected table.
   - Parse CHARACTER-PIPELINE.md role/floor table; diff; exit 1 on mismatch with diff print.
   - Same for ENGINE.md phase list vs ARTLAB_PHASES + blocker list vs ARTLAB_BLOCKERS.
3. Run drift check (will fail). Regenerate docs by hand to match canon/types. Make brainstorm fork (briefing/brief-review) + refining-concepts loop explicit. Rerun until pass.
4. Add .github/workflows/artlab-doc-drift.yml — runs `npm run -s artlab-doc-drift-check` on every PR.
5. CLAUDE.md:35: change pointer to docs/artlab/CHARACTER-PIPELINE.md.
6. `rmdir .artlab/engine/inbox/foundry`. Keep the "purged tower-art-foundry" message in install-mcp.ts:91 (still informative).

# TDD red→green
- Vitest: artlab-doc-drift-check exits 0 against current canon + types.
- Vitest: tamper sol row → drift check exits 1.
- Vitest: `grep "approved for app" src/lib/artlab` (excluding constants.ts) returns 0.
- Vitest: REQUIRED_PROMOTION_PHRASE === "approved for app".

# Verification
- `node scripts/artlab-doc-drift-check.ts; echo $?` returns 0.
- `grep -rn "\"approved for app\"" src/lib/artlab/ --include='*.ts' | grep -v constants.ts` empty.
- `ls .artlab/engine/inbox/foundry/ 2>&1` → "No such file".

# Branch + commit
Branch: `chore/2026-05-28-doc-canon-and-required-phrase` from main. Push branch only. Open PR.
Commit: `Regen docs from canon/types + consolidate approval phrase + delete foundry dir`
```

---

### Unit 9 — Cheap CI for the four `describe.skip` acceptance suites

**Scope:** The four most regression-prone properties (speed promise, memory accumulation, bundle atomicity, cast visual distinctness) are guarded by `describe.skip` test suites. Real-money runs are correct to skip on CI, but their *shape* — schema, structure, file/manifest contracts — can be enforced with fixtures. Split each suite into `describe("shape")` (always runs, uses fixtures only) + `describe.skip("live spend")` (existing). The shape suite for `cast-push-accumulation.test.ts` would have caught the 212dc976.C5 finding (style-wins keyed by roleSlug).

**Files touched:**
- `src/lib/artlab/speed/phase-5-acceptance.test.ts:13-20`
- `src/lib/artlab/memory/cast-push-accumulation.test.ts:6-16`
- `src/lib/artlab/intake/bundle-acceptance.test.ts:5-19`
- `src/lib/artlab/coherence/cast-diversity-regression.test.ts:7-12` (replace hardcoded `public/art/lobby` with canon-derived path)

**TDD red→green:**
- Red: shape-suite tests asserting fixture invariants (e.g., promotion writes one style-wins entry with required fields).
- Red: cast-diversity uses canon floor paths, not hardcoded lobby.
- Green: tests pass.

**Verification probe:** `npm test -- --reporter=verbose 2>&1 | grep -E "shape|skip"` — no shape suites skipped.

**`/goal` prompt:**
```
/goal Replace the 4 describe.skip acceptance suites with cheap fixture-based shape tests.

Repo: /Users/armaanarora/Documents/The Tower

# What is broken
4 acceptance suites are describe.skip — their CI coverage is zero:
1. src/lib/artlab/speed/phase-5-acceptance.test.ts:13-20 — "Phase 5 acceptance — Rafe-rerun ≥ 40% faster than baseline" (real spend).
2. src/lib/artlab/memory/cast-push-accumulation.test.ts:6-16 — "Phase 6 memory accumulation (manual — run after each character)".
3. src/lib/artlab/intake/bundle-acceptance.test.ts:5-19 — atomic environment+character bundle.
4. src/lib/artlab/coherence/cast-diversity-regression.test.ts:7-12 — hardcodes `public/art/lobby` as the only art root + describe.skip.

The shape tests below would have caught known bugs (e.g., the cast-push shape test would have caught style-wins keyed by roleSlug not header.id; the bundle shape test would have caught any new schema drift in the intake parser).

# Steps
For each file:
1. Wrap the existing block in `describe.skip("live spend", () => { /* existing */ })`. Keep it skipped.
2. Add a new `describe("shape", () => { ... })` that:
   - Uses synthetic fixtures only (mock files written to a `mkdtempSync` workspace).
   - Asserts the schema/structure that the live test would have asserted, not the spend-bearing properties.

phase-5-acceptance shape: assert the perf-snapshot JSON shape (fields: baselineWallClockMs, currentWallClockMs, improvementPercent or undefined, modelsUsed[]). Don't assert >=40%.

cast-push-accumulation shape: after one synthetic promotion (no real spend), assert style-wins.jsonl has exactly one line whose JSON matches the StyleWinEntry shape including `source` and canonical characterId (header.id). This catches the roleSlug-vs-header.id drift.

bundle-acceptance shape: synthetic bundle text fixture → parser produces both environment + character spec atoms; partial accept rejected with an explicit error code.

cast-diversity-regression: change line :12 from a hardcoded "public/art/lobby" to canon-derived path resolved per character (canon.floorId). Unskip the diversity assertion if it can run on fixtures; otherwise wrap the real-image check in describe.skip and add a fixture-pHash shape test.

# TDD red→green
- Red: write each shape test first. They fail because the implementation hasn't been wired (or in cast-diversity's case, because the path is wrong).
- Green: minimal wiring + path fix.

# Verification
- `npm test` runs all 4 shape suites without skip.
- Inspect CI run output: shape tests pass on every PR.

# Branch + commit
Branch: `test/2026-05-28-acceptance-shape-tests` from main. Push branch only. Open PR.
Commit: `Add CI-runnable shape tests for the 4 acceptance suites`
```

---

## Out of scope (deliberate)

Items flagged by ≤1 auditor that synthesizer did **not** independently corroborate, OR that are too small / too risky / too unscoped for atomic /goal execution:

- **Telegram identity-drop is silent** (212dc976.I5) — small alarm wiring; defer until someone owns Keychain ops.
- **`improvementPercent: 0%` ambiguity** (212dc976.I7) — UX polish on health renderer.
- **`daemon-heartbeat.json` written before work each tick** (212dc976.M1) — design refactor on heartbeat semantics; non-urgent.
- **`recordDaemonError` truncates message on read but writes full stack** (212dc976.M5) — log-rotation impact only; defer to log-rotation work.
- **Intake `needs-human` not honored by Telegram/worker** (6210f6d6.I2) — needs spec on Telegram clarification template; deserves own brainstorm.
- **Rejected reference photos persist before validation** (6210f6d6.I8) — privacy/storage footgun but small.
- **Daemon log path doc drift** (6210f6d6.M2) — single-auditor doc fix.
- **`tower-context.ts` silently falls back to Armaan's checkout** (d58b2bdf.M1) — single-auditor portability fix; needs CI run on another machine to confirm impact.
- **MCP installer writes wrong `settings.json` path per skill** (d58b2bdf.I8) — needs Claude Code reality-check first; the skill's claim that `~/.claude.json` is the right path may itself be outdated.
- **Self-evolution not wired into daemon** (d58b2bdf.I9) — risky subsystem; deserves a dedicated session with its own design.
- **Telegram `reject` parsed but not actioned** (d58b2bdf.I3) — needs spec on reject semantics.
- **Telegram dispatch on mock brain** (d58b2bdf.I5) — needs design choice on brain provider selection in dispatch path.
- **Heartbeat-vs-pid mismatch** (c11049ae.I3) — useful diagnostic improvement, single-auditor, non-urgent.
- **Canon load sequential `for-await`** (c11049ae.I6) — perf-only, no correctness impact at 12 characters.
- **`telegram-poller.ts` stack trace per failure** (c11049ae.M1) — log-volume polish; defer.
- **`daemon-heartbeat.json` lacks `lockOwner` field** (c11049ae.M5) — small consistency improvement.

These should be revisited after Units 1-9 land; some will resolve themselves (e.g., the silent identity-drop becomes trivially addable once Unit 1's silent-catch sweep pattern is in place).

---

**End-of-plan checklist:**
- [ ] Synthesis methodology documented (consensus vs single-auditor filtering rule)
- [ ] All 4 source audits referenced
- [ ] Findings consensus matrix complete (21 rows: 10 consensus + 5 single-auditor-corroborated + 6 folded-into-units)
- [ ] 9 atomic work units, each with file:line targets, TDD red→green, and a paste-ready `/goal` block under 3000 chars
- [ ] Out-of-scope list captures every single-auditor finding not promoted (with reason)
- [ ] No `/goal` block writes to `main` directly (each uses a `fix/*` or `chore/*` or `test/*` branch)
