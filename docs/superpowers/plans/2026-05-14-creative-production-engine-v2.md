# Creative Production Engine V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Creative Production Engine from prompt organization into a coordinator-driven creative factory for images, UI, shaders, animation, immersive scenes, and production review.

**Architecture:** Add a capability registry, coordinator scoring/review layer, lane result aggregation, and HTML review-board generation. Keep generation drafts in `.artlab`, keep promotion coordinator-owned, and preserve 15x parallel default output.

**Tech Stack:** TypeScript, Node `tsx`, Vitest, existing `.artlab/studio` structure, Creative Production Engine CLI, Superpowers docs.

---

## File Structure

- Create `src/lib/creative-production/capabilities.ts`: capability taxonomy for static art, app UI, shader, animation, scene, icon, and marketing work.
- Create `src/lib/creative-production/coordinator.ts`: lane result parsing, scoring, dedupe, ranking, promotion blockers, and review-board rendering.
- Modify `src/lib/creative-production/index.ts`: export new modules.
- Modify `src/lib/creative-production/prompts.ts`: include capability instructions in packets and prompts.
- Modify `src/lib/creative-production/intake.ts`: route shader, immersive UI, and advanced animation requests more reliably.
- Modify `scripts/creative-production-engine.ts`: add `--mode coordinate --parallel-plan <path>`.
- Modify `.agents/skills/creative-production-engine/SKILL.md`, `docs/CREATIVE-PRODUCTION-ENGINE.md`, `.artlab/README.md`: document coordinator mode and broad creative scope.
- Add tests:
  - `src/lib/creative-production/capabilities.test.ts`
  - `src/lib/creative-production/coordinator.test.ts`
  - Extend `src/lib/creative-production/studio-cli.test.ts`
  - Extend `src/lib/creative-production/intake.test.ts`
  - Extend `src/lib/creative-production/skill-docs.test.ts`

## Task 1: Capability Taxonomy

- [ ] Add tests proving every asset type has capabilities, app preview targets, QA gates, and production deliverables.
- [ ] Implement `capabilities.ts` with capabilities for raster assets, app UI components, shader effects, motion systems, 3D/immersive scenes, review boards, and manifest-backed assets.
- [ ] Export capability helpers and wire packet creation to include capability instructions.

## Task 2: Intake Expansion

- [ ] Add tests for requests such as "build a shader hover effect", "generate a real animated lobby transition", "make an immersive UI panel", and "create a Three.js scene".
- [ ] Update route signals so those requests land in `ui-texture`, `animation`, or `scene` with useful capability language.

## Task 3: Coordinator Domain

- [ ] Add tests for lane result parsing, placeholder rejection, score calculation, dedupe grouping, top-option ranking, and promotion blockers.
- [ ] Implement `coordinator.ts` with machine-readable review objects and HTML/Markdown renderers.

## Task 4: Coordinator CLI

- [ ] Add CLI tests that create a default 15-lane run, write fake lane results, run `--mode coordinate`, and verify JSON, Markdown, and HTML outputs.
- [ ] Implement `--mode coordinate --parallel-plan <path>` and write coordinator artifacts under the run's `parallel/` folder.

## Task 5: Docs And Skill Sync

- [ ] Update docs and the project skill so future Codex/Claude sessions know the engine can handle static art, UI, shader, animation, scene, and app-preview work.
- [ ] Add tests that prevent docs from drifting away from coordinator mode and capability scope.

## Task 6: Verification

- [ ] Run `npm run test -- src/lib/creative-production`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run test`.
- [ ] Run `git diff --check`.
- [ ] Run `npm run build`.
- [ ] Fix every failure and repeat targeted tests before committing.
