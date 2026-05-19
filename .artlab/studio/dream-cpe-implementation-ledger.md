# Dream CPE Implementation Ledger

## 2026-05-19 Baseline

- Active goal check: no old active goal was present; this run is now the active goal.
- Branch: `codex/creative-pipeline-hardening`.
- Baseline git status: clean against `origin/codex/creative-pipeline-hardening`.
- Active generation/API/cutout process check: no active job found; only the process-search command itself matched.
- Lock scan: no `.lock` files found under `.artlab`; historical API run state files exist.
- Current Otis production truth: `public/art/lobby/otis/` contains the promoted Otis derivatives, and `src/lib/visual-assets/approved-character-assets.generated.json` contains 21 approved Otis manifest entries.
- Current inconsistency to fix early: `run-state.json` says Otis is `integrated`, while `progress.json`, `human-action.json`, `art:status`, and `art:health` still describe `final-board-ready` and say promotion is locked until `approved for app`.
- Safety constraint: do not regenerate, overwrite, delete, or re-promote Otis; use promoted Otis as the production regression baseline.

## Work Log

- Started required instruction/doc/code read: `AGENTS.md`, `CLAUDE.md`, `.agents/skills/creative-production-engine/SKILL.md`, CPE docs, character pipeline docs, primary scripts, current Otis `.artlab` state, and visual asset manifests.
- Spawned read-only exploration subagents for operator/status, scheduler/budget/providers, and contracts/review/cleanup/health slices.
- Fixed the early Otis status inconsistency in the display layer. Root cause: `run-state.json` had advanced to `integrated`, but `progress.json` and `human-action.json` still described `final-board-ready`; status and health were mixing these without phase normalization.
- Added focused regression coverage for integrated/promoted baseline status and health behavior.
- Verified focused fix with `npm test -- src/lib/creative-production/operator/v1-final.test.ts src/lib/creative-production/health/health-cli.test.ts`.
- Live check after fix: `npm run art:status` now reports `Phase: integrated`, next browser QA, no Armaan action, and protected promoted baseline wording. `npm run art:health` now reports the same integrated next step.
- Added the missing normal command surface `npm run art:produce -- --answer <runId> "<plain English answer>"`.
- `--answer` now applies the human response from durable files, updates `run-state.json`, `progress.json`, `human-action.json`, and `events.jsonl`, and avoids stale action prompts after a gate is answered.
- Verified with `npm test -- src/lib/creative-production/produce-cli.test.ts`.
- Added `src/lib/creative-production/promotion/` as a reusable promotion firewall module.
- Promotion firewall blocks missing exact approval, locked public-art writes, missing strict QA, missing review/app-preview manifests, direct-promoting manifests, and missing staged assets.
- Transactional promotion helper writes only to caller-provided target roots; tests prove success in a temp public-art area without touching production `public/art`.
- Verified with `npm test -- src/lib/creative-production/promotion/promotion-firewall.test.ts`.
- Added `FileCreativeSlotLeaseStore` for durable slot leases backed by atomic JSON files.
- File-backed leases now support persisted duplicate protection, heartbeat persistence, stale-worker recovery proof, and release cleanup across scheduler instances.
- Verified with `npm test -- src/lib/creative-production/scheduler/scheduler.test.ts`.
- Reconciled routed asset types with typed asset contracts via `getCreativeAssetContractForCreativeType`.
- Corrected the character contract promotion target to the actual Tower character path and generated manifest (`public/art/lobby/<characterId>` and `src/lib/visual-assets/approved-character-assets.generated.json`).
- Verified with `npm test -- src/lib/creative-production/contracts/asset-contracts.test.ts`.
- Extended budget reservations/receipts with provider model, prompt hash, and optional reference hash while preserving the estimated/reserved/spent/released/refunded accounting model.
- Verified with `npm test -- src/lib/creative-production/budget/ledger.test.ts`.
- Added a mocked dream vertical-slice test proving vague request, durable human action, initial approval, scheduler overlap, cutout overlap, resume without duplicate spend, final board, app-preview step, promotion blocked without exact phrase, and temp public-art promotion only after `approved for app`.
- Verified with `npm test -- src/lib/creative-production/dream-pipeline.test.ts`.
- Added durable artifact registry read/write helpers and wired `art:clean` to emit `.artlab/studio/artifact-registry.json`.
- `art:clean` now reports cleanup through registry-plan buckets: protected, archive, delete, and keep; live public art and approved manifests remain protected.
- Verified with `npm test -- src/lib/creative-production/cleanup/art-clean-cli.test.ts src/lib/creative-production/cleanup/retention-registry.test.ts`.
- Updated `.agents/skills/creative-production-engine/SKILL.md`, `docs/CREATIVE-PRODUCTION-ENGINE.md`, `docs/CREATIVE-PRODUCTION-ENGINE-V1-FINAL-PLAN.md`, `docs/CHARACTER-IMAGE-OPERATIONS.md`, and `docs/CHARACTER-ART-PIPELINE.md` to include `--answer`, registry-backed cleanup, and promoted/integrated Otis as the current baseline.
- Split status-summary rendering out of `operator/v1-final.ts` into `src/lib/creative-production/operator/status-summary.ts` so the core operator file stays below the 800-line architecture warning threshold.
- Routed Gemini API `run-api` selected slot execution through the shared durable scheduler/provider adapter boundary. The command still writes the legacy Gemini inbox receipts for compatibility, but provider work now uses `FileCreativeSlotLeaseStore`, scheduler concurrency, provider budget reservations, and `provider-budget-ledger.json`.
- Extended the CLI regression tests to prove `run-api` writes scheduler-owned provider receipts with model/prompt/reference provenance and that warning retries advance to named versioned attempts without duplicate dry-run spend.
- Verified the live-adapter bridge with `npm test -- src/lib/creative-production/generation-adapter-cli.test.ts src/lib/creative-production/scheduler/scheduler.test.ts src/lib/creative-production/providers/adapters.test.ts src/lib/creative-production/budget/ledger.test.ts` and `npx tsc --noEmit --pretty false`.
- Final verification pass: `npm run art:status`, `npm run art:health`, `npm test -- src/lib/creative-production`, `npm test -- src/lib/creative-production/v1-final-stress.test.ts src/lib/creative-production/dream-pipeline.test.ts`, `npx tsc --noEmit --pretty false`, `npm run lint`, `git diff --check`, review-board image validation, and public-art/manifest no-change checks passed.
- Cleanup verification: `npm run art:clean -- otis --run-id otis-real-rembg-full-production-v1 --dry-run` wrote the registry and reported protected live public art plus approved manifest entries without deleting anything.
- Otis browser QA pass: added `tests/e2e/otis-browser-qa.spec.ts` and recorded `.artlab/runs/otis/otis-real-rembg-full-production-v1/browser-qa/browser-qa.json`.
- Browser QA scope covered `/lobby` and `/lobby/onboarding` at desktop, mobile, standard motion, and reduced motion, with image loading, Otis crop/fit, overlap, horizontal overflow, reduced-motion, and console-error checks.
- Fixed a real mobile onboarding layout issue: the `main` grid item stayed vertically centered on narrow viewports, which could push header Otis above the visible scroll container; mobile now top-aligns the onboarding grid item.
- Fixed lobby reduced-motion coverage so decorative particles and logo glow stop when `prefers-reduced-motion` is active.
- After QA passed, advanced the imported Otis baseline to `browser-verified` and attached the browser QA evidence path in `run-state.json`; no public art, production manifest, generation, or promotion files were changed.
- Re-ran status and health after browser verification: both now report Otis as `browser-verified`, safe to run, no active locks/processes, and the promoted baseline protected.

## File Size Notes

- `scripts/creative-generation-adapter.ts` remains a pre-existing giant adapter and is now 4,739 lines. It still owns legacy Gemini API CLI planning, subscription capture, doctor/repair/cutout commands, and compatibility glue around the new scheduler/provider boundary; this run added no new 4,000-line adapter.
- `scripts/art-pipeline.ts` remains a pre-existing 1,452-line character pipeline CLI. This run touched only status/cleanup integration and did not expand promotion surfaces.
- `src/lib/creative-production/operator/v1-final.ts` is 771 lines after extracting status rendering; it remains above 500 because it owns the V1-final run-state state machine and Otis import bridge.
- `src/lib/creative-production/scheduler/scheduler.ts` is 549 lines after adding the durable file-backed lease store and optional attempt/provenance metadata; it owns scheduler, lease, overlap, and retry behavior in one module for now.
