# Tower Art Lab

`.artlab` is the non-production workshop for Tower creative production. It is where generated concepts, references, run ledgers, QA previews, staged derivatives, browser-session downloads, and review boards live before anything reaches the app.

## Fresh-Start State

The studio was reset on 2026-05-15 so the next creative run starts clean.

- No character production assets are currently approved.
- No old Otis generated images, run ledgers, browser sessions, or staged derivatives are kept here.
- Lobby backgrounds remain protected: `public/lobby/bg-1.jpg` through `public/lobby/bg-4.jpg`.
- The engine code, docs, tests, and approval gates remain in the repo.
- The next image-production session should generate Otis from scratch through the engine, not from old reference files.

## Start Here

For the guided Creative Production Engine session:

```bash
npm run art:studio
```

For read-only status:

```bash
npm run art:status
```

For machine-readable status:

```bash
npm --silent run art:status -- --json
```

For a new visual request, use the studio router rather than hand-placing files:

```bash
npm run art:studio -- --request "Create five prompt-only initial Otis designs from scratch."
```

The engine routes characters, backgrounds, screens, UI surfaces, animations, props, scenes, shaders, and marketing visuals into organized `.artlab/studio/...` packets.

## Image Generation Rules

- Drafts and generated sources start in `.artlab`, never in `public/art`.
- Initial character design uses exactly 5 total prompt-only images unless Armaan changes the rule.
- Production packs happen only after initial design approval.
- Final promotion requires Armaan's exact phrase: `approved for app`.
- Only the coordinator can promote, clean shared state, or update manifests.
- Gemini API runs read keys only from `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or macOS Keychain service `tower-gemini-api-key`.
- Gemini API runs use `api-run.lock` and `api-run-state.json` so duplicate agents do not double-spend against the same plan.
- Do not write API keys into repo files, command flags, receipts, prompt decks, screenshots, or run JSON.
- Gemini does not reliably produce true transparent PNGs; use a flat `#00ff00` matte for source art and extract alpha locally.
- If a generated image fails to load, decodes poorly, lacks expected files, has broken preview references, or fails strict doctor, repair or regenerate before showing it as clean.

## Parallel Mode

Normal creative packets use five-lane parallel wave mode by default. Each lane writes only to its own lane root. The coordinator validates lanes, scores and dedupes results, creates the review board, and owns promotion.

Lane subagents should use GPT-5.5 fast mode with extra-high reasoning when available. Use `--no-parallel` only for diagnostics. Validate each lane with `npm run art:studio -- --mode validate-lane --lane-brief <lane-brief.json>`, then run `npm run art:studio -- --mode coordinate --parallel-plan <parallel-plan.json>` so the coordinator writes `coordinator-review.json`, `coordinator-report.md`, `review-board.html`, and `promotion-gate.json`.

API image runs use 5 lanes with concurrency 5 for initial design. Do not serialize the five initial concepts unless the run is explicitly diagnostic.

## Required Gates

Every phase must run:

- Housekeeping Gate: inventory created files, delete loose junk, keep only used artifacts, and confirm no unapproved asset entered `public/art`.
- Continuous Improvement Gate: run `npm run art:studio -- --mode improve` to record slow steps, errors, confusing points, quality failures, and engine rewrite needs. Repeated friction must become code, tests, or a stricter command-level guard.
- Asset Doctor Gate before final approval boards and promotion.

## Layout

```text
.artlab/
  README.md
  studio/
    <asset-type>/<run-id>/
      creative-brief.json
      prompt.md
      next-action.md
      parallel/
      generation/
      ledgers/
  inbox/
    <asset-type>/<run-id>/<slot-id>/
  characters/
    <character-id>/
  runs/
    <character-id>/<run-id>/
  browser-sessions/
```

Those folders are recreated by the engine as needed.
