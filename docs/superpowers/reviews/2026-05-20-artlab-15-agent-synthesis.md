# ArtLab 15-Agent Review — Verified Synthesis (2026-05-20)

## Verdict
ArtLab's individual modules are mostly well-implemented and well-tested in isolation, but the system as a whole is largely **un-wired**: the CLI, daemon orchestration, intake router, coherence subsystem, memory ledgers, and decision log have **no production callers**, and the `artlab daemon run` subcommand that `launchd` invokes is still a stub. The primary risk is shipping a façade — every Telegram trigger, every CLI `produce`, and every long-running daemon supervision call drops into a no-op or an empty `catch {}`, while the runtime promotion path is a separate runner that bypasses the firewall function that does the real safety work.

## Severity legend
- **CRITICAL** — blocks production, data corruption, security, or major safety-property failure
- **HIGH** — breaks a documented feature or makes a subsystem effectively useless
- **MEDIUM** — degrades robustness or correctness in non-default paths
- **LOW** — code smell, dead code, minor cleanup
- **REVIEW NOISE** — reviewer was wrong; included so we don't chase it

## CRITICAL findings

### 1. `artlab daemon run` is a stub — `launchd` invokes a no-op
**Subsystem:** cli, daemon
**Evidence:**
- `scripts/artlab.ts:91-92` — `case "daemon": return stub("daemon", rest, io);`
- `scripts/artlab.ts:36-40` — `stub(name, ...)` prints "stub — fills in during Phase 1-3 implementation" and returns `0`.
- `src/lib/artlab/daemon/launchd.ts:21` builds args `[node, daemonEntry, "daemon", "run"]` — this calls the stub.
- `src/lib/artlab/daemon/entry.ts:50` — `runDaemonForever` exists but `grep -rn runDaemonForever src/ scripts/` finds zero non-self callers.
**Why critical:** The `KeepAlive=true` plist will start a process that immediately exits successful (exit 0), wait `ThrottleInterval=10` seconds, and try again forever — but nothing actually runs the engine. Every "ArtLab is running" claim is false.
**Fix:** Replace the daemon stub case with code that builds the `DaemonContext` (telegramPoller + queueProcessor + cancelFlow + crashRecovery + sleepGuard + inboxWatcher) and awaits `runDaemonForever(ctx)`. The pieces already exist; only the wiring is missing.

### 2. CLI inbox writes are never consumed
**Subsystem:** cli, daemon, queue
**Evidence:**
- `src/lib/artlab/cli/produce.ts:23-30` writes JSON files to `inbox/cli/produce-<runId>.json`.
- `src/lib/artlab/cli/continue.ts:20-27` and `.../answer.ts:22-30` likewise write to `inbox/cli/`.
- `grep -rn "inbox/cli" src/` returns only the writers, their tests, the standalone `drainInbox` test, and one migration acceptance assertion — **no production reader**.
- The daemon's `queue-processor.ts:25` reads runs via `dequeueNextRun(workspaceRoot)`, which scans `queue/`, not `inbox/cli/`. `enqueueRun` itself is called only by tests (`grep -rn enqueueRun src/` confirms).
**Why critical:** The entire CLI surface (`artlab produce`, `continue`, `answer`) is a write-only side effect. Even if the daemon were started, it has no bridge from CLI intents to its queue.
**Fix:** In `runDaemonOnce`, after the telegram tick, call `drainInbox({subdir: "cli", prefix: "produce-"})` and pipe each intent into `enqueueRun(...)` (or a parallel `process<verb>Intent` function for `continue-`/`answer-`/`cancel-`). The `drainInbox` function already exists at `daemon/inbox-watcher.ts`.

### 3. Daemon ignores cancel-flow, crash-recovery, sleep-guard, and inbox-watcher
**Subsystem:** daemon
**Evidence:**
- `src/lib/artlab/daemon/entry.ts:42-48` — `runDaemonOnce` only `await Promise.all([telegramPoller.tick(), queueProcessor.tick()])`.
- `grep -rn "processCancelIntents|reconcileCrashedRuns|drainInbox|createSleepGuard" src/ scripts/` returns only test callers.
**Why critical:** Spec safety properties §13.3 (cancellation) and §13.4 (resume after crash) are not enforced at runtime even though the modules exist and pass their unit tests. `/cancel <runId>` writes a file nothing reads. `caffeinate -i` is never spawned, so a sleeping Mac will pause overnight production runs.
**Fix:** Extend `DaemonContextInput` with `cancelFlow`, `crashRecovery`, `sleepGuard`, and `cliInboxWatcher`. Have `runDaemonOnce` call them on a sensible cadence (cancel + inbox every tick; crash-recovery once per minute; sleep-guard activate when `supervisor.canSpawn() === false` and a long-running child is present).

### 4. Daemon main loop has an empty `catch {}` that hides every error
**Subsystem:** daemon
**Evidence:** `src/lib/artlab/daemon/entry.ts:57-61`
```
try {
  await runDaemonOnce(ctx);
} catch {
  // never let a tick error kill the daemon
}
```
**Why critical:** Failures in `telegramPoller.tick()`, `queueProcessor.tick()`, or anything else become silent. A misconfigured Telegram token, a corrupt queue file, a Postgres outage, or a runner throw all look identical to a healthy idle engine. Combined with the missing inbox drain and stub CLI, this means there is no observable signal of breakage.
**Fix:** Catch the error, write a structured entry to `${workspaceRoot}/daemon-errors.jsonl`, and emit it through the existing health snapshot. Keep the swallow semantics — just stop discarding the evidence.

### 5. Promotion runner bypasses the firewall entirely
**Subsystem:** runners, promotion
**Evidence:**
- `src/lib/artlab/runners/promotion-runner.ts:24-67` is the runner registered in `runners/index.ts:18` under `kind: "promotion"`. Its safety check is exactly one thing: the phrase string in `approval.json` must equal `"approved for app"`. It then `copyFileSync`s from `${runDir}/cutouts/*` straight into `/Users/armaanarora/Documents/The Tower/public/art/...` via `targetDir(input)`.
- `src/lib/artlab/promotion/promotion.ts:81-122` (the correct firewall) checks QA pass, both manifest existences, `promotesOnAction:false` on each, every staged asset existing, and the `publicArtWritesAllowed` flag.
- `grep -rn "promoteCreativeAssetsTransactionally" src/` returns only the test file plus its own definition. **No production caller.**
**Why critical:** The deterministic walker (`orchestrator/deterministic.ts:13`) routes the `promoting` phase to the `promotionRunner` — i.e., the path that bypasses strict-qa and both manifests. Once the walker is wired into the daemon, a run that has the phrase but no strict-qa receipt will still write to `public/art/`. This is the central spec safety property #1 and it is not enforced by the runtime code path.
**Fix:** Either (a) make `promotionRunner.run` delegate to `promoteCreativeAssetsTransactionally`, passing `strictQaPassed`/manifest summaries read from the run dir, or (b) replace the runner with a thin wrapper that calls the firewall function. Keep the runner registered under `promotion`; only its body changes.

### 6. Character contract — the 21-sprite matrix bedrock — does not exist
**Subsystem:** contracts
**Evidence (pre-verified):** `src/lib/artlab/contracts/` has `animation-contract.ts`, `environment-contract.ts`, `ui-texture-contract.ts`, and the general `contracts.ts`, but no `character-contract.ts`. Nothing in the codebase imports `characterContract`.
**Why critical:** Per the spec, the character asset type is the vertical slice and the bedrock for cast coherence; every other contract orbits it. `contracts.ts:137` describes character via the generic `CreativeAssetContract` shape, but there is no concrete 21-sprite matrix anywhere in the runtime. The `productionRunner` (used for characters) writes 20 generic slot JSONs with no per-pose semantics.
**Fix:** Add `contracts/character-contract.ts` with the explicit 21-sprite matrix (poses × expressions × variants) and a Zod schema. Re-export it from `contracts/index.ts`. Have `productionRunner` consume the matrix when `assetType === "character"`.

### 7. Cutout pool deadlocks at `concurrency: 0`
**Subsystem:** speed
**Evidence (pre-verified):** `src/lib/artlab/speed/cutout-pool.ts:11` — `const concurrency = input.concurrency ?? DEFAULT_CUTOUT_CONCURRENCY;`. `??` only triggers on null/undefined, so an explicit `0` produces a `length: 0` workers array; tasks are never picked up and `Promise.all([])` resolves immediately, looking like success.
**Why critical:** A misconfigured `concurrency: 0` (from a feature flag, env var, or test override) silently drops the entire cutout step. Run continues into strict-qa with zero cutouts and likely passes through anyway because most QA checks look for receipt files, not slot counts.
**Fix:** `const concurrency = input.concurrency && input.concurrency > 0 ? input.concurrency : DEFAULT_CUTOUT_CONCURRENCY;` (or throw on `<= 0` if that is preferred behavior).

### 8. Coherence subsystem is fully orphaned (no `age-impression` producer, AND-bug in diversity rule)
**Subsystem:** coherence
**Evidence:**
- Pre-verified: `grep -rn "from.*coherence" src/lib/artlab/` excluding coherence/ returns ZERO matches.
- `src/lib/artlab/coherence/cast-diversity.ts:39` — `if (sd < thresholds.silhouette.minPairwiseDistance && pd < thresholds.palette.minPairwiseDistance) { failureCodes.add("diversity-failure"); }`. The "diversity-failure" intent is "lanes look too alike"; the rule only fires when both silhouette **and** palette are too close. Two lanes with identical silhouettes but a slight palette tint pass.
- `LaneSignature` and `PromotedCastSignature` both require `ageImpression: number` (cast-diversity.ts:8, 15), but `coherence/hashes.ts` only exports `computeSilhouetteHash` and `computePaletteHistogram` — there is no `computeAgeImpression`, and no `coherence/scanners/` directory.
**Why critical:** Spec promises cast coherence enforcement. Today it is a paper subsystem: not called from any pipeline, the diversity rule misclassifies the most common failure mode, and the age-drift check is unreachable because no caller can supply a real `ageImpression` value.
**Fix:** (a) Wire `checkCastDiversity` and `computeStyleEnvelopeReport` into the strict-qa runner with promoted-cast signatures loaded from `memory/style-wins.jsonl`; (b) change line 39's `&&` to `||`; (c) either add an `ageImpression` producer (e.g., crude metric from face-aspect ratio + dominant chroma) or remove `ageImpression` from the signature types until a real producer exists.

## HIGH findings

### 9. Trigger dispatcher is a stub — Telegram triggers never enqueue runs
**Subsystem:** bot
**Evidence:** `src/lib/artlab/bot/bot-dispatcher.ts:55-63` — for `kind in {trigger, trigger-with-photo, bundle}` it only sends "Got it — <kind>. Engine routing." and returns `{ action: { type: "trigger-enqueued", runId: "pending-routing" } }`. The literal string `"pending-routing"` proves nothing was routed. No `enqueueRun`, no `routeRequest`, no inbox write.
**Why high:** Combined with finding #2, the Telegram surface is also a no-op for the primary user action. Users see the "Got it" message, then nothing ever happens.
**Fix:** In the trigger branches, call `routeRequest({ request: text })` from `intake/router.ts`, then `enqueueRun(workspaceRoot, { runId: randomUUID(), priority: "default", enqueuedAt: ..., spec: { request, classification } })`. For `trigger-with-photo`, attach via `attachReference(...)` from intake before enqueue.

### 10. Telegram poller has poison-message infinite reprocessing
**Subsystem:** bot, daemon
**Evidence:** `src/lib/artlab/daemon/telegram-poller.ts:39-46` writes the offset only after the for-loop finishes. If `await input.dispatch({ message })` throws, control returns to `runDaemonOnce`'s `catch {}` (finding #4); the offset is never written; the next tick fetches the same updates with the same poison message; throw repeats forever.
**Why high:** A single malformed update (or a transient dispatch failure with an external service) jams the bot indefinitely with no visible signal.
**Fix:** Wrap the dispatch call in per-message try/catch; on throw, log structured error to `daemon-errors.jsonl` and continue. Advance offset incrementally (`writeOffset(root, update.update_id)` inside the loop after each successful or recorded-failed dispatch) so a poison message can never block subsequent traffic.

### 11. Intake router is orphaned
**Subsystem:** intake
**Evidence:** `grep -rn "routeRequest|RouterOutcome|KNOWN_CAST|findCastMember|detectAmbiguity|parseBundle|attachReference" src/ scripts/` returns only callers inside `src/lib/artlab/intake/` and one unrelated agents string. The barrel at `intake/index.ts` re-exports everything, but no consumer imports from it.
**Why high:** The router is the canonical "did the user mean a character, an environment, or an ambiguous brief?" classifier. Without it, the bot dispatcher (finding #9) and CLI (finding #2) have no way to set `assetType`, `characterId`, or `needs-human` blocker correctly. Every run is effectively asset-type-blind.
**Fix:** Already covered under #9 (bot wiring) and #2 (CLI wiring) — call `routeRequest` at the bot/CLI boundary and persist its result onto the run.

### 12. Migration writers will corrupt the style-wins ledger schema
**Subsystem:** memory, migration
**Evidence:**
- `src/lib/artlab/memory/style-ledger.ts:5-15` — `StyleWinEntrySchema` requires `characterId`, `promotedAt`, `winningTechniques: string[]`, `promptHash`, `totalCostCents`; `cutoutModelUsed` is the only optional field.
- `src/lib/artlab/migration/import-otis.ts:38-45` and `import-mara.ts:38-44` build a literal `{characterId, promotedAt, source, fileCount, note}` and call `appendFileSync` directly to `style-wins.jsonl` — bypassing the schema. The literal is missing required fields (`winningTechniques`, `promptHash`, `totalCostCents`) and adds unknown fields (`source`, `fileCount`, `note`).
- `readStyleWins` (`style-ledger.ts:31`) calls `StyleWinEntrySchema.parse(...)` per line. **Any later production call to `readStyleWins` after migration throws.**
**Why high:** Spec test `cast-push-accumulation.test.ts:22-23` explicitly expects post-migration lines with `source: "legacy-import"`. Today the writer and the reader disagree on schema. The `getRelevantMemory` retrieve path (`memory/retrieve.ts:21`) will throw on the first call once migration has run.
**Fix:** Make migration writers go through `appendStyleWin(...)` with a schema-conforming entry (set `winningTechniques: ["legacy-import"]`, `promptHash: "legacy"`, `totalCostCents: 0`). Add `source?: "legacy-import"` and `fileCount?: number` and `note?: string` to `StyleWinEntrySchema` as optional fields so the existing semantics survive.

### 13. Byte-diff gate has no symlink defense
**Subsystem:** migration
**Evidence (pre-verified):** `src/lib/artlab/migration/promoted-state-snapshot.ts:30` calls `statSync` (follows symlinks) and `readFileSync` (follows symlinks); no `lstatSync` check. The CI workflow at `.github/workflows/artlab-byte-diff.yml` runs this snapshot.
**Why high:** Spec safety property §13.8 ("promoted state preservation") is the protection on Otis + Mara. An attacker (or a typo) replacing a protected PNG with a symlink to an attacker-controlled file passes the byte-identical check because the hash is computed against the resolved target.
**Fix:** In `walk`, use `lstatSync` instead of `statSync` to detect symlinks before recursing; treat any symlink as a diff. Add an explicit `isSymbolicLink` rejection in `snapshotPromotedState`'s mapper.

### 14. Self-evolution: obfuscation hack defeats the source-scan safety test
**Subsystem:** self-evolution
**Evidence:**
- `src/lib/artlab/self-evolution/codex-summoner.ts:37` has the literal comment: `// The following string is intentionally constructed to avoid matching the branch-policy source scan / while still producing the correct instruction for Codex at runtime.`
- Line 38: `` `DO NOT OPEN A PR. Never run ${"gh"} ${"pr"} ${"create"} or ${"gh"} ${"pr"} ${"merge"}. ...` ``
- `src/lib/artlab/self-evolution/branch-policy.test.ts:31-32` is the test being defeated: `expect(codexSummoner).not.toMatch(/openPR|mergePR|gh\s+pr\s+(create|merge)/);`
**Why high:** Spec safety property §13.5 ("no PR auto-merge") relies on a source-level scan AND a runtime ban string in the Codex goal. Today the source scan is defeated by string fragmentation — if someone later adds a real `gh pr create` invocation, the source-scan test continues to pass because it's already passing under false pretenses. The runtime ban string is fine.
**Fix:** Pick one approach. Either (a) keep the source scan but accept that the goal-builder *contains the banned phrase by construction* — adjust the source-scan to allow only `codex-summoner.ts` lines that are inside a known template string, or (b) drop the source scan, lean on a behavioral test plus a unit test that asserts `gh pr` and `pr create` are NOT executable strings in any module's exported callable surface. Either way, remove the deliberate-defeat comment and the string fragmentation.

### 15. Specialized runners (`animation`, `environment`, `ui-texture`) are dead code with kind-collision
**Subsystem:** runners
**Evidence (pre-verified):** `animationRunner`, `environmentRunner`, `uiTextureRunner` all declare `kind: "production"` and are not registered in `runners/index.ts`. `getRunner("production")` returns the generic `productionRunner` only.
**Why high:** These runners are the actual asset-type-aware producers. The generic `productionRunner` writes 20 unstructured slot JSONs and doesn't know about animation frame counts, environment time-of-day variants, or ui-texture tileability. Today the engine cannot produce a non-character asset correctly through the registered runner; the correct runners exist but are unreachable.
**Fix:** Replace `ArtLabRunnerKind` collision with a two-axis key: `(phase, assetType)`. Register `production:animation`, `production:environment`, `production:ui-texture`, `production:default`. Update `getRunner` and `runners/index.ts`. The deterministic walker passes `assetType` already; it just needs to use it.

### 16. Deterministic walker silently transitions on `needs-human` and unhanded failed statuses
**Subsystem:** orchestrator
**Evidence:** `src/lib/artlab/orchestrator/deterministic.ts:64-67` only sets the blocker when `result.status === "failed" && result.blockerHint`. If a runner returns `status: "needs-human"` (valid per `runner-contract.ts:28`'s `z.enum(["ok","failed","needs-human"])`) or `status: "failed"` without a `blockerHint`, execution falls through to line 69 and the phase is advanced as if the runner succeeded.
**Why high:** "needs-human" exists precisely to pause for review (e.g., low-confidence concept QA). Silently advancing it loses the human gate. Same risk for any `failed` without a blocker hint — the engine proceeds to strict-qa on an empty production output.
**Fix:** Make the post-run branch exhaustive: `switch(result.status) { case "ok": continue; case "needs-human": write blocker "needs-human", return; case "failed": write blocker (hint ?? "repair-required"), return; }`.

### 17. Symbolic safety-property tests give false comfort
**Subsystem:** safety-properties
**Evidence:** `src/lib/artlab/safety-properties/all-ten.test.ts`
- §13.2 (lines 31-38): `expect(typeof budgetModule.reserveCreativeBudget).toBe("function")` — module surface only, no spend behavior asserted.
- §13.3 (lines 40-44): `expect(typeof processCancelIntents).toBe("function")` — comment admits real behavior is "covered elsewhere"; this test asserts only existence.
- §13.7 (lines 81-85): file read + regex absent-check on `keychain.ts` only.
- §13.8 (lines 87-90): asserts the **workflow YAML file exists**, not that the runtime byte-diff gate is correct (per finding #13 it is not).
- §13.9 (lines 92-96): asserts `launchd.ts` has `<integer>10`, which is `ThrottleInterval` (restart back-off), not the heartbeat interval. The actual heartbeat is per-tick (`entry.ts:34-40`) with a 1s default sleep — the test entirely misses its target.
**Why high:** A passing all-ten test set is the deploy gate. Today 3 of 10 are typeof/source-scan smoke tests and 2 of 10 (§13.8, §13.9) assert the wrong target. Net real behavioral coverage: 5 of 10 (§13.1 partial — see finding #5, §13.4, §13.5, §13.6, §13.10).
**Fix:** Rewrite §13.2 to perform a real reserve→spend→assert-no-double-charge scenario; rewrite §13.3 to exercise an end-to-end cancel (queue→spawn→SIGTERM→lease released); rewrite §13.7 to invoke `setSecret`/`readSecret` against an in-memory keychain stub and assert no file write fired; rewrite §13.8 to invoke `assertByteIdenticalPromotedState` against a symlink-swap fixture (and add the lstat defense from finding #13); rewrite §13.9 to assert daemon heartbeat path is written within 1.5× of the configured tick interval during `runDaemonOnce`.

## MEDIUM findings

### 18. Reconciler crashes on a single malformed event line
**Subsystem:** state
**Evidence:** `src/lib/artlab/state/events.ts:21-27` — `readArtLabEvents` calls `ArtLabEventSchema.parse(JSON.parse(line))` per line with no try/catch. `readRunReality` (`state/reconciler.ts:60`) calls it. One corrupted JSON line (e.g., a half-written append after kill -9) nukes the whole reconciler return value and therefore the `/status` command, crash-recovery, and the health snapshot for that run.
**Fix:** Wrap each line in try/catch; on failure, push to a `malformedLines: number` field on the return and continue. Surface the count in the health snapshot so corruption is visible without blocking reads.

### 19. Memory writers and decision log are never called in production
**Subsystem:** memory, orchestrator
**Evidence:** `grep -rn "appendStyleWin|appendRejection|appendPromptEvolution|appendLlmDecision" src/ scripts/` returns only the test files. The ledgers exist and pass their unit tests but never grow during a real run.
**Why medium:** No data corruption — just no learning. Phase 6 "memory accumulation" goals are unmet. The `prompt-enrichment` LLM kind exists as an enum value but no caller builds such a request, so even the read path of `getRelevantMemory` is academic.
**Fix:** After a successful promotion in the runner (finding #5 rewrite), call `appendStyleWin`. After a `needs-human` blocker that resolves to "reject", call `appendRejection`. After the deterministic walker invokes the LLM brain, call `appendLlmDecision`. Add a "before generating concept prompts" hook that calls `getRelevantMemory` and feeds the result into the prompt context.

### 20. Production direct-write paths bypass `writeRunStateSnapshot`/`appendArtLabEvent`
**Subsystem:** state
**Evidence:** `grep -rn "writeFileSync.*run-state.json"` shows direct writers in `migration/import-mara.ts:34`, `migration/import-otis.ts:34`, and tests. None pass through `writeRunStateSnapshot`, which is the only place `ArtLabRunStateSchema.parse(state)` is called.
**Why medium:** Today the migration writers happen to produce schema-conformant JSON (all required fields present), so the next `readRunStateSnapshot` succeeds. But there is no compile-time guarantee — a future migration change can write a missing field and only manifest at the next reconcile.
**Fix:** Convert all direct `writeFileSync(... "run-state.json" ...)` to `writeRunStateSnapshot(runDir, state)`. The migration writers already build typed `state` literals; the call is a one-liner replacement.

### 21. LRU cache has a thundering-herd race
**Subsystem:** speed
**Evidence:** `src/lib/artlab/speed/lru-cache.ts:18-26` — `getOrFetch` checks `map.has(key)` then `await fetcher()`. Multiple concurrent callers all see `map.has === false`, each fire their own `fetcher()`, then race to write. Result: N fetches instead of 1.
**Why medium:** For expensive provider calls (the only reason to have an LRU here), this defeats the cache during burst traffic exactly when caching matters most.
**Fix:** Store in-flight Promises: `const inFlight = new Map<K, Promise<V>>();`. In `getOrFetch`, return the existing in-flight promise if any; otherwise create one, register it, await it, then move to `map`.

### 22. Provider-batch retry helper does not detect real `@ai-sdk/anthropic` v6 errors
**Subsystem:** speed
**Evidence:** `src/lib/artlab/speed/provider-batch.ts:13-19` matches `/HTTP\s+(\d{3})/` against `err.message`. Real `@ai-sdk` v6 errors are `AISDKError`-derived with a `statusCode` or `responseHeaders.status` field; their `message` is typically a human-readable summary like "Rate limit exceeded" with no `HTTP 429` substring.
**Why medium:** Retries fire only for errors whose message accidentally contains "HTTP NNN" — i.e., almost none. Real 429s and 503s become single-attempt failures.
**Fix:** Replace the regex with a typeguard: `import { APICallError } from "ai"; if (APICallError.isInstance(err) && retryableStatusCodes.includes(err.statusCode))`. Keep the regex fallback for the `Error` subclass-but-no-statusCode case.

### 23. archive-legacy throws on second invocation
**Subsystem:** migration
**Evidence:** `src/lib/artlab/migration/archive-legacy.ts:32` — `renameSync(src, dst)` with no pre-check. If the migration runs twice (e.g., legacy `studio/` already exists under both `<root>/studio` and `<root>/legacy/studio`), `renameSync` throws ENOTEMPTY.
**Why medium:** Non-idempotent migration. Operator running it twice for safety gets a stack trace instead of a successful no-op.
**Fix:** If `existsSync(dst)`, choose: skip with a returned warning, or append a timestamp to dst (`legacy/studio-<ISO>`).

## LOW findings
- `health/render.ts` `renderArtLabHealth` has zero production callers; bot `/health` builds its own string. Either delete the renderer or have bot/CLI use it.
- The speed summary (`snapshot.speed`) is computed by `buildArtLabHealthSnapshot` but no caller (bot, CLI, render) prints it. `renderArtLabHealth` should append a "Speed" block.
- `orchestrator/decision-log.ts` (`appendLlmDecision`, `readLlmDecisions`) — dead code without #19's wiring.
- `contracts/index.ts` re-exports only the general `contracts.ts`; the three mini-contracts (`animation`, `environment`, `ui-texture`) are imported directly. Either also re-export them or document the deliberate omission.
- `coherence/hashes.ts:53` returns 1 for an empty image — fine for snapshots but worth a unit test that asserts what `aspectRatio` is in the "fully transparent" case.
- `daemon/launchd.ts:39` sets `ThrottleInterval: 10` which is restart back-off, not heartbeat — but the §13.9 test reads the same field as a heartbeat assertion (see finding #17). Add a comment to prevent future readers from making the same mistake.

## REVIEW NOISE (do not act on)
- "Daemon writes `pid: -1` and runs `process.kill(-1)`" — `daemon/entry.ts:38` uses `process.pid`; no `process.kill(-1)` anywhere. Reviewer hallucinated.
- "CLI `runId` path traversal" — `cli/produce.ts:22` uses `randomUUID()`; user input never enters the path.
- "Memory LRU cache is dead code" — there is no LRU file in `memory/` (the LRU lives in `speed/lru-cache.ts` and has a real but separate bug; see finding #21).
- "Promotion firewall in `promotion.ts` lacks QA/manifest checks" — `promotion.ts:81-122` checks all of them. The real problem (finding #5) is that the wrong code path runs at promotion time, not that the firewall is weak.

## Cross-cutting themes

### Orphaned subsystems are the single largest risk
The pattern repeats across daemon-orchestration, CLI, intake, memory writes, decision-log, and coherence: each subsystem is well-implemented, unit-tested, and has a clean API — and nothing in the production path calls it. The codebase has ~110 source files and 118 test files; tests overwhelmingly drive the production surface. Fixing this is mostly wiring, not new logic. Findings #1, #2, #3, #9, #11, #19 are all variants of the same root cause.

### Two-pathway divergence
Where two implementations of the "same" concept exist, the registered/imported one is the weaker one: `promotionRunner` (no firewall) vs `promoteCreativeAssetsTransactionally` (correct firewall); `productionRunner` (generic) vs `animationRunner`/`environmentRunner`/`uiTextureRunner` (asset-aware, never registered); `appendStyleWin` (schema-validated) vs `writeFileSync` in migration (schema-bypassing). The pattern is that an early stub was followed by a "real" replacement that nobody finished plumbing in.

### Tests that pass for the wrong reason
The all-ten safety properties test (finding #17) and the self-evolution branch policy test (finding #14) both pass for reasons unrelated to whether the safety property actually holds. The branch-policy test even has a comment in the code-under-test admitting the test is being defeated on purpose. These tests are worse than no tests because they look like coverage on the CI dashboard.

### `??` and other "explicit zero" footguns
Finding #7 (cutout pool) is a classic — `value ?? default` silently swallows an explicit `0`. The pattern appears once but the same shape is worth grepping for elsewhere (e.g., budget caps, sleep intervals, slot counts).

### Silent error paths everywhere
`daemon/entry.ts:59` `catch {}`, `events.ts:21` no try/catch (whole-batch throw), `telegram-poller.ts` offset advance only at end of batch, `archive-legacy.ts` no collision check, runner failures with no `blockerHint`. Pattern: ArtLab very often chooses "keep going" over "report and continue" — and at the moment "keep going" is indistinguishable from "succeed."

### Symbolic vs behavioral testing
Three of ten safety properties are typeof or source-scan checks. The right behavioral tests are usually present elsewhere in the file tree (cancel-flow.test.ts, byte-diff-gate.test.ts), but the spec-mandated all-ten test set doesn't call them. Aggregating real behavioral checks into a single deploy-gate test would make CI failures meaningful.

## Definition of done — current state

Spec safety properties §13.1–§13.10, evaluated against runtime code (not against the symbolic tests):

| Property | Enforced by code? | Notes |
|---|---|---|
| §13.1 Promotion firewall (exact phrase + QA + manifests) | **No** — partial. The registered `promotionRunner` checks only the phrase. The full firewall (`promoteCreativeAssetsTransactionally`) is implemented but never called. See finding #5. |
| §13.2 No duplicate spend | **Unverified.** Module exists; `reserveCreativeBudget` / `releaseCreativeBudgetReservation` / `recordCreativeBudgetSpend` are not called by any orchestration code today. Symbolic test only. |
| §13.3 Cancellation is honest | **No.** `processCancelIntents` is correct in isolation but never composed into the daemon loop (finding #3). `/cancel` writes a file nothing reads. |
| §13.4 Resume after crash | **No.** `reconcileCrashedRuns` works in isolation but daemon doesn't call it (finding #3). |
| §13.5 No PR auto-merge | **Partial.** Runtime Codex goal does contain the ban string. The source-scan defense is defeated by deliberate obfuscation (finding #14). |
| §13.6 Identity check / silent drop | **Yes.** `isAuthorizedSender` is invoked by the bot dispatcher before any action and returns false silently on mismatch. |
| §13.7 Secret hygiene | **Likely yes.** Keychain helpers do not write to files; symbolic test only (no behavioral assertion). |
| §13.8 Promoted state preservation | **Partial.** CI workflow exists and runs the byte-diff. Runtime gate has no symlink defense (finding #13); a symlink swap silently passes. |
| §13.9 Mid-run progress accuracy | **Partial.** Heartbeat is written every tick by `entry.ts:34-40`, but the daemon main loop is a stub (finding #1) so heartbeats never actually fire in production. |
| §13.10 Two-gate purity | **Yes.** `parseReplyExact` enforces exactly two tiers. Verified behaviorally. |

Net: **3 of 10** spec safety properties are actually enforced by production code today (§13.6, §13.10, and the documented half of §13.5). The rest depend on wiring that does not exist.

## Recommended fix sequence

The order minimizes rework: each step removes a blocker that other fixes depend on.

1. **(S) Wire `runDaemonForever` into `artlab daemon run`.** Unblocks heartbeats (§13.9), unblocks every other daemon-composition fix. Findings #1, #4. Effort: small (50 lines including error logging to `daemon-errors.jsonl`).
2. **(S) Compose cancel-flow / crash-recovery / sleep-guard / cli-inbox-watcher into `runDaemonOnce`.** Findings #2, #3. Unblocks §13.3, §13.4, and the entire CLI surface. Effort: small (the modules exist; ~80 lines of composition + cadence).
3. **(M) Promotion: have `promotionRunner.run` delegate to `promoteCreativeAssetsTransactionally`.** Finding #5. Restores §13.1 to the real firewall path. Effort: medium (need to load strict-qa receipt + both manifests from the run dir before calling).
4. **(S) Trigger dispatcher: wire `routeRequest` + `enqueueRun` for the trigger/bundle branches.** Finding #9. Combined with step 2, this makes the Telegram surface real. Effort: small.
5. **(S) Per-message try/catch + incremental offset in `telegram-poller`.** Finding #10. Eliminates poison-message lockup. Effort: small.
6. **(S) Fix `cutout-pool` zero-concurrency guard and harden `??` defaults in the same idiom.** Finding #7. Effort: small (one line + a grep sweep).
7. **(S) Fix coherence diversity AND→OR; either implement `computeAgeImpression` or drop `ageImpression` from signatures; wire coherence into strict-qa runner.** Finding #8. Effort: small for the rule fix and signature cleanup, medium for the strict-qa wiring.
8. **(S) Add `character-contract.ts` with the 21-sprite matrix and re-export from barrel.** Finding #6. Effort: small (spec exists in design doc; this is just transcription).
9. **(S) Replace runner-kind collision with `(phase, assetType)` keying; register the three asset-aware runners.** Finding #15. Effort: small once #6 lands.
10. **(S) Make the deterministic walker's post-run branch exhaustive on status.** Finding #16. Effort: small.
11. **(S) Migration writers go through `appendStyleWin` (after schema gains optional `source`/`fileCount`/`note`).** Finding #12. Prevents the migration→read corruption. Effort: small.
12. **(S) Byte-diff snapshot uses `lstatSync` and rejects symlinks.** Finding #13. Effort: small.
13. **(S) `readArtLabEvents` per-line try/catch with `malformedLines` counter.** Finding #18. Effort: small.
14. **(S) LRU cache stores in-flight promises.** Finding #21. Effort: small.
15. **(S) `withRetryAndBackoff` uses `APICallError.isInstance(err)` + `err.statusCode`.** Finding #22. Effort: small.
16. **(S) `archive-legacy` collision handling (skip or timestamp).** Finding #23. Effort: small.
17. **(M) Rewrite the all-ten safety-property tests to exercise real code paths.** Finding #17. Effort: medium (10 test rewrites, but each follows the pattern already established in the corresponding behavioral test file).
18. **(M) Memory + decision-log wiring (after #3 and #5).** Finding #19. Effort: medium.
19. **(S) Self-evolution: drop the obfuscation hack; either tighten or remove the source-scan test.** Finding #14. Effort: small.
20. **(S) Cleanup pass: delete `health/render.ts` callers OR have CLI/bot use it; surface `snapshot.speed` in `/health` text; remove the launchd `ThrottleInterval`-as-heartbeat confusion.** LOW findings. Effort: small.

Steps 1-5 alone restore the system from "façade" to "real engine driving real Telegram + CLI traffic with cancel and resume," and are the highest leverage. Steps 6-10 close the asset-correctness gap. Steps 11-16 are defensive hardening. Step 17 makes the deploy gate meaningful.
