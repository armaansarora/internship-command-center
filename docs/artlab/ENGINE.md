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
- `state/` — 10-phase state machine, atomic writes, the **reconciler** (single read path).
- `queue/` — multi-run queue, parallelism limit (max 2), engine-level lock.
- `runners/` — concept, canary, production, cutout, strict-qa, promotion, verifying.
- `orchestrator/` — deterministic scheduler + LLM brain + progress heartbeat publisher.
- `memory/` — style-wins, style-rejections, prompt-evolution ledgers + retrieval API.
- `coherence/` — silhouette + palette + age-impression diversity checks.
- `bot/` — Telegram surface: long-poll, identity, 3-tier reply parser, image attachments.
- `daemon/` — launchd-supervised process: telegram poller, queue processor, crash recovery, SIGTERM cancel, sleep guard.
- `self-evolution/` — friction detector, Codex CLI summoner, branch policy.
- `health/` — real snapshot scanners (leases, ledgers, processes, receipts, locks, cleanup).
- `speed/` — Phase 5 mechanisms: measure, parallel pool, LRU cache, retry+backoff, debounce, quality-equivalence.
- `migration/` — Otis + Mara import, byte-diff gate, baseline recorder.

## 10-phase state machine

`routed → generating-concepts → concept-review → canary → production → strict-qa → final-review → promoting → verifying → closed`

Plus 7 orthogonal blockers: `needs-human`, `budget-blocked`, `provider-blocked`, `repair-required`, `style-failed`, `upgrade-required`, `cancelled`.

A run's state is `(phase, blocker?)`. The reconciler is the only legal read path.

## Three /goal layers

| Layer | When | Command |
|---|---|---|
| Whole-plan | first install | see `docs/superpowers/plans/2026-05-20-artlab-implementation.md` |
| Per-phase | staged rollout | see plan |
| Per-task | auto-invoked by dispatcher | see plan |

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
