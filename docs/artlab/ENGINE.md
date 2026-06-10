# ArtLab — Engine reference

ArtLab is the Tower's creative engine: a Telegram-driven, two-gate, file-state-machine pipeline that produces Tower character art (and environment / UI texture / animation assets) end-to-end with autonomous QA, persistent memory, and self-evolution.

## At a glance

- **Trigger surface:** Telegram bot (primary), `artlab` CLI (power use).
- **Two human gates only:** `approve direction <n>` and `approved for app`.
- **State:** filesystem-only at `.artlab/engine/` — no DB, no Vercel calls.
- **Brain:** deterministic scheduler + Claude Opus 4.7 LLM brain (`@ai-sdk/anthropic`) for novel decisions only.
- **Self-evolution:** `codex` CLI subprocess drafts refactor branches when friction repeats 5x; never auto-PRs.

## Modules

- `intake/` — single-source request router. Parses requests, detects ambiguity, parses bundles, handles photo uploads.
- `brainstorm/` — design-brief proposer + brief-feedback loop (the `briefing` / `brief-review` gate pair).
- `state/` — 13-phase state machine, atomic writes, the **reconciler** (single read path).
- `queue/` — multi-run queue, parallelism limit (max 2), engine-level lock.
- `runners/` — concept, canary, production, cutout, strict-qa, promotion, verifying.
- `orchestrator/` — deterministic scheduler + LLM brain + progress heartbeat publisher.
- `memory/` — style-wins, style-rejections, prompt-evolution, rejections ledgers + retrieval API.
- `coherence/` — silhouette + palette + age-impression diversity checks.
- `bot/` — Telegram surface: long-poll, identity, 3-tier reply parser, image attachments.
- `daemon/` — launchd-supervised process: telegram poller, queue processor, crash recovery, SIGTERM cancel, sleep guard.
- `self-evolution/` — friction detector, Codex CLI summoner, branch policy.
- `health/` — real snapshot scanners (leases, ledgers, processes, receipts, locks, cleanup).
- `speed/` — Phase 5 mechanisms: measure, parallel pool, LRU cache, retry+backoff, debounce, quality-equivalence.
- `migration/` — Otis + Mara import, byte-diff gate, baseline recorder.

## 13-phase state machine

`routed → briefing → brief-review → generating-concepts → concept-review → refining-concepts → canary → production → strict-qa → final-review → promoting → verifying → closed`

This is the authoritative chain — it must match `ARTLAB_PHASES` in `src/lib/artlab/types.ts` exactly (drift check: `scripts/artlab-doc-drift-check.ts`).

Plus 8 orthogonal blockers: `needs-human`, `budget-blocked`, `provider-blocked`, `repair-required`, `style-failed`, `upgrade-required`, `cancelled`, `concept-critique-fallback`.

The `concept-critique-fallback` blocker fires when the brain's automated concept critique is unavailable (mock-mode regression or provider outage) — the run still produced lanes, but the brain's critique was silently degraded. Surfacing it as a blocker forces a fresh attempt with a real brain instead of promoting unreviewed concepts.

A run's state is `(phase, blocker?)`. The reconciler is the only legal read path.

### The brainstorm fork (briefing → brief-review)

Before any concept lanes are generated, the engine proposes a structured **design brief** (visual archetype, palette hints, props, prohibited reads). The human reviews the brief at the `brief-review` gate and either:

- approves → the run advances to `generating-concepts` and spends provider budget on five concept lanes; or
- requests an adjustment in plain English → the brain folds the feedback back into the brief and the run loops back to `briefing` (no provider spend).

This pre-flight gate is the difference between "five lanes off a half-understood prompt" and "five lanes off an aligned brief", and it costs nothing because no images are generated yet.

### The refining-concepts loop (concept-review → refining-concepts)

After the five concept lanes appear on the initial concept board, the human has three options at the `concept-review` gate:

- `approve direction <n>` → advance to `canary` with the chosen lane.
- `revise: <feedback>` → enter the `refining-concepts` phase. The brain takes the rejection signal (which lanes the human liked / disliked + the freeform feedback), regenerates only the slots that need to change, and returns to `concept-review` with a refreshed lane set. This loop runs up to three times before escalating.
- `reject` → write a `cancelled` blocker and append a rejection ledger entry so the taste signal carries forward into future runs.

The loop ensures the concept gate is iterative — operators don't get a single "approve or kill" choice.

## Install history

Built via a 142-task superpowers plan, completed 2026-05. The plan doc is retired
(git history) — the running system + this doc are the source of truth now.

## CLI commands

```
artlab produce "<request>"            # enqueue a run
artlab continue <runId>               # advance a paused run
artlab answer <runId> "<reply>"       # record gate response (CLI mirror of Telegram)
artlab status [<runId>]               # plain-English status
artlab queue                          # queued + active runs
artlab health                         # health snapshot + speed dashboard
artlab cancel <runId>                 # write cancel intent
artlab daemon <start|stop|restart|status|logs>
artlab bot setup --token <T> --chat-id <N>
```

## Key files in `.artlab/engine/`

- `runs/<runId>/run-state.json` — current phase + blocker
- `runs/<runId>/progress.json` — heartbeat (every 10s during active work)
- `runs/<runId>/events.jsonl` — append-only audit log
- `runs/<runId>/slot-leases/*.lease.json` — per-slot duplicate-spend protection
- `memory/{style-wins,style-rejections,prompt-evolution}.jsonl`
- `ledgers/{measurements,baselines,improvements}.jsonl`

## Safety properties (spec §13; tests in `safety-properties/`)

1. Promotion firewall: no `public/art` write without `approved for app` + strict QA pass.
2. No duplicate spend.
3. Cancellation is honest (SIGTERM + grace + lease release + reservation refund).
4. Resume after crash.
5. No PR auto-merge (self-evolution drafts branches only).
6. Identity check (silent drop unauthorized Telegram chat.id).
7. Secret hygiene (env or Keychain only).
8. Promoted state preservation (byte-diff CI for Otis + Mara).
9. Mid-run progress accuracy (10s heartbeat).
10. Two-gate purity (no mini-gates between approve direction and approved for app).
