# ArtLab — Speed Playbook

ArtLab runs **as fast as quality allows**, with output byte-identical or QA-equivalent to a slow run. This page lists every speed mechanism, its quality-preservation guarantee, and the on-by-default tuning.

## Phase 5 speed mechanisms

| Mechanism | Quality preservation | Where |
|---|---|---|
| 5-lane concept parallelism (Promise.all) | Same slot files; Phase 1 Task 1.9 still passes | `src/lib/artlab/runners/concept-runner.ts` |
| LLM prompt caching (Anthropic ephemeral cache) | Same response; cache hit/miss invisible | `src/lib/artlab/orchestrator/claude-brain.ts` (Task 5.3 enforces) |
| Canary prep / concept QA overlap | Canary artifacts only consumed after QA pass | `src/lib/artlab/speed/pipeline-overlap.ts` |
| Cutout worker pool (concurrency 2-4) | Same cutout files, sorted output for determinism | `src/lib/artlab/speed/cutout-pool.ts`, `runners/cutout-runner.ts` |
| Memory retrieval LRU cache | Same results; cache size capped | `src/lib/artlab/speed/lru-cache.ts` |
| Provider retry+backoff (4xx/5xx-aware) | 4xx pass through; only transients retried | `src/lib/artlab/speed/provider-batch.ts` |
| Telegram message debounce | Every message preserved in batched send | `src/lib/artlab/speed/telegram-debounce.ts` |

## Tuning knobs

| Env var | Purpose | Default |
|---|---|---|
| `ARTLAB_CONCEPT_LANE_DELAY_MS` | Per-lane sleep in mock provider (test-only) | unset |
| `ARTLAB_CUTOUT_DELAY_MS` | Per-cutout sleep in mock provider (test-only) | unset |
| `ARTLAB_GEMINI_MODE=mock` | Skip real Gemini, return deterministic mock bytes | unset (production hits API) |
| `ARTLAB_CLAUDE_MODE=dry-run` | Skip real Anthropic call, echo input | unset (production hits API) |
| `ARTLAB_CODEX_MODE=mock` | Skip real codex CLI invocation | unset (production spawns CLI) |

## Daily benchmark + PR gate

- `.github/workflows/artlab-benchmark.yml` — daily 07:13 UTC mock-benchmark run; fails if total > 2s.
- `.github/workflows/artlab-speed-regression-gate.yml` — PR gate; fails if PR benchmark > baseline × 1.1.

## Quality-equivalence harness

Any contributor proposing a new speed change must use `src/lib/artlab/speed/quality-equivalence.ts` to assert their fast-path output is byte-identical (or QA-equivalent — timestamps stripped) to a slow-path run. Tests that ship in the PR cover this.

## Phase 5 acceptance gate

The whole-Phase-5 acceptance test (`src/lib/artlab/speed/phase-5-acceptance.test.ts`) asserts that the median of the last ≥ 3 Rafe-rerun wall-clocks is ≥ 40% faster than `phase-4-rafe-baseline`. The test is `describe.skip` by default; un-skip and run after ≥ 3 post-Phase-5 Rafe-equivalent runs are in the measurements ledger.
